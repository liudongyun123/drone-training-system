/**
 * Web API 服务 - 统一前端数据访问层
 * 
 * 对外提供班级、排课、调课等 Web 端所需的数据操作
 * 内部通过 classService / enrollmentService / transferService / adminService 访问 db-init 云函数
 */

import { classService } from './classService'
import { enrollmentService } from './enrollmentService'
import { transferService } from './transferService'
import { adminService } from './adminService'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 班级相关 API
 */
export const classApi = {
  /**
   * 获取班级列表
   */
  async getClasses(params: {
    page?: number
    pageSize?: number
    status?: string | string[]
    keyword?: string
    courseId?: string
    teacherId?: string
  } = {}): Promise<ApiResponse<{ list: any[]; total: number; page: number; pageSize: number }>> {
    try {
      const { code, data } = await classService.getList(params)
      return {
        success: code === 0,
        data: data as any,
      }
    } catch (error: any) {
      return { success: false, error: error.message || '获取班级列表失败' }
    }
  },

  /**
   * 获取班级详情
   */
  async getClassDetail(classId: string): Promise<ApiResponse<any>> {
    try {
      const { code, data } = await classService.getById(classId)
      return { success: code === 0, data }
    } catch (error: any) {
      return { success: false, error: error.message || '获取班级详情失败' }
    }
  },

  /**
   * 班级报名
   */
  async enroll(data: {
    classId: string
    userName: string
    phone: string
    idCard?: string
    emergencyContact?: string
    emergencyPhone?: string
    notes?: string
    userId?: string
  }): Promise<ApiResponse<any>> {
    try {
      const enrollmentData = {
        classId: data.classId,
        studentName: data.userName,
        phone: data.phone,
        idCard: data.idCard,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        notes: data.notes,
        studentId: data.userId,
        status: 'active' as const,
      }

      const { code } = await enrollmentService.create(enrollmentData)
      return { success: code === 0 }
    } catch (error: any) {
      return { success: false, error: error.message || '报名失败' }
    }
  }
}

/**
 * 排课相关 API
 */
export const scheduleApi = {
  /**
   * 获取排课列表
   */
  async getSchedules(params: {
    page?: number
    pageSize?: number
    classId?: string
    courseId?: string
    teacherId?: string
    status?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<ApiResponse<{ list: any[]; total: number; page: number; pageSize: number }>> {
    try {
      const query: Record<string, any> = {}
      if (params.classId) query.classId = params.classId
      if (params.courseId) query.courseId = params.courseId
      if (params.teacherId) query.teacherId = params.teacherId
      if (params.status) query.status = params.status

      const { code, data } = await adminService.listSchedules(query, {
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      })

      return {
        success: code === 0,
        data: data as any,
      }
    } catch (error: any) {
      return { success: false, error: error.message || '获取排课列表失败' }
    }
  },

  /**
   * 获取我的排课（根据用户ID或手机号，查询其所有班级的排课）
   */
  async getMySchedules(params: {
    userId?: string
    phone?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ list: any[]; total: number; page: number; pageSize: number }>> {
    try {
      const { userId, phone, page = 1, pageSize = 100 } = params

      // 收集用户的班级ID列表
      const classIds = new Set<string>()

      // 1. 从 class_members 查询
      if (userId || phone) {
        const memberQuery: Record<string, any> = {}
        if (userId) memberQuery.studentId = userId
        if (phone) memberQuery.studentPhone = phone

        const { data: membersData } = await adminService.list('class_members', memberQuery, { pageSize: 500 })
        if (membersData?.list) {
          for (const m of membersData.list) {
            if (m.classId) classIds.add(m.classId)
          }
        }
      }

      // 2. 从 registrations 兜底查询
      if (userId || phone) {
        const regQuery: Record<string, any> = {}
        if (userId) regQuery.studentId = userId
        if (phone) regQuery.phone = phone

        const { data: regData } = await adminService.list('registrations', regQuery, { pageSize: 500 })
        if (regData?.list) {
          for (const r of regData.list) {
            if (r.classId) classIds.add(r.classId)
          }
        }
      }

      if (classIds.size === 0) {
        return { success: true, data: { list: [], total: 0, page, pageSize } }
      }

      // 3. 查询所有关联班级的排课
      const query = { classId: { $in: Array.from(classIds) } }
      const { code, data } = await adminService.listSchedules(query, { page, pageSize })

      return {
        success: code === 0,
        data: data as any,
      }
    } catch (error: any) {
      return { success: false, error: error.message || '获取我的排课失败' }
    }
  }
}

/**
 * 调课申请相关 API
 */
export const transferApi = {
  /**
   * 获取调课申请列表
   */
  async getRequests(params: {
    userId?: string
    phone?: string
    page?: number
    pageSize?: number
    status?: string
  } = {}): Promise<ApiResponse<{ list: any[]; total: number; page: number; pageSize: number }>> {
    try {
      const statusParam = (params.status && params.status !== 'all')
        ? (params.status as 'pending' | 'approved' | 'rejected' | 'cancelled')
        : 'all'

      const { code, data, total, page, pageSize } = await transferService.listMyRequests({
        studentId: params.userId,
        phone: params.phone,
        status: statusParam,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      })

      return {
        success: code === 0,
        data: { list: data as any[], total: total || 0, page: page || 1, pageSize: pageSize || 20 },
      }
    } catch (error: any) {
      return { success: false, error: error.message || '获取调课申请列表失败' }
    }
  },

  /**
   * 创建调课申请
   */
  async createRequest(data: {
    fromClassId?: string
    fromScheduleId?: string
    toClassId?: string
    toScheduleId?: string
    reason: string
    userId?: string
    userName?: string
    phone?: string
  }): Promise<ApiResponse<any>> {
    try {
      const { code } = await transferService.createRequest({
        studentId: data.userId || '',
        studentName: data.userName,
        studentPhone: data.phone,
        originalScheduleId: data.fromScheduleId || '',
        targetScheduleId: data.toScheduleId,
        transferType: data.toClassId ? 'course' : 'time',
        reason: data.reason,
      })

      return { success: code === 0 }
    } catch (error: any) {
      return { success: false, error: error.message || '创建调课申请失败' }
    }
  },

  /**
   * 取消调课申请
   */
  async cancelRequest(requestId: string, userId?: string): Promise<ApiResponse<any>> {
    try {
      const { code } = await transferService.cancelRequest(requestId, userId || '')
      return { success: code === 0 }
    } catch (error: any) {
      return { success: false, error: error.message || '取消调课申请失败' }
    }
  }
}

export default {
  class: classApi,
  schedule: scheduleApi,
  transfer: transferApi
}
