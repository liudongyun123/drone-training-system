/**
 * 调课请求服务 v2.0
 * 版本: v20260515-unified
 * 统一使用 CloudDBService (HTTP → db-init)
 * 
 * 功能:
 * - 学员提交调课申请
 * - 查询调课记录
 * - 取消申请
 * - 管理端审核
 */
import { CloudDBService } from './CloudDBService'

const COLLECTION = 'transferRequests'

// 调课请求类型
export interface TransferRequest {
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

export interface TransferStats {
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

    const now = new Date().toISOString()
    const result = await CloudDBService.add<TransferRequest>(COLLECTION, {
      ...data,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    return { code: 0, data: { id: result.id } }
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

    const where: Record<string, any> = {}
    if (params.studentId) {
      where.studentId = params.studentId
    }
    if (params.phone) {
      where.studentPhone = params.phone
    }
    if (params.status && params.status !== 'all') {
      where.status = params.status
    }
    if (params.transferType && params.transferType !== 'all') {
      where.transferType = params.transferType
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const skip = (page - 1) * pageSize

    const result = await CloudDBService.query<TransferRequest>(COLLECTION, {
      where,
      orderBy: 'createdAt',
      order: 'desc',
      skip,
      limit: pageSize,
    })

    return {
      code: 0,
      data: result.data,
      total: result.total,
      page,
      pageSize,
    }
  },

  /**
   * 取消调课申请
   */
  async cancelRequest(requestId: string, studentId: string) {
    if (!requestId) {
      throw new Error('申请ID不能为空')
    }

    await CloudDBService.update(COLLECTION, requestId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    })

    return { code: 0, message: '取消成功' }
  },

  /**
   * 检查排课冲突
   */
  async checkConflict(studentId: string, targetScheduleId: string, excludeRequestId?: string) {
    const where: Record<string, any> = {
      studentId,
      targetScheduleId,
      status: { $in: ['pending', 'approved'] },
    }

    if (excludeRequestId) {
      where._id = { $ne: excludeRequestId }
    }

    const result = await CloudDBService.query<TransferRequest>(COLLECTION, {
      where,
      limit: 1,
    })

    return {
      code: 0,
      data: {
        hasConflict: result.data.length > 0,
        existingRequest: result.data[0] || null,
      },
    }
  },

  /**
   * 获取可选的排课列表（查询 schedules 集合）
   */
  async getAvailableSchedules(params: {
    courseId?: string
    excludeScheduleId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) {
    const where: Record<string, any> = {}

    if (params.courseId) {
      where.courseId = params.courseId
    }
    if (params.startDate) {
      where.date = { $gte: params.startDate }
    }
    if (params.endDate) {
      where.date = { ...where.date, $lte: params.endDate }
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 20

    const result = await CloudDBService.query('schedules', {
      where,
      orderBy: 'date',
      order: 'asc',
      skip: (page - 1) * pageSize,
      limit: pageSize,
    })

    return {
      code: 0,
      data: result.data,
      total: result.total,
    }
  },

  // =========================================================================
  // 管理端接口
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
    const where: Record<string, any> = {}

    if (params.status && params.status !== 'all') {
      where.status = params.status
    }
    if (params.transferType && params.transferType !== 'all') {
      where.transferType = params.transferType
    }
    if (params.studentId) {
      where.studentId = params.studentId
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {}
      if (params.startDate) {
        where.createdAt.$gte = params.startDate
      }
      if (params.endDate) {
        where.createdAt.$lte = params.endDate
      }
    }
    if (params.keyword) {
      where.$or = [
        { studentName: { $regex: params.keyword, $options: 'i' } },
        { studentPhone: { $regex: params.keyword, $options: 'i' } },
        { originalCourseName: { $regex: params.keyword, $options: 'i' } },
      ]
    }

    const page = params.page || 1
    const pageSize = params.pageSize || 20

    const result = await CloudDBService.query<TransferRequest>(COLLECTION, {
      where,
      orderBy: 'createdAt',
      order: 'desc',
      skip: (page - 1) * pageSize,
      limit: pageSize,
    })

    // 获取统计数据
    const stats = await this.getStats()

    return {
      code: 0,
      data: result.data,
      total: result.total,
      page,
      pageSize,
      stats,
    }
  },

  /**
   * 获取调课申请详情
   */
  async getRequestDetail(requestId: string) {
    if (!requestId) {
      throw new Error('申请ID不能为空')
    }

    const request = await CloudDBService.get<TransferRequest>(COLLECTION, requestId)

    if (!request) {
      throw new Error('申请不存在')
    }

    return { code: 0, data: request }
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

    const now = new Date().toISOString()

    await CloudDBService.update(COLLECTION, requestId, {
      status: 'approved',
      adminId: adminInfo.adminId,
      adminName: adminInfo.adminName || '管理员',
      adminReply: adminInfo.adminReply,
      reviewedAt: now,
      updatedAt: now,
    })

    // 如果有目标排课，更新出勤记录
    const request = await CloudDBService.get<TransferRequest>(COLLECTION, requestId)
    if (request?.targetScheduleId) {
      // 更新出勤记录
      await CloudDBService.updateWhere('attendance', {
        studentId: request.studentId,
        scheduleId: request.originalScheduleId,
      }, {
        scheduleId: request.targetScheduleId,
        updatedAt: now,
      })
    }

    return { code: 0, message: '审核通过' }
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

    const now = new Date().toISOString()

    await CloudDBService.update(COLLECTION, requestId, {
      status: 'rejected',
      adminId: adminInfo.adminId,
      adminName: adminInfo.adminName || '管理员',
      adminReply: adminInfo.adminReply,
      reviewedAt: now,
      updatedAt: now,
    })

    return { code: 0, message: '已拒绝' }
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

    const now = new Date().toISOString()

    for (const requestId of requestIds) {
      await CloudDBService.update(COLLECTION, requestId, {
        status: 'approved',
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminName || '管理员',
        adminReply: adminInfo.adminReply,
        reviewedAt: now,
        updatedAt: now,
      })
    }

    return { code: 0, message: `已通过 ${requestIds.length} 个申请` }
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

    const now = new Date().toISOString()

    for (const requestId of requestIds) {
      await CloudDBService.update(COLLECTION, requestId, {
        status: 'rejected',
        adminId: adminInfo.adminId,
        adminName: adminInfo.adminName || '管理员',
        adminReply: adminInfo.adminReply,
        reviewedAt: now,
        updatedAt: now,
      })
    }

    return { code: 0, message: `已拒绝 ${requestIds.length} 个申请` }
  },

  /**
   * 获取统计数据
   */
  async getStats(): Promise<TransferStats> {
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [total, pending, approved, rejected, todayCount, weekCount, monthCount] = await Promise.all([
      CloudDBService.count(COLLECTION, {}),
      CloudDBService.count(COLLECTION, { status: 'pending' }),
      CloudDBService.count(COLLECTION, { status: 'approved' }),
      CloudDBService.count(COLLECTION, { status: 'rejected' }),
      CloudDBService.count(COLLECTION, { createdAt: { $gte: today } }),
      CloudDBService.count(COLLECTION, { createdAt: { $gte: weekAgo } }),
      CloudDBService.count(COLLECTION, { createdAt: { $gte: monthAgo } }),
    ])

    // 按类型统计
    const byTypeResult = await CloudDBService.query(COLLECTION, {
      field: { transferType: true },
      limit: 1000,
    })
    const byType: Record<string, number> = {}
    byTypeResult.data.forEach((item: any) => {
      const type = item.transferType || 'unknown'
      byType[type] = (byType[type] || 0) + 1
    })

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

    return {
      total,
      pending,
      approved,
      rejected,
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      byType,
      approvalRate,
    }
  },
}

export default transferService
