/**
 * 班级管理服务 v2.0
 * 版本: v20260410-refactor
 * 
 * 业务逻辑:
 * - 班级(Class)是线下培训的最小单元
 * - 排课(Schedule)从属于班级
 * - 线下报名关联班级，线上购买关联课程
 */

import app from '../config/tcb'
import type { 
  Class, 
  ClassSchedule, 
  CreateClassRequest, 
  UpdateClassRequest,
  CreateScheduleRequest,
  BatchCreateScheduleRequest,
  ClassQueryParams,
  ScheduleQueryParams,
  ClassStatistics
} from '../types/class'
import type { PaginatedResult, PaginationParams } from '../types/service'
import { safeGetList, safeGetTotal, parseCloudFunctionListResponse } from '@/utils/safeData'

const CLOUD_FUNCTION_NAME = 'api-admin'

// 错误日志开关
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
      console.error('班级管理服务错误:', error)
    }
    throw error
  }
}

/**
 * 班级管理服务
 */
export const classService = {
  // ============ 班级 CRUD ============
  
  /**
   * 获取班级列表
   */
  async getList(params: ClassQueryParams = {}): Promise<{ code: number; data: PaginatedResult<Class>; message?: string }> {
    const { page = 1, pageSize = 20, ...query } = params
    
    try {
      const result = await callAdminFunction('list', {
        collection: 'classes',
        query,
        options: { page, pageSize, orderBy: 'startDate', order: 'desc' }
      })

      // 安全获取列表数据
      const list = safeGetList(result)
      const total = safeGetTotal(result)

      return {
        code: 0,
        data: { list, total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取班级列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取班级列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取班级详情
   */
  async getById(classId: string): Promise<{ code: number; data: Class }> {
    const result = await callAdminFunction('get', {
      collection: 'classes',
      docId: classId
    }) as { data: Class }

    // 获取班级的排课列表
    const schedulesResult = await this.getClassSchedules(classId)
    
    return {
      code: 0,
      data: {
        ...result.data,
        schedules: schedulesResult.data || []
      }
    }
  },

  /**
   * 创建班级
   */
  async create(data: CreateClassRequest): Promise<{ code: number; data: { id: string } }> {
    const classData = {
      ...data,
      enrolledCount: 0,
      status: 'enrolling' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await callAdminFunction('add', {
      collection: 'classes',
      data: classData
    }) as { data: { id: string } }

    return {
      code: 0,
      data: { id: result.data?.id }
    }
  },

  /**
   * 更新班级
   */
  async update(classId: string, data: UpdateClassRequest): Promise<{ code: number }> {
    await callAdminFunction('update', {
      collection: 'classes',
      docId: classId,
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      }
    })

    return { code: 0 }
  },

  /**
   * 删除班级
   */
  async delete(classId: string): Promise<{ code: number }> {
    await callAdminFunction('delete', {
      collection: 'classes',
      docId: classId
    })

    return { code: 0 }
  },

  /**
   * 获取课程的班级列表
   * 注意：当前系统中班级与课程没有直接关联，返回空数组
   * 如需关联，需扩展 class 表添加 courseId 字段
   */
  async getClassesByCourse(courseId: string): Promise<{ code: number; data: Class[] }> {
    // 班级与课程无直接关联，暂时返回空
    // 如果业务需要关联，应在创建班级时指定关联的课程
    return { code: 0, data: [] };
  },

  // ============ 排课管理 ============

  /**
   * 获取班级的排课列表
   */
  async getClassSchedules(classId: string): Promise<{ code: number; data: ClassSchedule[] }> {
    try {
      const result = await callAdminFunction('list', {
        collection: 'class_schedules',
        query: { classId },
        options: { orderBy: 'date', order: 'asc' }
      })

      // 使用统一响应解析函数
      // @ts-ignore
      const { list } = parseCloudFunctionListResponse<ClassSchedule>(result)

      return {
        code: 0,
        data: list
      }
    } catch (error: any) {
      console.error('获取班级排课失败:', error)
      return {
        code: -1,
        // @ts-ignore
        message: error.message || '获取班级排课失败',
        data: []
      }
    }
  },

  /**
   * 获取排课详情
   */
  async getScheduleById(scheduleId: string): Promise<{ code: number; data: ClassSchedule }> {
    const result = await callAdminFunction('get', {
      collection: 'class_schedules',
      docId: scheduleId
    }) as { data: ClassSchedule }

    return {
      code: 0,
      data: result.data
    }
  },

  /**
   * 创建排课
   */
  async createSchedule(data: CreateScheduleRequest): Promise<{ code: number; data: { id: string } }> {
    const scheduleData = {
      ...data,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await callAdminFunction('add', {
      collection: 'class_schedules',
      data: scheduleData
    }) as { data: { id: string } }

    // 更新班级的排课数量
    await this.updateScheduleCount(data.classId)

    return {
      code: 0,
      data: { id: result.data?.id }
    }
  },

  /**
   * 批量创建排课
   */
  async createSchedulesBatch(params: BatchCreateScheduleRequest): Promise<{ code: number; data: { inserted: number; ids: string[] } }> {
    const { classId, startDate, endDate, startTime, endTime, repeatType, repeatDays, excludeDates = [] } = params
    
    // 生成日期列表
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const excludeSet = new Set(excludeDates)
    
    let current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      
      if (!excludeSet.has(dateStr)) {
        const dayOfWeek = current.getDay()
        
        if (repeatType === 'daily') {
          dates.push(dateStr)
        } else if (repeatType === 'weekly' && repeatDays?.includes(dayOfWeek)) {
          dates.push(dateStr)
        }
      }
      
      current.setDate(current.getDate() + 1)
    }

    // 批量创建
    const schedules = dates.map(date => ({
      classId,
      date,
      startTime,
      endTime,
      title: params.title,
      content: params.content,
      location: params.location,
      teacherId: params.teacherId,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }))

    const result = await callAdminFunction('batchAdd', {
      collection: 'class_schedules',
      batchData: schedules
    }) as { data: { inserted: number; ids: string[] } }

    // 更新班级的排课数量
    await this.updateScheduleCount(classId)

    return {
      code: 0,
      data: result.data
    }
  },

  /**
   * 更新排课
   */
  async updateSchedule(scheduleId: string, data: Partial<ClassSchedule>): Promise<{ code: number }> {
    await callAdminFunction('update', {
      collection: 'class_schedules',
      docId: scheduleId,
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      }
    })

    return { code: 0 }
  },

  /**
   * 删除排课
   */
  async deleteSchedule(scheduleId: string, classId: string): Promise<{ code: number }> {
    await callAdminFunction('delete', {
      collection: 'class_schedules',
      docId: scheduleId
    })

    // 更新班级的排课数量
    await this.updateScheduleCount(classId)

    return { code: 0 }
  },

  /**
   * 更新班级排课数量
   */
  async updateScheduleCount(classId: string): Promise<void> {
    const countResult = await callAdminFunction('count', {
      collection: 'class_schedules',
      query: { classId }
    }) as { data: number }

    await callAdminFunction('update', {
      collection: 'classes',
      docId: classId,
      data: {
        scheduleCount: countResult.data || 0,
        updatedAt: new Date().toISOString()
      }
    })
  },

  // ============ 调课功能 ============

  /**
   * 调课 - 修改排课时间/地点
   */
  async reschedule(scheduleId: string, newData: { date?: string; startTime?: string; endTime?: string; location?: string; reason?: string }): Promise<{ code: number }> {
    // 获取原排课信息
    const original = await this.getScheduleById(scheduleId)
    
    // 创建调课记录
    await callAdminFunction('add', {
      collection: 'schedule_changes',
      data: {
        scheduleId,
        classId: original.data.classId,
        originalDate: original.data.date,
        originalStartTime: original.data.startTime,
        originalEndTime: original.data.endTime,
        originalLocation: original.data.location,
        newDate: newData.date,
        newStartTime: newData.startTime,
        newEndTime: newData.endTime,
        newLocation: newData.location,
        reason: newData.reason,
        status: 'completed',
        changedAt: new Date().toISOString()
      }
    })

    // 更新排课
    await this.updateSchedule(scheduleId, {
      date: newData.date || original.data.date,
      startTime: newData.startTime || original.data.startTime,
      endTime: newData.endTime || original.data.endTime,
      location: newData.location || original.data.location
    })

    return { code: 0 }
  },

  // ============ 统计 ============

  /**
   * 获取班级统计
   */
  async getStatistics(): Promise<{ code: number; data: ClassStatistics }> {
    const [total, enrolling, inProgress, completed, cancelled] = await Promise.all([
      callAdminFunction('count', { collection: 'classes' }),
      callAdminFunction('count', { collection: 'classes', query: { status: 'enrolling' } }),
      callAdminFunction('count', { collection: 'classes', query: { status: 'in_progress' } }),
      callAdminFunction('count', { collection: 'classes', query: { status: 'completed' } }),
      callAdminFunction('count', { collection: 'classes', query: { status: 'cancelled' } })
    ])

    return {
      code: 0,
      data: {
        totalClasses: (total as any)?.data || 0,
        enrollingCount: (enrolling as any)?.data || 0,
        inProgressCount: (inProgress as any)?.data || 0,
        completedCount: (completed as any)?.data || 0,
        cancelledCount: (cancelled as any)?.data || 0,
        totalStudents: 0,  // 需要通过聚合计算
        totalRevenue: 0
      }
    }
  }
}

export default classService
