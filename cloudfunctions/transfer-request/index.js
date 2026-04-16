/**
 * 调课请求管理云函数 v1.0
 * 版本: v20260406-production
 * 
 * 功能:
 * - 学员提交调课申请
 * - 管理员审核调课申请
 * - 查询调课记录
 * - 自动更新关联数据
 */
const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command
const $ = db.command.aggregate

/**
 * 主函数入口
 */
exports.main = async (event, context) => {
  const { action, data, query, docId, options, batchData } = event
  
  console.log('【调课请求】action:', action)
  
  try {
    switch (action) {
      // ========== 学员端 ==========
      case 'createRequest':
        return await createTransferRequest(data)
      case 'listMyRequests':
        return await listMyRequests(data, options)
      case 'cancelRequest':
        return await cancelTransferRequest(docId, data)
      
      // ========== 管理端 ==========
      case 'listAllRequests':
        return await listAllRequests(query, options)
      case 'getRequestDetail':
        return await getRequestDetail(docId)
      case 'approveRequest':
        return await approveRequest(docId, data)
      case 'rejectRequest':
        return await rejectRequest(docId, data)
      case 'batchApprove':
        return await batchApproveRequests(batchData, data)
      case 'batchReject':
        return await batchRejectRequests(batchData, data)
      
      // ========== 统计 ==========
      case 'getStats':
        return await getTransferStats()
      
      // ========== 辅助 ==========
      case 'checkConflict':
        return await checkScheduleConflict(data)
      case 'getAvailableSchedules':
        return await getAvailableSchedules(data)
      
      // ========== 管理 ==========
      case 'initCollection':
        return await initTransferCollection()
      case 'insertTestData':
        return await insertTestData()
      
      // ========== 数据修复 ==========
      case 'fixCourseRelations':
        return await fixCourseRelations()
      
      default:
        return { code: 400, message: `未知操作: ${action}` }
    }
  } catch (error) {
    console.error('【调课请求】错误:', error)
    return {
      code: 500,
      message: error.message || '服务器错误',
      error: error.message
    }
  }
}

// ============================================================================
// 学员端接口
// ============================================================================

/**
 * 创建调课申请
 */
async function createTransferRequest(data) {
  const {
    studentId,
    studentName,
    studentPhone,
    originalScheduleId,
    originalCourseId,
    originalCourseName,
    originalDate,
    originalTime,
    originalTeacher,
    originalTeacherId,
    originalLocation,
    targetScheduleId,
    targetCourseId,
    targetCourseName,
    targetDate,
    targetTime,
    targetTeacher,
    targetTeacherId,
    targetLocation,
    transferType,
    reason,
    remark
  } = data

  // ========== 数据验证 ==========
  if (!studentId) {
    return { code: 400, message: '学员ID不能为空' }
  }
  if (!originalScheduleId) {
    return { code: 400, message: '原排课ID不能为空' }
  }
  if (!transferType) {
    return { code: 400, message: '调课类型不能为空' }
  }
  if (!reason || reason.trim().length < 5) {
    return { code: 400, message: '调课原因至少5个字符' }
  }

  // ========== 检查原排课是否存在 ==========
  const originalSchedule = await db.collection('course_schedules')
    .doc(originalScheduleId)
    .get()
  
  if (!originalSchedule.data || originalSchedule.data.length === 0) {
    return { code: 404, message: '原排课不存在' }
  }

  // ========== 检查是否有待处理的调课申请 ==========
  const existingRequest = await db.collection('transfer_requests')
    .where({
      studentId,
      originalScheduleId,
      status: _.in(['pending'])
    })
    .count()
  
  if (existingRequest.total > 0) {
    return { code: 400, message: '您已提交过该课程的调课申请，请等待审核' }
  }

  // ========== 检查目标排课是否存在（如果指定了目标） ==========
  if (targetScheduleId) {
    const targetSchedule = await db.collection('course_schedules')
      .doc(targetScheduleId)
      .get()
    
    if (!targetSchedule.data || targetSchedule.data.length === 0) {
      return { code: 404, message: '目标排课不存在' }
    }
    
    // ========== 检查目标排课是否满员 ==========
    const targetData = targetSchedule.data[0]
    const enrolled = targetData.enrolled || targetData.enrolledCount || 0
    const maxStudents = targetData.maxStudents || targetData.capacity || 20
    
    if (enrolled >= maxStudents) {
      return { code: 400, message: '目标排课已满员，请选择其他时间' }
    }
    
    // ========== 检查目标排课是否与自己其他申请冲突 ==========
    const conflictCheck = await db.collection('transfer_requests')
      .where({
        studentId,
        targetScheduleId,
        status: _.in(['pending', 'approved'])
      })
      .count()
    
    if (conflictCheck.total > 0) {
      return { code: 400, message: '您已有该时段的调课申请' }
    }
  }

  // ========== 创建调课申请 ==========
  const now = new Date().toISOString()
  const requestData = {
    // 学员信息
    studentId,
    studentName: studentName || '',
    studentPhone: studentPhone || '',
    
    // 原排课信息
    originalScheduleId,
    originalCourseId: originalCourseId || originalSchedule.data[0].courseId,
    originalCourseName: originalCourseName || originalSchedule.data[0].courseName || originalSchedule.data[0].courseTitle,
    originalDate: originalDate || originalSchedule.data[0].date,
    originalTime: originalTime || originalSchedule.data[0].startTime,
    originalTeacher: originalTeacher || originalSchedule.data[0].teacherName,
    originalTeacherId: originalTeacherId || originalSchedule.data[0].teacherId,
    originalLocation: originalLocation || originalSchedule.data[0].location,
    
    // 目标排课信息（可选）
    targetScheduleId: targetScheduleId || null,
    targetCourseId: targetCourseId || null,
    targetCourseName: targetCourseName || null,
    targetDate: targetDate || null,
    targetTime: targetTime || null,
    targetTeacher: targetTeacher || null,
    targetTeacherId: targetTeacherId || null,
    targetLocation: targetLocation || null,
    
    // 申请信息
    transferType, // time, teacher, location, course, leave
    reason: reason.trim(),
    remark: remark || '',
    
    // 状态与审核
    status: 'pending',
    adminId: null,
    adminName: null,
    adminReply: null,
    reviewedAt: null,
    
    // 考勤关联
    originalAttendanceId: null,
    targetAttendanceId: null,
    
    // 时间戳
    createdAt: now,
    updatedAt: now,
    
    // 扩展字段
    _openid: studentId,
    isRead: false, // 管理员是否已读
    notificationSent: false // 是否已发送通知
  }

  const result = await db.collection('transfer_requests').add(requestData)
  
  console.log(`【调课申请】创建成功: ${result.id}`)
  
  return {
    code: 0,
    message: '调课申请提交成功，请等待管理员审核',
    data: {
      id: result.id,
      ...requestData
    }
  }
}

