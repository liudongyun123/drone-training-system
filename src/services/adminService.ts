// @ts-nocheck
/**
 * 管理后台统一服务 - 生产级别 v8.0
 * 
 * 统一的数据访问层，通过 HTTP 方式访问 db-init 云函数
 * 解决 Web 端 CloudBase SDK 数据库访问问题
 */

import axios, { AxiosInstance } from 'axios'
import { API_BASE_URL, REQUEST_TIMEOUT } from '@/config/api'
import type { DbQuery, QueryOptions, ListData, CloudFunctionResponse } from '@/types/admin'

const DB_INIT_URL = `${API_BASE_URL}/db-init`

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

// 操作日志：在数据访问层统一记录后台增删改操作，写入 system_logs 集合。
// 这样「操作日志」模块才会有真实数据（而非仅登录/登出）。
async function recordOperationLog(
  module: string,
  operation: string,
  message: string,
  extra: Record<string, unknown> = {}
): Promise<void> {
  try {
    await httpClient.post('/db-init', {
      action: 'add',
      collection: 'system_logs',
      data: {
        level: 'info',
        module,
        operation,
        message,
        ...extra,
        createdAt: new Date().toISOString(),
      },
    })
  } catch (e) {
    // 日志写入失败不影响主业务流程
  }
}

async function httpRequest<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  // ★ 统一走 /db-init 云函数（与小程序一致）；根路径 / 无 HTTP 触发器，会返回 INVALID_PATH
  const response = await httpClient.post('/db-init', { action, ...params }) as Record<string, unknown>
  
  if (response && typeof response === 'object' && response.code !== undefined && response.code !== 0) {
    console.error(`[adminService] ${action} 返回错误:`, response)
  }
  
  return response as T
}

