/**
 * Storage Adapter - 存储适配器实现
 * 支持 LocalStorage, SessionStorage, Memory 三种模式
 */

import {
  IStorageAdapter,
  StorageConfig,
  StorageItem,
} from './IStorageAdapter';

// ============================================================================
// 内存存储
// ============================================================================

class MemoryStorage {
  private store = new Map<string, StorageItem>();
  private listeners = new Set<(key: string, action: 'set' | 'remove' | 'clear') => void>();

  get<T = any>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;
    
    // 检查过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  set<T = any>(key: string, value: T, ttl?: number): void {
    const item: StorageItem<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
      persistent: false,
    };
    this.store.set(key, item);
    this.notifyListeners(key, 'set');
  }

  remove(key: string): void {
    this.store.delete(key);
    this.notifyListeners(key, 'remove');
  }

  clear(): void {
    this.store.clear();
    this.notifyListeners('', 'clear');
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }

  subscribe(callback: (key: string, action: 'set' | 'remove' | 'clear') => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(key: string, action: 'set' | 'remove' | 'clear'): void {
    this.listeners.forEach(callback => callback(key, action));
  }
}

// ============================================================================
// 存储适配器实现
// ============================================================================

export class WebStorageAdapter implements IStorageAdapter {
  private prefix: string;
  private defaultTTL: number;
  private storage: Storage | null;
  private memory: MemoryStorage;
  private listeners = new Set<(key: string, action: 'set' | 'remove' | 'clear') => void>();

  constructor(config?: StorageConfig) {
    this.prefix = config?.prefix || 'app_';
    this.defaultTTL = config?.defaultTTL || 0;
    
    // 优先使用 localStorage
    if (config?.storageType === 'sessionStorage' && typeof sessionStorage !== 'undefined') {
      this.storage = sessionStorage;
    } else if (typeof localStorage !== 'undefined') {
      this.storage = localStorage;
    } else {
      this.storage = null;
    }
    
    this.memory = new MemoryStorage();
  }

  // --------------------------------------------------------------------------
  // 基础操作
  // --------------------------------------------------------------------------

  get<T = any>(key: string): T | null {
    const fullKey = this.prefix + key;
    
    // 优先从持久化存储读取
    if (this.storage) {
      try {
        const data = this.storage.getItem(fullKey);
        if (data) {
          const item: StorageItem<T> = JSON.parse(data);
          
          // 检查过期
          if (item.expiresAt && Date.now() > item.expiresAt) {
            this.storage.removeItem(fullKey);
            return null;
          }
          
          return item.value;
        }
      } catch (error) {
        console.warn('Storage get error:', error);
      }
    }
    
    // 回退到内存
    return this.memory.get<T>(fullKey);
  }

  set<T = any>(key: string, value: T, ttl?: number): void {
    const fullKey = this.prefix + key;
    const expiresAt = ttl ? Date.now() + ttl : this.defaultTTL ? Date.now() + this.defaultTTL : undefined;
    
    const item: StorageItem<T> = {
      value,
      createdAt: Date.now(),
      expiresAt,
      persistent: !!this.storage,
    };
    
    // 同时设置到持久化存储和内存
    if (this.storage) {
      try {
        this.storage.setItem(fullKey, JSON.stringify(item));
      } catch (error) {
        console.warn('Storage set error:', error);
        // 存储失败，只存内存
        this.memory.set(fullKey, value, ttl);
      }
    } else {
      this.memory.set(fullKey, value, ttl);
    }
    
    this.notifyListeners(key, 'set');
  }

  remove(key: string): void {
    const fullKey = this.prefix + key;
    
    if (this.storage) {
      this.storage.removeItem(fullKey);
    }
    this.memory.remove(fullKey);
    
    this.notifyListeners(key, 'remove');
  }