/**
 * 查询我的调课申请
 */
async function listMyRequests(data, options) {
  const { studentId, status, transferType } = data
  const { page = 1, pageSize = 20 } = options || {}
  
  if (!studentId) {
    return { code: 400, message: '学员ID不能为空' }
  }

  let query = db.collection('transfer_requests').where({ studentId })
  
  if (status && status !== 'all') {
    query = query.where({ status })
  }
  
  if (transferType && transferType !== 'all') {
    query = query.where({ transferType })
  }

  // 统计总数
  const countQuery = db.collection('transfer_requests').where({
    studentId,
    ...(status && status !== 'all' ? { status } : {}),
    ...(transferType && transferType !== 'all' ? { transferType } : {})
  })
  const countResult = await countQuery.count()
  const total = countResult.total || 0

  // 分页查询
  const skip = (page - 1) * pageSize
  const result = await query
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    message: '查询成功',
    data: result.data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

/**
 * 取消调课申请
 */
async function cancelTransferRequest(docId, data) {
  if (!docId) {
    return { code: 400, message: '申请ID不能为空' }
  }

  const { studentId } = data
  
  // 查询申请
  const request = await db.collection('transfer_requests').doc(docId).get()
  
  if (!request.data || request.data.length === 0) {
    return { code: 404, message: '调课申请不存在' }
  }
  
  const requestData = request.data[0]
  
  // 验证学员身份
  if (requestData.studentId !== studentId) {
    return { code: 403, message: '无权取消此申请' }
  }
  
  // 检查状态
  if (requestData.status !== 'pending') {
    return { code: 400, message: '只能取消待审核的申请' }
  }

  // 更新状态
  await db.collection('transfer_requests').doc(docId).update({
    status: 'cancelled',
    updatedAt: new Date().toISOString()
  })

  return {
    code: 0,
    message: '调课申请已取消'
  }
}

// ============================================================================
// 管理端接口
// ============================================================================

/**
 * 查询所有调课申请（管理端）
 */
async function listAllRequests(query = {}, options = {}) {
  const { 
    status, 
    transferType, 
    keyword,
    startDate,
    endDate,
    studentId,
    page = 1, 
    pageSize = 20,
    needStats = true
  } = options

  let dbQuery = db.collection('transfer_requests')

  // 构建查询条件
  const conditions = []
  
  if (status && status !== 'all') {
    conditions.push({ status })
  }
  
  if (transferType && transferType !== 'all') {
    conditions.push({ transferType })
  }
  
  if (studentId) {
    conditions.push({ studentId })
  }
  
  if (startDate || endDate) {
    const dateCondition = {}
    if (startDate) dateCondition.$gte = startDate
    if (endDate) dateCondition.$lte = endDate
    conditions.push({ originalDate: dateCondition })
  }
  
  if (keyword) {
    conditions.push(
      db.command.or([
        { studentName: db.RegExp({ regex: keyword, options: 'i' }) },
        { studentPhone: db.RegExp({ regex: keyword, options: 'i' }) },
        { originalCourseName: db.RegExp({ regex: keyword, options: 'i' }) },
        { reason: db.RegExp({ regex: keyword, options: 'i' }) }
      ])
    )
  }

  if (conditions.length > 0) {
    if (conditions.length === 1) {
      dbQuery = dbQuery.where(conditions[0])
    } else {
      dbQuery = dbQuery.where(db.command.and(conditions))
    }
  }

  // 统计总数
  const countResult = await dbQuery.count()
  const total = countResult.total || 0

  // 分页查询
  const skip = (page - 1) * pageSize
  const result = await dbQuery
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 统计（可选，避免额外查询）
  let stats = null
  if (needStats) {
    const [pending, approved, rejected, today] = await Promise.all([
      db.collection('transfer_requests').where({ status: 'pending' }).count(),
      db.collection('transfer_requests').where({ status: 'approved' }).count(),
      db.collection('transfer_requests').where({ status: 'rejected' }).count(),
      db.collection('transfer_requests')
        .where({
          createdAt: db.command.gte(new Date(new Date().toDateString()).toISOString())
        })
        .count()
    ])
    
    stats = {
      pending: pending.total || 0,
      approved: approved.total || 0,
      rejected: rejected.total || 0,
      today: today.total || 0,
      total: total
    }
  }

  return {
    code: 0,
    message: '查询成功',
    data: result.data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stats
  }
}

/**
 * 获取调课申请详情
 */
async function getRequestDetail(docId) {
  if (!docId) {
    return { code: 400, message: '申请ID不能为空' }
  }

  const result = await db.collection('transfer_requests').doc(docId).get()
  
  if (!result.data || result.data.length === 0) {
    return { code: 404, message: '调课申请不存在' }
  }

  const request = result.data[0]

  // 获取关联的原排课详情
  let originalScheduleDetail = null
  if (request.originalScheduleId) {
    const originalSchedule = await db.collection('course_schedules')
      .doc(request.originalScheduleId)
      .get()
    originalScheduleDetail = originalSchedule.data?.[0] || null
  }

  // 获取关联的目标排课详情
  let targetScheduleDetail = null
  if (request.targetScheduleId) {
    const targetSchedule = await db.collection('course_schedules')
      .doc(request.targetScheduleId)
      .get()
    targetScheduleDetail = targetSchedule.data?.[0] || null
  }

  // 获取学员信息
  let studentInfo = null
  if (request.studentId) {
    try {
      const student = await db.collection('students')
        .where({ studentId: request.studentId })
        .limit(1)
        .get()
      studentInfo = student.data?.[0] || null
    } catch (e) {
      console.log('获取学员信息失败:', e.message)
    }
  }

  return {
    code: 0,
    message: '查询成功',
    data: {
      ...request,
      originalScheduleDetail,
      targetScheduleDetail,
      studentInfo
    }
  }
}

/**
 * 审核通过调课申请
 */
async function approveRequest(docId, data) {
  if (!docId) {
    return { code: 400, message: '申请ID不能为空' }
  }

  const { adminId, adminName, adminReply, autoUpdateAttendance = true } = data

  // 查询申请
  const request = await db.collection('transfer_requests').doc(docId).get()
  
  if (!request.data || request.data.length === 0) {
    return { code: 404, message: '调课申请不存在' }
  }
  
  const requestData = request.data[0]
  
  if (requestData.status !== 'pending') {
    return { code: 400, message: '该申请已审核，请勿重复操作' }
  }

  const now = new Date().toISOString()

  // ========== 更新排课数据 ==========
  if (requestData.targetScheduleId && autoUpdateAttendance) {
    try {
      // 1. 原排课报名人数 -1
      if (requestData.originalScheduleId) {
        await db.collection('course_schedules').doc(requestData.originalScheduleId).update({
          $inc: { enrolled: -1 },
          updatedAt: now
        })
      }

      // 2. 目标排课报名人数 +1
      await db.collection('course_schedules').doc(requestData.targetScheduleId).update({
        $inc: { enrolled: 1 },
        updatedAt: now
      })
    } catch (e) {
      console.error('更新排课人数失败:', e)
      // 不阻断流程，继续执行
    }
  }

  // ========== 更新调课申请状态 ==========
  await db.collection('transfer_requests').doc(docId).update({
    status: 'approved',
    adminId: adminId || 'admin',
    adminName: adminName || '管理员',
    adminReply: adminReply || '',
    reviewedAt: now,
    updatedAt: now,
    notificationSent: false // 待发送通知
  })

  console.log(`【调课审核】通过: ${docId}`)

  return {
    code: 0,
    message: '调课申请已通过',
    data: {
      id: docId,
      status: 'approved'
    }
  }
}

/**
 * 审核拒绝调课申请
 */
async function rejectRequest(docId, data) {
  if (!docId) {
    return { code: 400, message: '申请ID不能为空' }
  }

  const { adminId, adminName, adminReply } = data

  if (!adminReply || adminReply.trim().length < 2) {
    return { code: 400, message: '请填写拒绝原因' }
  }

  // 查询申请
  const request = await db.collection('transfer_requests').doc(docId).get()
  
  if (!request.data || request.data.length === 0) {
    return { code: 404, message: '调课申请不存在' }
  }
  
  const requestData = request.data[0]
  
  if (requestData.status !== 'pending') {
    return { code: 400, message: '该申请已审核，请勿重复操作' }
  }

  const now = new Date().toISOString()

  await db.collection('transfer_requests').doc(docId).update({
    status: 'rejected',
    adminId: adminId || 'admin',
    adminName: adminName || '管理员',
    adminReply: adminReply.trim(),
    reviewedAt: now,
    updatedAt: now,
    notificationSent: false
  })

  console.log(`【调课审核】拒绝: ${docId}`)

  return {
    code: 0,
    message: '调课申请已拒绝',
    data: {
      id: docId,
      status: 'rejected'
    }
  }
}

/**
 * 批量审核通过
 */
async function batchApproveRequests(docIds, data) {
  if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
    return { code: 400, message: '请选择要通过的申请' }
  }

  const { adminId, adminName, adminReply } = data
  const now = new Date().toISOString()
  
  let successCount = 0
  let failCount = 0
  const results = []

  for (const docId of docIds) {
    try {
      // 查询申请
      const request = await db.collection('transfer_requests').doc(docId).get()
      
      if (!request.data || request.data.length === 0) {
        results.push({ id: docId, success: false, message: '不存在' })
        failCount++
        continue
      }
      
      const requestData = request.data[0]
      
      if (requestData.status !== 'pending') {
        results.push({ id: docId, success: false, message: '状态已变更' })
        failCount++
        continue
      }

      // 更新排课数据
      if (requestData.targetScheduleId) {
        try {
          if (requestData.originalScheduleId) {
            await db.collection('course_schedules').doc(requestData.originalScheduleId).update({
              $inc: { enrolled: -1 },
              updatedAt: now
            })
          }
          await db.collection('course_schedules').doc(requestData.targetScheduleId).update({
            $inc: { enrolled: 1 },
            updatedAt: now
          })
        } catch (e) {
          console.error(`更新排课失败 ${docId}:`, e)
        }
      }

      // 更新申请状态
      await db.collection('transfer_requests').doc(docId).update({
        status: 'approved',
        adminId: adminId || 'admin',
        adminName: adminName || '管理员',
        adminReply: adminReply || '',
        reviewedAt: now,
        updatedAt: now
      })

      results.push({ id: docId, success: true })
      successCount++
    } catch (e) {
      results.push({ id: docId, success: false, message: e.message })
      failCount++
    }
  }

  return {
    code: 0,
    message: `批量审核完成：成功 ${successCount}，失败 ${failCount}`,
    data: {
      successCount,
      failCount,
      results
    }
  }
}