export interface ListResponse<T = unknown> {
  list: T[]
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
  async list<T = unknown>(collection: string, query: DbQuery = {}, options: QueryOptions = {}): Promise<{ code: number; data: ListResponse<T> }> {
    const { skip, limit, orderBy, order, page, pageSize } = options
    
    const result = await httpRequest<CloudFunctionResponse<T[]> & { total: number; skip: number; limit: number }>('query', {
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
  async get<T = unknown>(collection: string, id: string): Promise<{ code: number; data: T }> {
    const result = await httpRequest<CloudFunctionResponse<T>>('get', { collection, id })
    return { code: result.code ?? 0, data: result.data as T }
  },

  /**
   * 添加记录
   */
  async add(collection: string, data: Record<string, unknown>): Promise<{ code: number; data: { id: string }; message?: string }> {
    const result = await httpRequest<{ code?: number; data?: { id?: string }; id?: string; message?: string }>('add', { collection, data })
    const code = result?.code ?? -1
    const id = result?.data?.id || result?.id || ''
    const message = result?.message || ''
    if (code !== 0) {
      console.error('[adminService] add 失败:', JSON.stringify(result))
      return { code, data: { id }, message: message || '添加失败' }
    }
    if (!id) {
      console.warn('[adminService] add 返回的 id 为空, result:', JSON.stringify(result))
    }
    // 记录操作日志（跳过日志集合自身，避免递归）
    if (collection !== 'system_logs') {
      void recordOperationLog(collection, 'create', `新增 ${collection} 记录${id ? ` (${id})` : ''}`)
    }
    return { code: 0, data: { id }, message }
  },

  /**
   * 更新记录
   */
  async update(collection: string, id: string, data: Record<string, unknown>): Promise<{ code: number; message?: string }> {
    const result = await httpRequest<{ code?: number; message?: string }>('update', { collection, id, data })
    const code = result?.code ?? -1
    if (code !== 0) {
      console.error('[adminService] update 失败:', JSON.stringify(result))
      return { code, message: result?.message || '更新失败' }
    }
    // 记录操作日志（跳过日志集合自身，避免递归）
    if (collection !== 'system_logs') {
      void recordOperationLog(collection, 'update', `更新 ${collection} 记录 (${id})`)
    }
    return { code: 0 }
  },

  /**
   * 删除记录
   */
  async delete(collection: string, id: string): Promise<{ code: number; message?: string }> {
    const result = await httpRequest<{ code?: number; message?: string }>('delete', { collection, id })
    const code = result?.code ?? -1
    if (code !== 0) {
      console.error('[adminService] delete 失败:', JSON.stringify(result))
      return { code, message: result?.message || '删除失败' }
    }
    // 记录操作日志（跳过日志集合自身，避免递归）
    if (collection !== 'system_logs') {
      void recordOperationLog(collection, 'delete', `删除 ${collection} 记录 (${id})`)
    }
    return { code: 0 }
  },

  /**
   * 统计数量
   */
  async count(collection: string, query: DbQuery = {}): Promise<{ code: number; data: number }> {
    const result = await httpRequest<CloudFunctionResponse & { total: number }>('count', { collection, query })
    return { code: 0, data: result.total || 0 }
  },

  // ==================== 高级查询方法（支持操作符）====================

  /**
   * 查询列表（支持 MongoDB 风格操作符 $gt/$lt/$in/$or/$regex 等）
   */
  async listWithOps<T = unknown>(collection: string, query: DbQuery = {}, options: QueryOptions = {}): Promise<{ code: number; data: ListResponse<T> }> {
    const { skip, limit, orderBy, order, page, pageSize } = options
    
    const result = await httpRequest<CloudFunctionResponse<unknown[]> & { total: number; skip: number; limit: number }>('query', {
      collection,
      query,
      useOperators: true,
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
   * 统计（支持 MongoDB 风格操作符）
   */
  async countWithOps(collection: string, query: DbQuery = {}): Promise<{ code: number; data: number }> {
    const result = await httpRequest<CloudFunctionResponse & { total: number }>('count', { collection, query, useOperators: true })
    return { code: 0, data: result.total || 0 }
  },

  /**
   * 更新（支持 MongoDB 风格操作符 $inc/$addToSet/$push 等）
   */
  async updateWithOps(collection: string, id: string, data: Record<string, unknown>): Promise<{ code: number }> {
    await httpRequest('update', { collection, id, data, useOperators: true })
    return { code: 0 }
  },

  // ==================== 便捷方法 ====================
  
  // 课程
  listCourses: (options: QueryOptions = {}) => adminService.list('courses', {}, options),
  getCourse: (id: string) => adminService.get('courses', id),
  createCourse: (data: Record<string, unknown>) => adminService.add('courses', data),
  updateCourse: (id: string, data: Record<string, unknown>) => adminService.update('courses', id, data),
  deleteCourse: (id: string) => adminService.delete('courses', id),

  // 班级
  listClasses: (options: Record<string, any> = {}) => adminService.list('classes', {}, options),
  getClass: (id: string) => adminService.get('classes', id),
  createClass: (data: Record<string, any>) => adminService.add('classes', data),
  updateClass: (id: string, data: Record<string, any>) => adminService.update('classes', id, data),
  deleteClass: (id: string) => adminService.delete('classes', id),

  // 分类
  listCategories: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('categories', { status: 'active', ...query }, { orderBy: 'sort', order: 'asc', ...options }),
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

  // 用户（统一使用 members 集合）
  listUsers: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('members', query, options),
  getUser: (id: string) => adminService.get('members', id),
  createUser: (data: Record<string, any>) => adminService.add('members', data),
  updateUser: (id: string, data: Record<string, any>) => adminService.update('members', id, data),

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

  // 体系 - 不再默认过滤状态，由调用方决定
  listSources: (query: Record<string, any> = {}, options: Record<string, any> = {}) => adminService.list('sources', query, { orderBy: 'sortOrder', order: 'asc', ...options }),
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

  // ==================== 云函数调用 ====================

  /**
   * 调用 admin 云函数（自定义 action）
   * 用于数据修复等特殊操作
   */
  async callAdminFunction(action: string, data: Record<string, any> = {}): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/admin`, { action, ...data })
      return response.data
    } catch (error: any) {
      console.error('[callAdminFunction] 调用失败:', error.message)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 通用云函数 HTTP 调用
   * 替代 app.callFunction()，统一走 HTTP
   */
  async callFunction(functionName: string, data: Record<string, any> = {}): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${functionName}`, data)
      return response.data
  } catch (error: any) {
    console.error(`[callFunction] ${functionName} 调用失败:`, error.message)
    return { code: -1, success: false, message: error.message }
  }
  },
}

export default adminService
