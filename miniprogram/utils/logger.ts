/**
 * 日志工具 - 生产环境版本
 * 开发环境显示日志，生产环境关闭日志输出
 */

// 设置为 true 则在开发环境显示日志，生产环境应设为 false
const ENABLE_LOG = true

const formatLog = (tag: string, message: string, data?: any): string => {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const dataStr = data !== undefined ? `, ${JSON.stringify(data)}` : ''
  return `[${time}] [${tag}] ${message}${dataStr}`
}

export const logger = {
  debug(tag: string, message: string, data?: any): void {
    if (ENABLE_LOG) {
      console.log(formatLog(tag, message, data))
    }
  },

  error(tag: string, message: string, error?: any): void {
    if (ENABLE_LOG) {
      const errorStr = error instanceof Error ? error.message : (error ? JSON.stringify(error) : '')
      console.error(formatLog(tag, message, errorStr))
    }
  },

  info(tag: string, message: string, data?: any): void {
    if (ENABLE_LOG) {
      console.log(formatLog(tag, message, data))
    }
  },

  warn(tag: string, message: string, data?: any): void {
    if (ENABLE_LOG) {
      console.warn(formatLog(tag, message, data))
    }
  }
}

export default logger;