/**
 * 批量审核拒绝
 */
async function batchRejectRequests(docIds, data) {
  if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
    return { code: 400, message: '请选择要拒绝的申请' }
  }

  const { adminId, adminName, adminReply } = data

  if (!adminReply || adminReply.trim().length < 2) {
    return { code: 400, message: '请填写拒绝原因' }
  }

  const now = new Date().toISOString()
  
  let successCount = 0
  let failCount = 0
  const results = []

  for (const docId of docIds) {
    try {
      const request = await db.collection('transfer_requests').doc(docId).get()
      
      if (!request.data || request.data.length === 0) {
        results.push({ id: docId, success: false, message: '不存在' })
        failCount++
        continue
      }
      
      const requestData = request.data[0]
      
      if (requestData.status !== 'pending') {
        results.push({ id: docId, success: false, message: '状态已变更' })
        failCount++
        continue
      }

      await db.collection('transfer_requests').doc(docId).update({
        status: 'rejected',
        adminId: adminId || 'admin',
        adminName: adminName || '管理员',
        adminReply: adminReply.trim(),
        reviewedAt: now,
        updatedAt: now
      })

      results.push({ id: docId, success: true })
      successCount++
    } catch (e) {
      results.push({ id: docId, success: false, message: e.message })
      failCount++
    }
  }

  return {
    code: 0,
    message: `批量审核完成：成功 ${successCount}，失败 ${failCount}`,
    data: {
      successCount,
      failCount,
      results
    }
  }
}

