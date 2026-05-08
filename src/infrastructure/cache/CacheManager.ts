/**
 * Cache Manager - 分层缓存管理器
 * 
 * 实现三级缓存：
 * 1. Memory Cache - 最快，页面关闭消失
 * 2. Storage Cache - 较慢，跨页面持久化
 * 3. Remote Cache - 最慢，数据最新
 */

import { ICacheAdapter } from '../../platform/adapters/IStorageAdapter';
import { IRequestAdapter, BaseResponse } from '../../platform/adapters/IRequestAdapter';
import { platform } from '../../platform/adapters';

// ============================================================================
// 缓存配置
// ============================================================================

export interface CacheOptions {
  /** 缓存 key */
  key: string;
  /** 缓存数据获取函数 */
  fetcher: () => Promise<any>;
  /** 缓存时间(ms) */
  ttl?: number;
  /** 是否 stale-while-revalidate */
  staleWhileRevalidate?: boolean;
  /** 是否持久化 */
  persistent?: boolean;
  /** 缓存刷新条件 */
  shouldRefresh?: (data: any) => boolean;
}

export interface CacheConfig {
  /** 默认 TTL */
  defaultTTL: number;
  /** 最大缓存数 */
  maxSize: number;
  /** 缓存前缀 */
  prefix: string;
  /** 是否启用 */
  enabled: boolean;
}

// ============================================================================
// 缓存条目
// ============================================================================

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  persistent: boolean;
  /** 正在刷新中的 Promise */
  refreshing?: Promise<T>;
}

// ============================================================================
// 缓存管理器
// ============================================================================

export class CacheManager implements ICacheAdapter {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private storage = platform.storage;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5分钟
      maxSize: 100,
      prefix: 'cache_',
      enabled: true,
      ...config,
    };
    
    // 从持久化存储恢复缓存
    this.restoreFromStorage();
  }
  
  // --------------------------------------------------------------------------
  // ICacheAdapter 实现
  // --------------------------------------------------------------------------
  
  get<T = any>(key: string): T | undefined {
    if (!this.config.enabled) return undefined;
    
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // 检查过期
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }
  
  set<T = any>(key: string, value: T, ttl?: number): void {
    if (!this.config.enabled) return;
    
    // 检查大小限制
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.prune();
    }
    
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      persistent: false,
    };
    
    this.cache.set(key, entry);
    
    // 如果需要持久化，保存到 storage
    if (entry.persistent) {
      this.persistToStorage(key, entry);
    }
  }
  
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  keys(): Iterable<string> {
    return this.cache.keys();
  }
  
  forEach(callback: (value: any, key: string) => void): void {
    this.cache.forEach((entry, key) => {
      callback(entry.data, key);
    });
  }
  
  getOrSet<T = any>(key: string, factory: () => T): T {
    const value = this.get<T>(key);
    if (value !== undefined) return value;
    
    // 注意：这个同步版本不调用 factory，因为 factory 可能是异步的
    // 请使用 getOrFetch 方法
    return undefined as any;
  }
  
  // --------------------------------------------------------------------------
  // 异步缓存方法
  // --------------------------------------------------------------------------
  
  /**
   * 获取缓存或获取数据
   */
  async getOrFetch<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options: Partial<CacheOptions> = {}
  ): Promise<T> {
    const { ttl, staleWhileRevalidate = true } = options;
    
    // 检查缓存
    const cached = this.get<T>(key);
    
    if (cached !== undefined) {
      // 检查是否需要后台刷新
      if (staleWhileRevalidate && this.isStale(key)) {
        // 后台刷新，不阻塞返回
        this.refresh(key, fetcher, ttl).catch(console.error);
      }
      return cached;
    }
    
    // 没有缓存，获取数据
    return this.refresh(key, fetcher, ttl);
  }
  
  /**
   * 刷新缓存
   */
  async refresh<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 如果已经在刷新中，等待刷新完成
    const existing = this.cache.get(key);
    if (existing?.refreshing) {
      return existing.refreshing as Promise<T>;
    }
    
    const promise = fetcher();
    
    // 标记正在刷新
    if (existing) {
      (existing as any).refreshing = promise;
    }
    
    try {
      const data = await promise;
      this.set(key, data, ttl);
      return data;
    } finally {
      // 清除刷新标记
      const entry = this.cache.get(key);
      if (entry) {
        (entry as any).refreshing = undefined;
      }
    }
  }
  
  /**
   * 清除并刷新
   */
  async invalidateAndFetch<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    this.delete(key);
    return this.refresh(key, fetcher, ttl);
  }
  
  // --------------------------------------------------------------------------
  // 持久化
  // --------------------------------------------------------------------------
  
  /**
   * 设置为持久化缓存
   */
  setPersistent<T = any>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || 7 * 24 * 60 * 60 * 1000, // 默认7天
      persistent: true,
    };
    
    this.cache.set(key, entry);
    this.persistToStorage(key, entry);
  }
  
  /**
   * 清除过期缓存
   */
  prune(): number {
    let count = 0;
    const now = Date.now();
    
    this.cache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }
  
  // --------------------------------------------------------------------------
  // 私有方法
  // --------------------------------------------------------------------------
  
  private isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    // 超过 50% TTL 后认为 stale
    const elapsed = Date.now() - entry.timestamp;
    return elapsed > entry.ttl * 0.5;
  }
  
  private persistToStorage(key: string, entry: CacheEntry): void {
    try {
      const storageKey = this.config.prefix + key;
      this.storage.set(storageKey, entry, entry.ttl);
    } catch (error) {
      console.warn('Cache persist error:', error);
    }
  }
  
  private restoreFromStorage(): void {
    try {
      const keys = this.storage.keys();
      const prefix = this.config.prefix;
      
      keys
        .filter(k => k.startsWith(prefix))
        .forEach(storageKey => {
          const key = storageKey.replace(prefix, '');
          const entry = this.storage.get<CacheEntry>(storageKey);
          
          if (entry && Date.now() < entry.timestamp + entry.ttl) {
            this.cache.set(key, entry);
          } else {
            this.storage.remove(storageKey);
          }
        });
    } catch (error) {
      console.warn('Cache restore error:', error);
    }
  }
}

// ============================================================================
// API 缓存装饰器
// ============================================================================

export class APICache {
  private cache: CacheManager;
  private request = platform.request;
  
  constructor() {
    this.cache = new CacheManager();
  }
  
  /**
   * 缓存 GET 请求
   */
  async get<T = any>(
    url: string,
    params?: Record<string, any>,
    options: {
      ttl?: number;
      key?: string;
      staleWhileRevalidate?: boolean;
    } = {}
  ): Promise<BaseResponse<T>> {
    const { ttl = 300000, key, staleWhileRevalidate = true } = options;
    const cacheKey = key || this.generateKey(url, params);
    
    return this.cache.getOrFetch(
      cacheKey,
      () => this.request.get<BaseResponse<T>>(url, params),
      { ttl, staleWhileRevalidate }
    );
  }
  
  /**
   * 清除 URL 对应的缓存
   */
  invalidate(url: string, params?: Record<string, any>): void {
    const key = this.generateKey(url, params);
    this.cache.delete(key);
  }
  
  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  private generateKey(url: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${url}${paramsStr}`;
  }
}

// ============================================================================
// 导出
// ============================================================================

export const cacheManager = new CacheManager();
export const apiCache = new APICache();
