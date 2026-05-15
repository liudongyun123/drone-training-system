/**
 * 班级管理服务 v3.0
 * 版本: v20260515-unified
 * 
 * 统一使用 CloudDBService (HTTP → db-init)
 */

import { CloudDBService } from './CloudDBService'
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
import type { PaginatedResult } from '../types/service'

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
      const result = await CloudDBService.query<Class>('classes', {
        where: query,
        orderBy: 'startDate',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { 
          list: result.data, 
          total: result.total, 
          page, 
          pageSize 
        }
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
    try {
      const result = await CloudDBService.get<Class>('classes', classId)
      
      if (!result) {
        throw new Error('班级不存在')
      }

      // 获取班级的排课列表
      const schedulesResult = await this.getClassSchedules(classId)
      
      return {
        code: 0,
        data: {
          ...result,
          schedules: schedulesResult.data || []
        } as Class
      }
    } catch (error: any) {
      console.error('获取班级详情失败:', error)
      throw error
    }
  },

  /**
   * 创建班级
   */
  async create(data: CreateClassRequest): Promise<{ code: number; data: { id: string } }> {
    try {
      const classData = {
        ...data,
        enrolledCount: 0,
        status: 'enrolling' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await CloudDBService.add('classes', classData)

      return {
        code: 0,
        data: { id: result!.id }
      }
    } catch (error: any) {
      console.error('创建班级失败:', error)
      throw error
    }
  },

  /**
   * 更新班级
   */
  async update(classId: string, data: UpdateClassRequest): Promise<{ code: number }> {
    try {
      await CloudDBService.update('classes', classId, {
        ...data,
        updatedAt: new Date().toISOString()
      })

      return { code: 0 }
    } catch (error: any) {
      console.error('更新班级失败:', error)
      throw error
    }
  },

  /**
   * 删除班级
   */
  async delete(classId: string): Promise<{ code: number }> {
    try {
      await CloudDBService.delete('classes', classId)
      return { code: 0 }
    } catch (error: any) {
      console.error('删除班级失败:', error)
      throw error
    }
  },

  /**
   * 获取课程的班级列表
   */
  async getClassesByCourse(courseId: string): Promise<{ code: number; data: Class[] }> {
    try {
      const result = await CloudDBService.query<Class>('classes', {
        where: { courseId },
        limit: 100
      })
      return { code: 0, data: result.data }
    } catch (error) {
      return { code: 0, data: [] }
    }
  },

  // ============ 排课管理 ============

  /**
   * 获取班级的排课列表
   */
  async getClassSchedules(classId: string): Promise<{ code: number; data: ClassSchedule[] }> {
    try {
      const result = await CloudDBService.query<ClassSchedule>('class_schedules', {
        where: { classId },
        orderBy: 'date',
        order: 'asc',
        limit: 100
      })

      return {
        code: 0,
        data: result.data
      }
    } catch (error: any) {
      console.error('获取班级排课失败:', error)
      return {
        code: -1,
        message: error.message || '获取班级排课失败',
        data: []
      }
    }
  },

  /**
   * 获取排课详情
   */
  async getScheduleById(scheduleId: string): Promise<{ code: number; data: ClassSchedule }> {
    try {
      const result = await CloudDBService.get<ClassSchedule>('class_schedules', scheduleId)
      if (!result) {
        throw new Error('排课不存在')
      }
      return { code: 0, data: result }
    } catch (error: any) {
      console.error('获取排课详情失败:', error)
      throw error
    }
  },

  /**
   * 创建排课
   */
  async createSchedule(data: CreateScheduleRequest): Promise<{ code: number; data: { id: string } }> {
    try {
      const scheduleData = {
        ...data,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const result = await CloudDBService.add('class_schedules', scheduleData)

      // 更新班级的排课数量
      await this.updateScheduleCount(data.classId)

      return {
        code: 0,
        data: { id: result!.id }
      }
    } catch (error: any) {
      console.error('创建排课失败:', error)
      throw error
    }
  },

  /**
   * 批量创建排课
   */
  async createSchedulesBatch(params: BatchCreateScheduleRequest): Promise<{ code: number; data: { inserted: number; ids: string[] } }> {
    try {
      const { classId, startDate, endDate, startTime, endTime, repeatType, repeatDays, excludeDates = [] } = params
      
      // 生成日期列表
      const dates: string[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      const excludeSet = new Set(excludeDates)
      
      const current = new Date(start)
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

      const result = await CloudDBService.batchAdd('class_schedules', schedules)

      // 更新班级的排课数量
      await this.updateScheduleCount(classId)

      return {
        code: 0,
        data: { 
          inserted: result.filter(r => r.success).length, 
          ids: result.map(r => r.id) 
        }
      }
    } catch (error: any) {
      console.error('批量创建排课失败:', error)
      throw error
    }
  },

  /**
   * 更新排课
   */
  async updateSchedule(scheduleId: string, data: Partial<ClassSchedule>): Promise<{ code: number }> {
    try {
      await CloudDBService.update('class_schedules', scheduleId, {
        ...data,
        updatedAt: new Date().toISOString()
      })

      return { code: 0 }
    } catch (error: any) {
      console.error('更新排课失败:', error)
      throw error
    }
  },

  /**
   * 删除排课
   */
  async deleteSchedule(scheduleId: string, classId: string): Promise<{ code: number }> {
    try {
      await CloudDBService.delete('class_schedules', scheduleId)

      // 更新班级的排课数量
      await this.updateScheduleCount(classId)

      return { code: 0 }
    } catch (error: any) {
      console.error('删除排课失败:', error)
      throw error
    }
  },

  /**
   * 更新班级排课数量
   */
  async updateScheduleCount(classId: string): Promise<void> {
    try {
      const count = await CloudDBService.count('class_schedules', { classId })

      await CloudDBService.update('classes', classId, {
        scheduleCount: count,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('更新排课数量失败:', error)
    }
  },

  // ============ 调课功能 ============

  /**
   * 调课 - 修改排课时间/地点
   */
  async reschedule(scheduleId: string, newData: { date?: string; startTime?: string; endTime?: string; location?: string; reason?: string }): Promise<{ code: number }> {
    try {
      // 获取原排课信息
      const original = await this.getScheduleById(scheduleId)
      
      // 创建调课记录
      await CloudDBService.add('schedule_changes', {
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
      })

      // 更新排课
      await this.updateSchedule(scheduleId, {
        date: newData.date || original.data.date,
        startTime: newData.startTime || original.data.startTime,
        endTime: newData.endTime || original.data.endTime,
        location: newData.location || original.data.location
      })

      return { code: 0 }
    } catch (error: any) {
      console.error('调课失败:', error)
      throw error
    }
  },

  // ============ 统计 ============

  /**
   * 获取班级统计
   */
  async getStatistics(): Promise<{ code: number; data: ClassStatistics }> {
    try {
      const [total, enrolling, inProgress, completed, cancelled] = await Promise.all([
        CloudDBService.count('classes'),
        CloudDBService.count('classes', { status: 'enrolling' }),
        CloudDBService.count('classes', { status: 'in_progress' }),
        CloudDBService.count('classes', { status: 'completed' }),
        CloudDBService.count('classes', { status: 'cancelled' })
      ])

      return {
        code: 0,
        data: {
          totalClasses: total,
          enrollingCount: enrolling,
          inProgressCount: inProgress,
          completedCount: completed,
          cancelledCount: cancelled,
          totalStudents: 0,
          totalRevenue: 0
        }
      }
    } catch (error: any) {
      console.error('获取班级统计失败:', error)
      return {
        code: -1,
        data: {
          totalClasses: 0,
          enrollingCount: 0,
          inProgressCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          totalStudents: 0,
          totalRevenue: 0
        }
      }
    }
  }
}

export default classService
