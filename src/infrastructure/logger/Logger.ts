/**
 * Logger - 日志系统
 * 
 * 支持多级别日志、分类日志、格式化输出
 */

import { platform } from '../../platform/adapters';

// ============================================================================
// 日志级别
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export const LogLevelName: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

// ============================================================================
// 日志配置
// ============================================================================

export interface LoggerConfig {
  /** 最小日志级别 */
  level: LogLevel;
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否发送到远程 */
  remote: boolean;
  /** 远程端点 */
  remoteEndpoint?: string;
  /** 日志分类 */
  categories?: string[];
  /** 是否包含时间戳 */
  timestamp: boolean;
  /** 是否包含调用位置 */
  caller: boolean;
  /** 日志格式化 */
  formatter?: (log: LogMessage) => string;
}

export interface LogMessage {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 分类 */
  category?: string;
  /** 额外数据 */
  data?: any;
  /** 调用位置 */
  caller?: {
    file: string;
    line: number;
    column: number;
  };
  /** 时间戳 */
  timestamp: number;
  /** 用户信息 */
  userId?: string;
  /** 会话 ID */
  sessionId?: string;
}

// ============================================================================
// 日志器
// ============================================================================

export class Logger {
  private static instance: Logger;
  
  private config: LoggerConfig;
  private logs: LogMessage[] = [];
  private maxLogs = 1000;
  
  // 分类日志器
  private categoryLoggers = new Map<string, Logger>();
  
  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      console: true,
      remote: false,
      timestamp: true,
      caller: true,
      ...config,
    };
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  // --------------------------------------------------------------------------
  // 配置方法
  // --------------------------------------------------------------------------
  
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  enableRemote(endpoint: string): void {
    this.config.remote = true;
    this.config.remoteEndpoint = endpoint;
  }
  
  disableRemote(): void {
    this.config.remote = false;
    this.config.remoteEndpoint = undefined;
  }
  
  // --------------------------------------------------------------------------
  // 分类日志器
  // --------------------------------------------------------------------------
  
  getLogger(category: string): Logger {
    if (!this.categoryLoggers.has(category)) {
      const categoryLogger = new Logger({
        ...this.config,
        category,
      });
      this.categoryLoggers.set(category, categoryLogger);
    }
    return this.categoryLoggers.get(category)!;
  }
  
  // --------------------------------------------------------------------------
  // 日志方法
  // --------------------------------------------------------------------------
  
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }
  
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
  
  fatal(message: string, data?: any): void {
    this.log(LogLevel.FATAL, message, data);
  }
  
  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------
  
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查级别
    if (level < this.config.level) return;
    
    // 构造日志消息
    const logMessage: LogMessage = {
      level,
      message,
      category: (this.config as any).category,
      data,
      timestamp: Date.now(),
    };
    
    // 添加调用位置
    if (this.config.caller) {
      logMessage.caller = this.getCaller();
    }
    
    // 保存到日志队列
    this.logs.push(logMessage);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // 输出到控制台
    if (this.config.console) {
      this.outputToConsole(logMessage);
    }
    
    // 发送到远程
    if (this.config.remote && this.config.remoteEndpoint) {
      this.sendToRemote(logMessage);
    }
  }
  
  private outputToConsole(log: LogMessage): void {
    const prefix = this.formatPrefix(log);
    const message = this.formatMessage(log);
    
    switch (log.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message);
        break;
      case LogLevel.INFO:
        console.info(prefix, message);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(prefix, message);
        break;
    }
  }
  
  private formatPrefix(log: LogMessage): string {
    const parts: string[] = [];
    
    // 时间戳
    if (this.config.timestamp) {
      parts.push(`[${new Date(log.timestamp).toISOString()}]`);
    }
    
    // 级别
    parts.push(`[${LogLevelName[log.level]}]`);
    
    // 分类
    if (log.category) {
      parts.push(`[${log.category}]`);
    }
    
    return parts.join(' ');
  }
  
  private formatMessage(log: LogMessage): string {
    if (this.config.formatter) {
      return this.config.formatter(log);
    }
    
    let msg = log.message;
    
    // 添加调用位置
    if (log.caller) {
      msg += ` (${log.caller.file}:${log.caller.line})`;
    }
    
    // 添加额外数据
    if (log.data !== undefined) {
      msg += ` ${JSON.stringify(log.data)}`;
    }
    
    return msg;
  }
  
  private getCaller(): { file: string; line: number; column: number } | undefined {
    try {
      const error = new Error();
      const stack = error.stack?.split('\n');
      
      if (stack && stack.length >= 4) {
        const callerLine = stack[3];
        const match = callerLine.match(/at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)/);
        
        if (match) {
          return {
            file: match[2].split('/').pop() || match[2],
            line: parseInt(match[3], 10),
            column: parseInt(match[4], 10),
          };
        }
      }
    } catch (e) {
      // ignore
    }
    
    return undefined;
  }
  
  private async sendToRemote(log: LogMessage): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });
    } catch (e) {
      console.error('Failed to send log to remote:', e);
    }
  }
  
  // --------------------------------------------------------------------------
  // 工具方法
  // --------------------------------------------------------------------------
  
  getLogs(level?: LogLevel): LogMessage[] {
    if (level === undefined) return [...this.logs];
    return this.logs.filter(log => log.level >= level);
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// ============================================================================
// 导出便捷函数
// ============================================================================

export const logger = Logger.getInstance();

// 便捷分类日志器
export const createLogger = (category: string) => logger.getLogger(category);

// 常用日志器
export const apiLogger = logger.getLogger('API');
export const authLogger = logger.getLogger('Auth');
export const bizLogger = logger.getLogger('Business');
export const errorLogger = logger.getLogger('Error');
