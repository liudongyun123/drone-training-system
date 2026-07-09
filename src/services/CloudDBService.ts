/**
 * CloudDBService - 统一数据访问服务（兼容层，v5.0）
 * 
 * ⚠️ DEPRECATED: 此文件已改为 adminService 的兼容包装层。
 * 所有数据库操作统一通过 adminService → db-init 云函数。
 * 新代码请直接使用 adminService。
 * 
 * @example
 * // 查询列表
 * const { data, total } = await CloudDBService.query('courses', { where: { status: 'active' } })
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
 */

import { adminService } from './adminService'

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

// 辅助函数：从 adminService 响应中提取数据
function extractList<T>(result: any): { data: T[]; total: number; skip: number; limit: number } {
  if (result?.data) {
    return {
      data: result.data.list || result.data.data || [],
      total: result.data.total || 0,
      skip: result.data.skip || 0,
      limit: result.data.limit || 20,
    }
  }
  return { data: [], total: 0, skip: 0, limit: 20 }
}

function extractSingle<T>(result: any): T | null {
  if (result?.data) {
    return result.data as T
  }
  return null
}

function extractId(result: any): string {
  return result?.data?.id || ''
}

/**
 * 统一数据访问服务（兼容包装层）
 */
export const CloudDBService = {
  /**
   * 健康检查
   */
  async ping(): Promise<{ success: boolean; timestamp?: string }> {
    try {
      const result = await adminService.count('courses', {})
      return { success: result?.code === 0, timestamp: new Date().toISOString() }
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
    try {
      const { where = {}, orderBy = 'createdAt', order = 'desc', skip = 0, limit = 20 } = options
      
      // 使用 listWithOps 以支持 $or/$regex/$gt 等操作符
      const result = await adminService.listWithOps(collection, where, {
        skip,
        limit,
        orderBy,
        order,
      })
      
      const extracted = extractList<T>(result)
      return {
        data: extracted.data,
        total: extracted.total,
        skip: extracted.skip,
        limit: extracted.limit,
      }
    } catch (error: any) {
      console.error('[CloudDBService] query 失败:', error)
      return { data: [], total: 0, skip: 0, limit: 0 }
    }
  },

  /**
   * 获取单条记录
   */
  async get<T = any>(collection: string, id: string): Promise<T | null> {
    try {
      const result = await adminService.get(collection, id)
      return extractSingle<T>(result)
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
      const result = await adminService.add(collection, data as Record<string, any>)
      const id = extractId(result)
      if (id) {
        return { id }
      }
      throw new Error('添加失败：未返回 ID')
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
      const result = await adminService.update(collection, id, data)
      return result?.code === 0
    } catch (error: any) {
      console.error('[CloudDBService] update 失败:', error)
      throw error
    }
  },

  /**
   * 条件更新（先查询再逐个更新）
   */
  async updateWhere(
    collection: string, 
    where: Record<string, any>, 
    data: Record<string, any>
  ): Promise<{ updated: number }> {
    try {
      const listResult = await adminService.listWithOps(collection, where, { limit: 1000 })
      const items = extractList<{ _id: string }>(listResult)
      
      let updated = 0
      for (const item of items.data) {
        if (item._id) {
          await adminService.update(collection, item._id, data)
          updated++
        }
      }
      return { updated }
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
      const result = await adminService.delete(collection, id)
      return result?.code === 0
    } catch (error: any) {
      console.error('[CloudDBService] delete 失败:', error)
      throw error
    }
  },

  /**
   * 条件删除（先查询再逐个删除）
   */
  async deleteWhere(
    collection: string, 
    where: Record<string, any>
  ): Promise<{ deleted: number }> {
    try {
      const listResult = await adminService.listWithOps(collection, where, { limit: 1000 })
      const items = extractList<{ _id: string }>(listResult)
      
      let deleted = 0
      for (const item of items.data) {
        if (item._id) {
          await adminService.delete(collection, item._id)
          deleted++
        }
      }
      return { deleted }
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
      const result = await adminService.count(collection, where)
      return result?.data || 0
    } catch (error) {
      console.error('[CloudDBService] count 失败:', error)
      return 0
    }
  },

  /**
   * 聚合查询（暂不支持，返回空数组）
   */
  async aggregate<T = any>(
    _collection: string, 
    _pipeline: any[]
  ): Promise<T[]> {
    console.warn('[CloudDBService] aggregate 暂不支持，请使用 adminService')
    return []
  },

  /**
   * 搜索（使用 $regex 操作符）
   */
  async search<T = any>(
    collection: string,
    keyword: string,
    fields: string[] = ['title', 'name'],
    where: Record<string, any> = {},
    limit: number = 20
  ): Promise<T[]> {
    try {
      // 构建 $or 查询
      const orConditions = fields.map(field => ({
        [field]: { '$regex': keyword, '$options': 'i' }
      }))
      
      const query: Record<string, any> = { ...where }
      if (orConditions.length > 0) {
        query['$or'] = orConditions
      }
      
      const result = await adminService.listWithOps(collection, query, { limit })
      const extracted = extractList<T>(result)
      return extracted.data
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
    const results: { id: string; success: boolean }[] = []
    
    for (const item of items) {
      try {
        const result = await adminService.add(collection, item as Record<string, any>)
        const id = extractId(result)
        results.push({ id, success: !!id })
      } catch (error) {
        results.push({ id: '', success: false })
      }
    }
    
    return results
  },

  /**
   * 原子递增（使用 $inc 操作符）
   */
  async increment(
    collection: string, 
    id: string, 
    field: string, 
    amount: number = 1
  ): Promise<boolean> {
    try {
      const result = await adminService.updateWithOps(collection, id, {
        '$inc': { [field]: amount }
      })
      return result?.code === 0
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
    const { data } = await this.query<T>(collection, {
      where,
      orderBy: 'updatedAt',
      order: 'desc',
      limit,
    })
    return data
  },

  /**
   * 根据字段值查询
   */
  async getByField<T = any>(
    collection: string, 
    field: string, 
    value: any
  ): Promise<T[]> {
    const { data } = await this.query<T>(collection, {
      where: { [field]: value },
      limit: 100,
    })
    return data
  },
}

// 类型已在顶部通过 interface/export type 导出，无需重复

// 快捷方法（保持向后兼容）
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
