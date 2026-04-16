/**
 * Sentry 监控配置
 * 用于生产环境错误追踪和性能监控
 */

import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/react';

// Sentry DSN - 从环境变量获取
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

// 是否启用 Sentry
const SENTRY_ENABLED = import.meta.env.PROD && Boolean(SENTRY_DSN);

// Sentry 配置
export function initSentry() {
  if (!SENTRY_ENABLED) {
    console.log('[Sentry] 生产环境未配置 Sentry DSN，跳过初始化');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // 集成
    integrations: [
      browserTracingIntegration({
        // 追踪页面加载性能
        startTransactionOnLocationChange: true,
      }),
    ],
    
    // 采样率：10% 的交易（性能事务）
    tracesSampleRate: 0.1,
    
    // 采样率：10% 的错误事件
    sampleRate: 0.1,
    
    // 环境
    environment: import.meta.env.MODE,
    
    // 版本
    release: import.meta.env.VITE_BUILD_VERSION || 'unknown',
    
    // 忽略的错误类型
    ignoreErrors: [
      // 网络错误
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      // 浏览器安全错误
      'SecurityError: Blocked attempt to use history.pushState',
      // React 取消的请求
      'AbortError',
      // 用户取消
      'User cancelled',
      // 重复渲染警告
      'Warning: Cannot update during an existing state transition',
    ],
    
    // 忽略特定错误
    denyUrls: [
      // 忽略 Chrome 扩展
      /extensions/i,
      // 忽略 localhost
      /localhost:5173/,
    ],
    
    // 是否开启面包屑追踪
    enableBreadcrumbHints: true,
    
    // 最大已有面包屑数
    maxBreadcrumbs: 50,
    
    // 调试模式
    debug: false,
  });

  console.log('[Sentry] 监控已初始化', {
    dsn: SENTRY_DSN ? '***' + SENTRY_DSN.slice(-10) : '未设置',
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

// 获取当前用户信息并设置给 Sentry
export function setSentryUser(user: { uid?: string; phone?: string; nickname?: string } | null) {
  if (!SENTRY_ENABLED) return;

  if (user) {
    Sentry.setUser({
      id: user.uid,
      username: user.nickname || user.phone || user.uid,
      email: undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

// 设置额外上下文
export function setSentryContext(name: string, context: Record<string, any>) {
  if (!SENTRY_ENABLED) return;
  Sentry.setContext(name, context);
}

// 添加面包屑
export function addSentryBreadcrumb(
  message: string,
  category: string = 'custom',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  if (!SENTRY_ENABLED) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now(),
  });
}

// 手动捕获错误
export function captureSentryError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_ENABLED) {
    console.error('[Error]', error, context);
    return;
  }

  Sentry.captureException(error, {
    contexts: context ? { extra: context } : undefined,
  });
}

// 手动捕获消息
export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!SENTRY_ENABLED) {
    console.log(`[${level}]`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

// 获取 Sentry 膜态
export function getSentryStatus() {
  return {
    enabled: SENTRY_ENABLED,
    dsn: SENTRY_DSN ? '***' + SENTRY_DSN.slice(-10) : '未设置',
    environment: import.meta.env.MODE,
    version: import.meta.env.VITE_BUILD_VERSION || 'unknown',
  };
}

export default {
  initSentry,
  setSentryUser,
  setSentryContext,
  addSentryBreadcrumb,
  captureSentryError,
  captureSentryMessage,
  getSentryStatus,
};
