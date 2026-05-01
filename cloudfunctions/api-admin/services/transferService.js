/**
 * 调课服务 - 符合生产规范的调课申请管理
 */

const Validator = require('../lib/validator')
const ApiResponse = require('../lib/response')

class TransferService {
  constructor(db, _) {
    this.db = db
    this._
  }

  /**
   * 获取调课申请列表
   */
  async list(options = {}, userFilter = {}) {
    const { page = 1, pageSize = 20, status, transferType } = options

    const paginationResult = Validator.pagination({ page, pageSize })
    if (!paginationResult.valid) {
      return ApiResponse.error(400, paginationResult.error)
    }

    let query = { ...userFilter }

    // 状态筛选
    if (status && status !== 'all') {
      query.status = status
    }

    // 类型筛选
    if (transferType && transferType !== 'all') {
      query.transferType = transferType
    }

    const skip = (paginationResult.page - 1) * paginationResult.pageSize

    const result = await this.db.collection('transfer_requests')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(paginationResult.pageSize)
      .get()

    const countResult = await this.db.collection('transfer_requests')
      .where(query)
      .count()

    return ApiResponse.paginated(
      result.data,
      countResult.total,
      paginationResult.page,
      paginationResult.pageSize,
      '查询成功'
    )
  }

  /**
   * 获取调课申请详情
   */
  async get(requestId) {
    const idValidation = Validator.id(requestId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const result = await this.db.collection('transfer_requests')
      .doc(requestId)
      .get()

    if (!result.data || result.data.length === 0) {
      return ApiResponse.error(404, '申请不存在')
    }

    return ApiResponse.success(result.data[0], '查询成功')
  }

  /**
   * 创建调课申请
   */
  async create(data) {
    const validation = Validator.validate(data, {
      studentId: { required: true },
      originalScheduleId: { required: true },
      transferType: { required: true, enum: ['time', 'teacher', 'location', 'course', 'leave'] },
      reason: { required: true, min: 5, max: 500 }
    })

    if (!validation.valid) {
      return ApiResponse.error(400, validation.errors.join('; '))
    }

    const now = new Date().toISOString()
    const requestData = {
      studentId: data.studentId,
      studentName: data.studentName || '',
      studentPhone: data.studentPhone || '',
      originalScheduleId: data.originalScheduleId,
      originalCourseId: data.originalCourseId || '',
      originalCourseName: data.originalCourseName || '',
      originalDate: data.originalDate || '',
      originalTime: data.originalTime || '',
      originalTeacher: data.originalTeacher || '',
      originalTeacherId: data.originalTeacherId || '',
      originalLocation: data.originalLocation || '',
      targetScheduleId: data.targetScheduleId || '',
      targetCourseId: data.targetCourseId || '',
      targetCourseName: data.targetCourseName || '',
      targetDate: data.targetDate || '',
      targetTime: data.targetTime || '',
      targetTeacher: data.targetTeacher || '',
      targetTeacherId: data.targetTeacherId || '',
      targetLocation: data.targetLocation || '',
      transferType: data.transferType,
      reason: data.reason.trim(),
      remark: data.remark || '',
      status: 'pending',
      isRead: false,
      notificationSent: false,
      createdAt: now,
      updatedAt: now
    }

    const result = await this.db.collection('transfer_requests').add(requestData)

    return ApiResponse.success({
      id: result.id,
      ...requestData
    }, '调课申请提交成功')
  }

  /**
   * 审核调课申请
   */
  async review(requestId, data, adminInfo) {
    const idValidation = Validator.id(requestId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const validation = Validator.validate(data, {
      status: { required: true, enum: ['approved', 'rejected'] },
      adminReply: { min: 0, max: 500 }
    })

    if (!validation.valid) {
      return ApiResponse.error(400, validation.errors.join('; '))
    }

    // 检查申请状态
    const existing = await this.db.collection('transfer_requests')
      .doc(requestId)
      .get()

    if (!existing.data || existing.data.length === 0) {
      return ApiResponse.error(404, '申请不存在')
    }

    if (existing.data[0].status !== 'pending') {
      return ApiResponse.error(409, '只能审核待处理的申请')
    }

    const updateData = {
      status: data.status,
      adminId: adminInfo.userId,
      adminName: adminInfo.userName || '管理员',
      adminReply: data.adminReply || '',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.db.collection('transfer_requests')
      .doc(requestId)
      .update(updateData)

    const statusText = data.status === 'approved' ? '已通过' : '已拒绝'
    return ApiResponse.success({ id: requestId, ...updateData }, `调课申请${statusText}`)
  }

  /**
   * 取消调课申请
   */
  async cancel(requestId, userId) {
    const idValidation = Validator.id(requestId)
    if (!idValidation.valid) {
      return ApiResponse.error(400, idValidation.error)
    }

    const existing = await this.db.collection('transfer_requests')
      .doc(requestId)
      .get()

    if (!existing.data || existing.data.length === 0) {
      return ApiResponse.error(404, '申请不存在')
    }

    const request = existing.data[0]

    // 检查是否是申请人本人
    if (request.studentId !== userId) {
      return ApiResponse.error(403, '只能取消自己的调课申请')
    }

    if (request.status !== 'pending') {
      return ApiResponse.error(409, '只能取消待处理的申请')
    }

    await this.db.collection('transfer_requests')
      .doc(requestId)
      .update({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })

    return ApiResponse.success(null, '申请已取消')
  }

  /**
   * 统计调课申请
   */
  async statistics() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [pending, approved, rejected, monthCount] = await Promise.all([
      this.db.collection('transfer_requests').where({ status: 'pending' }).count(),
      this.db.collection('transfer_requests').where({ status: 'approved' }).count(),
      this.db.collection('transfer_requests').where({ status: 'rejected' }).count(),
      this.db.collection('transfer_requests')
        .where({ createdAt: { $gte: startOfMonth } })
        .count()
    ])

    return ApiResponse.success({
      pending: pending.total,
      approved: approved.total,
      rejected: rejected.total,
      monthTotal: monthCount.total
    }, '统计成功')
  }
}

module.exports = TransferService
