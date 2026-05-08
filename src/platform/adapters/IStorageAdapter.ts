/**
 * Platform Adapter - 存储适配器接口定义
 * 定义跨平台统一的数据存储接口
 */

// ============================================================================
// 存储配置
// ============================================================================

export interface StorageConfig {
  /** 存储前缀 */
  prefix?: string;
  /** 默认过期时间(ms) */
  defaultTTL?: number;
  /** 存储类型 */
  storageType?: 'localStorage' | 'sessionStorage' | 'memory' | 'cookie';
  /** 是否加密 */
  encrypted?: boolean;
  /** 加密密钥 */
  encryptionKey?: string;
}

export interface StorageItem<T = any> {
  /** 存储的值 */
  value: T;
  /** 过期时间 */
  expiresAt?: number;
  /** 创建时间 */
  createdAt: number;
  /** 是否持久化 */
  persistent: boolean;
}

// ============================================================================
// 存储适配器接口
// ============================================================================

export interface IStorageAdapter {
  // --------------------------------------------------------------------------
  // 基础操作
  // --------------------------------------------------------------------------
  
  /** 获取值 */
  get<T = any>(key: string): T | null;
  
  /** 设置值 */
  set<T = any>(key: string, value: T, ttl?: number): void;
  
  /** 删除值 */
  remove(key: string): void;
  
  /** 清空所有值 */
  clear(): void;
  
  /** 检查键是否存在 */
  has(key: string): boolean;
  
  /** 获取所有键 */
  keys(): string[];
  
  // --------------------------------------------------------------------------
  // 高级操作
  // --------------------------------------------------------------------------
  
  /** 获取值，如果不存在则设置并返回 */
  getOrSet<T = any>(key: string, factory: () => T | Promise<T>, ttl?: number): Promise<T>;
  
  /** 更新值（仅当键存在时） */
  update<T = any>(key: string, updater: (value: T) => T): boolean;
  
  /** 设置过期时间 */
  setExpiry(key: string, ttl: number): void;
  
  /** 获取剩余 TTL */
  getTTL(key: string): number | null;
  
  /** 获取大小 */
  size(): number;
  
  // --------------------------------------------------------------------------
  // 批量操作
  // --------------------------------------------------------------------------
  
  /** 批量获取 */
  multiGet<T = any>(keys: string[]): Record<string, T | null>;
  
  /** 批量设置 */
  multiSet<T = any>(items: Record<string, T>, ttl?: number): void;
  
  /** 批量删除 */
  multiRemove(keys: string[]): void;
  
  // --------------------------------------------------------------------------
  // 工具方法
  // --------------------------------------------------------------------------
  
  /** 清除过期数据 */
  prune(): number;
  
  /** 导出所有数据 */
  export(): Record<string, StorageItem>;
  
  /** 导入数据 */
  import(items: Record<string, StorageItem>): void;
  
  /** 监听变化 */
  subscribe(callback: (key: string, action: 'set' | 'remove' | 'clear') => void): () => void;
}

// ============================================================================
// 缓存接口（内存缓存）
// ============================================================================

export interface ICacheAdapter {
  /** 获取缓存 */
  get<T = any>(key: string): T | undefined;
  
  /** 设置缓存 */
  set<T = any>(key: string, value: T, ttl?: number): void;
  
  /** 检查缓存是否存在 */
  has(key: string): boolean;
  
  /** 删除缓存 */
  delete(key: string): boolean;
  
  /** 清空所有缓存 */
  clear(): void;
  
  /** 获取缓存数量 */
  size(): number;
  
  /** 获取缓存 Keys */
  keys(): Iterable<string>;
  
  /** 遍历缓存 */
  forEach(callback: (value: any, key: string) => void): void;
  
  /** 获取或设置缓存 */
  getOrSet<T = any>(key: string, factory: () => T): T;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  StorageConfig,
  StorageItem,
};
