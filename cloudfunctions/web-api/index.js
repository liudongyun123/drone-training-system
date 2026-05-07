/**
 * web-api 云函数 - Web端统一数据访问
 * 
 * 功能：
 * - 班级列表查询
 * - 班级详情
 * - 班级报名
 * - 我的班级
 * - 排课查询
 * - 调课申请
 * 
 * 统一通过此云函数访问数据库，避免前端直接调用数据库的问题
 */

// 动态选择 SDK
let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ========== CORS 头 ==========

function getCorsHeaders(origin = '') {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com',
    'https://rcwljy-5ghmq2ex26764978-1318564729.ap-shanghai.app.tcloudbase.com'
  ]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  }
}

// ========== 班级相关 ==========

/**
 * 获取班级列表
 */
async function getClasses(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    status,
    keyword,
    courseId,
    teacherId
  } = params

  let where = {}

  // 状态筛选
  if (status) {
    if (Array.isArray(status)) {
      where.status = _.in(status)
    } else {
      where.status = status
    }
  } else {
    // 默认查询可报名的班级
    where.status = _.in(['enrolling', 'upcoming', 'open'])
  }

  // 关键词搜索
  if (keyword) {
    where.name = db.RegExp({ regexp: keyword, options: 'i' })
  }

  // 课程筛选
  if (courseId) {
    where.courseId = courseId
  }

  // 教师筛选
  if (teacherId) {
    where.teacherId = teacherId
  }

  // 获取总数
  const countResult = await db.collection('classes').where(where).count()

  // 获取列表
  const skip = (page - 1) * pageSize
  const classes = await db.collection('classes')
    .where(where)
    .orderBy('startDate', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 补充每个班级的已报名人数
  const enrichedClasses = await Promise.all(
    (classes.data || []).map(async (cls) => {
      // 获取已报名人数
      const memberCount = await db.collection('class_members')
        .where({
          classId: cls._id,
          status: _.in(['enrolled', 'learning'])
        })
        .count()

      // 获取课程信息
      let courseInfo = null
      if (cls.courseId) {
        const courseRes = await db.collection('courses').doc(cls.courseId).get()
        if (courseRes.data) {
          courseInfo = {
            name: courseRes.data.title,
            price: courseRes.data.price
          }
        }
      }

      return {
        ...cls,
        enrolledCount: memberCount.total || cls.enrolledCount || 0,
        courseName: cls.courseName || courseInfo?.name || '',
        coursePrice: courseInfo?.price || cls.price || 0
      }
    })
  )

  return {
    success: true,
    data: {
      list: enrichedClasses,
      total: countResult.total || enrichedClasses.length,
      page,
      pageSize,
      hasMore: skip + enrichedClasses.length < (countResult.total || enrichedClasses.length)
    }
  }
}

/**
 * 获取班级详情
 */
async function getClassDetail(classId) {
  if (!classId) {
    return { success: false, error: '缺少班级ID' }
  }

  const classRes = await db.collection('classes').doc(classId).get()

  if (!classRes.data) {
    return { success: false, error: '班级不存在' }
  }

  const cls = classRes.data

  // 获取已报名人数
  const memberCount = await db.collection('class_members')
    .where({
      classId: cls._id,
      status: _.in(['enrolled', 'learning'])
    })
    .count()

  // 获取课程信息
  let courseInfo = null
  if (cls.courseId) {
    const courseRes = await db.collection('courses').doc(cls.courseId).get()
    if (courseRes.data) {
      courseInfo = {
        _id: courseRes.data._id,
        name: courseRes.data.title,
        description: courseRes.data.description,
        thumbnail: courseRes.data.thumbnail || courseRes.data.coverImage
      }
    }
  }

  // 获取教师信息
  let teacherInfo = null
  if (cls.teacherId) {
    const teacherRes = await db.collection('teachers').doc(cls.teacherId).get()
    if (teacherRes.data) {
      teacherInfo = {
        _id: teacherRes.data._id,
        name: teacherRes.data.name,
        avatar: teacherRes.data.avatar,
        title: teacherRes.data.title
      }
    }
  }

  return {
    success: true,
    data: {
      ...cls,
      enrolledCount: memberCount.total || cls.enrolledCount || 0,
      course: courseInfo,
      teacher: teacherInfo
    }
  }
}

