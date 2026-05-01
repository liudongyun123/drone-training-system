/**
 * api-training 云函数 - 培训服务
 * 
 * 合并来源：
 * - mobile-course（班级/报名部分）
 * - class（班级管理）
 * - registration（报名）
 * - api（班级相关部分）
 * 
 * 功能：
 * - 班级列表（正在招生）
 * - 班级详情
 * - 报名/取消报名
 * - 排课管理
 * - 考勤记录
 * - 通知公告
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

// ========== 工具函数 ==========

function getCorsHeaders(origin = '') {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com'
  ]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  }
}

/**
 * 格式化班级数据
 */
function formatClass(cls, course = null, teacher = null) {
  return {
    _id: cls._id,
    classId: cls._id,
    name: cls.name || cls.className || '班级名称',
    className: cls.name || cls.className || '班级名称',
    coverImage: cls.coverImage || cls.cover || '',
    description: cls.description || course?.description || '',
    price: cls.price || 0,
    originalPrice: cls.originalPrice || cls.price || 0,
    startDate: cls.startDate || cls.startTime || '',
    endDate: cls.endDate || cls.endTime || '',
    location: cls.location || '',
    maxStudents: cls.maxStudents || cls.capacity?.max || 30,
    enrolledCount: cls.enrolledCount || cls.capacity?.enrolled || 0,
    status: cls.status || 'open',
    courseId: cls.courseId,
    courseName: course?.title || '',
    teacherId: cls.teacherId,
    teacherName: teacher?.name || '待分配',
    teacherAvatar: teacher?.avatar || '',
    teacherTitle: teacher?.title || '',
    hasVideoGrant: cls.hasVideoGrant || false,
    videoGrantCourseName: cls.videoGrantCourseName || '',
    videoGrantCourseId: cls.videoGrantCourseId || '',
    contactPhone: cls.contactPhone || '',
    notes: cls.notes || '',
    createdAt: cls.createdAt
  }
}

// ========== 班级相关 ==========

/**
 * 获取正在招生的班级
 */
