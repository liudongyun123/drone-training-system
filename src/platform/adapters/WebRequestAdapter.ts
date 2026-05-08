/**
 * Web Request Adapter - Web 端请求适配器实现
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  IRequestAdapter,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  BaseResponse,
  RequestError,
  ErrorCode,
  RequestAdapterConfig,
} from './IRequestAdapter';

// 取消请求管理器
class CancelManager {
  private pendingRequests = new Map<string, AbortController>();

  createRequestId(url: string, method: string): string {
    return `${method}:${url}:${Date.now()}`;
  }

  add(requestId: string, controller: AbortController): void {
    this.pendingRequests.set(requestId, controller);
  }

  remove(requestId: string): void {
    const controller = this.pendingRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestId);
    }
  }

  cancelAll(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }
}

// Web 请求适配器
export class WebRequestAdapter implements IRequestAdapter {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private cancelManager = new CancelManager();

  constructor(config?: RequestAdapterConfig) {
    this.client = axios.create({
      baseURL: config?.baseURL || import.meta.env.VITE_API_BASE_URL || '',
      timeout: config?.timeout || 30000,
      withCredentials: true,
      responseType: 'json',
      ...config,
    });

    // 设置默认拦截器
    this.setupDefaultInterceptors();
    
    // 设置自定义拦截器
    if (config?.requestInterceptor || config?.responseInterceptor) {
      this.setInterceptors(
        config.requestInterceptor || {},
        config.responseInterceptor || {}
      );
    }

    // 设置错误处理
    if (config?.errorHandler) {
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          config.errorHandler!(this.normalizeError(error));
          return Promise.reject(error);
        }
      );
    }
  }

  private setupDefaultInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证令牌
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        // 添加时间戳防止缓存
        config.params = {
          ...config.params,
          _t: Date.now(),
        };
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // 处理取消请求
        if (axios.isCancel(error)) {
          throw new RequestError(
            '请求已取消',
            ErrorCode.CANCELLED,
            0,
            null,
            error.config
          );
        }
        throw this.normalizeError(error);
      }
    );
  }

  private normalizeError(error: any): RequestError {
    if (error.response) {
      // 服务器返回错误
      const { status, data } = error.response;
      return new RequestError(
        data?.message || error.message || '请求失败',
        data?.code || status,
        status,
        data,
        error.config
      );
    } else if (error.request) {
      // 网络错误
      return new RequestError(
        '网络连接失败，请检查网络',
        ErrorCode.NETWORK_ERROR,
        0,
        null,
        error.config
      );
    } else {
      // 其他错误
      return new RequestError(
        error.message || '请求配置错误',
        ErrorCode.BAD_REQUEST,
        0,
        null,
        error.config
      );
    }
  }

  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    const requestId = this.cancelManager.createRequestId(url, 'GET');
    const controller = new AbortController();
    this.cancelManager.add(requestId, controller);

    try {
      const response: AxiosResponse<BaseResponse<T>> = await this.client.get(url, {
        params,
        ...config,
        signal: controller.signal,
      });
      return this.normalizeResponse(response);
    } finally {
      this.cancelManager.remove(requestId);
    }
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    const requestId = this.cancelManager.createRequestId(url, 'POST');
    const controller = new AbortController();
    this.cancelManager.add(requestId, controller);

    try {
      const response: AxiosResponse<BaseResponse<T>> = await this.client.post(url, data, {
        ...config,
        signal: controller.signal,
      });
      return this.normalizeResponse(response);
    } finally {
      this.cancelManager.remove(requestId);
    }
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    const requestId = this.cancelManager.createRequestId(url, 'PUT');
    const controller = new AbortController();
    this.cancelManager.add(requestId, controller);

    try {
      const response: AxiosResponse<BaseResponse<T>> = await this.client.put(url, data, {
        ...config,
        signal: controller.signal,
      });
      return this.normalizeResponse(response);
    } finally {
      this.cancelManager.remove(requestId);
    }
  }

  async delete<T = any>(
    url: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    const requestId = this.cancelManager.createRequestId(url, 'DELETE');
    const controller = new AbortController();
    this.cancelManager.add(requestId, controller);

    try {
      const response: AxiosResponse<BaseResponse<T>> = await this.client.delete(url, {
        params,
        ...config,
        signal: controller.signal,
      });
      return this.normalizeResponse(response);
    } finally {
      this.cancelManager.remove(requestId);
    }
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<BaseResponse<T>> {
    const requestId = this.cancelManager.createRequestId(url, 'PATCH');
    const controller = new AbortController();
    this.cancelManager.add(requestId, controller);

    try {
      const response: AxiosResponse<BaseResponse<T>> = await this.client.patch(url, data, {
        ...config,
        signal: controller.signal,
      });
      return this.normalizeResponse(response);
    } finally {
      this.cancelManager.remove(requestId);
    }
  }

  async upload<T = any>(
    url: string,
    file: File | Blob,
    name: string = 'file',
    onProgress?: (percent: number) => void
  ): Promise<BaseResponse<T>> {
    const formData = new FormData();
    formData.append(name, file);

    const response: AxiosResponse<BaseResponse<T>> = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return this.normalizeResponse(response);
  }

  async download(
    url: string,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const response: AxiosResponse<Blob> = await this.client.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  }

  setInterceptors(
    requestInterceptor: RequestInterceptor,
    responseInterceptor: ResponseInterceptor
  ): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      async (config) => {
        if (requestInterceptor.onRequest) {
          return await requestInterceptor.onRequest(config);
        }
        return config;
      },
      (error) => {
        if (requestInterceptor.onRequestError) {
          return requestInterceptor.onRequestError(error);
        }
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      async (response) => {
        if (responseInterceptor.onResponse) {
          return await responseInterceptor.onResponse(response);
        }
        return response;
      },
      (error) => {
        if (responseInterceptor.onResponseError) {
          return responseInterceptor.onResponseError(this.normalizeError(error));
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  cancelRequest(requestId: string): void {
    this.cancelManager.remove(requestId);
  }

  cancelAllRequests(): void {
    this.cancelManager.cancelAll();
  }

  private normalizeResponse<T>(response: AxiosResponse<BaseResponse<T>>): BaseResponse<T> {
    return response.data;
  }
}

// 创建默认实例
export const createWebRequestAdapter = (config?: RequestAdapterConfig): IRequestAdapter => {
  return new WebRequestAdapter(config);
};

// 默认实例
export const webRequestAdapter = new WebRequestAdapter();
