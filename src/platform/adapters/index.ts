/**
 * Platform Adapters - 平台适配器模块
 * 
 * 提供跨平台的统一接口抽象：
 * - Request Adapter: 统一 HTTP 请求
 * - Router Adapter: 统一路由操作
 * - Storage Adapter: 统一数据存储
 */

// ============================================================================
// 导出接口
// ============================================================================

export * from './IRequestAdapter';
export * from './IRouterAdapter';
export * from './IStorageAdapter';

// ============================================================================
// 导出实现
// ============================================================================

export { WebRequestAdapter, createWebRequestAdapter, webRequestAdapter } from './WebRequestAdapter';
export { WebStorageAdapter, createStorageAdapter, storageAdapter, memoryCache } from './StorageAdapter';

// ============================================================================
// Platform Context
// ============================================================================

import { IRequestAdapter, IStorageAdapter } from './IRequestAdapter';
import { webRequestAdapter } from './WebRequestAdapter';
import { storageAdapter } from './StorageAdapter';

/**
 * Platform Context - 提供当前平台的适配器实例
 */
export class PlatformContext {
  private static instance: PlatformContext;
  
  private _request: IRequestAdapter;
  private _storage: IStorageAdapter;
  
  private constructor() {
    this._request = webRequestAdapter;
    this._storage = storageAdapter;
  }
  
  static getInstance(): PlatformContext {
    if (!PlatformContext.instance) {
      PlatformContext.instance = new PlatformContext();
    }
    return PlatformContext.instance;
  }
  
  get request(): IRequestAdapter {
    return this._request;
  }
  
  get storage(): IStorageAdapter {
    return this._storage;
  }
  
  // 设置自定义适配器
  setRequestAdapter(adapter: IRequestAdapter): void {
    this._request = adapter;
  }
  
  setStorageAdapter(adapter: IStorageAdapter): void {
    this._storage = adapter;
  }
}

// 导出单例
export const platform = PlatformContext.getInstance();
