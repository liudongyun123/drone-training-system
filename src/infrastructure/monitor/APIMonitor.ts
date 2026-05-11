/**
 * API Monitor - API 监控系统
 * 
 * 监控 API 调用：性能、错误、成功率和趋势
 */

import { platform } from '../../platform/adapters';
import { RequestError } from '../../platform/adapters/IRequestAdapter';
import { logger } from '../logger/Logger';

// ============================================================================
// 监控指标
// ============================================================================

export interface APIMetrics {
  /** 总调用次数 */
  totalCalls: number;
  /** 成功次数 */
  successCalls: number;
  /** 失败次数 */
  errorCalls: number;
  /** 超时次数 */
  timeoutCalls: number;
  /** 总耗时(ms) */
  totalDuration: number;
  /** 平均耗时(ms) */
  avgDuration: number;
  /** 最小耗时(ms) */
  minDuration: number;
  /** 最大耗时(ms) */
  maxDuration: number;
  /** 成功率 */
  successRate: number;
  /** 最后调用时间 */
  lastCallTime: number;
}

export interface APIRecord {
  /** API 端点 */
  endpoint: string;
  /** 请求方法 */
  method: string;
  /** 状态 */
  status: 'success' | 'error' | 'timeout';
  /** 耗时(ms) */
  duration: number;
  /** 错误信息 */
  error?: string;
  /** 错误码 */
  errorCode?: number;
  /** 时间戳 */
  timestamp: number;
}

// ============================================================================
// API 监控器
// ============================================================================

export class APIMonitor {
  private static instance: APIMonitor;
  
  // 全局指标
  private globalMetrics: APIMetrics = this.initMetrics();
  
  // 按端点统计
  private endpointMetrics = new Map<string, APIMetrics>();
  
  // 最近调用记录
  private records: APIRecord[] = [];
  private maxRecords = 500;
  
  // 实时指标回调
  private metricsCallbacks: ((metrics: APIMetrics) => void)[] = [];
  
  // 错误回调
  private errorCallbacks: ((error: RequestError, record: APIRecord) => void)[] = [];
  
  // 是否启用
  private enabled = true;
  
