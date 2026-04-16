/**
 * 教师管理服务
 * 处理教师档案、排课、出勤统计等功能
 * 版本：v20260404-refactor
 */

import app from '../config/tcb'
import type { Teacher, Schedule, PaginationParams } from '../types/service'

const CLOUD_FUNCTION_NAME = 'admin'

// 错误日志开关（生产环境设为 false）
const ENABLE_ERROR_LOG = false

/**
 * 调用管理后台云函数
 */
async function callAdminFunction(action: string, params: Record<string, unknown> = {}) {
  try {
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: {
        ...params,
        action
      }
    })

    const response = result.result as { code: number; message?: string; data?: unknown }

    if (response.code !== 0) {
      if (ENABLE_ERROR_LOG) {
        console.error(`云函数调用失败:`, response)
      }
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error) {
    if (ENABLE_ERROR_LOG) {
      console.error('教师管理服务错误:', error)
    }
    throw error
  }
}

/**
 * 教师管理服务
 */
export const teacherService = {
  /**
   * 获取教师列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const result = await callAdminFunction('list', {
      collection: 'teacher_profiles',
      query,
      options
    }) as { code: number; data: unknown[] | { list: Teacher[]; total: number }; total?: number }

    // 解析云函数返回的数据
    // 云函数返回格式: { code: 0, data: [数组], total: 4 }
    // 需要转换为: { code: 0, data: { list: [数组], total: 4 } }
    let dataArray: Teacher[] = []
    let total = 0
    
    // 情况1: data 是数组
    if (Array.isArray(result.data)) {
      dataArray = result.data as Teacher[]
      total = (result as any).total || dataArray.length
    } 
    // 情况2: data 是对象
    else if (result.data && typeof result.data === 'object') {
      const dataObj = result.data as { list?: Teacher[]; total?: number }
      dataArray = dataObj.list || []
      total = dataObj.total || 0
    }

    return {
      code: 0,
      data: {
        list: dataArray,
        total: total
      }
    }
  },

  /**
   * 获取教师详情
   */
  async getDetail(teacherId: string) {
    return await callAdminFunction('get', {
      collection: 'teacher_profiles',
      docId: teacherId
    })
  },

  /**
   * 创建教师档案
   */
  async create(data: Partial<Teacher>) {
    const teacherData = {
      ...data,
      rating: data.rating || 0,
      totalHours: data.totalHours || 0,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('add', {
      collection: 'teacher_profiles',
      data: teacherData
    })
  },

  /**
   * 更新教师档案
   */
  async update(teacherId: string, data: Partial<Teacher>) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('update', {
      collection: 'teacher_profiles',
      docId: teacherId,
      data: updateData
    })
  },

  /**
   * 删除教师档案
   */
  async delete(teacherId: string) {
    return await callAdminFunction('delete', {
      collection: 'teacher_profiles',
      docId: teacherId
    })
  },

  /**
   * 获取教师排课列表
   */
  async getScheduleList(teacherId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    return await callAdminFunction('list', {
      collection: 'course_schedules',
      query: {
        teacherId,
        ...query
      },
      options
    })
  },

  /**
   * 获取教师统计数据
   */
  async getStatistics(teacherId: string, year: number, month: number) {
    return await callAdminFunction('list', {
      collection: 'statistics_teacher',
      query: {
        teacherId,
        year,
        month
      },
      options: {
        limit: 1
      }
    })
  },

  /**
   * 获取教师的所有课程
   */
  async getCourses(teacherId: string) {
    return await callAdminFunction('list', {
      collection: 'courses',
      query: {
        teacherId
      },
      options: {
        orderBy: 'createTime',
        order: 'desc'
      }
    })
  }
}

export default teacherService
