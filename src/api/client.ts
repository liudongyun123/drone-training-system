/**
 * API 客户端配置
 * 统一的 HTTP 客户端，包含拦截器、错误处理等功能
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import { showNotification } from '@/utils/notification'
import { refreshAccessToken } from '@/api/modules/auth'

// API 基础配置 - 从环境变量读取或使用默认值
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  // 默认使用当前环境的服务地址
  return 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
}

const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
}

// 生成请求ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// 判断是否需要签名
function needsSignature(method?: string, url?: string): boolean {
  const signRequiredMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  const signRequiredPaths = ['/api/v1/users', '/api/v1/orders', '/api/v1/payments']
  
  if (!method || !url) return false
  if (!signRequiredMethods.includes(method.toUpperCase())) return false
  
  return signRequiredPaths.some(path => url.includes(path))
}

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create(API_CONFIG)

// Token 刷新状态
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

// 订阅 Token 刷新
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

// 通知 Token 刷新完成
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

// 请求拦截器
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 添加 Access Token
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加请求ID
    config.headers = config.headers || {}
    config.headers['X-Request-ID'] = generateRequestId()
    
    // 添加时间戳（防重放攻击）
    const timestamp = Date.now()
    config.headers['X-Timestamp'] = timestamp.toString()
    
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    
    // 统一响应格式处理
    if (data.success === false) {
      // 业务错误
      handleBusinessError(data.error)
      return Promise.reject(new Error(data.error?.message || '操作失败'))
    }
    
    return data
  },
  async (error: AxiosError) => {
    const { response } = error
    
    if (!response) {
      // 网络错误
      showNotification('error', '网络错误，请检查网络连接')
      return Promise.reject(error)
    }
    
    const { status, data } = response as AxiosResponse
    
    // 处理 401 Unauthorized
    if (status === 401) {
      return handleTokenExpired(error.config)
    }
    
    // 处理其他错误
    handleHttpError(status, data)
    
    return Promise.reject(error)
  }
)

// 处理业务错误
function handleBusinessError(error: any) {
  if (!error) return
  
  const { code, message, details } = error
  
  switch (code) {
    case 'AUTH_TOKEN_INVALID':
    case 'AUTH_TOKEN_EXPIRED':
      showNotification('error', '登录已过期，请重新登录')
      useAuthStore.getState().logout()
      window.location.href = '/login'
      break
      
    case 'AUTH_UNAUTHORIZED':
      showNotification('error', '没有权限访问')
      break
      
    case 'USER_NOT_FOUND':
      showNotification('error', '用户不存在')
      break
      
    case 'USER_EMAIL_DUPLICATE':
      showNotification('error', '邮箱已被使用')
      break
      
    case 'VALIDATION_REQUIRED':
    case 'VALIDATION_INVALID_FORMAT':
      if (details && Array.isArray(details)) {
        const messages = details.map((d: any) => d.message).join('; ')
        showNotification('error', messages || '参数验证失败')
      } else {
        showNotification('error', message || '参数验证失败')
      }
      break
      
    case 'RATE_LIMIT_EXCEEDED':
      showNotification('warning', '请求过于频繁，请稍后再试')
      break
      
    default:
      showNotification('error', message || '操作失败')
  }
}

// 处理 HTTP 错误
function handleHttpError(status: number, data: any) {
  switch (status) {
    case 400:
      showNotification('error', data?.error?.message || '请求参数错误')
      break
      
    case 403:
      showNotification('error', '没有权限访问')
      break
      
    case 404:
      showNotification('error', '请求的资源不存在')
      break
      
    case 422:
      showNotification('error', data?.error?.message || '参数验证失败')
      break
      
    case 429:
      showNotification('warning', '请求过于频繁，请稍后再试')
      break
      
    case 500:
      showNotification('error', '服务器内部错误，请稍后再试')
      break
      
    case 503:
      showNotification('error', '服务暂时不可用，请稍后再试')
      break
      
    default:
      showNotification('error', `请求失败: ${status}`)
  }
}

// 处理 Token 过期
async function handleTokenExpired(originalConfig?: InternalAxiosRequestConfig) {
  const refreshToken = localStorage.getItem('refresh_token')

  if (!refreshToken) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    return Promise.reject(new Error('No refresh token'))
  }

  // 正在刷新，加入等待队列
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        if (originalConfig) {
          originalConfig.headers = originalConfig.headers || {}
          originalConfig.headers.Authorization = `Bearer ${token}`
        }
        resolve(apiClient(originalConfig))
      })
    })
  }

  isRefreshing = true

  try {
    // CloudBase 项目使用 CloudBase Auth，此处通过 HTTP API 刷新 Token
    const response = await refreshAccessToken(refreshToken)
    const { access_token, refresh_token: newRefreshToken } = response.data

    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', newRefreshToken)

    // 通知订阅者
    onTokenRefreshed(access_token)

    isRefreshing = false

    // 重试原请求
    if (originalConfig) {
      originalConfig.headers = originalConfig.headers || {}
      originalConfig.headers.Authorization = `Bearer ${access_token}`
      return apiClient(originalConfig)
    }

    return access_token
  } catch (error) {
    isRefreshing = false

    // 刷新失败，跳转登录
    useAuthStore.getState().logout();
    window.location.href = '/login';

    return Promise.reject(error)
  }
}

// 导出 API 客户端
export default apiClient

// 导出工具函数
export { needsSignature }