// ========== 排课相关 ==========

/**
 * 获取排课列表
 */
async function getSchedules(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    classId,
    courseId,
    teacherId,
    status,
    startDate,
    endDate
  } = params

  let where = {}

  if (classId) where.classId = classId
  if (courseId) where.courseId = courseId
  if (teacherId) where.teacherId = teacherId
  if (status) where.status = status

  // 日期范围筛选
  if (startDate) {
    where.scheduleDate = where.scheduleDate || {}
    where.scheduleDate = _.gte(startDate)
  }
  if (endDate) {
    where.scheduleDate = where.scheduleDate || {}
    where.scheduleDate = (where.scheduleDate.gte ? where.scheduleDate : {}).gte || _.gte(startDate || '2000-01-01')
    where.scheduleDate = _.and(_.gte(startDate || '2000-01-01'), _.lte(endDate))
  }

  // 获取总数
  const countResult = await db.collection('class_schedules').where(where).count()

  // 获取列表
  const skip = (page - 1) * pageSize
  const schedules = await db.collection('class_schedules')
    .where(where)
    .orderBy('scheduleDate', 'asc')
    .orderBy('startTime', 'asc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 补充班级和课程信息
  const enrichedSchedules = await Promise.all(
    (schedules.data || []).map(async (schedule) => {
      // 获取班级信息
      let classInfo = null
      if (schedule.classId) {
        const classRes = await db.collection('classes').doc(schedule.classId).get()
        if (classRes.data) {
          classInfo = {
            _id: classRes.data._id,
            name: classRes.data.name
          }
        }
      }

      // 获取课程信息
      let courseInfo = null
      if (schedule.courseId) {
        const courseRes = await db.collection('courses').doc(schedule.courseId).get()
        if (courseRes.data) {
          courseInfo = {
            _id: courseRes.data._id,
            name: courseRes.data.title
          }
        }
      }

      // 获取教师信息
      let teacherInfo = null
      if (schedule.teacherId) {
        const teacherRes = await db.collection('teachers').doc(schedule.teacherId).get()
        if (teacherRes.data) {
          teacherInfo = {
            _id: teacherRes.data._id,
            name: teacherRes.data.name
          }
        }
      }

      return {
        ...schedule,
        class: classInfo,
        course: courseInfo,
        teacher: teacherInfo
      }
    })
  )

  return {
    success: true,
    data: {
      list: enrichedSchedules,
      total: countResult.total || enrichedSchedules.length,
      page,
      pageSize
    }
  }
}

/**
 * 获取我的排课（用户已报名的班级排课）
 */
async function getMySchedules(params = {}) {
  const { userId, phone, page = 1, pageSize = 20 } = params

  if (!userId && !phone) {
    return { success: false, error: '缺少用户ID或手机号' }
  }

  // 查找用户已报名的班级
  let memberQuery = {}
  if (userId) memberQuery.userId = userId
  if (phone) memberQuery.phone = phone
  
  const members = await db.collection('class_members')
    .where({
      ...memberQuery,
      status: _.in(['enrolled', 'learning'])
    })
    .get()

  if (!members.data || members.data.length === 0) {
    return {
      success: true,
      data: {
        list: [],
        total: 0,
        page,
        pageSize
      }
    }
  }

  const classIds = members.data.map(m => m.classId)

  // 获取班级的排课
  const now = new Date().toISOString().split('T')[0]
  const schedules = await db.collection('class_schedules')
    .where({
      classId: _.in(classIds),
      scheduleDate: _.gte(now)
    })
    .orderBy('scheduleDate', 'asc')
    .orderBy('startTime', 'asc')
    .limit(50)
    .get()

  // 补充班级信息
  const enrichedSchedules = await Promise.all(
    (schedules.data || []).map(async (schedule) => {
      const member = members.data.find(m => m.classId === schedule.classId)
      
      let classInfo = null
      if (schedule.classId) {
        const classRes = await db.collection('classes').doc(schedule.classId).get()
        if (classRes.data) {
          classInfo = {
            _id: classRes.data._id,
            name: classRes.data.name,
            location: classRes.data.location
          }
        }
      }

      let courseInfo = null
      if (schedule.courseId) {
        const courseRes = await db.collection('courses').doc(schedule.courseId).get()
        if (courseRes.data) {
          courseInfo = {
            _id: courseRes.data._id,
            name: courseRes.data.title
          }
        }
      }

      return {
        ...schedule,
        enrollmentId: member?._id,
        enrollmentStatus: member?.status,
        class: classInfo,
        course: courseInfo
      }
    })
  )

  return {
    success: true,
    data: {
      list: enrichedSchedules,
      total: enrichedSchedules.length,
      page,
      pageSize
    }
  }
}

