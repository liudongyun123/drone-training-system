/**
 * 报名管理服务 v3.0
 * 版本: v20260515-unified
 * 
 * 统一使用 CloudDBService (HTTP → db-init)
 */

import { CloudDBService } from './CloudDBService'
import type { Enrollment, AttendanceRecord, PaginationParams } from '../types/service'
import { membersService } from './membersService'

// ==================== 报名服务 ====================

export const enrollmentService = {
  /**
   * 获取报名列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<Enrollment>('enrollments', {
        where: query,
        orderBy: 'enrollmentTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取报名列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取报名列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取报名详情
   */
  async getDetail(enrollmentId: string) {
    try {
      const data = await CloudDBService.get<Enrollment>('enrollments', enrollmentId)
      return { code: 0, data }
    } catch (error: any) {
      console.error('获取报名详情失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 创建报名记录
   */
  async create(data: Partial<Enrollment>) {
    const enrollmentData = {
      ...data,
      enrollmentTime: new Date().toISOString(),
      status: 'active',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await CloudDBService.add('enrollments', enrollmentData)

    // ★ 报名成功后，授予课程权限
    if (result?.id && data.phone && data.courseId) {
      try {
        await membersService.grantCoursePermission(data.phone, data.courseId, {
          source: 'enrollment',
          enrollmentId: result.id
        })
        console.log('[enrollmentService] 报名成功，课程权限已授予:', { phone: data.phone, courseId: data.courseId })
      } catch (err) {
        console.error('[enrollmentService] 授予课程权限失败:', err)
      }
    }

    return { code: 0, data: { _id: result?.id || result?.id } }
  },

  /**
   * 更新报名记录
   */
  async update(enrollmentId: string, data: Partial<Enrollment>) {
    try {
      await CloudDBService.update('enrollments', enrollmentId, {
        ...data,
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      console.error('更新报名失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 取消报名
   */
  async cancel(enrollmentId: string, reason: string) {
    try {
      await CloudDBService.update('enrollments', enrollmentId, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      console.error('取消报名失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取用户的报名列表
   */
  async getUserEnrollments(userId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<Enrollment>('enrollments', {
        where: { userId, ...query },
        orderBy: 'enrollmentTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取用户报名列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取用户报名列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取课程的报名列表
   */
  async getCourseEnrollments(courseId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<Enrollment>('enrollments', {
        where: { courseId, ...query },
        orderBy: 'enrollmentTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取课程报名列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取课程报名列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  }
}

// ==================== 调课服务 ====================

export const scheduleChangeService = {
  /**
   * 获取调课申请列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query('schedule_changes', {
        where: query,
        orderBy: 'applyTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: {
          list: result.data || [],
          total: result.total || 0
        }
      }
    } catch (error: any) {
      console.error('获取调课申请列表失败:', error)
      return { code: -1, message: error.message, data: { list: [], total: 0 } }
    }
  },

  /**
   * 获取调课申请详情
   */
  async getDetail(changeId: string) {
    try {
      const data = await CloudDBService.get('schedule_changes', changeId)
      return { code: 0, data }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 创建调课申请
   */
  async create(data: Record<string, unknown>) {
    const changeData = {
      ...data,
      applyTime: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await CloudDBService.add('schedule_changes', changeData)
    return { code: 0, data: { _id: result?.id } }
  },

  /**
   * 更新调课申请
   */
  async update(changeId: string, data: Record<string, unknown>) {
    try {
      await CloudDBService.update('schedule_changes', changeId, {
        ...data,
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 审批调课申请
   */
  async approve(changeId: string, approved: boolean, remark: string, approverId: string) {
    try {
      await CloudDBService.update('schedule_changes', changeId, {
        status: approved ? 'approved' : 'rejected',
        approverId,
        approveTime: new Date().toISOString(),
        approveRemark: remark,
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 撤销调课申请
   */
  async cancel(changeId: string, reason: string) {
    try {
      await CloudDBService.update('schedule_changes', changeId, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取用户的调课申请列表
   */
  async getUserChanges(userId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    const result = await CloudDBService.query('schedule_changes', {
      where: { userId, ...query },
      orderBy: 'applyTime',
      order: 'desc',
      skip: (page - 1) * pageSize,
      limit: pageSize
    })

    return {
      code: 0,
      data: { list: result.data || [], total: result.total || 0 }
    }
  },

  /**
   * 获取待审批的调课申请列表
   */
  async getPendingApprovals(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    const result = await CloudDBService.query('schedule_changes', {
      where: { status: 'pending', ...query },
      orderBy: 'applyTime',
      order: 'desc',
      skip: (page - 1) * pageSize,
      limit: pageSize
    })

    return {
      code: 0,
      data: { list: result.data || [], total: result.total || 0 }
    }
  }
}

// ==================== 出勤服务 ====================

export const attendanceService = {
  /**
   * 获取出勤记录列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<AttendanceRecord>('attendance_records', {
        where: query,
        orderBy: 'checkInTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取出勤记录列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取出勤记录列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取出勤记录详情
   */
  async getDetail(attendanceId: string) {
    try {
      const data = await CloudDBService.get<AttendanceRecord>('attendance_records', attendanceId)
      return { code: 0, data }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 创建出勤记录
   */
  async create(data: Partial<AttendanceRecord>) {
    const attendanceData = {
      ...data,
      attendanceStatus: data.attendanceStatus || 'present',
      checkInTime: new Date().toISOString(),
      checkOutTime: '',
      duration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await CloudDBService.add('attendance_records', attendanceData)
    return { code: 0, data: { _id: result?.id } }
  },

  /**
   * 更新出勤记录
   */
  async update(attendanceId: string, data: Partial<AttendanceRecord>) {
    try {
      await CloudDBService.update('attendance_records', attendanceId, {
        ...data,
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 签到
   */
  async checkIn(scheduleId: string, userId: string, courseId: string, enrollmentId: string, teacherId: string) {
    const result = await CloudDBService.add('attendance_records', {
      scheduleId,
      userId,
      courseId,
      enrollmentId,
      teacherId,
      attendanceStatus: 'present',
      checkInTime: new Date().toISOString(),
      checkOutTime: '',
      duration: 0,
      remark: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    return { code: 0, data: { _id: result?.id } }
  },

  /**
   * 签退
   */
  async checkOut(attendanceId: string) {
    try {
      const attendance = await CloudDBService.get<AttendanceRecord>('attendance_records', attendanceId)
      if (!attendance) {
        return { code: -1, message: '出勤记录不存在' }
      }
      
      const checkInTime = new Date(attendance.checkInTime)
      const checkOutTime = new Date()
      const duration = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 1000 / 60)

      await CloudDBService.update('attendance_records', attendanceId, {
        checkOutTime: checkOutTime.toISOString(),
        duration,
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取排课的出勤记录
   */
  async getScheduleAttendance(scheduleId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<AttendanceRecord>('attendance_records', {
        where: { scheduleId, ...query },
        orderBy: 'checkInTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      return {
        code: -1,
        message: error.message || '获取排课出勤记录失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取用户的出勤记录
   */
  async getUserAttendance(userId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<AttendanceRecord>('attendance_records', {
        where: { userId, ...query },
        orderBy: 'checkInTime',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      return {
        code: -1,
        message: error.message || '获取用户出勤记录失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  }
}

export default {
  enrollmentService,
  scheduleChangeService,
  attendanceService
}
