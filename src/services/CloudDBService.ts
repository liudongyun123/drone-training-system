/**
 * CloudDBService - 统一数据访问服务
 * 
 * 所有端（小程序、Web、管理后台）统一使用此服务进行数据库操作
 * 基于 HTTP 调用 db-init 云函数
 * 
 * @example
 * // 查询列表
 * const { data, total } = await CloudDBService.query('courses', { status: 'active' })
 * 
 * // 获取单条
 * const course = await CloudDBService.get('courses', 'course-id')
 * 
 * // 新增
 * const { id } = await CloudDBService.add('courses', { title: '新课程' })
 * 
 * // 更新
 * await CloudDBService.update('courses', 'course-id', { title: '更新标题' })
 * 
 * // 删除
 * await CloudDBService.delete('courses', 'course-id')
 * 
 * // 统计
 * const { total } = await CloudDBService.count('courses', { status: 'active' })
 */

import axios, { AxiosInstance } from 'axios'

// API 配置
const API_BASE = typeof window !== 'undefined' 
  ? (import.meta.env.VITE_API_BASE_URL || 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com')
  : 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
const DB_INIT_URL = `${API_BASE}/db-init`

// 请求超时
const REQUEST_TIMEOUT = 30000

// 创建 Axios 实例
const httpClient: AxiosInstance = axios.create({
  baseURL: DB_INIT_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 响应拦截器
httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || `服务器错误: ${error.response.status}`
      return Promise.reject(new Error(message))
    }
    if (error.request) {
      return Promise.reject(new Error('网络连接失败'))
    }
    return Promise.reject(error)
  }
)

// 统一响应格式
export interface DBResponse<T = any> {
  code: number
  message?: string
  data?: T
  total?: number
  skip?: number
  limit?: number
}

export interface QueryOptions {
  where?: Record<string, any>
  orderBy?: string
  order?: 'asc' | 'desc'
  skip?: number
  limit?: number
  field?: Record<string, boolean>
}

export interface ListResponse<T = any> {
  data: T[]
  total: number
  skip: number
  limit: number
}

/**
 * 统一数据访问服务
 */