// ========== 班级报名相关 ==========

/**
 * 班级报名
 */
async function enrollClass(data) {
  const {
    classId,
    userName,
    phone,
    idCard,
    emergencyContact,
    emergencyPhone,
    notes,
    userId
  } = data

  if (!classId) {
    return { success: false, error: '缺少班级ID' }
  }
  if (!userName) {
    return { success: false, error: '缺少姓名' }
  }
  if (!phone) {
    return { success: false, error: '缺少手机号' }
  }

  // 检查班级是否存在
  const classRes = await db.collection('classes').doc(classId).get()
  if (!classRes.data) {
    return { success: false, error: '班级不存在' }
  }

  const cls = classRes.data

  // 检查是否已满员
  const memberCount = await db.collection('class_members')
    .where({
      classId: classId,
      status: _.in(['enrolled', 'learning'])
    })
    .count()

  const maxStudents = cls.maxStudents || 30
  if (memberCount.total >= maxStudents) {
    return { success: false, error: '班级已满员' }
  }

  // 检查是否已报名
  const existing = await db.collection('class_members')
    .where({
      classId: classId,
      phone: phone,
      status: _.in(['enrolled', 'learning', 'pending'])
    })
    .get()

  if (existing.data && existing.data.length > 0) {
    return { success: false, error: '您已报名此班级' }
  }

  // 创建报名记录
  const now = new Date().toISOString()
  const result = await db.collection('class_members').add({
    data: {
      classId,
      className: cls.name,
      courseId: cls.courseId,
      userId: userId || '',
      userName,
      phone,
      idCard: idCard || '',
      emergencyContact: emergencyContact || '',
      emergencyPhone: emergencyPhone || '',
      notes: notes || '',
      status: 'pending',
      enrollmentTime: now,
      createdAt: now,
      updatedAt: now
    }
  })

  return {
    success: true,
    data: {
      enrollmentId: result.id,
      classId,
      className: cls.name
    },
    message: '报名成功'
  }
}

// ========== 调课申请相关 ==========

/**
 * 获取调课申请列表
 */
async function getTransferRequests(params = {}) {
  const {
    userId,
    phone,
    page = 1,
    pageSize = 20,
    status
  } = params

  let where = {}

  // 非管理员只能查看自己的申请
  if (userId) {
    where.userId = userId
  }
  if (phone) {
    where.phone = phone
  }
  if (status) {
    where.status = status
  }

  // 获取总数
  const countResult = await db.collection('transfer_requests').where(where).count()

  // 获取列表
  const skip = (page - 1) * pageSize
  const requests = await db.collection('transfer_requests')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 补充详情
  const enrichedRequests = await Promise.all(
    (requests.data || []).map(async (req) => {
      // 获取原班级信息
      let fromClass = null
      if (req.fromClassId) {
        const classRes = await db.collection('classes').doc(req.fromClassId).get()
        if (classRes.data) {
          fromClass = {
            _id: classRes.data._id,
            name: classRes.data.name,
            scheduleDate: req.fromDate
          }
        }
      }

      // 获取目标班级信息
      let toClass = null
      if (req.toClassId) {
        const classRes = await db.collection('classes').doc(req.toClassId).get()
        if (classRes.data) {
          toClass = {
            _id: classRes.data._id,
            name: classRes.data.name,
            scheduleDate: req.toDate
          }
        }
      }

      return {
        ...req,
        fromClass,
        toClass
      }
    })
  )

  return {
    success: true,
    data: {
      list: enrichedRequests,
      total: countResult.total || enrichedRequests.length,
      page,
      pageSize
    }
  }
}

