/**
 * 管理后台 API 服务 - 生产级别
 * 
 * 通过 HTTP 方式访问 db-init 云函数
 * 解决 Web 端无法直接使用 CloudBase SDK 数据库 API 的问题
 */

import axios, { AxiosInstance } from 'axios'

// API 基础配置
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
const DB_INIT_URL = `${API_BASE}/db-init`

// 请求超时配置
const REQUEST_TIMEOUT = 30000

// 创建 Axios 实例
const httpClient: AxiosInstance = axios.create({
  baseURL: DB_INIT_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
httpClient.interceptors.request.use(
  (config) => {
    // 添加请求时间戳
    config.headers['X-Request-Time'] = Date.now().toString()
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
httpClient.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code !== 0) {
      throw new Error(data.message || '请求失败')
    }
    return data
  },
  (error) => {
    if (error.response) {
      throw new Error(`服务器错误: ${error.response.status}`)
    }
    if (error.request) {
      throw new Error('网络连接失败')
    }
    throw error
  }
)

// ==================== 类型定义 ====================

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

// ==================== 通用 CRUD API ====================

export const adminApi = {
  /**
   * 查询列表
   */
  async list<T>(
    collection: string,
    query: Record<string, any> = {},
    options: QueryOptions = {}
  ): Promise<ListResponse<T>> {
    // 使用 POST 请求确保 query 对象能正确传递
    const response = await httpClient.post<ApiResponse<T[]>>('', {
      action: 'query',
      collection,
      query,
      ...Object.fromEntries(
        Object.entries(options).filter(([, v]) => v !== undefined)
      ),
    })
    return {
      data: response.data || [],
      total: response.total || 0,
      skip: response.skip || 0,
      limit: response.limit || 20,
    }
  },

  /**
   * 获取单条记录
   */
  async get<T>(collection: string, id: string): Promise<T | null> {
    const response = await httpClient.post<ApiResponse<T>>('', {
      action: 'get',
      collection,
      id,
    })
    return response.data || null
  },

  /**
   * 创建记录
   */
  async add(collection: string, data: Record<string, any>): Promise<{ id: string }> {
    const response = await httpClient.post<ApiResponse<{ id: string }>>('', {
      action: 'add',
      collection,
      data,
    })
    return response.data
  },

  /**
   * 更新记录
   */
  async update(collection: string, id: string, data: Record<string, any>): Promise<void> {
    await httpClient.post('', {
      action: 'update',
      collection,
      id,
      data,
    })
  },

  /**
   * 删除记录
   */
  async delete(collection: string, id: string): Promise<void> {
    await httpClient.post('', {
      action: 'delete',
      collection,
      id,
    })
  },

  /**
   * 统计数量
   */
  async count(collection: string, query: Record<string, any> = {}): Promise<number> {
    const response = await httpClient.post<ApiResponse<{ total: number }>>('', {
      action: 'count',
      collection,
      query,
    })
    return response.total || 0
  },

  // ==================== 专用业务 API ====================

  // 等级管理
  async listLevels(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('levels', query, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  // 体系管理（sources 集合）
  async listSources(options?: QueryOptions) {
    return this.list('sources', { status: 'active' }, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  // 课程管理
  async listCourses(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('courses', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 分类管理
  async listCategories(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('categories', { status: 'active', ...query }, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  // 班级管理
  async listClasses(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('classes', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 排课管理
  async listSchedules(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('class_schedules', query, { orderBy: 'scheduledAt', order: 'asc', ...options })
  },

  // 报名管理
  async listEnrollments(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('enrollments', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 学员管理
  async listMembers(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('members', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 教师管理
  async listTeachers(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('teachers', { status: 'active', ...query }, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  // 订单管理
  async listOrders(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('orders', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 商品管理
  async listProducts(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('products', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 优惠券管理
  async listCoupons(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('coupons', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 轮播图管理
  async listBanners(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('banners', query, { orderBy: 'sortOrder', order: 'asc', ...options })
  },

  // 公告管理
  async listNotices(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('notices', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 考试管理
  async listExams(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('exams', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 题库管理
  async listQuestionBanks(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('question_banks', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 证书管理
  async listCertificates(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('certificates', query, { orderBy: 'createdAt', order: 'desc', ...options })
  },

  // 考勤管理
  async listAttendances(query: Record<string, any> = {}, options?: QueryOptions) {
    return this.list('attendances', query, { orderBy: 'date', order: 'desc', ...options })
  },
}

export default adminApi
