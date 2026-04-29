// 统一日志工具
// 生产环境自动静默 DEBUG 级日志

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development'
const LOG_LEVEL: LogLevel = isDev ? 'DEBUG' : 'WARN'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[LOG_LEVEL]
}

export const logger = {
  debug(...args: any[]) {
    if (shouldLog('DEBUG')) {
      console.log('[DEBUG]', ...args)
    }
  },
  
  info(...args: any[]) {
    if (shouldLog('INFO')) {
      console.info('[INFO]', ...args)
    }
  },
  
  warn(...args: any[]) {
    if (shouldLog('WARN')) {
      console.warn('[WARN]', ...args)
    }
  },
  
  error(...args: any[]) {
    if (shouldLog('ERROR')) {
      console.error('[ERROR]', ...args)
    }
  },
  
  // 用于性能追踪，生产环境也保留
  time(label: string) {
    console.time(label)
  },
  
  timeEnd(label: string) {
    console.timeEnd(label)
  },
  
  // 分组日志，仅开发环境
  group(label: string, ...args: any[]) {
    if (isDev) {
      console.group(label)
      args.forEach(arg => console.log(arg))
      console.groupEnd()
    }
  }
}

export default logger