// ============================================================================
// 统计接口
// ============================================================================

/**
 * 获取调课统计数据
 */
async function getTransferStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()
  
  const todayEnd = new Date(today.getTime() + 86400000).toISOString()

  // 并行查询各种统计
  const [
    totalResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    todayResult,
    byTypeResult
  ] = await Promise.all([
    db.collection('transfer_requests').count(),
    db.collection('transfer_requests').where({ status: 'pending' }).count(),
    db.collection('transfer_requests').where({ status: 'approved' }).count(),
    db.collection('transfer_requests').where({ status: 'rejected' }).count(),
    db.collection('transfer_requests')
      .where({
        createdAt: _.and(_.gte(todayStart), _.lt(todayEnd))
      })
      .count(),
    // 按类型统计
    db.collection('transfer_requests')
      .aggregate()
      .group({
        _id: '$transferType',
        count: $.sum(1)
      })
      .end()
  ])

  // 处理按类型统计结果
  const byType = {}
  if (byTypeResult.list) {
    byTypeResult.list.forEach(item => {
      byType[item._id || 'unknown'] = item.count
    })
  }

  // 计算本周数据
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekResult = await db.collection('transfer_requests')
    .where({
      createdAt: _.gte(weekStart.toISOString())
    })
    .count()

  // 计算本月数据
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthResult = await db.collection('transfer_requests')
    .where({
      createdAt: _.gte(monthStart.toISOString())
    })
    .count()

  return {
    code: 0,
    message: '统计成功',
    data: {
      total: totalResult.total || 0,
      pending: pendingResult.total || 0,
      approved: approvedResult.total || 0,
      rejected: rejectedResult.total || 0,
      today: todayResult.total || 0,
      thisWeek: weekResult.total || 0,
      thisMonth: monthResult.total || 0,
      byType,
      approvalRate: totalResult.total > 0 
        ? Math.round((approvedResult.total / totalResult.total) * 100) 
        : 0
    }
  }
}

