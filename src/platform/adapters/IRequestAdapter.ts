/**
 * Platform Adapter - 请求适配器接口定义
 * 定义跨平台统一的请求接口
 */

// ============================================================================
// 请求配置
// ============================================================================

export interface RequestConfig {
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求超时时间(ms) */
  timeout?: number;
  /** 是否携带凭证 */
  withCredentials?: boolean;
  /** 响应类型 */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}

export interface RequestInterceptor {
  /** 请求拦截 */
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  /** 请求错误拦截 */
  onRequestError?: (error: any) => any;
}

export interface ResponseInterceptor<T = any> {
  /** 响应成功拦截 */
  onResponse?: (response: T) => T | Promise<T>;
  /** 响应错误拦截 */
  onResponseError?: (error: RequestError) => any;
}

// ============================================================================
// 响应格式
// ============================================================================

export interface BaseResponse<T = any> {
  /** 状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 请求 ID */
  requestId?: string;
  /** 时间戳 */
  timestamp?: number;
}

export interface PaginatedResponse<T = any> extends BaseResponse<T> {
  data: {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface ListResponse<T = any> extends BaseResponse<T> {
  data: T[];
}

// ============================================================================
// 错误类型
// ============================================================================

export class RequestError extends Error {
  constructor(
    message: string,
    public code: number,
    public statusCode?: number,
    public response?: any,
    public config?: RequestConfig
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

export enum ErrorCode {
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // 业务错误
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  
  // 客户端错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// 请求适配器接口
// ============================================================================

export interface IRequestAdapter {
  /** GET 请求 */
  get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<BaseResponse<T>>;
  
  /** POST 请求 */
  post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>>;
  
  /** PUT 请求 */
  put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>>;
  
  /** DELETE 请求 */
  delete<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<BaseResponse<T>>;
  
  /** PATCH 请求 */
  patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>>;
  
  /** 文件上传 */
  upload<T = any>(
    url: string,
    file: File | Blob,
    name?: string,
    onProgress?: (percent: number) => void
  ): Promise<BaseResponse<T>>;
  
  /** 文件下载 */
  download(
    url: string,
    onProgress?: (percent: number) => void
  ): Promise<Blob>;
  
  /** 设置请求拦截器 */
  setInterceptors(
    requestInterceptor: RequestInterceptor,
    responseInterceptor: ResponseInterceptor
  ): void;
  
  /** 设置认证令牌 */
  setAuthToken(token: string | null): void;
  
  /** 取消请求 */
  cancelRequest(requestId: string): void;
  
  /** 取消所有请求 */
  cancelAllRequests(): void;
}

// ============================================================================
// 工厂函数接口
// ============================================================================

export interface IRequestAdapterFactory {
  /** 创建请求适配器 */
  create(config?: RequestAdapterConfig): IRequestAdapter;
}

export interface RequestAdapterConfig {
  /** 基础 URL */
  baseURL?: string;
  /** 默认超时时间 */
  timeout?: number;
  /** 请求拦截器 */
  requestInterceptor?: RequestInterceptor;
  /** 响应拦截器 */
  responseInterceptor?: ResponseInterceptor;
  /** 错误处理器 */
  errorHandler?: (error: RequestError) => void;
  /** 重试次数 */
  retry?: number;
  /** 重试延迟 */
  retryDelay?: number;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  BaseResponse,
  PaginatedResponse,
  ListResponse,
  RequestAdapterConfig,
};

export { RequestError, ErrorCode };
