/**
 * 统一API调用层
 * 
 * 特性：
 * - 统一的错误处理
 * - 请求/响应拦截器
 * - 自动Token刷新
 * - API限流
 */

import app from '@/config/tcb';

// ============================================================================
// 类型定义
// ============================================================================

export interface ApiError {
  code: number
  message: string
  details?: any
}

export interface ApiRequest<T = any> {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: T
  headers?: Record<string, string>
  timeout?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
}

// ============================================================================
// API限流器
// ============================================================================

interface RateLimitConfig {
  maxRequests: number // 时间窗口内最大请求数
  windowMs: number // 时间窗口（毫秒）
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config
  }

  /**
   * 检查是否允许请求
   */
  canRequest(key: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []
    
    // 清理过期时间戳
    const validTimestamps = timestamps.filter(t => now - t < this.config.windowMs)
    
    if (validTimestamps.length >= this.config.maxRequests) {
      return false
    }

    validTimestamps.push(now)
    this.requests.set(key, validTimestamps)
    return true
  }

  /**
   * 获取剩余请求数
   */
  getRemaining(key: string): number {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []
    const validTimestamps = timestamps.filter(t => now - t < this.config.windowMs)
    return Math.max(0, this.config.maxRequests - validTimestamps.length)
  }

  /**
   * 获取重试等待时间（毫秒）
   */
  getRetryAfter(key: string): number {
    const now = Date.now()
    const timestamps = this.requests.get(key) || []
    const validTimestamps = timestamps.filter(t => now - t < this.config.windowMs)
    
    if (validTimestamps.length === 0) return 0
    
    const oldest = Math.min(...validTimestamps)
    return Math.max(0, this.config.windowMs - (now - oldest))
  }
}

// 全局限流器实例
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 每分钟100次请求
  windowMs: 60000
})

// ============================================================================
// 请求拦截器
// ============================================================================

type InterceptorFn<T> = (data: T) => T | Promise<T>

interface Interceptors {
  request: InterceptorFn<ApiRequest>[]
  response: InterceptorFn<ApiResponse>[]
}

const interceptors: Interceptors = {
  request: [],
  response: []
}

/**
 * 添加请求拦截器
 */
export function addRequestInterceptor(fn: InterceptorFn<ApiRequest>): () => void {
  interceptors.request.push(fn)
  return () => {
    const index = interceptors.request.indexOf(fn)
    if (index > -1) interceptors.request.splice(index, 1)
  }
}

/**
 * 添加响应拦截器
 */
export function addResponseInterceptor(fn: InterceptorFn<ApiResponse>): () => void {
  interceptors.response.push(fn)
  return () => {
    const index = interceptors.response.indexOf(fn)
    if (index > -1) interceptors.response.splice(index, 1)
  }
}

// ============================================================================
// 统一API调用
// ============================================================================

class ApiClient {
  private baseUrl = ''
  private timeout = 30000

  /**
   * 设置基础URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  /**
   * 设置默认超时
   */
  setTimeout(ms: number): void {
    this.timeout = ms
  }

  /**
   * 核心请求方法
   */
  async request<T = any>(config: ApiRequest): Promise<ApiResponse<T>> {
    const { url, method = 'GET', data, headers = {}, timeout = this.timeout } = config
    
    // 应用请求拦截器
    let processedConfig = { url, method, data, headers, timeout }
    for (const interceptor of interceptors.request) {
      processedConfig = await interceptor(processedConfig) as typeof processedConfig
    }

    const fullUrl = this.baseUrl ? `${this.baseUrl}${url}` : url
    const startTime = performance.now()

    try {
      // 检查限流
      const rateLimitKey = `${method}:${url}`
      if (!apiRateLimiter.canRequest(rateLimitKey)) {
        const retryAfter = apiRateLimiter.getRetryAfter(rateLimitKey)
        throw new Error(`请求过于频繁，请 ${Math.ceil(retryAfter / 1000)} 秒后重试`)
      }

      // 构建请求选项
      const options: RequestInit = {
        method: processedConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...processedConfig.headers
        }
      }

      if (processedConfig.data && ['POST', 'PUT'].includes(processedConfig.method)) {
        options.body = JSON.stringify(processedConfig.data)
      }

      // 添加超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      options.signal = controller.signal

      // 发送请求
      const response = await fetch(fullUrl, options)
      clearTimeout(timeoutId)

      // 解析响应
      let responseData: T
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text() as any
      }

      const duration = performance.now() - startTime
      console.log(`[API] ${method} ${url} - ${response.status} (${duration.toFixed(0)}ms)`)

      const result: ApiResponse<T> = response.ok
        ? { success: true, data: responseData }
        : { 
            success: false, 
            error: { 
              code: response.status, 
              message: (responseData as any)?.message || response.statusText 
            } 
          }

      // 应用响应拦截器
      for (const interceptor of interceptors.response) {
        return await interceptor(result) as ApiResponse<T>
      }

      return result

    } catch (error: any) {
      const duration = performance.now() - startTime
      console.error(`[API] ${method} ${url} - ERROR (${duration.toFixed(0)}ms)`, error.message)

      return {
        success: false,
        error: {
          code: error.name === 'AbortError' ? 408 : 500,
          message: error.message || '网络请求失败'
        }
      }
    }
  }

  /**
   * GET请求
   */
  get<T = any>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const queryString = params 
      ? '?' + new URLSearchParams(params).toString() 
      : ''
    return this.request<T>({ url: url + queryString, method: 'GET' })
  }

  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', data })
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', data })
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE' })
  }
}

// 导出API客户端实例
export const apiClient = new ApiClient()

// ============================================================================
// 云函数调用封装
// ============================================================================

interface CloudFunctionOptions {
  name: string
  data?: any
  timeout?: number
}

export async function callCloudFunction<T = any>(
  options: CloudFunctionOptions
): Promise<ApiResponse<T>> {
  const { name, data = {}, timeout = 30000 } = options
  
  const startTime = performance.now()

  try {
    // 检查限流
    const rateLimitKey = `function:${name}`
    if (!apiRateLimiter.canRequest(rateLimitKey)) {
      const retryAfter = apiRateLimiter.getRetryAfter(rateLimitKey)
      throw new Error(`云函数调用过于频繁，请 ${Math.ceil(retryAfter / 1000)} 秒后重试`)
    }

    const result = await app.callFunction({
      name,
      data,
      timeout
    })

    const duration = performance.now() - startTime
    console.log(`[CloudFunction] ${name} (${duration.toFixed(0)}ms)`, result.result)

    // 标准化响应格式
    if (result.result?.success !== undefined) {
      return {
        success: result.result.success,
        data: result.result.data,
        error: result.result.error ? {
          code: result.result.code || -1,
          message: result.result.error
        } : undefined
      }
    }

    return {
      success: true,
      data: result.result as T
    }

  } catch (error: any) {
    const duration = performance.now() - startTime
    console.error(`[CloudFunction] ${name} ERROR (${duration.toFixed(0)}ms)`, error.message)

    return {
      success: false,
      error: {
        code: error.code || -1,
        message: error.message || '云函数调用失败'
      }
    }
  }
}

// ============================================================================
// 默认拦截器
// ============================================================================

// 添加Token自动附加拦截器
addRequestInterceptor((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    }
  }
  return config
})

// 添加错误日志拦截器
addResponseInterceptor((response) => {
  if (!response.success) {
    console.error('[API Error]', response.error)
  }
  return response
})

export default apiClient