  clear(): void {
    if (this.storage) {
      const keys = this.getKeysFromStorage();
      keys.forEach(k => {
        if (k.startsWith(this.prefix)) {
          this.storage!.removeItem(k);
        }
      });
    }
    this.memory.clear();
    
    this.notifyListeners('', 'clear');
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  keys(): string[] {
    const keys: string[] = [];
    
    // 从持久化存储获取
    if (this.storage) {
      keys.push(...this.getKeysFromStorage().filter(k => k.startsWith(this.prefix)));
    }
    
    // 从内存获取
    keys.push(...this.memory.keys().filter(k => k.startsWith(this.prefix)));
    
    // 去重
    return [...new Set(keys.map(k => k.replace(this.prefix, '')))];
  }

  // --------------------------------------------------------------------------
  // 高级操作
  // --------------------------------------------------------------------------

  async getOrSet<T = any>(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const value = this.get<T>(key);
    
    if (value !== null) {
      return value;
    }
    
    const newValue = await factory();
    this.set(key, newValue, ttl);
    return newValue;
  }

  update<T = any>(key: string, updater: (value: T) => T): boolean {
    const value = this.get<T>(key);
    
    if (value === null) {
      return false;
    }
    
    const newValue = updater(value);
    this.set(key, newValue);
    return true;
  }

  setExpiry(key: string, ttl: number): void {
    const fullKey = this.prefix + key;
    const value = this.get(fullKey.replace(this.prefix, ''));
    
    if (value !== null) {
      this.set(fullKey.replace(this.prefix, ''), value, ttl);
    }
  }

  getTTL(key: string): number | null {
    const fullKey = this.prefix + key;
    
    if (this.storage) {
      try {
        const data = this.storage.getItem(fullKey);
        if (data) {
          const item: StorageItem = JSON.parse(data);
          if (item.expiresAt) {
            return Math.max(0, item.expiresAt - Date.now());
          }
        }
      } catch (error) {
        // ignore
      }
    }
    
    // 检查内存
    const memoryItem = (this.memory as any).store?.get(fullKey) as StorageItem;
    if (memoryItem?.expiresAt) {
      return Math.max(0, memoryItem.expiresAt - Date.now());
    }
    
    return null;
  }

  size(): number {
    return this.keys().length;
  }

  // --------------------------------------------------------------------------
  // 批量操作
  // --------------------------------------------------------------------------

  multiGet<T = any>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });
    return result;
  }

  multiSet<T = any>(items: Record<string, T>, ttl?: number): void {
    Object.entries(items).forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
  }

  multiRemove(keys: string[]): void {
    keys.forEach(key => this.remove(key));
  }

  // --------------------------------------------------------------------------
  // 工具方法
  // --------------------------------------------------------------------------

  prune(): number {
    let count = 0;
    const keys = this.keys();
    
    keys.forEach(key => {
      if (this.getTTL(key) === 0) {
        this.remove(key);
        count++;
      }
    });
    
    return count;
  }

  export(): Record<string, StorageItem> {
    const result: Record<string, StorageItem> = {};
    const keys = this.keys();
    
    keys.forEach(key => {
      const fullKey = this.prefix + key;
      if (this.storage) {
        try {
          const data = this.storage.getItem(fullKey);
          if (data) {
            result[key] = JSON.parse(data);
          }
        } catch (error) {
          // ignore
        }
      }
    });
    
    return result;
  }

  import(items: Record<string, StorageItem>): void {
    Object.entries(items).forEach(([key, item]) => {
      this.set(key, item.value);
    });
  }

  subscribe(callback: (key: string, action: 'set' | 'remove' | 'clear') => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(key: string, action: 'set' | 'remove' | 'clear'): void {
    this.listeners.forEach(callback => callback(key, action));
  }

  private getKeysFromStorage(): string[] {
    if (!this.storage) return [];
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  }
}

// ============================================================================
// 导出
// ============================================================================

export const createStorageAdapter = (config?: StorageConfig): IStorageAdapter => {
  return new WebStorageAdapter(config);
};

// 默认实例
export const storageAdapter = new WebStorageAdapter();

// 便捷方法
export const localStorage$ = storageAdapter;
export const sessionStorage$ = {
  get: <T = any>(key: string) => {
    const temp = new WebStorageAdapter({ storageType: 'sessionStorage' });
    return temp.get<T>(key);
  },
  set: <T = any>(key: string, value: T, ttl?: number) => {
    const temp = new WebStorageAdapter({ storageType: 'sessionStorage' });
    temp.set(key, value, ttl);
  },
  remove: (key: string) => {
    const temp = new WebStorageAdapter({ storageType: 'sessionStorage' });
    temp.remove(key);
  },
};

// 内存缓存
export const memoryCache = new MemoryStorage() as IStorageAdapter & MemoryStorage;