export const CloudDBService = {
  /**
   * 健康检查
   */
  async ping(): Promise<{ success: boolean; timestamp?: string }> {
    try {
      const result = await httpClient.post<DBResponse>('', { action: 'ping' })
      return { success: result.code === 0, timestamp: result.message }
    } catch (error: any) {
      console.error('[CloudDBService] ping 失败:', error)
      return { success: false }
    }
  },

  /**
   * 查询列表
   */
  async query<T = any>(
    collection: string, 
    options: QueryOptions = {}
  ): Promise<ListResponse<T>> {
    const { where = {}, orderBy = 'createdAt', order = 'desc', skip = 0, limit = 20, field } = options
    
    const result = await httpClient.post<DBResponse<{ list: T[]; total: number }>>('', {
      action: 'query',
      collection,
      query: where,
      orderBy,
      order,
      skip,
      limit,
      field,
    })
    
    // 兼容 db-init 返回格式
    const list = result.data?.list || result.data || []
    const total = result.total || (result.data as any)?.total || 0
    
    return {
      data: list,
      total,
      skip: result.skip || skip,
      limit: result.limit || limit,
    }
  },

  /**
   * 获取单条记录
   */
  async get<T = any>(collection: string, id: string): Promise<T | null> {
    try {
      const result = await httpClient.post<DBResponse<T>>('', {
        action: 'get',
        collection,
        id,
      })
      
      if (result.code === 0 && result.data) {
        return result.data
      }
      return null
    } catch (error) {
      console.error('[CloudDBService] get 失败:', error)
      return null
    }
  },

  /**
   * 新增记录
   */
  async add<T = any>(
    collection: string, 
    data: Partial<T>
  ): Promise<{ id: string } | null> {
    try {
      const result = await httpClient.post<DBResponse<{ id: string }>>('', {
        action: 'add',
        collection,
        data,
      })
      
      if (result.code === 0 && result.data) {
        return { id: result.data.id }
      }
      throw new Error(result.message || '添加失败')
    } catch (error: any) {
      console.error('[CloudDBService] add 失败:', error)
      throw error
    }
  },

  /**
   * 更新记录
   */
  async update(
    collection: string, 
    id: string, 
    data: Record<string, any>
  ): Promise<boolean> {
    try {
      const result = await httpClient.post('', {
        action: 'update',
        collection,
        id,
        data,
      })
      
      if (result.code === 0) {
        return true
      }
      throw new Error(result.message || '更新失败')
    } catch (error: any) {
      console.error('[CloudDBService] update 失败:', error)
      throw error
    }
  },

  /**
   * 条件更新
   */
  async updateWhere(
    collection: string, 
    where: Record<string, any>, 
    data: Record<string, any>
  ): Promise<{ updated: number }> {
    try {
      const result = await httpClient.post('', {
        action: 'updateWhere',
        collection,
        query: where,
        data,
      })
      
      if (result.code === 0) {
        return { updated: result.updated || 0 }
      }
      throw new Error(result.message || '更新失败')
    } catch (error: any) {
      console.error('[CloudDBService] updateWhere 失败:', error)
      throw error
    }
  },

  /**
   * 删除记录
   */
  async delete(collection: string, id: string): Promise<boolean> {
    try {
      const result = await httpClient.post('', {
        action: 'delete',
        collection,
        id,
      })
      
      if (result.code === 0) {
        return true
      }
      throw new Error(result.message || '删除失败')
    } catch (error: any) {
      console.error('[CloudDBService] delete 失败:', error)
      throw error
    }
  },

  /**
   * 条件删除
   */
  async deleteWhere(
    collection: string, 
    where: Record<string, any>
  ): Promise<{ deleted: number }> {
    try {
      const result = await httpClient.post('', {
        action: 'deleteWhere',
        collection,
        query: where,
      })
      
      if (result.code === 0) {
        return { deleted: result.deleted || 0 }
      }
      throw new Error(result.message || '删除失败')
    } catch (error: any) {
      console.error('[CloudDBService] deleteWhere 失败:', error)
      throw error
    }
  },

  /**
   * 统计数量
   */
  async count(collection: string, where: Record<string, any> = {}): Promise<number> {
    try {
      const result = await httpClient.post<DBResponse<{ total: number }>>('', {
        action: 'count',
        collection,
        query: where,
      })
      
      if (result.code === 0) {
        return result.total || 0
      }
      return 0
    } catch (error) {
      console.error('[CloudDBService] count 失败:', error)
      return 0
    }
  },

  /**
   * 聚合查询
   */
  async aggregate<T = any>(
    collection: string, 
    pipeline: any[]
  ): Promise<T[]> {
    try {
      const result = await httpClient.post<DBResponse<T[]>>('', {
        action: 'aggregate',
        collection,
        pipeline,
      })
      
      if (result.code === 0 && result.data) {
        return result.data
      }
      return []
    } catch (error) {
      console.error('[CloudDBService] aggregate 失败:', error)
      return []
    }
  },

  /**
   * 搜索（正则匹配）
   */
  async search<T = any>(
    collection: string,
    keyword: string,
    fields: string[] = ['title', 'name'],
    where: Record<string, any> = {},
    limit: number = 20
  ): Promise<T[]> {
    try {
      const result = await httpClient.post<DBResponse<T[]>>('', {
        action: 'search',
        collection,
        keyword,
        fields,
        where,
        limit,
      })
      
      if (result.code === 0 && result.data) {
        return result.data
      }
      return []
    } catch (error) {
      console.error('[CloudDBService] search 失败:', error)
      return []
    }
  },

  /**
   * 批量添加
   */
  async batchAdd<T = any>(
    collection: string, 
    items: Partial<T>[]
  ): Promise<{ id: string; success: boolean }[]> {
    try {
      const result = await httpClient.post('', {
        action: 'batchAdd',
        collection,
        items,
      })
      
      if (result.code === 0 && result.data) {
        return result.data
      }
      throw new Error(result.message || '批量添加失败')
    } catch (error: any) {
      console.error('[CloudDBService] batchAdd 失败:', error)
      throw error
    }
  },

  /**
   * 原子递增
   */
  async increment(
    collection: string, 
    id: string, 
    field: string, 
    amount: number = 1
  ): Promise<boolean> {
    try {
      const result = await httpClient.post('', {
        action: 'increment',
        collection,
        id,
        field,
        amount,
      })
      
      if (result.code === 0) {
        return true
      }
      return false
    } catch (error) {
      console.error('[CloudDBService] increment 失败:', error)
      return false
    }
  },

  /**
   * 获取最近更新的记录
   */
  async getRecent<T = any>(
    collection: string, 
    limit: number = 10,
    where: Record<string, any> = {}
  ): Promise<T[]> {
    return this.query<T>(collection, {
      where,
      orderBy: 'updatedAt',
      order: 'desc',
      limit,
    }).then(r => r.data)
  },

  /**
   * 根据字段值查询
   */
  async getByField<T = any>(
    collection: string, 
    field: string, 
    value: any
  ): Promise<T[]> {
    return this.query<T>(collection, {
      where: { [field]: value },
      limit: 100,
    }).then(r => r.data)
  },
}

// 导出类型
export type { QueryOptions, ListResponse, DBResponse }

// 快捷方法
export const db = {
  query: CloudDBService.query.bind(CloudDBService),
  get: CloudDBService.get.bind(CloudDBService),
  add: CloudDBService.add.bind(CloudDBService),
  update: CloudDBService.update.bind(CloudDBService),
  delete: CloudDBService.delete.bind(CloudDBService),
  count: CloudDBService.count.bind(CloudDBService),
  search: CloudDBService.search.bind(CloudDBService),
  batchAdd: CloudDBService.batchAdd.bind(CloudDBService),
}
