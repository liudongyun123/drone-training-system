/**
 * 报名管理服务
 * 处理课程报名、调课申请、出勤记录等功能
 * 版本：v20260413-fix-parse
 */

import app from '../config/tcb'
import type { Enrollment, AttendanceRecord, Schedule, PaginationParams } from '../types/service'
import { membersService } from './membersService'
import { parseCloudFunctionListResponse } from '@/utils/safeData'

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
      console.error('报名管理服务错误:', error)
    }
    throw error
  }
}

/**
 * 安全解析云函数列表响应
 */
function parseListResponse(response: any, page: number = 1, pageSize: number = 20): { list: any[]; total: number } {
  if (!response) return { list: [], total: 0 };
  
  // 处理直接返回数组的情况
  if (Array.isArray(response)) {
    return { list: response, total: response.length };
  }
  
  // 处理 { data: [...] } 格式
  if (response.data && Array.isArray(response.data)) {
    return { list: response.data, total: response.total || response.data.length };
  }
  
  // 处理 { list: [...] } 格式
  if (response.list && Array.isArray(response.list)) {
    return { list: response.list, total: response.total || response.list.length };
  }
  
  return { list: [], total: 0 };
}

/**
 * 报名管理服务
 */
export const enrollmentService = {
  /**
   * 获取报名列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await callAdminFunction('list', {
        collection: 'enrollments',
        query,
        options
      })

      // 解析云函数响应
      const { list, total } = parseListResponse(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
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
    return await callAdminFunction('get', {
      collection: 'enrollments',
      docId: enrollmentId
    })
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

    const result = await callAdminFunction('add', {
      collection: 'enrollments',
      data: enrollmentData
    })

    // ★ 报名成功后，授予课程权限
    if (result?.code === 0 && data.phone && data.courseId) {
      try {
        await membersService.grantCoursePermission(data.phone, data.courseId, {
          source: 'enrollment',
          enrollmentId: result.data?._id || result.data?.id
        })
        console.log('[enrollmentService] 报名成功，课程权限已授予:', { phone: data.phone, courseId: data.courseId })
      } catch (err) {
        console.error('[enrollmentService] 授予课程权限失败:', err)
        // 不阻塞主流程，仅记录错误
      }
    }

    return result
  },

  /**
   * 更新报名记录
   */
  async update(enrollmentId: string, data: Partial<Enrollment>) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('update', {
      collection: 'enrollments',
      docId: enrollmentId,
      data: updateData
    })
  },

  /**
   * 取消报名
   */
  async cancel(enrollmentId: string, reason: string) {
    return await callAdminFunction('update', {
      collection: 'enrollments',
      docId: enrollmentId,
      data: {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString()
      }
    })
  },

  /**
   * 获取用户的报名列表
   */
  async getUserEnrollments(userId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await callAdminFunction('list', {
        collection: 'enrollments',
        query: {
          userId,
          ...query
        },
        options
      })

      const { list, total } = parseCloudFunctionListResponse<Enrollment>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
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
      const result = await callAdminFunction('list', {
        collection: 'enrollments',
        query: {
          courseId,
          ...query
        },
        options
      })

      const { list, total } = parseCloudFunctionListResponse<Enrollment>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
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

/**
 * 调课管理服务
 */
export const scheduleChangeService = {
  /**
   * 获取调课申请列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const result = await callAdminFunction('list', {
      collection: 'schedule_changes',
      query,
      options
    }) as { data: unknown[]; total: number }

    return {
      code: 0,
      data: {
        list: result.data || [],
        total: result.total || 0
      }
    }
  },

  /**
   * 获取调课申请详情
   */
  async getDetail(changeId: string) {
    return await callAdminFunction('get', {
      collection: 'schedule_changes',
      docId: changeId
    })
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

    return await callAdminFunction('add', {
      collection: 'schedule_changes',
      data: changeData
    })
  },

  /**
   * 更新调课申请
   */
  async update(changeId: string, data: Record<string, unknown>) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('update', {
      collection: 'schedule_changes',
      docId: changeId,
      data: updateData
    })
  },

  /**
   * 审批调课申请
   */
  async approve(changeId: string, approved: boolean, remark: string, approverId: string) {
    return await callAdminFunction('update', {
      collection: 'schedule_changes',
      docId: changeId,
      data: {
        status: approved ? 'approved' : 'rejected',
        approverId,
        approveTime: new Date().toISOString(),
        approveRemark: remark
      }
    })
  },

  /**
   * 撤销调课申请
   */
  async cancel(changeId: string, reason: string) {
    return await callAdminFunction('update', {
      collection: 'schedule_changes',
      docId: changeId,
      data: {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString()
      }
    })
  },

  /**
   * 获取用户的调课申请列表
   */
  async getUserChanges(userId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    return await callAdminFunction('list', {
      collection: 'schedule_changes',
      query: {
        userId,
        ...query
      },
      options
    })
  },

  /**
   * 获取待审批的调课申请列表
   */
  async getPendingApprovals(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    return await callAdminFunction('list', {
      collection: 'schedule_changes',
      query: {
        status: 'pending',
        ...query
      },
      options
    })
  }
}

