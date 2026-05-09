/**
 * 管理后台统一服务 - 生产级别 v8.0
 * 
 * 统一的数据访问层，通过 HTTP 方式访问 db-init 云函数
 * 解决 Web 端 CloudBase SDK 数据库访问问题
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
    config.headers['X-Request-Time'] = Date.now().toString()
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
httpClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 返回错误对象而不是抛出，让调用方处理
    if (error.response) {
      return { code: error.response.status, message: `服务器错误: ${error.response.status}`, data: null }
    }
    if (error.request) {
      return { code: -1, message: '网络连接失败', data: null }
    }
    return { code: -1, message: error.message || '请求失败', data: null }
  }
)

// ==================== 通用 CRUD 操作 ====================

async function httpRequest<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  // 直接 post 返回响应拦截器的结果
  const response = await httpClient.post<T>('', { action, ...params })
  
  // 检查响应中是否有错误
  if (response && typeof response === 'object' && response.code !== undefined && response.code !== 0) {
    console.error(`[adminService] ${action} 返回错误:`, response)
  }
  
  return response as T
}

// 统一的列表查询
interface ListParams {
  collection: string
  query?: Record<string, any>
  skip?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

interface ListResponse {
  data: any[]
  total: number
  skip: number
  limit: number
}

// ==================== 导出统一服务 ====================

export const adminService = {
  // ==================== 通用 CRUD ====================
  
  /**
   * 查询列表
   */
  async list(collection: string, query: Record<string, any> = {}, options: Record<string, any> = {}): Promise<{ code: number; data: ListResponse }> {
    const { skip, limit, orderBy, order, page, pageSize } = options
    
    const result = await httpRequest<{ code: number; data: any[]; total: number; skip: number; limit: number }>('query', {
      collection,
      query,
      skip: skip ?? page ? ((page - 1) * (pageSize || limit || 20)) : 0,
      limit: limit ?? pageSize ?? 20,
      orderBy: orderBy ?? 'createdAt',
      order: order ?? 'desc',
    })
    
    return {
      code: 0,
      data: {
        list: result.data || [],
        total: result.total || 0,
        skip: result.skip || 0,
        limit: result.limit || 20,
      },
    }
  },

  /**
   * 获取单条记录
   */
  async get(collection: string, id: string): Promise<{ code: number; data: any }> {
    const result = await httpRequest<{ code: number; data: any }>('get', { collection, id })
    return result
  },

  /**
   * 添加记录
   */
  async add(collection: string, data: Record<string, any>): Promise<{ code: number; data: { id: string } }> {
    const result = await httpRequest<{ code: number; id: string }>('add', { collection, data })
    return { code: 0, data: { id: result.id } }
  },

  /**
   * 更新记录
   */
  async update(collection: string, id: string, data: Record<string, any>): Promise<{ code: number }> {
    await httpRequest('update', { collection, id, data })
    return { code: 0 }
  },

  /**
   * 删除记录
   */
  async delete(collection: string, id: string): Promise<{ code: number }> {
    await httpRequest('delete', { collection, id })
    return { code: 0 }
  },

  /**
   * 统计数量
   */
  async count(collection: string, query: Record<string, any> = {}): Promise<{ code: number; data: number }> {
    const result = await httpRequest<{ code: number; total: number }>('count', { collection, query })
    return { code: 0, data: result.total || 0 }
  },

  // ==================== 便捷方法 ====================
  
  // 课程
  listCourses: (options: Record<string, any> = {}) => adminService.list('courses', {}, options),
  getCourse: (id: string) => adminService.get('courses', id),
  createCourse: (data: Record<string, any>) => adminService.add('courses', data),
  updateCourse: (id: string, data: Record<string, any>) => adminService.update('courses', id, data),
  deleteCourse: (id: string) => adminService.delete('courses', id),

  // 班级
  listClasses: (options: Record<string, any> = {}) => adminService.list('classes', {}, options),
  getClass: (id: string) => adminService.get('classes', id),
  createClass: (data: Record<string, any>) => adminService.add('classes', data),
  updateClass: (id: string, data: Record<string, any>) => adminService.update('classes', id, data),
  deleteClass: (id: string) => adminService.delete('classes', id),

  // 分类
  listCategories: (options: Record<string, any> = {}) => adminService.list('categories', { status: 'active' }, options),
  getCategory: (id: string) => adminService.get('categories', id),
  createCategory: (data: Record<string, any>) => adminService.add('categories', data),
  updateCategory: (id: string, data: Record<string, any>) => adminService.update('categories', id, data),
  deleteCategory: (id: string) => adminService.delete('categories', id),

  // 教师
  listTeachers: (options: Record<string, any> = {}) => adminService.list('teachers', { status: 'active' }, options),
  getTeacher: (id: string) => adminService.get('teachers', id),
  createTeacher: (data: Record<string, any>) => adminService.add('teachers', data),
  updateTeacher: (id: string, data: Record<string, any>) => adminService.update('teachers', id, data),
  deleteTeacher: (id: string) => adminService.delete('teachers', id),

  // 订单
  listOrders: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('orders', query, options),
  getOrder: (id: string) => adminService.get('orders', id),
  createOrder: (data: Record<string, any>) => adminService.add('orders', data),
  updateOrder: (id: string, data: Record<string, any>) => adminService.update('orders', id, data),

  // 报名
  listEnrollments: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('enrollments', query, options),
  getEnrollment: (id: string) => adminService.get('enrollments', id),
  createEnrollment: (data: Record<string, any>) => adminService.add('enrollments', data),
  updateEnrollment: (id: string, data: Record<string, any>) => adminService.update('enrollments', id, data),

  // 会员
  listMembers: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('members', query, options),
  getMember: (id: string) => adminService.get('members', id),
  createMember: (data: Record<string, any>) => adminService.add('members', data),
  updateMember: (id: string, data: Record<string, any>) => adminService.update('members', id, data),

  // 用户
  listUsers: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('users', query, options),
  getUser: (id: string) => adminService.get('users', id),
  createUser: (data: Record<string, any>) => adminService.add('users', data),
  updateUser: (id: string, data: Record<string, any>) => adminService.update('users', id, data),

  // 排课
  listSchedules: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('class_schedules', query, options),
  getSchedule: (id: string) => adminService.get('class_schedules', id),
  createSchedule: (data: Record<string, any>) => adminService.add('class_schedules', data),
  updateSchedule: (id: string, data: Record<string, any>) => adminService.update('class_schedules', id, data),
  deleteSchedule: (id: string) => adminService.delete('class_schedules', id),

  // 考试
  listExams: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('exams', query, options),
  getExam: (id: string) => adminService.get('exams', id),
  createExam: (data: Record<string, any>) => adminService.add('exams', data),
  updateExam: (id: string, data: Record<string, any>) => adminService.update('exams', id, data),
  deleteExam: (id: string) => adminService.delete('exams', id),

  // 体系
  listSources: (options: Record<string, any> = {}) => adminService.list('sources', { status: 'active' }, options),
  getSource: (id: string) => adminService.get('sources', id),
  createSource: (data: Record<string, any>) => adminService.add('sources', data),
  updateSource: (id: string, data: Record<string, any>) => adminService.update('sources', id, data),
  deleteSource: (id: string) => adminService.delete('sources', id),

  // 等级
  listLevels: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('levels', query, { orderBy: 'sortOrder', order: 'asc', ...options }),
  getLevel: (id: string) => adminService.get('levels', id),
  createLevel: (data: Record<string, any>) => adminService.add('levels', data),
  updateLevel: (id: string, data: Record<string, any>) => adminService.update('levels', id, data),
  deleteLevel: (id: string) => adminService.delete('levels', id),

  // 商品
  listProducts: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('products', query, options),
  getProduct: (id: string) => adminService.get('products', id),
  createProduct: (data: Record<string, any>) => adminService.add('products', data),
  updateProduct: (id: string, data: Record<string, any>) => adminService.update('products', id, data),
  deleteProduct: (id: string) => adminService.delete('products', id),

  // 用户角色
  listUserRoles: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('user_roles', query, options),
  getUserRole: (id: string) => adminService.get('user_roles', id),
  createUserRole: (data: Record<string, any>) => adminService.add('user_roles', data),
  updateUserRole: (id: string, data: Record<string, any>) => adminService.update('user_roles', id, data),
  deleteUserRole: (id: string) => adminService.delete('user_roles', id),
}

export default adminService