/**
 * 创建调课申请
 */
async function createTransferRequest(data) {
  const {
    fromClassId,
    fromScheduleId,
    toClassId,
    toScheduleId,
    reason,
    userId,
    userName,
    phone
  } = data

  if (!fromClassId || !toClassId) {
    return { success: false, error: '缺少班级信息' }
  }
  if (!reason) {
    return { success: false, error: '请填写调课原因' }
  }

  // 检查是否已存在待处理的申请
  const existing = await db.collection('transfer_requests')
    .where({
      userId: userId || phone,
      status: 'pending'
    })
    .get()

  if (existing.data && existing.data.length > 0) {
    return { success: false, error: '您有待处理的调课申请，请先处理' }
  }

  const now = new Date().toISOString()
  const result = await db.collection('transfer_requests').add({
    data: {
      fromClassId,
      fromScheduleId: fromScheduleId || '',
      toClassId,
      toScheduleId: toScheduleId || '',
      reason,
      userId: userId || '',
      userName: userName || '',
      phone: phone || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }
  })

  return {
    success: true,
    data: {
      requestId: result.id
    },
    message: '调课申请已提交'
  }
}

/**
 * 取消调课申请
 */
async function cancelTransferRequest(params) {
  const { requestId, userId } = params

  if (!requestId) {
    return { success: false, error: '缺少申请ID' }
  }

  // 检查申请是否存在
  const request = await db.collection('transfer_requests').doc(requestId).get()
  if (!request.data) {
    return { success: false, error: '申请不存在' }
  }

  // 检查状态
  if (request.data.status !== 'pending') {
    return { success: false, error: '只能取消待处理的申请' }
  }

  // 更新状态
  await db.collection('transfer_requests').doc(requestId).update({
    data: {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId || ''
    }
  })

  return {
    success: true,
    message: '申请已取消'
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[web-api] 收到请求:', event.action)

  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: 0, message: 'OK' })
    }
  }

  // 解析参数
  let action = event.action || ''
  let data = event.data || event

  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || action
      data = { ...data, ...body }
    } catch (e) {}
  }

  try {
    let result

    switch (action) {
      // 班级
      case 'getClasses':
      case 'classes':
        result = await getClasses(data)
        break
      
      case 'getClassDetail':
      case 'classDetail':
        result = await getClassDetail(data.classId || data.id)
        break

      case 'enrollClass':
      case 'enroll':
        result = await enrollClass(data)
        break

      // 排课
      case 'getSchedules':
      case 'schedules':
        result = await getSchedules(data)
        break

      case 'getMySchedules':
      case 'mySchedules':
        result = await getMySchedules(data)
        break

      // 调课
      case 'getTransferRequests':
      case 'transferRequests':
        result = await getTransferRequests(data)
        break

      case 'createTransferRequest':
      case 'createTransfer':
        result = await createTransferRequest(data)
        break

      case 'cancelTransferRequest':
      case 'cancelTransfer':
        result = await cancelTransferRequest(data)
        break

      default:
        result = { success: false, error: '未知的操作: ' + action }
    }

    // HTTP 返回格式
    if (event.httpMethod || event.headers) {
      return {
        statusCode: result.success ? 200 : 400,
        headers: getCorsHeaders(event.headers?.origin),
        body: JSON.stringify(result)
      }
    }

    return result

  } catch (error) {
    console.error('[web-api] 错误:', error)
    const errorResult = { success: false, error: error.message }

    if (event.httpMethod || event.headers) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(),
        body: JSON.stringify(errorResult)
      }
    }

    return errorResult
  }
}
