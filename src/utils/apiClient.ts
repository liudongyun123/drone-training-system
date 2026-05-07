/**
 * API 客户端 - 生产环境版本
 * 提供统一的请求/响应拦截、错误处理、请求取消
 */

import { safeAsync, logError, NetworkError } from './errorHandler';

// ============================================================================
// 类型定义
// ============================================================================

interface ApiConfig {
  baseURL: string;
  timeout: number;
  retry: number;
  retryDelay: number;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retry?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

// ============================================================================
// 默认配置
// ============================================================================

const defaultConfig: ApiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  retry: 3,
  retryDelay: 1000,
};

// ============================================================================
// 请求拦截器
// ============================================================================

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;

const requestInterceptors: RequestInterceptor[] = [
  // 添加认证 token
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    return config;
  },
  // 添加 Content-Type
  (config) => {
    if (!config.headers || typeof config.headers === 'string') {
      config.headers = {
        'Content-Type': 'application/json',
        ...(typeof config.headers === 'string' ? {} : config.headers),
      };
    } else {
      config.headers = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
    }
    return config;
  },
];

// ============================================================================
// 响应拦截器
// ============================================================================

type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

const responseInterceptors: ResponseInterceptor[] = [
  // 检查响应状态
  async (response) => {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    return response;
  },
];

// ============================================================================
// 核心请求函数
// ============================================================================

/**
 * 构建 URL（添加查询参数）
 */
function buildUrl(url: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return url;
  
  const urlObj = new URL(url, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlObj.searchParams.append(key, String(value));
    }
  });
  
  return urlObj.toString();
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 核心请求函数
 */
async function request<T>(
  method: string,
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const config = { ...defaultConfig, ...options };
  let lastError: Error | null = null;
  
  const attemptRequest = async (attempt: number): Promise<ApiResponse<T>> => {
    try {
      // 应用请求拦截器
      let requestConfig = {
        method,
        headers: options.headers || {},
        body: options.body,
      };
      
      for (const interceptor of requestInterceptors) {
        // @ts-ignore
        requestConfig = await interceptor(requestConfig);
      }
      
      // 构建 URL
      const fullUrl = buildUrl(url.startsWith('http') ? url : `${config.baseURL}${url}`, options.params);
      
      // 创建 AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      
      // 发送请求
      const response = await fetch(fullUrl, {
        ...requestConfig,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 应用响应拦截器
      let processedResponse = response;
      for (const interceptor of responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }
      
      // 解析响应
      const contentType = response.headers.get('content-type');
      let data: T;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }
      
      return {
        success: response.ok,
        data,
        statusCode: response.status,
        error: response.ok ? undefined : response.statusText,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 网络错误或超时，尝试重试
      if (
        config.retry &&
        // @ts-ignore
        attempt < config.retry &&
        (lastError.name === 'AbortError' || lastError.message.includes('network'))
      ) {
        await delay(config.retryDelay * attempt);
        return attemptRequest(attempt + 1);
      }
      
      return {
        success: false,
        error: lastError.message,
        statusCode: 0,
      };
    }
  };
  
  return attemptRequest(1);
}

// ============================================================================
// HTTP 方法
// ============================================================================

export const api = {
  get: <T = any>(url: string, options?: RequestOptions) => 
    request<T>('GET', url, options),
  
  post: <T = any>(url: string, data?: any, options?: RequestOptions) => 
    request<T>('POST', url, { ...options, body: JSON.stringify(data) }),
  
  put: <T = any>(url: string, data?: any, options?: RequestOptions) => 
    request<T>('PUT', url, { ...options, body: JSON.stringify(data) }),
  
  patch: <T = any>(url: string, data?: any, options?: RequestOptions) => 
    request<T>('PATCH', url, { ...options, body: JSON.stringify(data) }),
  
  delete: <T = any>(url: string, options?: RequestOptions) => 
    request<T>('DELETE', url, options),
};

// ============================================================================
// 导出
// ============================================================================

export { request };
export default api;
