/**
 * 管理后台服务 - 生产规范 v5.0
 * 
 * 使用统一的模块化 action 格式: {module}.{operation}
 * 同时提供通用 CRUD 方法供其他服务层使用
 * 
 * 模块列表:
 * - course: 课程管理 (list/get/create/update/delete)
 * - schedule: 排课管理 (list/get/create/update/delete)
 * - transfer: 调课申请 (list/get/create/review/cancel/statistics)
 * - dashboard: 仪表板 (stats/enrollmentTrend/courseRanking)
 * 
 * 通用 CRUD:
 * - list(collection, query, options): 列表查询
 * - get(collection, id): 单条查询
 * - add(collection, data): 创建
 * - update(collection, id, data): 更新
 * - delete(collection, id): 删除
 * - count(collection, query): 计数
 * - upsert(collection, id, data): 存在则更新，不存在则创建
 */

import { app } from '@/utils/cloudbase'

// ==================== 配置 ====================

const CLOUD_FUNCTION_NAME = import.meta.env.VUE_APP_ADMIN_FUNCTION || 'admin-http'

// ==================== 核心调用 ====================

async function callAdminFunction(action, params = {}) {
  try {
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, ...params }
    })

    const response = result.result

    if (response.code !== 0) {
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error) {
    console.error(`[adminService] ${action} 失败:`, error)
    throw error
  }
}

// ==================== 通用 CRUD 方法 ====================

/**
 * 通用 CRUD 操作 - 供其他服务层使用
 * 支持所有集合的通用增删改查操作
 */
export const adminService = {
  // ==================== 通用 CRUD ====================
  
  /**
   * 列表查询
   * @param collection 集合名称
   * @param query 查询条件 (可选)
   * @param options 选项 { limit, skip, page, orderBy, order } (可选)
   */
  list: (collection: string, query: Record<string, any> = {}, options: Record<string, any> = {}) => {
    return callAdminFunction('list', { collection, query, ...options })
  },

  /**
   * 单条查询
   * @param collection 集合名称
   * @param id 文档ID
   */
  get: (collection: string, id: string) => {
    return callAdminFunction('get', { collection, id })
  },

  /**
   * 创建记录
   * @param collection 集合名称
   * @param data 文档数据
   */
  add: (collection: string, data: Record<string, any>) => {
    return callAdminFunction('add', { collection, data })
  },

  /**
   * 更新记录
   * @param collection 集合名称
   * @param id 文档ID
   * @param data 更新数据
   */
  update: (collection: string, id: string, data: Record<string, any>) => {
    return callAdminFunction('update', { collection, id, data })
  },

  /**
   * 删除记录
   * @param collection 集合名称
   * @param id 文档ID
   */
  delete: (collection: string, id: string) => {
    return callAdminFunction('delete', { collection, id })
  },

  /**
   * 计数查询
   * @param collection 集合名称
   * @param query 查询条件 (可选)
   */
  count: (collection: string, query: Record<string, any> = {}) => {
    return callAdminFunction('count', { collection, query })
  },

  /**
   * 存在则更新，不存在则创建
   * @param collection 集合名称
   * @param id 文档ID
   * @param data 文档数据
   */
  upsert: (collection: string, id: string, data: Record<string, any>) => {
    return callAdminFunction('upsert', { collection, id, data })
  },

  // ==================== 课程管理 ====================
  
  /** 课程列表 */
  listCourses: (params = {}) => callAdminFunction('course.list', params),

  /** 课程详情 */
  getCourse: (courseId) => callAdminFunction('course.get', { id: courseId }),

  /** 创建课程 */
  createCourse: (data) => callAdminFunction('course.create', { data }),

  /** 更新课程 */
  updateCourse: (courseId, data) => callAdminFunction('course.update', { id: courseId, data }),

  /** 删除课程 */
  deleteCourse: (courseId) => callAdminFunction('course.delete', { id: courseId }),

  // ==================== 排课管理 ====================
  
  /** 排课列表 */
  listSchedules: (params = {}) => callAdminFunction('schedule.list', params),

  /** 排课详情 */
  getSchedule: (scheduleId) => callAdminFunction('schedule.get', { id: scheduleId }),

  /** 创建排课 */
  createSchedule: (data) => callAdminFunction('schedule.create', { data }),

  /** 更新排课 */
  updateSchedule: (scheduleId, data) => callAdminFunction('schedule.update', { id: scheduleId, data }),

  /** 删除排课 */
  deleteSchedule: (scheduleId) => callAdminFunction('schedule.delete', { id: scheduleId }),

  // ==================== 调课申请 ====================
  
  /** 调课申请列表 */
  listTransfers: (params = {}) => callAdminFunction('transfer.list', params),

  /** 调课申请详情 */
  getTransfer: (transferId) => callAdminFunction('transfer.get', { id: transferId }),

  /** 创建调课申请 */
  createTransfer: (data) => callAdminFunction('transfer.create', { data }),

  /** 审核调课申请 */
  reviewTransfer: (transferId, data) => callAdminFunction('transfer.review', { id: transferId, data }),

  /** 取消调课申请 */
  cancelTransfer: (transferId) => callAdminFunction('transfer.cancel', { id: transferId }),

  /** 调课统计 */
  getTransferStats: () => callAdminFunction('transfer.statistics'),

  // ==================== 仪表板 ====================
  
  /** 仪表板统计 */
  getDashboardStats: () => callAdminFunction('dashboard.stats'),

  /** 报名趋势 */
  getEnrollmentTrend: (params = {}) => callAdminFunction('dashboard.enrollmentTrend', params),

  /** 课程排名 */
  getCourseRanking: (limit = 10) => callAdminFunction('dashboard.courseRanking', { limit })
}

export default adminService