/**
 * 出勤管理服务
 */
export const attendanceService = {
  /**
   * 获取出勤记录列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await callAdminFunction('list', {
        collection: 'attendance_records',
        query,
        options
      })

      const { list, total } = parseCloudFunctionListResponse<AttendanceRecord>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
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
    return await callAdminFunction('get', {
      collection: 'attendance_records',
      docId: attendanceId
    })
  },

  /**
   * 创建出勤记录
   */
  async create(data: Partial<AttendanceRecord>) {
    const attendanceData = {
      ...data,
      attendanceStatus: data.attendanceStatus || 'present',
      checkInTime: new Date().toISOString(),
      duration: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('add', {
      collection: 'attendance_records',
      data: attendanceData
    })
  },

  /**
   * 更新出勤记录
   */
  async update(attendanceId: string, data: Partial<AttendanceRecord>) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('update', {
      collection: 'attendance_records',
      docId: attendanceId,
      data: updateData
    })
  },

  /**
   * 签到
   */
  async checkIn(scheduleId: string, userId: string, courseId: string, enrollmentId: string, teacherId: string) {
    return await callAdminFunction('add', {
      collection: 'attendance_records',
      data: {
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
      }
    })
  },

  /**
   * 签退
   */
  async checkOut(attendanceId: string) {
    const attendance = await this.getDetail(attendanceId) as { data: AttendanceRecord }
    const checkInTime = new Date(attendance.data.checkInTime)
    const checkOutTime = new Date()
    const duration = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / 1000 / 60)

    return await callAdminFunction('update', {
      collection: 'attendance_records',
      docId: attendanceId,
      data: {
        checkOutTime: checkOutTime.toISOString(),
        duration,
        updatedAt: new Date().toISOString()
      }
    })
  },

  /**
   * 获取排课的出勤记录
   */
  async getScheduleAttendance(scheduleId: string, query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await callAdminFunction('list', {
        collection: 'attendance_records',
        query: {
          scheduleId,
          ...query
        },
        options
      })

      const { list, total } = parseCloudFunctionListResponse<AttendanceRecord>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取排课出勤记录失败:', error)
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
      const result = await callAdminFunction('list', {
        collection: 'attendance_records',
        query: {
          userId,
          ...query
        },
        options
      })

      const { list, total } = parseCloudFunctionListResponse<AttendanceRecord>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取用户出勤记录失败:', error)
      return {
        code: -1,
        message: error.message || '获取用户出勤记录失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 导出出勤统计
   */
  async exportStatistics(scheduleId: string) {
    // 获取排课信息
    const schedule = await callAdminFunction('list', {
      collection: 'course_schedules',
      query: { _id: scheduleId },
      options: { limit: 1 }
    }) as { data: Schedule[] }

    // 获取出勤记录
    const attendanceList = await this.getScheduleAttendance(scheduleId) as { data: AttendanceRecord[] }
    const records = attendanceList.data || []

    // 统计数据
    const statistics = {
      schedule: schedule.data?.[0],
      total: records.length,
      present: records.filter(r => r.attendanceStatus === 'present').length,
      absent: records.filter(r => r.attendanceStatus === 'absent').length,
      late: records.filter(r => r.attendanceStatus === 'late').length,
      leave: records.filter(r => r.attendanceStatus === 'leave').length,
      records
    }

    return {
      code: 0,
      message: '导出成功',
      data: statistics
    }
  }
}

export default {
  enrollmentService,
  scheduleChangeService,
  attendanceService
}
