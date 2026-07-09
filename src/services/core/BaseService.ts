/**
 * 统一服务层架构
 * 
 * 特性：
 * - 请求缓存（防止重复请求）
 * - 自动重试（网络错误自动重试）
 * - 性能监控（API调用耗时统计）
 * - 统一错误处理
 */

import { adminService } from '@/services/adminService';

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

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractSingle(result: any): any | null {
  if (!result) return null;
  if (result.data && !Array.isArray(result.data) && typeof result.data === 'object') return result.data;
  if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
  return result.data || null;
}

export class BaseService {

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
        result = await (serviceCache.deduplicate as any)(cacheKey, queryFn, opts.cacheTTL)
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
        result = await (queryFn as any)()
        serviceCache.set(cacheKey, result, opts.cacheTTL)
      } else {
        result = await (queryFn as any)()
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

    const result = await adminService.list(collectionName, where, { orderBy, order, page, pageSize })
    const data = extractList(result)
    const total = result?.data?.total || data.length

    return {
      list: data as T[],
      total,
      page,
      pageSize
    }
  }

  /**
   * 根据ID查询
   */
  async findById<T>(collectionName: string, id: string): Promise<T | null> {
    return extractSingle(await adminService.get(collectionName, id)) as T || null
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
    const result = await adminService.add(collectionName, doc)
    return { _id: result?.data?.id || '', ...doc } as T
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
    await adminService.update(collectionName, id, doc)
    return true
  }

  /**
   * 删除记录
   */
  async remove(collectionName: string, id: string): Promise<boolean> {
    try {
      await adminService.delete(collectionName, id)
      return true
    } catch (error) {
      console.error(`[BaseService] 删除 ${collectionName}/${id} 失败:`, error)
      return false
    }
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
    try {
      for (const op of operations) {
        if (op.type === 'add') {
          await adminService.add(collectionName, { ...op.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        } else if (op.type === 'update' && op.id) {
          await adminService.update(collectionName, op.id, { ...op.data, updatedAt: new Date().toISOString() })
        } else if (op.type === 'remove' && op.id) {
          await adminService.delete(collectionName, op.id)
        }
      }
      return true
    } catch (error) {
      console.error(`[BaseService] 批量操作 ${collectionName} 失败:`, error)
      return false
    }
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
