/**
 * 生产环境错误处理工具
 * 提供统一的错误处理、日志记录和降级策略
 */

import { captureSentryError, addSentryBreadcrumb } from './sentry';

// ============================================================================
// 错误类型定义
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NetworkError extends AppError {
  constructor(message: string = '网络连接失败') {
    super(message, 'NETWORK_ERROR', 0, true);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400, true);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 'AUTH_ERROR', 401, true);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 'NOT_FOUND', 404, true);
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// 错误处理策略
// ============================================================================

interface ErrorLog {
  timestamp: string;
  message: string;
  code: string;
  stack?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
}

/**
 * 记录错误日志（生产环境）
 */
export function logError(error: Error | AppError, context?: Record<string, any>): void {
  const log: ErrorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
    stack: import.meta.env.DEV ? error.stack : undefined, // 生产环境不记录堆栈
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // 生产环境发送到监控服务
  if (import.meta.env.PROD) {
    // 发送到错误监控服务（如 Sentry）
    sendToErrorMonitor(log);
  } else {
    console.error('[Error]', log, context);
  }
}

/**
 * 发送错误到监控服务
 */
function sendToErrorMonitor(log: ErrorLog): void {
  // 发送到 Sentry 监控
  try {
    // 创建错误对象用于 Sentry
    const error = new Error(log.message);
    error.name = log.code;
    error.stack = log.stack;
    
    // 捕获错误到 Sentry
    captureSentryError(error, {
      code: log.code,
      url: log.url,
      userAgent: log.userAgent,
      timestamp: log.timestamp,
    });
    
    // 同时保留本地日志作为备份
    const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
    logs.push(log);
    if (logs.length > 50) {
      logs.shift();
    }
    localStorage.setItem('error_logs', JSON.stringify(logs));
  } catch {
    // ignore
  }
}

/**
 * 获取错误显示消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '操作失败，请稍后重试';
}

/**
 * 检查是否是网络错误
 */
export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof NetworkError ||
    (error instanceof Error && (error.message.includes('network') || error.message.includes('fetch')))
  );
}

/**
 * 检查是否是认证错误
 */
export function isAuthError(error: unknown): boolean {
  return (
    error instanceof AuthError ||
    (error instanceof AppError && error.statusCode === 401)
  );
}

// ============================================================================
// 异步操作包装器
// ============================================================================

interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 安全的异步操作包装器
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  errorMessage: string = '操作失败'
): Promise<AsyncResult<T>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    const message = getErrorMessage(error);
    logError(error instanceof Error ? error : new Error(message));
    return { success: false, error: message || errorMessage };
  }
}

/**
 * 带重试的异步操作
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}

// ============================================================================
// 降级策略
// ============================================================================

/**
 * 降级数据缓存
 */
const fallbackCache = new Map<string, { data: any; timestamp: number }>();
const FALLBACK_CACHE_DURATION = 5 * 60 * 1000; // 5分钟

/**
 * 获取降级数据
 */
export function getFallbackData<T>(key: string): T | null {
  const cached = fallbackCache.get(key);
  if (cached && Date.now() - cached.timestamp < FALLBACK_CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

/**
 * 设置降级数据
 */
export function setFallbackData<T>(key: string, data: T): void {
  fallbackCache.set(key, { data, timestamp: Date.now() });
}

/**
 * 带降级策略的异步操作
 */
export async function withFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallbackValue?: T
): Promise<T> {
  // 先尝试获取缓存
  const cached = getFallbackData<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    const data = await fetcher();
    setFallbackData(key, data);
    return data;
  } catch (error) {
    // 使用降级数据
    const fallback = fallbackValue ?? getFallbackData<T>(key);
    if (fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

export default {
  AppError,
  NetworkError,
  ValidationError,
  AuthError,
  NotFoundError,
  logError,
  getErrorMessage,
  isNetworkError,
  isAuthError,
  safeAsync,
  retryAsync,
  withFallback,
  getFallbackData,
  setFallbackData,
};
