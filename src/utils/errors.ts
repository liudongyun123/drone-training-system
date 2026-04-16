/**
 * 统一的 API 错误类型
 */

export enum ErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',

  // 业务错误
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INVALID_INPUT = 'INVALID_INPUT',
  RESOURCE_LIMIT = 'RESOURCE_LIMIT',

  // CloudBase 特定错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  COLLECTION_NOT_FOUND = 'COLLECTION_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export class AppError extends Error {
  code: ErrorCode
  details?: any
  timestamp: string

  constructor(
    code: ErrorCode,
    message: string,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * CloudBase 错误映射表
 */
const tcbErrorMap: Record<string, ErrorCode> = {
  'PERMISSION_DENIED': ErrorCode.PERMISSION_DENIED,
  'UNAUTHORIZED': ErrorCode.UNAUTHORIZED,
  'DATABASE_ERROR': ErrorCode.DATABASE_ERROR,
  'COLLECTION_NOT_FOUND': ErrorCode.COLLECTION_NOT_FOUND,
  'QUOTA_EXCEEDED': ErrorCode.QUOTA_EXCEEDED,
  'INVALID_PARAM': ErrorCode.INVALID_INPUT,
  'NETWORK_ERROR': ErrorCode.NETWORK_ERROR
}

/**
 * 将 CloudBase 错误转换为应用错误
 */
export function convertTcbError(error: any): AppError {
  if (!error) {
    return new AppError(ErrorCode.UNKNOWN, '未知错误')
  }

  // CloudBase 错误
  if (error.code) {
    const appCode = tcbErrorMap[error.code] || ErrorCode.DATABASE_ERROR
    return new AppError(
      appCode,
      error.message || '数据库操作失败',
      error
    )
  }

  // 网络错误
  if (error.message && error.message.includes('Network')) {
    return new AppError(
      ErrorCode.NETWORK_ERROR,
      '网络连接失败，请检查网络设置'
    )
  }

  // 超时错误
  if (error.message && error.message.includes('timeout')) {
    return new AppError(
      ErrorCode.TIMEOUT,
      '请求超时，请重试'
    )
  }

  // 默认未知错误
  return new AppError(
    ErrorCode.UNKNOWN,
    error.message || '操作失败',
    error
  )
}

/**
 * 获取用户友好的错误消息
 */
export function getErrorMessage(error: AppError | Error | any): string {
  if (error instanceof AppError) {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.UNKNOWN]: '操作失败，请重试',
      [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
      [ErrorCode.TIMEOUT]: '请求超时，请重试',
      [ErrorCode.UNAUTHORIZED]: '未授权，请登录',
      [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
      [ErrorCode.INSUFFICIENT_PERMISSION]: '权限不足',
      [ErrorCode.NOT_FOUND]: '资源不存在',
      [ErrorCode.ALREADY_EXISTS]: '资源已存在',
      [ErrorCode.INVALID_INPUT]: '输入数据无效',
      [ErrorCode.RESOURCE_LIMIT]: '资源数量超出限制',
      [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
      [ErrorCode.COLLECTION_NOT_FOUND]: '数据集合不存在',
      [ErrorCode.PERMISSION_DENIED]: '权限被拒绝',
      [ErrorCode.QUOTA_EXCEEDED]: '配额已用尽'
    }

    return messages[error.code] || error.message
  }

  return error?.message || '操作失败，请重试'
}