// ============================================================================
// 辅助接口
// ============================================================================

/**
 * 检查排课冲突
 */
async function checkScheduleConflict(data) {
  const { studentId, targetScheduleId, excludeRequestId } = data

  if (!studentId || !targetScheduleId) {
    return { code: 400, message: '参数不完整' }
  }

  // 检查是否有待处理或已通过的调课申请
  const query = {
    studentId,
    targetScheduleId,
    status: _.in(['pending', 'approved'])
  }
  
  if (excludeRequestId) {
    query._id = _.neq(excludeRequestId)
  }

  const result = await db.collection('transfer_requests').where(query).count()

  return {
    code: 0,
    message: '查询成功',
    data: {
      hasConflict: result.total > 0,
      conflictCount: result.total
    }
  }
}

/**
 * 获取可用的排课列表（用于学员选择目标排课）
 */
async function getAvailableSchedules(data) {
  const { 
    courseId,        // 课程ID（可选）
    excludeScheduleId, // 排除的排课ID
    startDate,       // 可选：开始日期
    endDate,         // 可选：结束日期
    page = 1,
    pageSize = 20
  } = data

  let query = db.collection('course_schedules')

  // 只查询有剩余名额的排课
  query = query.where({
    status: _.nin(['cancelled', 'cancelled'])
  })

  // 日期过滤
  const conditions = []
  const now = new Date().toISOString()
  
  conditions.push({
    date: _.gte(now.split('T')[0])
  })

  if (startDate) {
    conditions.push({ date: _.gte(startDate) })
  }
  if (endDate) {
    conditions.push({ date: _.lte(endDate) })
  }
  if (excludeScheduleId) {
    conditions.push({ _id: _.neq(excludeScheduleId) })
  }

  const result = await query
    .where(_.and(conditions))
    .orderBy('date', 'asc')
    .orderBy('startTime', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 过滤掉已满员的
  const availableSchedules = (result.data || []).filter(schedule => {
    const enrolled = schedule.enrolled || schedule.enrolledCount || 0
    const max = schedule.maxStudents || schedule.capacity || 20
    return enrolled < max
  })

  return {
    code: 0,
    message: '查询成功',
    data: availableSchedules,
    page,
    pageSize
  }
}

// ============================================================================
// 集合初始化和测试数据
// ============================================================================

/**
 * 初始化调课申请集合
 */
async function initTransferCollection() {
  try {
    // 尝试添加一条空记录来创建集合
    const result = await db.collection('transfer_requests').add({
      _openid: 'system_init',
      createdAt: new Date().toISOString(),
      status: 'init'
    })
    
    // 删除刚才添加的记录
    if (result.id) {
      await db.collection('transfer_requests').doc(result.id).remove()
    }
    
    return {
      code: 0,
      message: '集合初始化成功',
      data: { id: result.id }
    }
  } catch (e) {
    return {
      code: 0,
      message: '集合已存在或初始化成功',
      error: e.message
    }
  }
}

/**
 * 插入测试数据
 */
async function insertTestData() {
  const testData = [
    {
      _openid: 'test_user_001',
      studentId: 'student_001',
      studentName: '张小明',
      studentPhone: '13800138001',
      originalScheduleId: 'schedule_001',
      originalCourseId: 'course_001',
      originalCourseName: '无人机基础飞行训练',
      originalDate: '2026-04-10',
      originalTime: '09:00',
      originalTeacher: '李教练',
      originalTeacherId: 'teacher_001',
      originalLocation: '东区训练场',
      targetScheduleId: 'schedule_002',
      targetCourseId: 'course_001',
      targetCourseName: '无人机基础飞行训练',
      targetDate: '2026-04-15',
      targetTime: '14:00',
      targetTeacher: '王教练',
      targetTeacherId: 'teacher_002',
      targetLocation: '西区训练场',
      transferType: 'time',
      reason: '因公司会议冲突，无法参加原定时间的课程',
      remark: '希望能安排王教练的课程',
      status: 'pending',
      createdAt: '2026-04-06T10:00:00.000Z',
      updatedAt: '2026-04-06T10:00:00.000Z',
      isRead: false,
      notificationSent: false
    },
    {
      _openid: 'test_user_002',
      studentId: 'student_002',
      studentName: '李小红',
      studentPhone: '13800138002',
      originalScheduleId: 'schedule_003',
      originalCourseId: 'course_002',
      originalCourseName: '无人机高级航拍技术',
      originalDate: '2026-04-12',
      originalTime: '10:00',
      originalTeacher: '赵教练',
      originalTeacherId: 'teacher_003',
      originalLocation: '北区训练场',
      targetScheduleId: 'schedule_002',
      targetCourseId: 'course_001',
      targetCourseName: '无人机基础飞行训练',
      targetDate: '2026-04-15',
      targetTime: '14:00',
      targetTeacher: '王教练',
      targetTeacherId: 'teacher_002',
      targetLocation: '西区训练场',
      transferType: 'teacher',
      reason: '听说王教练航拍经验丰富，希望能换成王教练授课',
      remark: '',
      status: 'pending',
      createdAt: '2026-04-05T14:30:00.000Z',
      updatedAt: '2026-04-05T14:30:00.000Z',
      isRead: false,
      notificationSent: false
    },
    {
      _openid: 'test_user_003',
      studentId: 'student_003',
      studentName: '王小强',
      studentPhone: '13800138003',
      originalScheduleId: 'schedule_004',
      originalCourseId: 'course_001',
      originalCourseName: '无人机基础飞行训练',
      originalDate: '2026-04-08',
      originalTime: '09:00',
      originalTeacher: '李教练',
      originalTeacherId: 'teacher_001',
      originalLocation: '西区训练场',
      targetScheduleId: null,
      targetCourseId: null,
      targetCourseName: null,
      targetDate: null,
      targetTime: null,
      targetTeacher: null,
      targetTeacherId: null,
      targetLocation: '东区训练场',
      transferType: 'location',
      reason: '家住东区，希望调到东区的训练场',
      remark: '',
      status: 'approved',
      adminId: 'admin',
      adminName: '管理员',
      adminReply: '已通过，请按新时间参加课程',
      reviewedAt: '2026-04-05T10:00:00.000Z',
      createdAt: '2026-04-04T09:15:00.000Z',
      updatedAt: '2026-04-05T10:00:00.000Z',
      isRead: true,
      notificationSent: true
    },
    {
      _openid: 'test_user_004',
      studentId: 'student_004',
      studentName: '陈小丽',
      studentPhone: '13800138004',
      originalScheduleId: 'schedule_005',
      originalCourseId: 'course_003',
      originalCourseName: '无人机飞行安全',
      originalDate: '2026-04-18',
      originalTime: '09:00',
      originalTeacher: '孙教练',
      originalTeacherId: 'teacher_004',
      originalLocation: '南区训练场',
      targetScheduleId: null,
      targetCourseId: null,
      targetCourseName: null,
      targetDate: null,
      targetTime: null,
      targetTeacher: null,
      targetTeacherId: null,
      targetLocation: null,
      transferType: 'time',
      reason: '天气原因想延期课程',
      remark: '希望尽快安排',
      status: 'rejected',
      adminId: 'admin',
      adminName: '管理员',
      adminReply: '抱歉，该时段名额已满，建议选择其他时间',
      reviewedAt: '2026-04-04T09:00:00.000Z',
      createdAt: '2026-04-03T11:20:00.000Z',
      updatedAt: '2026-04-04T09:00:00.000Z',
      isRead: true,
      notificationSent: true
    },
    {
      _openid: 'test_user_005',
      studentId: 'student_005',
      studentName: '刘小军',
      studentPhone: '13800138005',
      originalScheduleId: 'schedule_001',
      originalCourseId: 'course_001',
      originalCourseName: '无人机基础飞行训练',
      originalDate: '2026-04-10',
      originalTime: '09:00',
      originalTeacher: '李教练',
      originalTeacherId: 'teacher_001',
      originalLocation: '东区训练场',
      targetScheduleId: null,
      targetCourseId: null,
      targetCourseName: null,
      targetDate: null,
      targetTime: null,
      targetTeacher: null,
      targetTeacherId: null,
      targetLocation: null,
      transferType: 'leave',
      reason: '有重要考试需要复习，想请假一段时间',
      remark: '',
      status: 'pending',
      createdAt: '2026-04-06T08:45:00.000Z',
      updatedAt: '2026-04-06T08:45:00.000Z',
      isRead: false,
      notificationSent: false
    }
  ]

  try {
    const results = []
    for (const item of testData) {
      const result = await db.collection('transfer_requests').add(item)
      results.push(result.id)
    }
    
    return {
      code: 0,
      message: '测试数据插入成功',
      data: {
        inserted: results.length,
        ids: results
      }
    }
  } catch (e) {
    return {
      code: 500,
      message: '插入失败: ' + e.message
    }
  }
}

// ============================================================================
// 数据修复 - 统一课程关联关系
// ============================================================================

/**
 * 数据修复工具 - 统一课程、排课、报名的关联关系
 */
async function fixCourseRelations() {
  console.log('【数据修复】开始修复课程关联数据...');
  
  const results = {
    schedules: null,
    enrollments: null,
    orders: null,
  };
  
  try {
    // 1. 获取所有课程，建立 courseName -> _id 映射
    const coursesResult = await db.collection('courses').get();
    const courseNameMap = {};
    
    coursesResult.data.forEach(course => {
      // 以 title 为键
      courseNameMap[course.title] = course._id;
      
      // 提取 course_001 中的数字 001 -> course_001
      const match = course._id.match(/course_(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        // 同时支持 course_1, course_01, course_001 格式
        courseNameMap[`course_${num}`] = course._id;
        courseNameMap[`course_${num.toString().padStart(2, '0')}`] = course._id;
        courseNameMap[`course_${num.toString().padStart(3, '0')}`] = course._id;
      }
    });
    
    // 添加别名映射
    const nameAliases = {
      '多旋翼基础': 'course_001',
      '多旋翼飞行': 'course_001',
      '航拍技巧': 'course_003',
      '航拍技巧进阶': 'course_003',
      '固定翼飞行': 'course_002',
      '固定翼飞行入门': 'course_002',
      '维修保养': 'course_004',
      '无人机维修培训': 'course_004',
      'AOPA无人机驾驶员认证课程': 'course_002',
      'CAAC无人机驾驶员执照培训': 'course_001',
      '无人机航拍技术专业课程': 'course_003',
      '植保无人机操作与维护': 'course_004',
    };
    Object.assign(courseNameMap, nameAliases);
    
    console.log('【数据修复】课程映射表:', JSON.stringify(courseNameMap));
    
    // 2. 修复排课表
    console.log('【数据修复】开始修复排课表...');
    const schedulesResult = await db.collection('course_schedules').get();
    let scheduleUpdated = 0;
    let scheduleErrors = [];
    
    for (const schedule of schedulesResult.data) {
      let correctCourseId = null;
      
      // 方式1: 通过 courseName 匹配
      if (schedule.courseName) {
        correctCourseId = courseNameMap[schedule.courseName];
      }
      
      // 方式2: 通过 courseId 数字匹配 (course_1_0 -> course_001)
      if (!correctCourseId && schedule.courseId) {
        const idMatch = schedule.courseId.match(/course_(\d+)/);
        if (idMatch) {
          const num = parseInt(idMatch[1]);
          correctCourseId = `course_${num.toString().padStart(3, '0')}`;
        }
      }
      
      if (correctCourseId) {
        // 更新排课表的 courseId
        try {
          await db.collection('course_schedules').doc(schedule._id).update({
            data: {
              courseId: correctCourseId,
              courseTitle: schedule.courseName,  // 保留原始名称
            }
          });
          scheduleUpdated++;
          console.log(`【数据修复】更新排课 ${schedule._id}: courseId -> ${correctCourseId}`);
        } catch (e) {
          scheduleErrors.push({ id: schedule._id, error: e.message });
        }
      } else {
        scheduleErrors.push({ 
          id: schedule._id, 
          courseId: schedule.courseId, 
          courseName: schedule.courseName,
          error: '无法匹配课程' 
        });
      }
    }
    
    results.schedules = {
      total: schedulesResult.data.length,
      updated: scheduleUpdated,
      errors: scheduleErrors.slice(0, 10)
    };
    console.log('【数据修复】排课表修复完成:', results.schedules);
    
    // 3. 修复报名表
    console.log('【数据修复】开始修复报名表...');
    const enrollmentsResult = await db.collection('enrollments').get();
    let enrollmentUpdated = 0;
    let enrollmentErrors = [];
    
    for (const enrollment of enrollmentsResult.data) {
      let correctCourseId = null;
      
      // 方式1: 通过 scheduleId 找到对应的排课，再获取正确的 courseId
      try {
        const scheduleResult = await db.collection('course_schedules')
          .where(_.or(
            { _id: enrollment.scheduleId },
            { courseId: enrollment.scheduleId }
          ))
          .limit(1)
          .get();
        
        if (scheduleResult.data && scheduleResult.data.length > 0) {
          correctCourseId = scheduleResult.data[0].courseId;
        }
      } catch (e) {
        console.log('【数据修复】查询排课失败:', e.message);
      }
      
      // 方式2: 通过 courseName 匹配
      if (!correctCourseId && enrollment.courseName) {
        correctCourseId = courseNameMap[enrollment.courseName];
      }
      
      if (correctCourseId) {
        try {
          await db.collection('enrollments').doc(enrollment._id).update({
            data: {
              courseId: correctCourseId,
            }
          });
          enrollmentUpdated++;
        } catch (e) {
          enrollmentErrors.push({ id: enrollment._id, error: e.message });
        }
      } else {
        enrollmentErrors.push({
          id: enrollment._id,
          scheduleId: enrollment.scheduleId,
          courseName: enrollment.courseName,
          error: '无法匹配课程'
        });
      }
    }
    
    results.enrollments = {
      total: enrollmentsResult.data.length,
      updated: enrollmentUpdated,
      errors: enrollmentErrors.slice(0, 10)
    };
    console.log('【数据修复】报名表修复完成:', results.enrollments);
    
    // 4. 修复订单表（只处理老格式）
    console.log('【数据修复】开始修复订单表...');
    const ordersResult = await db.collection('orders')
      .where({
        courseId: _.exists(true)
      })
      .limit(100)
      .get();
    
    let orderUpdated = 0;
    let orderErrors = [];
    
    for (const order of ordersResult.data) {
      // 跳过新格式订单
      if (order.items && order.items.length > 0) {
        continue;
      }
      
      let correctCourseId = null;
      
      // 方式1: 通过 courseName 匹配
      if (order.courseName) {
        correctCourseId = courseNameMap[order.courseName];
      }
      
      // 方式2: 数字匹配 (course_1 -> course_001)
      if (!correctCourseId && order.courseId) {
        const idMatch = order.courseId.match(/course_(\d+)$/);
        if (idMatch) {
          const num = parseInt(idMatch[1]);
          correctCourseId = `course_${num.toString().padStart(3, '0')}`;
        }
      }
      
      if (correctCourseId) {
        try {
          await db.collection('orders').doc(order._id).update({
            data: {
              courseId: correctCourseId,
            }
          });
          orderUpdated++;
          console.log(`【数据修复】更新订单 ${order._id}: courseId -> ${correctCourseId}`);
        } catch (e) {
          orderErrors.push({ id: order._id, error: e.message });
        }
      } else {
        orderErrors.push({
          id: order._id,
          courseId: order.courseId,
          courseName: order.courseName,
          error: '无法匹配课程'
        });
      }
    }
    
    results.orders = {
      total: ordersResult.data.length,
      updated: orderUpdated,
      errors: orderErrors.slice(0, 10)
    };
    console.log('【数据修复】订单表修复完成:', results.orders);
    
    return {
      code: 0,
      message: '数据修复完成',
      results,
      summary: {
        schedulesFixed: scheduleUpdated,
        enrollmentsFixed: enrollmentUpdated,
        ordersFixed: orderUpdated,
      }
    };
    
  } catch (error) {
    console.error('【数据修复】数据修复失败:', error);
    return {
      code: 500,
      message: '数据修复失败: ' + error.message,
      results
    };
  }
}