  private constructor() {
    // 监听页面可见性变化
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.report();
        }
      });
    }
  }
  
  static getInstance(): APIMonitor {
    if (!APIMonitor.instance) {
      APIMonitor.instance = new APIMonitor();
    }
    return APIMonitor.instance;
  }
  
  // --------------------------------------------------------------------------
  // 监控方法
  // --------------------------------------------------------------------------
  
  /**
   * 监控 API 调用
   */
  async track<T>(
    endpoint: string,
    method: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) {
      return requestFn();
    }
    
    const startTime = performance.now();
    let status: 'success' | 'error' | 'timeout' = 'success';
    let error: RequestError | undefined;
    let duration: number;
    
    try {
      const result = await requestFn();
      duration = performance.now() - startTime;
      this.recordCall(endpoint, method, status, duration);
      return result;
    } catch (e) {
      duration = performance.now() - startTime;
      error = e as RequestError;
      
      if (error.code === 'TIMEOUT') {
        status = 'timeout';
      } else {
        status = 'error';
      }
      
      this.recordCall(endpoint, method, status, duration, error);
      throw e;
    }
  }
  
  /**
   * 记录调用
   */
  private recordCall(
    endpoint: string,
    method: string,
    status: 'success' | 'error' | 'timeout',
    duration: number,
    error?: RequestError
  ): void {
    const record: APIRecord = {
      endpoint,
      method,
      status,
      duration,
      error: error?.message,
      errorCode: error?.code,
      timestamp: Date.now(),
    };
    
    // 保存记录
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
    
    // 更新全局指标
    this.updateGlobalMetrics(status, duration);
    
    // 更新端点指标
    this.updateEndpointMetrics(endpoint, status, duration);
    
    // 记录日志
    const logLevel = status === 'success' ? 'info' : 'error';
    logger[logLevel](
      `[API] ${method} ${endpoint}`,
      { status, duration: `${duration.toFixed(2)}ms`, error: error?.message }
    );
    
    // 触发错误回调
    if (status !== 'success' && this.errorCallbacks.length > 0) {
      this.errorCallbacks.forEach(cb => cb(error!, record));
    }
    
    // 触发指标回调
    this.notifyMetricsCallbacks();
  }
  
  // --------------------------------------------------------------------------
  // 指标更新
  // --------------------------------------------------------------------------
  
  private initMetrics(): APIMetrics {
    return {
      totalCalls: 0,
      successCalls: 0,
      errorCalls: 0,
      timeoutCalls: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successRate: 100,
      lastCallTime: 0,
    };
  }
  
  private updateGlobalMetrics(status: 'success' | 'error' | 'timeout', duration: number): void {
    const metrics = this.globalMetrics;
    
    metrics.totalCalls++;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.totalCalls;
    metrics.lastCallTime = Date.now();
    
    if (duration < metrics.minDuration) {
      metrics.minDuration = duration;
    }
    if (duration > metrics.maxDuration) {
      metrics.maxDuration = duration;
    }
    
    switch (status) {
      case 'success':
        metrics.successCalls++;
        break;
      case 'error':
        metrics.errorCalls++;
        break;
      case 'timeout':
        metrics.timeoutCalls++;
        break;
    }
    
    metrics.successRate = (metrics.successCalls / metrics.totalCalls) * 100;
  }
  
  private updateEndpointMetrics(
    endpoint: string,
    status: 'success' | 'error' | 'timeout',
    duration: number
  ): void {
    if (!this.endpointMetrics.has(endpoint)) {
      this.endpointMetrics.set(endpoint, this.initMetrics());
    }
    
    const metrics = this.endpointMetrics.get(endpoint)!;
    
    metrics.totalCalls++;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.totalCalls;
    metrics.lastCallTime = Date.now();
    
    if (duration < metrics.minDuration) {
      metrics.minDuration = duration;
    }
    if (duration > metrics.maxDuration) {
      metrics.maxDuration = duration;
    }
    
    switch (status) {
      case 'success':
        metrics.successCalls++;
        break;
      case 'error':
        metrics.errorCalls++;
        break;
      case 'timeout':
        metrics.timeoutCalls++;
        break;
    }
    
    metrics.successRate = (metrics.successCalls / metrics.totalCalls) * 100;
  }
  
  // --------------------------------------------------------------------------
  // 查询方法
  // --------------------------------------------------------------------------
  
  /**
   * 获取全局指标
   */
  getGlobalMetrics(): APIMetrics {
    return { ...this.globalMetrics };
  }
  
  /**
   * 获取端点指标
   */
  getEndpointMetrics(endpoint: string): APIMetrics | undefined {
    return this.endpointMetrics.get(endpoint);
  }
  
  /**
   * 获取所有端点指标
   */
  getAllEndpointMetrics(): Map<string, APIMetrics> {
    return new Map(this.endpointMetrics);
  }
  
  /**
   * 获取最近调用记录
   */
  getRecentRecords(limit?: number): APIRecord[] {
    if (limit) {
      return this.records.slice(-limit);
    }
    return [...this.records];
  }
  
  /**
   * 获取端点的最近记录
   */
  getEndpointRecords(endpoint: string, limit?: number): APIRecord[] {
    const records = this.records.filter(r => r.endpoint === endpoint);
    if (limit) {
      return records.slice(-limit);
    }
    return records;
  }
  
  // --------------------------------------------------------------------------
  // 回调
  // --------------------------------------------------------------------------
  
  /**
   * 订阅指标变化
   */
  onMetrics(callback: (metrics: APIMetrics) => void): () => void {
    this.metricsCallbacks.push(callback);
    return () => {
      this.callbacks = this.metricsCallbacks.filter(cb => cb !== callback);
    };
  }
  
  /**
   * 订阅错误
   */
  onError(callback: (error: RequestError, record: APIRecord) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }
  
  private notifyMetricsCallbacks(): void {
    this.metricsCallbacks.forEach(cb => cb(this.globalMetrics));
  }
  
  // --------------------------------------------------------------------------
  // 上报
  // --------------------------------------------------------------------------
  
  /**
   * 上报监控数据
   */
  async report(): Promise<void> {
    const data = {
      globalMetrics: this.globalMetrics,
      endpointMetrics: Object.fromEntries(this.endpointMetrics),
      recentRecords: this.records.slice(-100),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
    
    // 可以发送到监控服务
    logger.debug('[APIMonitor] Report', data);
    
    // ⏸️ 监控服务接入预留
    // 如需接入实际监控服务（如 Sentry、FunDebug 等），在此处调用：
    // await fetch('/api/monitor/report', { method: 'POST', body: JSON.stringify(data) });
  }
  
  // --------------------------------------------------------------------------
  // 控制
  // --------------------------------------------------------------------------
  
  enable(): void {
    this.enabled = true;
  }
  
  disable(): void {
    this.enabled = false;
  }
  
  reset(): void {
    this.globalMetrics = this.initMetrics();
    this.endpointMetrics.clear();
    this.records = [];
  }
}

