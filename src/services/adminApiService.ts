/**
 * 管理后台 API 服务 - 兼容层 v5.0
 * 
 * ⚠️ DEPRECATED: 此文件已改为 adminService 的兼容包装层。
 * 新代码请直接使用 adminService。
 */

import { adminService } from './adminService'

export interface QueryOptions {
  skip?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface ApiResponse<T = any> {
  code: number
  data: T
  total?: number
  message?: string
}

export interface ListResponse<T> {
  data: T[]
  total: number
  skip: number
  limit: number
}

// 辅助：从 adminService 响应提取数据
function extractList(result: any): { data: any[]; total: number; skip: number; limit: number } {
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

export const adminApi = {
  /**
   * 查询列表
   */
  async list<T>(
    collection: string,
    query: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<ListResponse<T>> {
    const { skip, limit, orderBy, order, page, pageSize } = options
    
    const result = await adminService.list(collection, query, {
      skip: skip ?? (page ? ((page - 1) * (pageSize || 20)) : 0),
      limit: limit ?? pageSize ?? 20,
      orderBy: orderBy ?? 'createdAt',
      order: order ?? 'desc',
    })
    
    const extracted = extractList(result)
    return {
      data: extracted.data,
      total: extracted.total,
      skip: extracted.skip,
      limit: extracted.limit,
    }
  },

  /**
   * 获取单条记录
   */
  async get<T>(collection: string, id: string): Promise<T | null> {
    const result = await adminService.get(collection, id)
    return result?.data || null
  },

  /**
   * 创建记录
   */
  async add(collection: string, data: Record<string, any>): Promise<{ id: string }> {
    const result = await adminService.add(collection, data)
    return { id: result?.data?.id || '' }
  },

  /**
   * 更新记录
   */
  async update(collection: string, id: string, data: Record<string, any>): Promise<void> {
    await adminService.update(collection, id, data)
  },

  /**
   * 删除记录
   */
  async delete(collection: string, id: string): Promise<void> {
    await adminService.delete(collection, id)
  },

  /**
   * 统计数量
   */
  async count(collection: string, query: Record<string, any> = {}): Promise<number> {
    const result = await adminService.count(collection, query)
    return result?.data || 0
  },

  // ==================== 专用业务 API ====================

  async listLevels(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('levels', query, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  async listSources(options?: QueryOptions) {
    return this.list('sources', { status: 'active' }, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  async listCourses(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('courses', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listCategories(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('categories', { status: 'active', ...query }, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  async listClasses(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('classes', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listSchedules(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('class_schedules', query, { orderBy: 'scheduledAt', order: 'asc', ...options })
  },

  async listEnrollments(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('enrollments', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listMembers(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('members', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listTeachers(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('teachers', { status: 'active', ...query }, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  async listOrders(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('orders', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listProducts(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('products', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listCoupons(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('coupons', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listBanners(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('banners', query, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  async listNotices(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('notices', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listExams(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('exams', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listQuestionBanks(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('question_banks', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listCertificates(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('certificates', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  async listAttendances(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('attendances', query, { orderBy: 'date', order: 'desc', ...options })
  },
}

export default adminApi
