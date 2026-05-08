/**
 * Platform Context - 平台上下文
 * 
 * 提供统一的平台服务单例
 */

import { WebRequestAdapter } from './adapters/WebRequestAdapter';
import { LocalStorageAdapter, MemoryStorageAdapter } from './adapters/StorageAdapter';
import type { IRequestAdapter } from './adapters/IRequestAdapter';
import type { IStorageAdapter } from './adapters/IStorageAdapter';
import type { IRouterAdapter } from './adapters/IRouterAdapter';

export interface PlatformContextConfig {
  /** API 基础地址 */
  apiBaseURL?: string;
  /** 默认请求头 */
  defaultHeaders?: Record<string, string>;
  /** 存储前缀 */
  storagePrefix?: string;
}

class PlatformContextImpl {
  private static instance: PlatformContextImpl;
  
  private _requestAdapter: IRequestAdapter | null = null;
  private _storageAdapter: IStorageAdapter | null = null;
  private _memoryAdapter: IStorageAdapter | null = null;
  private _routerAdapter: IRouterAdapter | null = null;
  private _config: PlatformContextConfig = {};

  private constructor() {
    // 私有构造函数
  }

  static getInstance(): PlatformContextImpl {
    if (!PlatformContextImpl.instance) {
      PlatformContextImpl.instance = new PlatformContextImpl();
    }
    return PlatformContextImpl.instance;
  }

  /**
   * 初始化平台上下文
   */
  init(config: PlatformContextConfig = {}): void {
    this._config = { ...this._config, ...config };
    
    // 初始化请求适配器
    if (!this._requestAdapter) {
      this._requestAdapter = new WebRequestAdapter(
        this._config.apiBaseURL,
        this._config.defaultHeaders
      );
    }

    // 初始化存储适配器
    if (!this._storageAdapter) {
      this._storageAdapter = new LocalStorageAdapter(this._config.storagePrefix);
    }

    // 初始化内存存储适配器
    if (!this._memoryAdapter) {
      this._memoryAdapter = new MemoryStorageAdapter();
    }
  }

  /**
   * 获取请求适配器
   */
  get request(): IRequestAdapter {
    if (!this._requestAdapter) {
      this.init();
    }
    return this._requestAdapter!;
  }

  /**
   * 获取存储适配器
   */
  get storage(): IStorageAdapter {
    if (!this._storageAdapter) {
      this.init();
    }
    return this._storageAdapter!;
  }

  /**
   * 获取内存存储适配器（临时数据）
   */
  get memory(): IStorageAdapter {
    if (!this._memoryAdapter) {
      this._memoryAdapter = new MemoryStorageAdapter();
    }
    return this._memoryAdapter!;
  }

  /**
   * 获取路由适配器
   */
  get router(): IRouterAdapter {
    if (!this._routerAdapter) {
      // 默认实现
      this._routerAdapter = this.createWebRouterAdapter();
    }
    return this._routerAdapter;
  }

  /**
   * 创建 Web 路由适配器
   */
  private createWebRouterAdapter(): IRouterAdapter {
    return {
      getCurrentRoute() {
        const { pathname, search } = window.location;
        const params: Record<string, string> = {};
        const query: Record<string, string> = {};
        
        // 解析路径参数（简单实现）
        const pathSegments = pathname.split('/').filter(Boolean);
        pathSegments.forEach((segment, index) => {
          if (segment.match(/^\d+$/)) {
            params[`param${index}`] = segment;
          }
        });
        
        // 解析查询参数
        if (search) {
          const urlParams = new URLSearchParams(search);
          urlParams.forEach((value, key) => {
            query[key] = value;
          });
        }

        return { pathname, params, query };
      },

      push(config) {
        const { path, params, query, replace } = config;
        let url = path;
        
        // 替换路径参数
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, String(value));
          });
        }
        
        // 添加查询参数
        if (query && Object.keys(query).length > 0) {
          const queryString = new URLSearchParams(
            query as Record<string, string>
          ).toString();
          url += `?${queryString}`;
        }

        if (replace) {
          window.history.replaceState(null, '', url);
        } else {
          window.history.pushState(null, '', url);
        }
        
        // 触发路由变化事件
        window.dispatchEvent(new PopStateEvent('popstate'));
      },

      replace(config) {
        this.push({ ...config, replace: true });
      },

      back() {
        window.history.back();
      },

      forward() {
        window.history.forward();
      },

      onRouteChange(callback) {
        const handler = () => callback(this.getCurrentRoute());
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
      },
    };
  }

  /**
   * 获取环境信息
   */
  getEnv(): Record<string, string> {
    return {
      mode: import.meta.env.MODE,
      baseURL: import.meta.env.VITE_API_BASE_URL || '',
      appVersion: import.meta.env.VITE_APP_VERSION || '',
      buildTime: import.meta.env.VITE_BUILD_TIME || '',
    };
  }
}

// 导出单例
export const PlatformContext = PlatformContextImpl.getInstance();

// 便捷导出
export const { request, storage, memory, router, getEnv } = PlatformContext;