// ============================================================================
// 导出
// ============================================================================

export const apiMonitor = APIMonitor.getInstance();

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export interface UseAPIMetricsOptions {
  /** 是否自动上报 */
  autoReport?: boolean;
  /** 上报间隔(ms) */
  reportInterval?: number;
  /** 端点过滤 */
  endpoint?: string;
}

export interface UseAPIMetricsResult {
  /** 全局指标 */
  globalMetrics: APIMetrics;
  /** 端点指标 */
  endpointMetrics?: APIMetrics;
  /** 最近的调用记录 */
  records: APIRecord[];
  /** 重置统计 */
  reset: () => void;
}

export function useAPIMetrics(options: UseAPIMetricsOptions = {}): UseAPIMetricsResult {
  const { endpoint, autoReport = false, reportInterval = 60000 } = options;
  
  const [globalMetrics, setGlobalMetrics] = useState<APIMetrics>(apiMonitor.getGlobalMetrics());
  const [endpointMetrics, setEndpointMetrics] = useState<APIMetrics | undefined>(
    endpoint ? apiMonitor.getEndpointMetrics(endpoint) : undefined
  );
  const [records, setRecords] = useState<APIRecord[]>(
    endpoint ? apiMonitor.getEndpointRecords(endpoint, 50) : apiMonitor.getRecentRecords(50)
  );
  
  // 订阅指标变化
  useEffect(() => {
    const unsubscribe = apiMonitor.onMetrics((metrics) => {
      setGlobalMetrics({ ...metrics });
    });
    
    return unsubscribe;
  }, []);
  
  // 订阅端点指标变化
  useEffect(() => {
    if (!endpoint) return;
    
    const unsubscribe = apiMonitor.onMetrics(() => {
      setEndpointMetrics(apiMonitor.getEndpointMetrics(endpoint));
      setRecords(apiMonitor.getEndpointRecords(endpoint, 50));
    });
    
    return unsubscribe;
  }, [endpoint]);
  
  // 自动上报
  useEffect(() => {
    if (!autoReport) return;
    
    const interval = setInterval(() => {
      apiMonitor.report();
    }, reportInterval);
    
    return () => clearInterval(interval);
  }, [autoReport, reportInterval]);
  
  const reset = useCallback(() => {
    apiMonitor.reset();
    setGlobalMetrics(apiMonitor.getGlobalMetrics());
    if (endpoint) {
      setEndpointMetrics(undefined);
      setRecords([]);
    } else {
      setRecords([]);
    }
  }, [endpoint]);
  
  return {
    globalMetrics,
    endpointMetrics,
    records,
    reset,
  };
}
