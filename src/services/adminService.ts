/**
 * 管理后台服务 - 简化版 v7.0
 * 
 * 使用 api-admin 云函数的基本 CRUD 操作
 * 支持: list, get, add, update, delete, count
 */

import { ensureInit } from '@/utils/cloudbase'

const CLOUD_FUNCTION_NAME = 'api-admin'

async function callAdminFunction(action: string, params: Record<string, unknown> = {}) {
  try {
    await ensureInit()
    const { getCloudbaseApp } = await import('@/utils/cloudbase')
    const app = getCloudbaseApp()
    
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, ...params }
    })

    const response = result.result as { code: number; message?: string; data?: unknown }

    if (response.code !== 0) {
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error) {
    console.error(`[adminService] ${action} 失败:`, error)
    throw error
  }
}

export const adminService = {
  // ==================== 通用 CRUD ====================
  
  list: (collection: string, query: Record<string, unknown> = {}, options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection, query, ...options })
  },

  get: (collection: string, id: string) => {
    return callAdminFunction('get', { collection, id })
  },

  add: (collection: string, data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection, data })
  },

  update: (collection: string, id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection, id, data })
  },

  delete: (collection: string, id: string) => {
    return callAdminFunction('delete', { collection, id })
  },

  count: (collection: string, query: Record<string, unknown> = {}) => {
    return callAdminFunction('count', { collection, query })
  },

  // ==================== 便捷方法 ====================
  
  // 课程
  listCourses: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'courses', ...options })
  },

  getCourse: (id: string) => {
    return callAdminFunction('get', { collection: 'courses', id })
  },

  createCourse: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'courses', data })
  },

  updateCourse: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'courses', id, data })
  },

  deleteCourse: (id: string) => {
    return callAdminFunction('delete', { collection: 'courses', id })
  },

  // 班级
  listClasses: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'classes', ...options })
  },

  getClass: (id: string) => {
    return callAdminFunction('get', { collection: 'classes', id })
  },

  createClass: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'classes', data })
  },

  updateClass: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'classes', id, data })
  },

  deleteClass: (id: string) => {
    return callAdminFunction('delete', { collection: 'classes', id })
  },

  // 排课
  listSchedules: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'class_schedules', ...options })
  },

  getSchedule: (id: string) => {
    return callAdminFunction('get', { collection: 'class_schedules', id })
  },

  createSchedule: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'class_schedules', data })
  },

  updateSchedule: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'class_schedules', id, data })
  },

  deleteSchedule: (id: string) => {
    return callAdminFunction('delete', { collection: 'class_schedules', id })
  },

  // 报名
  listEnrollments: (query: Record<string, unknown> = {}, options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'enrollments', query, ...options })
  },

  getEnrollment: (id: string) => {
    return callAdminFunction('get', { collection: 'enrollments', id })
  },

  createEnrollment: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'enrollments', data })
  },

  updateEnrollment: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'enrollments', id, data })
  },

  // 学员
  listMembers: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'members', ...options })
  },

  getMember: (id: string) => {
    return callAdminFunction('get', { collection: 'members', id })
  },

  createMember: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'members', data })
  },

  updateMember: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'members', id, data })
  },

  // 教师
  listTeachers: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'teachers', ...options })
  },

  getTeacher: (id: string) => {
    return callAdminFunction('get', { collection: 'teachers', id })
  },

  createTeacher: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'teachers', data })
  },

  updateTeacher: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'teachers', id, data })
  },

  // 订单
  listOrders: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'orders', ...options })
  },

  getOrder: (id: string) => {
    return callAdminFunction('get', { collection: 'orders', id })
  },

  // 优惠券
  listCoupons: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'coupons', ...options })
  },

  getCoupon: (id: string) => {
    return callAdminFunction('get', { collection: 'coupons', id })
  },

  createCoupon: (data: Record<string, unknown>) => {
    return callAdminFunction('add', { collection: 'coupons', data })
  },

  updateCoupon: (id: string, data: Record<string, unknown>) => {
    return callAdminFunction('update', { collection: 'coupons', id, data })
  },

  // 轮播图
  listBanners: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'banners', ...options })
  },

  // 分类
  listCategories: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'categories', ...options })
  },

  // 考试
  listExams: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'exams', ...options })
  },

  // 题库
  listBankQuestions: (options: Record<string, unknown> = {}) => {
    return callAdminFunction('list', { collection: 'bankQuestions', ...options })
  },
}

export default adminService
