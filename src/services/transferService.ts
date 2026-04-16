/**
 * 调课请求服务 v1.0
 * 版本: v20260406-production
 * 
 * 功能:
 * - 学员提交调课申请
 * - 查询调课记录
 * - 取消申请
 */
import app from '../config/tcb'

const CLOUD_FUNCTION_NAME = 'transfer-request'

// 错误日志开关（开发时设为 true）
const ENABLE_ERROR_LOG = true

/**
 * 调用调课云函数
 */
async function callFunction(action: string, data: Record<string, unknown> = {}, options?: Record<string, unknown>) {
  try {
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, ...data, options }
    })

    const response = result.result as { code: number; message?: string; data?: unknown }

    if (response.code !== 0) {
      if (ENABLE_ERROR_LOG) {
        console.error(`[调课服务] ${action} 失败:`, response)
      }
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error: any) {
    if (ENABLE_ERROR_LOG) {
      console.error(`[调课服务] ${action} 异常:`, error)
    }
    throw error
  }
}

/**
 * 调课请求服务
 */
export const transferService = {
  // =========================================================================
  // 学员端接口
  // =========================================================================

  /**
   * 创建调课申请
   */
  async createRequest(data: {
    studentId: string
    studentName?: string
    studentPhone?: string
    originalScheduleId: string
    originalCourseId?: string
    originalCourseName?: string
    originalDate?: string
    originalTime?: string
    originalTeacher?: string
    originalTeacherId?: string
    originalLocation?: string
    targetScheduleId?: string
    targetCourseId?: string
    targetCourseName?: string
    targetDate?: string
    targetTime?: string
    targetTeacher?: string
    targetTeacherId?: string
    targetLocation?: string
    transferType: 'time' | 'teacher' | 'location' | 'course' | 'leave'
    reason: string
    remark?: string
  }) {
    if (!data.studentId) {
      throw new Error('学员ID不能为空')
    }
    if (!data.originalScheduleId) {
      throw new Error('原排课ID不能为空')
    }
    if (!data.transferType) {
      throw new Error('调课类型不能为空')
    }
    if (!data.reason || data.reason.trim().length < 5) {
      throw new Error('调课原因至少5个字符')
    }

    const result = await callFunction('createRequest', data)
    return result
  },

  /**
   * 查询我的调课申请
   */
  async listMyRequests(params: {
    studentId?: string
    phone?: string
    status?: 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'
    transferType?: 'all' | 'time' | 'teacher' | 'location' | 'course' | 'leave'
    page?: number
    pageSize?: number
  }) {
    if (!params.studentId && !params.phone) {
      throw new Error('学员ID或手机号不能都为空')
    }

    const result = await callFunction('listMyRequests', {
      studentId: params.studentId,
      phone: params.phone,
      status: params.status,
      transferType: params.transferType
    }, {
      page: params.page || 1,
      pageSize: params.pageSize || 20
    })

    return result
  },

  /**
   * 取消调课申请
   */
  async cancelRequest(requestId: string, studentId: string) {
    if (!requestId) {
      throw new Error('申请ID不能为空')
    }

    const result = await callFunction('cancelRequest', {
      studentId
    }, { requestId })
    return result
  },

  /**
   * 检查排课冲突
   */
  async checkConflict(studentId: string, targetScheduleId: string, excludeRequestId?: string) {
    const result = await callFunction('checkConflict', {
      studentId,
      targetScheduleId,
      excludeRequestId
    })
    return result
  },

  /**
   * 获取可选的排课列表
   */
  async getAvailableSchedules(params: {
    courseId?: string
    excludeScheduleId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) {
    const result = await callFunction('getAvailableSchedules', params)
    return result
  },

  // =========================================================================
  // 管理端接口（前端调用，但使用 admin 云函数）
  // =========================================================================

  /**
   * 查询所有调课申请（管理端）
   */
  async listAllRequests(params: {
    status?: 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'
    transferType?: 'all' | 'time' | 'teacher' | 'location' | 'course' | 'leave'
    keyword?: string
    startDate?: string
    endDate?: string
    studentId?: string
    page?: number
    pageSize?: number
  } = {}) {
    const result = await callFunction('listAllRequests', {}, {
      ...params,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      needStats: true
    })
    return result
  },

  /**
   * 获取调课申请详情
   */
  async getRequestDetail(requestId: string) {
    if (!requestId) {
      throw new Error('申请ID不能为空')
    }
    const result = await callFunction('getRequestDetail', {}, { requestId })
    return result
  },

  /**
   * 审核通过调课申请
   */
  async approveRequest(requestId: string, adminInfo: {
    adminId?: string
    adminName?: string
    adminReply?: string
  } = {}) {
    if (!requestId) {
      throw new Error('申请ID不能为空')
    }
    const result = await callFunction('approveRequest', {
      ...adminInfo,
      autoUpdateAttendance: true
    }, { requestId })
    return result
  },

  /**
   * 审核拒绝调课申请
   */
  async rejectRequest(requestId: string, adminInfo: {
    adminId?: string
    adminName?: string
    adminReply: string
  }) {
    if (!requestId) {
      throw new Error('申请ID不能为空')
    }
    if (!adminInfo.adminReply || adminInfo.adminReply.trim().length < 2) {
      throw new Error('请填写拒绝原因')
    }
    const result = await callFunction('rejectRequest', adminInfo, { requestId })
    return result
  },

  /**
   * 批量审核通过
   */
  async batchApprove(requestIds: string[], adminInfo: {
    adminId?: string
    adminName?: string
    adminReply?: string
  } = {}) {
    if (!requestIds || requestIds.length === 0) {
      throw new Error('请选择要通过的申请')
    }
    const result = await callFunction('batchApprove', adminInfo, { requestIds })
    return result
  },

  /**
   * 批量审核拒绝
   */
  async batchReject(requestIds: string[], adminInfo: {
    adminId?: string
    adminName?: string
    adminReply: string
  }) {
    if (!requestIds || requestIds.length === 0) {
      throw new Error('请选择要拒绝的申请')
    }
    if (!adminInfo.adminReply || adminInfo.adminReply.trim().length < 2) {
      throw new Error('请填写拒绝原因')
    }
    const result = await callFunction('batchReject', adminInfo, { requestIds })
    return result
  },

  /**
   * 获取统计数据
   */
  async getStats() {
    const result = await callFunction('getStats')
    return result
  }
}

// 导出类型
export type TransferRequest = {
  _id?: string
  id?: string
  studentId: string
  studentName: string
  studentPhone: string
  originalScheduleId: string
  originalCourseId: string
  originalCourseName: string
  originalDate: string
  originalTime: string
  originalTeacher: string
  originalTeacherId: string
  originalLocation: string
  targetScheduleId?: string
  targetCourseId?: string
  targetCourseName?: string
  targetDate?: string
  targetTime?: string
  targetTeacher?: string
  targetTeacherId?: string
  targetLocation?: string
  transferType: 'time' | 'teacher' | 'location' | 'course' | 'leave'
  reason: string
  remark?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  adminId?: string
  adminName?: string
  adminReply?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export type TransferStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  today: number
  thisWeek: number
  thisMonth: number
  byType: Record<string, number>
  approvalRate: number
}

export default transferService
