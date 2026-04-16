/**
 * 统一服务层架构
 * 
 * 特性：
 * - 请求缓存（防止重复请求）
 * - 自动重试（网络错误自动重试）
 * - 性能监控（API调用耗时统计）
 * - 统一错误处理
 */

import app from '@/config/tcb';

// ============================================================================
// 缓存配置
// ============================================================================

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // 过期时间(毫秒)
}

class ServiceCache {
  private cache = new Map<string, CacheItem<unknown>>()
  private pending = new Map<string, Promise<unknown>>() // 正在进行的请求

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined
    if (!item) return null
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清除匹配前缀的缓存
   */
  clearPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 请求去重 - 防止同一时间发起多个相同请求
   */
  async deduplicate<T>(key: string, request: () => Promise<T>, ttl: number = 5000): Promise<T> {
    // 如果已有相同请求在进行，返回那个Promise
    const pending = this.pending.get(key) as Promise<T> | undefined
    if (pending) {
      return pending
    }

    // 如果缓存有效，直接返回
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 创建新请求
    const promise = request().then(data => {
      this.set(key, data, ttl)
      this.pending.delete(key)
      return data
    }).catch(error => {
      this.pending.delete(key)
      throw error
    })

    this.pending.set(key, promise)
    return promise
  }
}

// 全局缓存实例
export const serviceCache = new ServiceCache()

// ============================================================================
// 性能监控
// ============================================================================

interface PerformanceMetric {
  method: string
  endpoint: string
  duration: number
  status: 'success' | 'error'
  timestamp: number
  error?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000

  /**
   * 记录API调用
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    })
    
    // 保持最多1000条记录
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  /**
   * 获取性能统计
   */
  getStats(endpoint?: string): {
    avgDuration: number
    minDuration: number
    maxDuration: number
    totalCalls: number
    errorRate: number
  } {
    const filtered = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics

    if (filtered.length === 0) {
      return { avgDuration: 0, minDuration: 0, maxDuration: 0, totalCalls: 0, errorRate: 0 }
    }

    const durations = filtered.map(m => m.duration)
    const errors = filtered.filter(m => m.status === 'error').length

    return {
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalCalls: filtered.length,
      errorRate: errors / filtered.length
    }
  }

  /**
   * 获取慢查询（超过阈值）
   */
  getSlowQueries(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold && m.status === 'error')
  }

  /**
   * 清除记录
   */
  clear(): void {
    this.metrics = []
  }
}

export const perfMonitor = new PerformanceMonitor()

// ============================================================================
// 统一服务基类
// ============================================================================

interface ServiceOptions {
  cache?: boolean
  cacheTTL?: number
  retries?: number
  retryDelay?: number
  dedupe?: boolean
}

const DEFAULT_OPTIONS: Required<ServiceOptions> = {
  cache: false,
  cacheTTL: 60000,
  retries: 0,
  retryDelay: 1000,
  dedupe: false
}

export class BaseService {
  protected db = app.database()

  /**
   * 通用查询方法（带缓存、重试、去重）
   */
  async query<T>(
    collectionName: string,
    queryFn: () => Promise<{ data: T[] }>,
    options: ServiceOptions = {}
  ): Promise<T[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const cacheKey = `${collectionName}:${JSON.stringify(queryFn.toString())}`
    const startTime = performance.now()

    try {
      let result: T[]

      if (opts.dedupe) {
        // 请求去重模式
        result = await serviceCache.deduplicate(cacheKey, queryFn, opts.cacheTTL)
      } else if (opts.cache) {
        // 缓存模式
        const cached = serviceCache.get<T[]>(cacheKey)
        if (cached !== null) {
          perfMonitor.record({
            method: 'GET',
            endpoint: collectionName,
            duration: performance.now() - startTime,
            status: 'success'
          })
          return cached
        }
        result = await queryFn()
        serviceCache.set(cacheKey, result, opts.cacheTTL)
      } else {
        result = await queryFn()
      }

      perfMonitor.record({
        method: 'GET',
        endpoint: collectionName,
        duration: performance.now() - startTime,
        status: 'success'
      })

      return result
    } catch (error: any) {
      perfMonitor.record({
        method: 'GET',
        endpoint: collectionName,
        duration: performance.now() - startTime,
        status: 'error',
        error: error.message
      })

      // 自动重试
      if (opts.retries > 0) {
        for (let i = 0; i < opts.retries; i++) {
          await new Promise(resolve => setTimeout(resolve, opts.retryDelay))
          try {
            const result = await queryFn()
            return result.data
          } catch (e) {
            if (i === opts.retries - 1) throw e
          }
        }
      }

      throw error
    }
  }

  /**
   * 分页查询
   */
  async paginatedQuery<T>(
    collectionName: string,
    params: {
      page?: number
      pageSize?: number
      where?: Record<string, any>
      orderBy?: string
      order?: 'asc' | 'desc'
    }
  ): Promise<{ list: T[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, where = {}, orderBy, order = 'desc' } = params
    const skip = (page - 1) * pageSize
    
    let collection = this.db.collection(collectionName).where(where)
    
    if (orderBy) {
      collection = collection.orderBy(orderBy, order)
    }

    const countResult = await collection.count()
    const { data } = await collection.skip(skip).limit(pageSize).get()

    return {
      list: data as T[],
      total: countResult.total || 0,
      page,
      pageSize
    }
  }

  /**
   * 根据ID查询
   */
  async findById<T>(collectionName: string, id: string): Promise<T | null> {
    const { data } = await this.db.collection(collectionName).doc(id).get()
    return Array.isArray(data) && data.length > 0 ? data[0] as T : null
  }

  /**
   * 创建记录
   */
  async create<T extends Record<string, any>>(
    collectionName: string, 
    data: Omit<T, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const doc = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const result = await this.db.collection(collectionName).add(doc)
    return { _id: (result as any).id || (result as any)._id, ...doc } as T
  }

  /**
   * 更新记录
   */
  async update<T extends Record<string, any>>(
    collectionName: string,
    id: string,
    data: Partial<T>
  ): Promise<boolean> {
    const doc = {
      ...data,
      updatedAt: new Date().toISOString()
    }
    const result = await this.db.collection(collectionName).doc(id).update(doc)
    return (result as any)?.data?.updated > 0 || true
  }

  /**
   * 删除记录
   */
  async remove(collectionName: string, id: string): Promise<boolean> {
    const result = await this.db.collection(collectionName).doc(id).remove()
    return (result as any)?.data?.deleted > 0 || true
  }

  /**
   * 批量操作
   */
  async batch<T extends Record<string, any>>(
    collectionName: string,
    operations: Array<{
      type: 'add' | 'update' | 'remove'
      data?: Partial<T>
      id?: string
    }>
  ): Promise<boolean> {
    const batch = this.db.batch()
    
    for (const op of operations) {
      const doc = this.db.collection(collectionName).doc(op.id!)
      if (op.type === 'add') {
        batch.add(doc, { ...op.data, createdAt: new Date().toISOString() })
      } else if (op.type === 'update') {
        batch.update(doc, { ...op.data, updatedAt: new Date().toISOString() })
      } else if (op.type === 'remove') {
        batch.remove(doc)
      }
    }

    const result = await batch.commit()
    return result.ok
  }

  /**
   * 清除相关缓存
   */
  protected clearCache(prefix?: string): void {
    if (prefix) {
      serviceCache.clearPrefix(prefix)
    } else {
      serviceCache.clear()
    }
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// ============================================================================
// 导出
// ============================================================================

export default BaseService