async function getEnrollingClasses(params = {}) {
  const { page = 1, pageSize = 10 } = params

  let where = { status: _.in(['open', 'enrolling']) }

  const countResult = await db.collection('classes').where(where).count()

  const classes = await db.collection('classes')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 获取关联课程
  const courseIds = [...new Set(classes.data.map(c => c.courseId).filter(Boolean))]
  let coursesMap = {}
  if (courseIds.length > 0) {
    const courses = await db.collection('courses')
      .where({ _id: _.in(courseIds) })
      .field({ _id: true, title: true, description: true })
      .get()
    courses.data.forEach(c => { coursesMap[c._id] = c })
  }

  // 获取关联教师
  const teacherIds = [...new Set(classes.data.map(c => c.teacherId).filter(Boolean))]
  let teachersMap = {}
  if (teacherIds.length > 0) {
    const teachers = await db.collection('teachers')
      .where({ _id: _.in(teacherIds) })
      .field({ _id: true, name: true, avatar: true, title: true })
      .get()
    teachers.data.forEach(t => { teachersMap[t._id] = t })
  }

  return {
    success: true,
    data: {
      list: classes.data.map(cls =>
        formatClass(cls, coursesMap[cls.courseId], teachersMap[cls.teacherId])
      ),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 获取班级详情
 */
async function getClassDetail(classId) {
  const classes = await db.collection('classes').doc(classId).get()

  if (!classes.data) {
    return { success: false, error: '班级不存在' }
  }

  const cls = classes.data

  // 获取关联课程
  let course = null
  if (cls.courseId) {
    try {
      const courses = await db.collection('courses')
        .doc(cls.courseId)
        .field({ _id: true, title: true, description: true, cover: true })
        .get()
      if (courses.data) course = courses.data
    } catch (e) {}
  }

  // 获取关联教师
  let teacher = null
  if (cls.teacherId) {
    try {
      const teachers = await db.collection('teachers')
        .doc(cls.teacherId)
        .field({ _id: true, name: true, avatar: true, title: true })
        .get()
      if (teachers.data) teacher = teachers.data
    } catch (e) {}
  }

  return {
    success: true,
    data: formatClass(cls, course, teacher)
  }
}

/**
 * 获取班级列表（通用）
 */
async function getClassList(params = {}) {
  const {
    page = 1,
    pageSize = 10,
    status = '',
    keyword = '',
    courseId = ''
  } = params

  let where = {}

  if (status) {
    where.status = status
  }

  if (courseId) {
    where.courseId = courseId
  }

  if (keyword) {
    where = {
      ...where,
      $or: [
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { className: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }
  }

  const countResult = await db.collection('classes').where(where).count()

  const classes = await db.collection('classes')
    .where(where)
    .orderBy('startDate', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: classes.data.map(cls => formatClass(cls)),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

// ========== 报名相关 ==========

/**
 * 提交报名
 */
async function submitEnrollment(data, userId) {
  const { classId, name, phone, idCard, notes, code } = data

  if (!classId) {
    return { success: false, error: '缺少班级ID' }
  }

  if (!name || !phone) {
    return { success: false, error: '姓名和手机号不能为空' }
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: '手机号格式不正确' }
  }

  // 获取班级信息
  const cls = await db.collection('classes').doc(classId).get()
  if (!cls.data) {
    return { success: false, error: '班级不存在' }
  }

  // 检查是否满员
  const maxStudents = cls.data.maxStudents || cls.data.capacity?.max || 30
  const enrolledCount = cls.data.enrolledCount || cls.data.capacity?.enrolled || 0

  if (enrolledCount >= maxStudents) {
    return { success: false, error: '班级已满员' }
  }

  // 检查重复报名
  const existEnrollment = await db.collection('enrollments')
    .where({
      classId,
      phone,
      status: _.nin(['cancelled', 'rejected'])
    })
    .limit(1)
    .get()

  if (existEnrollment.data && existEnrollment.data.length > 0) {
    return { success: false, error: '您已报名此班级' }
  }

  // 创建报名记录
  const enrollmentData = {
    classId,
    className: cls.data.name || cls.data.className,
    courseId: cls.data.courseId,
    name,
    phone,
    idCard: idCard || '',
    notes: notes || '',
    status: 'pending',
    enrollmentTime: new Date().toISOString(),
    source: 'online',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }

  // 关联用户
  if (userId) {
    enrollmentData.userId = userId
  }
  if (isWxEnv) {
    enrollmentData._openid = cloud.getWXContext().OPENID
  }

  const result = await db.collection('enrollments').add({
    data: enrollmentData
  })

  // 更新班级报名人数
  await db.collection('classes').doc(classId).update({
    enrolledCount: _.inc(1),
    updatedAt: db.serverDate()
  })

  return {
    success: true,
    data: {
      enrollmentId: result.id,
      message: '报名成功，请等待审核'
    }
  }
}

/**
 * 获取我的报名记录
 */
async function getMyEnrollments(params, userId) {
  const openid = userId || (isWxEnv ? cloud.getWXContext().OPENID : '')
  const { page = 1, pageSize = 10, status = '' } = params

  let where = {}
  if (openid) where.userId = openid
  if (openid) where._openid = openid

  // 支持手机号查询
  if (params.phone) {
    where = { phone: params.phone }
  }

  if (status) {
    where.status = status
  }

  if (Object.keys(where).length === 0) {
    return { success: true, data: { list: [], total: 0 } }
  }

  const countResult = await db.collection('enrollments').where(where).count()

  const enrollments = await db.collection('enrollments')
    .where(where)
    .orderBy('enrollmentTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: enrollments.data.map(e => ({
        _id: e._id,
        classId: e.classId,
        className: e.className,
        courseId: e.courseId,
        name: e.name,
        phone: e.phone,
        status: e.status,
        enrollmentTime: e.enrollmentTime,
        notes: e.notes
      })),
      total: countResult.total,
      page,
      pageSize
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
    courseId = '',
    teacherId = '',
    status = '',
    startDate = '',
    endDate = ''
  } = params

  let where = {}
  if (courseId) where.courseId = courseId
  if (teacherId) where.teacherId = teacherId
  if (status) where.status = status

  // 日期范围
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date['$gte'] = startDate
    if (endDate) where.date['$lte'] = endDate
  }

  const countResult = await db.collection('course_schedules').where(where).count()

  const schedules = await db.collection('course_schedules')
    .where(where)
    .orderBy('date', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 丰富数据
  const courseIds = [...new Set(schedules.data.map(s => s.courseId).filter(Boolean))]
  let coursesMap = {}
  if (courseIds.length > 0) {
    const courses = await db.collection('courses')
      .where({ _id: _.in(courseIds) })
      .field({ _id: true, title: true })
      .get()
    courses.data.forEach(c => { coursesMap[c._id] = c })
  }

  const teacherIds = [...new Set(schedules.data.map(s => s.teacherId).filter(Boolean))]
  let teachersMap = {}
  if (teacherIds.length > 0) {
    const teachers = await db.collection('teachers')
      .where({ _id: _.in(teacherIds) })
      .field({ _id: true, name: true })
      .get()
    teachers.data.forEach(t => { teachersMap[t._id] = t })
  }

  return {
    success: true,
    data: {
      list: schedules.data.map(s => ({
        _id: s._id,
        courseId: s.courseId,
        courseName: coursesMap[s.courseId]?.title || '',
        teacherId: s.teacherId,
        teacherName: teachersMap[s.teacherId]?.name || '',
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        maxStudents: s.maxStudents,
        enrolledCount: s.enrolledCount || 0,
        status: s.status
      })),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

// ========== 其他 ==========

async function getNotices(limit = 10) {
  const notices = await db.collection('notices')
    .where({ status: 'published' })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return {
    success: true,
    data: notices.data.map(n => ({
      _id: n._id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt
    }))
  }
}

async function getLearningPaths(params = {}) {
  const { limit = 10, difficulty = '' } = params

  let where = {}
  if (difficulty) where.difficulty = difficulty

  const paths = await db.collection('learning_paths')
    .where(where)
    .orderBy('order', 'asc')
    .limit(limit)
    .get()

  return {
    success: true,
    data: paths.data.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      difficulty: p.difficulty || 'beginner',
      categoryIds: p.categoryIds || [],
      tag: p.difficulty === 'intermediate' ? '进阶' : p.difficulty === 'advanced' ? '高级' : '入门'
    }))
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[api-training] 收到请求:', event.action)

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
      data = body.data || body
    } catch (e) {}
  }

  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : '')

  try {
    let result

    switch (action) {
      // 班级
      case 'enrollingClasses':
        result = await getEnrollingClasses(data)
        break
      case 'classDetail':
      case 'getClassDetail':
        result = await getClassDetail(data.classId)
        break
      case 'classList':
      case 'getClassList':
        result = await getClassList(data)
        break

      // 报名
      case 'enroll':
      case 'submitEnrollment':
        result = await submitEnrollment(data, userId)
        break
      case 'myEnrollments':
      case 'getMyEnrollments':
        result = await getMyEnrollments(data, userId)
        break

      // 排课
      case 'schedules':
      case 'getSchedules':
        result = await getSchedules(data)
        break

      // 其他
      case 'notices':
      case 'getNotices':
        result = await getNotices(data.limit)
        break
      case 'learningPaths':
      case 'getLearningPaths':
        result = await getLearningPaths(data)
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
    console.error('[api-training] 错误:', error)
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