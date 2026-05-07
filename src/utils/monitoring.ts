/**
 * 日志监控服务
 * 用于生产环境错误收集和性能监控
 */

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 日志配置
interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  tags?: Record<string, string>;
}

// 默认配置
const defaultConfig: LogConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: false,
};

let config: LogConfig = { ...defaultConfig };

/**
 * 初始化日志服务
 */
export function initLogger(userConfig?: Partial<LogConfig>): void {
  config = { ...defaultConfig, ...userConfig };
  
  if (config.enableRemote && config.remoteEndpoint) {
    console.log('Logger initialized with remote endpoint:', config.remoteEndpoint);
  }
}

/**
 * 格式化日志消息
 */
function formatLog(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  
  return JSON.stringify({
    timestamp,
    level: levelName,
    message,
    data,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    tags: config.tags,
  });
}

/**
 * 发送远程日志
 */
async function sendRemoteLog(logMessage: string): Promise<void> {
  if (!config.enableRemote || !config.remoteEndpoint) {
    return;
  }

  try {
    await fetch(config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: logMessage,
    });
  } catch (error) {
    console.error('Failed to send remote log:', error);
  }
}

/**
 * 记录日志
 */
export function log(level: LogLevel, message: string, data?: any): void {
  if (level < config.level) {
    return;
  }

  const logMessage = formatLog(level, message, data);

  // 控制台输出
  if (config.enableConsole) {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, data);
        break;
      case LogLevel.INFO:
        console.info(message, data);
        break;
      case LogLevel.WARN:
        console.warn(message, data);
        break;
      case LogLevel.ERROR:
        console.error(message, data);
        break;
    }
  }

  // 远程发送
  if (config.enableRemote) {
    sendRemoteLog(logMessage);
  }
}

// 便捷方法
export const logger = {
  debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => log(LogLevel.WARN, message, data),
  error: (message: string, data?: any) => log(LogLevel.ERROR, message, data),
};

/**
 * 性能监控
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Array<{
    name: string;
    duration: number;
    startTime: number;
  }> = [];

  /**
   * 记录性能标记
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined' && 'mark' in performance) {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  /**
   * 测量两个标记之间的性能
   */
  measure(name: string, startMark: string, endMark?: string): number {
    if (typeof performance === 'undefined' || !('measure' in performance)) {
      return 0;
    }

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const entries = performance.getEntriesByName(name);
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        this.measures.push({
          name,
          duration,
          startTime: performance.now(),
        });
        return duration;
      }
    } catch (error) {
      logger.error('Performance measure failed', error);
    }

    return 0;
  }

  /**
   * 获取所有性能指标
   */
  getMeasures(): Array<{ name: string; duration: number }> {
    return this.measures;
  }

  /**
   * 上报性能数据
   */
  report(): void {
    if (!config.enableRemote) {
      return;
    }

    const reportData = {
      type: 'performance',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      measures: this.measures,
      navigationTiming: this.getNavigationTiming(),
      resourceTiming: this.getResourceTiming(),
    };

    sendRemoteLog(JSON.stringify(reportData));
  }

  private getNavigationTiming(): any {
    if (typeof performance === 'undefined' || !('getEntriesByType' in performance)) {
      return null;
    }

    const [navigation] = performance.getEntriesByType('navigation');
    return navigation || null;
  }

  private getResourceTiming(): any[] {
    if (typeof performance === 'undefined' || !('getEntriesByType' in performance)) {
      return [];
    }

    return performance.getEntriesByType('resource') as any[];
  }
}

// 全局性能监控实例
export const perfMonitor = new PerformanceMonitor();

/**
 * 错误收集
 */
export class ErrorCollector {
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: string;
    userAgent: string;
    url: string;
  }> = [];

  /**
   * 收集错误
   */
  collect(error: Error | string, source?: string): void {
    const errorInfo = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      source,
    };

    this.errors.push(errorInfo);
    logger.error(`[${source || 'Unknown'}] ${errorInfo.message}`, errorInfo);

    // 上报到远程
    if (config.enableRemote) {
      sendRemoteLog(JSON.stringify({
        type: 'error',
        ...errorInfo,
      }));
    }
  }

  /**
   * 获取所有收集的错误
   */
  getErrors(): Array<any> {
    return this.errors;
  }

  /**
   * 清除错误记录
   */
  clear(): void {
    this.errors = [];
  }
}

// 全局错误收集实例
export const errorCollector = new ErrorCollector();

/**
 * 全局错误处理
 */
export function setupGlobalErrorHandlers(): void {
  // 监听未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault();
    errorCollector.collect(
      event.reason?.message || event.reason || 'Unhandled Promise Rejection',
      'unhandledrejection'
    );
  });

  // 监听全局错误
  window.addEventListener('error', (event) => {
    errorCollector.collect(
      event.error?.message || event.message || 'Unknown Error',
      'window.onerror'
    );
  });

  logger.info('Global error handlers initialized');
}

// 初始化
if (typeof window !== 'undefined') {
  setupGlobalErrorHandlers();
}
