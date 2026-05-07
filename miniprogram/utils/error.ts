// utils/error.ts
// 统一错误处理工具

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',      // 网络错误
  BUSINESS = 'BUSINESS',     // 业务错误
  VALIDATION = 'VALIDATION', // 验证错误
  UNKNOWN = 'UNKNOWN'        // 未知错误
}

/**
 * 错误信息配置
 */
const ERROR_MESSAGES: Record<ErrorType, Record<string, string>> = {
  [ErrorType.NETWORK]: {
    timeout: '网络请求超时，请检查网络连接',
    refused: '网络连接被拒绝，请稍后重试',
    unavailable: '网络不可用，请检查网络设置'
  },
  [ErrorType.BUSINESS]: {
    unauthorized: '登录已过期，请重新登录',
    forbidden: '无权访问此资源',
    notFound: '请求的资源不存在',
    serverError: '服务器错误，请稍后重试'
  },
  [ErrorType.VALIDATION]: {
    phone: '请输入正确的手机号',
    email: '请输入正确的邮箱地址',
    name: '姓名格式不正确',
    idCard: '身份证号格式不正确',
    required: '此项为必填项'
  },
  [ErrorType.UNKNOWN]: {
    default: '操作失败，请稍后重试'
  }
}

/**
 * AppError 错误类
 */
export class AppError extends Error {
  type: ErrorType
  code?: string
  isOperational: boolean

  constructor(type: ErrorType, message?: string, code?: string) {
    super(message || ERROR_MESSAGES[type].default)
    this.type = type
    this.code = code
    this.isOperational = true
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 解析错误类型
 */
export function parseError(error: any): { type: ErrorType; message: string; code?: string } {
  // 已经是 AppError
  if (error instanceof AppError) {
    return { type: error.type, message: error.message, code: error.code }
  }

  // 网络错误
  if (error.errMsg?.includes('timeout') || error.errMsg?.includes('超时')) {
    return { type: ErrorType.NETWORK, message: ERROR_MESSAGES[ErrorType.NETWORK].timeout }
  }
  if (error.errMsg?.includes('ECONNREFUSED') || error.statusCode === 502) {
    return { type: ErrorType.NETWORK, message: ERROR_MESSAGES[ErrorType.NETWORK].refused }
  }
  if (!wx.getNetworkType || wx.getNetworkType().networkType === 'none') {
    return { type: ErrorType.NETWORK, message: ERROR_MESSAGES[ErrorType.NETWORK].unavailable }
  }

  // HTTP 状态码错误
  if (error.statusCode) {
    if (error.statusCode === 401) {
      return { type: ErrorType.BUSINESS, message: ERROR_MESSAGES[ErrorType.BUSINESS].unauthorized, code: '401' }
    }
    if (error.statusCode === 403) {
      return { type: ErrorType.BUSINESS, message: ERROR_MESSAGES[ErrorType.BUSINESS].forbidden, code: '403' }
    }
    if (error.statusCode === 404) {
      return { type: ErrorType.BUSINESS, message: ERROR_MESSAGES[ErrorType.BUSINESS].notFound, code: '404' }
    }
    if (error.statusCode >= 500) {
      return { type: ErrorType.BUSINESS, message: ERROR_MESSAGES[ErrorType.BUSINESS].serverError, code: String(error.statusCode) }
    }
  }

  // 业务逻辑错误（从 result 中解析）
  if (error.result?.error) {
    const errorMsg = error.result.error
    if (errorMsg.includes('未登录') || errorMsg.includes('登录')) {
      return { type: ErrorType.BUSINESS, message: ERROR_MESSAGES[ErrorType.BUSINESS].unauthorized }
    }
    return { type: ErrorType.BUSINESS, message: errorMsg }
  }

  // 未知错误
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || error.errMsg || ERROR_MESSAGES[ErrorType.UNKNOWN].default
  }
}

/**
 * 显示错误 Toast
 */
export function showError(error: any): void {
  const { message } = parseError(error)
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2500
  })
}

/**
 * 检查网络状态
 */
export function checkNetwork(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 监听网络状态变化
 */
export function onNetworkChange(callback: (isConnected: boolean) => void): void {
  wx.onNetworkStatusChange((res) => {
    callback(res.isConnected)
  })
}
