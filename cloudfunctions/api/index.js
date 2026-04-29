/**
 * 云函数: api
 * 统一 API 网关（Web + H5）
 * 
 * 合并来源：
 * - api/auth-login（Web 认证）
 * - api/courses-list（课程列表）
 * - api/orders-create（创建订单）
 * - api/orders-callback（支付回调）
 * - api/progress-update（学习进度）
 * - mobile-api（移动端全部功能）
 * 
 * 版本: v20260429-consolidated
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

// ========================================
// 工具函数
// ========================================

/**
 * 格式化课程数据
 */
function formatCourse(course, teacher = null) {
  return {
    _id: course._id,
    title: course.title,
    coverImage: course.coverImage || course.cover || '',
    cover: course.coverImage || course.cover || '',
    description: course.description?.slice(0, 100) || '',
    price: course.price || 0,
    originalPrice: course.originalPrice || course.price || 0,
    category: course.category,
    level: course.level,
    duration: course.duration || 0,
    studentCount: course.studentCount || 0,
    rating: course.rating || 4.5,
    tags: course.tags || [],
    isFree: course.isFree || false,
    teacher: teacher ? {
      _id: teacher._id,
      name: teacher.name,
      avatar: teacher.avatar,
      title: teacher.title,
    } : null,
    createdAt: course.createdAt,
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
    description: cls.description || course?.description || '',
    createdAt: cls.createdAt,
  }
}

/**
 * 获取用户平台
 */
function getPlatform(event) {
  // 从 event.platform 显式传递
  if (event.platform) return event.platform
  
  // 从 userInfo 推断
  const userInfo = event.userInfo || {}
  if (userInfo.openId || userInfo._openid) {
    return 'miniapp' // 小程序
  }
  
  // 从 headers 推断
  const userAgent = event.headers?.['user-agent'] || ''
  if (userAgent.includes('MiniProgram')) return 'miniapp'
  if (userAgent.includes('Mobile')) return 'h5'
  
  return 'web'
}

// ========================================
// 课程相关
// ========================================

async function getCourseList(params = {}) {
  const {
    page = 1,
    pageSize = 10,
    category = '',
    level = '',
    keyword = '',
    difficulty = '',
  } = params
  
  let where = { status: 'published' }
  
  if (category && category !== '全部') {
    where.category = category
  }
  
  if (level || difficulty) {
    where.level = level || difficulty
  }
  
  if (keyword) {
    where = {
      ...where,
      $or: [
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) },
      ],
    }
  }
  
  const countResult = await db.collection('courses').where(where).count()
  
  const courses = await db.collection('courses')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  
  const teacherIds = [...new Set(courses.data.map(c => c.teacherId).filter(Boolean))]
  let teachersMap = {}
  
  if (teacherIds.length > 0) {
    const teachers = await db.collection('teachers')
      .where({ _id: _.in(teacherIds) })
      .get()
    teachers.data.forEach(t => { teachersMap[t._id] = t })
  }
  
  return {
    success: true,
    code: 0,
    data: courses.data.map(c => formatCourse(c, teachersMap[c.teacherId])),
    total: countResult.total,
    page,
    pageSize,
  }
}

async function getCourseDetail(courseId) {
  const courses = await db.collection('courses').doc(courseId).get()
  
  if (!courses.data || courses.data.length === 0) {
    return { success: false, code: 1, error: '课程不存在' }
  }
  
  const course = courses.data
  
  let teacher = null
  if (course.teacherId) {
    const teachers = await db.collection('teachers').doc(course.teacherId).get()
    if (teachers.data) {
      teacher = teachers.data
    }
  }
  
  const lessons = await db.collection('lessons')
    .where({ courseId })
    .orderBy('order', 'asc')
    .get()
  
  const chapterMap = {}
  lessons.data.forEach(lesson => {
    const chapterId = lesson.chapterId || 'default'
    if (!chapterMap[chapterId]) {
      chapterMap[chapterId] = {
        _id: chapterId,
        title: lesson.chapterTitle || '课程内容',
        order: lesson.chapterOrder || 0,
        lessons: [],
      }
    }
    chapterMap[chapterId].lessons.push({
      _id: lesson._id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration || 0,
      order: lesson.order,
      isFree: lesson.isFree || false,
      description: lesson.description,
    })
  })
  
  return {
    success: true,
    code: 0,
    data: {
      ...formatCourse(course, teacher),
      chapters: Object.values(chapterMap).sort((a, b) => a.order - b.order),
      lessonCount: lessons.data.length,
    },
  }
}

async function getCategories() {
  const courses = await db.collection('courses')
    .where({ status: 'published' })
    .field({ category: true })
    .get()
  
  const categoryMap = {}
  courses.data.forEach(c => {
    if (c.category) {
      categoryMap[c.category] = (categoryMap[c.category] || 0) + 1
    }
  })
  
  const categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  
  return {
    success: true,
    code: 0,
    data: [
      { name: '全部', count: courses.data.length },
      ...categories,
    ],
  }
}

// ========================================
// 班级相关（核心功能）
// ========================================

async function enrollingClasses(params = {}) {
  const { page = 1, pageSize = 10 } = params
  
  const countResult = await db.collection('classes').where({ status: _.in(['open', 'enrolling']) }).count()
  
  const classes = await db.collection('classes')
    .where({ status: _.in(['open', 'enrolling']) })
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
      .field({ _id: true, title: true })
      .get()
    courses.data.forEach(c => { coursesMap[c._id] = c })
  }
  
  // 获取关联教师
  const teacherIds = [...new Set(classes.data.map(c => c.teacherId).filter(Boolean))]
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
    code: 0,
    data: classes.data.map(cls => formatClass(cls, coursesMap[cls.courseId], teachersMap[cls.teacherId])),
    total: countResult.total,
  }
}

async function classDetail(classId) {
  try {
    const classes = await db.collection('classes').doc(classId).get()
    
    if (!classes.data || classes.data.length === 0) {
      return { success: false, code: 1, error: '班级不存在' }
    }
    
    const cls = classes.data
    
    let course = null
    if (cls.courseId) {
      try {
        const courses = await db.collection('courses').doc(cls.courseId).get()
        if (courses.data && courses.data.length > 0) {
          course = courses.data
        }
      } catch (e) {
        console.log('Course not found:', cls.courseId)
      }
    }
    
    let teacher = null
    if (cls.teacherId) {
      try {
        const teachers = await db.collection('teachers').doc(cls.teacherId).get()
        if (teachers.data && teachers.data.length > 0) {
          teacher = teachers.data
        }
      } catch (e) {
        console.log('Teacher not found:', cls.teacherId)
      }
    }
    
    return {
      success: true,
      code: 0,
      data: formatClass(cls, course, teacher),
    }
  } catch (e) {
    console.error('classDetail error:', e)
    return { success: false, code: 1, error: e.message }
  }
}

async function submitEnrollment(data) {
  const { classId, name, phone, idCard, notes } = data
  
  if (!classId) {
    return { success: false, code: 1, error: '缺少班级ID' }
  }
  
  if (!name || !phone) {
    return { success: false, code: 1, error: '姓名和手机号不能为空' }
  }
  
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, code: 1, error: '手机号格式不正确' }
  }
  
  // 检查班级是否存在
  const cls = await db.collection('classes').doc(classId).get()
  if (!cls.data || cls.data.length === 0) {
    return { success: false, code: 1, error: '班级不存在' }
  }
  
  // 检查是否满员
  const maxStudents = cls.data.maxStudents || cls.data.capacity?.max || 30
  const enrolledCount = cls.data.enrolledCount || cls.data.capacity?.enrolled || 0
  if (enrolledCount >= maxStudents) {
    return { success: false, code: 1, error: '班级已满员' }
  }
  
  // 检查重复报名
  const exist = await db.collection('enrollments')
    .where({ classId, phone, status: _.nin(['cancelled', 'rejected']) })
    .count()
  if (exist.total > 0) {
    return { success: false, code: 1, error: '您已报名此班级' }
  }
  
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 创建报名记录
  const result = await db.collection('enrollments').add({
    data: {
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
      _openid: openid,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })
  
  // 更新班级人数
  await db.collection('classes').doc(classId).update({
    enrolledCount: _.inc(1),
    updatedAt: db.serverDate(),
  })
  
  return {
    success: true,
    code: 0,
    data: {
      enrollmentId: result.id,
      message: '报名成功，请等待审核',
    },
  }
}

// ========================================
// 订单相关（来自原 api/orders-create）
// ========================================

async function createOrder(data) {
  const { openid, items } = data
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, code: 1, error: '订单项不能为空' }
  }
  
  // 检查用户是否已购买过这些课程
  const existingOrders = await db.collection('orders')
    .where({ openid })
    .get()
  
  const purchasedCourseIds = existingOrders.data
    .filter(order => order.status === 'paid')
    .flatMap(order => (order.items || []).map(item => item.courseId))
  
  // 过滤掉已购买的课程
  const validItems = items.filter(item => !purchasedCourseIds.includes(item.courseId))
  
  if (validItems.length === 0) {
    return {
      success: false,
      code: 1,
      error: '所有课程均已购买',
    }
  }
  
  // 计算总金额
  let totalAmount = 0
  for (const item of validItems) {
    const course = await db.collection('courses').doc(item.courseId).get()
    if (course.data) {
      item.price = course.data.price || 0
      item.title = course.data.title
      totalAmount += item.price
    }
  }
  
  // 创建订单
  const orderNo = `ORD${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const order = {
    orderNo,
    openid,
    items: validItems,
    totalAmount,
    status: 'pending',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }
  
  const result = await db.collection('orders').add({ data: order })
  
  return {
    success: true,
    code: 0,
    data: {
      orderId: result.id,
      orderNo,
      totalAmount,
      items: validItems,
    },
  }
}

async function ordersCallback(data) {
  const { out_trade_no, transaction_id, result_code } = data
  
  // 更新订单状态
  const orderResult = await db.collection('orders')
    .where({ orderNo: out_trade_no })
    .update({
      status: result_code === 'SUCCESS' ? 'paid' : 'cancelled',
      payment_id: transaction_id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  
  // 如果支付成功，创建课程权限
  if (result_code === 'SUCCESS') {
    const order = await db.collection('orders')
      .where({ orderNo: out_trade_no })
      .get()
    
    if (order.data && order.data.length > 0) {
      const orderData = order.data[0]
      for (const item of orderData.items || []) {
        await db.collection('course_permissions').add({
          data: {
            userId: orderData.openid,
            courseId: item.courseId,
            courseName: item.title,
            source: 'purchase',
            status: 'active',
            createdAt: db.serverDate(),
          },
        })
      }
    }
  }
  
  return {
    success: true,
    code: 0,
    message: '回调处理成功',
  }
}

// ========================================
// 学习进度（来自原 api/progress-update）
// ========================================

async function updateProgress(data) {
  const { openid, courseId, lessonId, progress } = data
  
  if (!openid || !courseId) {
    return { success: false, code: 1, error: '缺少必要参数' }
  }
  
  // 查找现有进度
  const existing = await db.collection('user_progress')
    .where({
      openid,
      course_id: courseId,
    })
    .get()
  
  if (existing.data && existing.data.length > 0) {
    // 更新现有进度
    await db.collection('user_progress')
      .doc(existing.data[0]._id)
      .update({
        lesson_id: lessonId,
        progress,
        updated_at: new Date().toISOString(),
      })
  } else {
    // 创建新进度
    await db.collection('user_progress').add({
      data: {
        openid,
        course_id: courseId,
        lesson_id: lessonId,
        progress,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  }
  
  return {
    success: true,
    code: 0,
    message: '进度更新成功',
  }
}

// ========================================
// 其他功能
// ========================================

async function getBanners(limit = 5) {
  const banners = await db.collection('banners')
    .where({ status: 'active' })
    .orderBy('order', 'asc')
    .limit(limit)
    .get()
  
  return {
    success: true,
    code: 0,
    data: banners.data.map(b => ({
      _id: b._id,
      image: b.image,
      link: b.link || '',
      courseId: b.courseId || '',
      title: b.title || '',
    })),
  }
}

async function getLearningPaths(params = {}) {
  const { limit = 10, difficulty = '' } = params
  
  let where = {}
  if (difficulty) {
    where.difficulty = difficulty
  }
  
  const paths = await db.collection('learning_paths')
    .where(where)
    .orderBy('order', 'asc')
    .limit(limit)
    .get()
  
  return {
    success: true,
    code: 0,
    data: paths.data.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      difficulty: p.difficulty || 'beginner',
      categoryIds: p.categoryIds || [],
      tag: p.difficulty === 'intermediate' ? '进阶' : p.difficulty === 'advanced' ? '高级' : '入门',
    })),
  }
}

async function getNotices(limit = 10) {
  const notices = await db.collection('notices')
    .where({ status: 'published' })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()
  
  return {
    success: true,
    code: 0,
    data: notices.data.map(n => ({
      _id: n._id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
    })),
  }
}

async function getTeachers(params = {}) {
  const { specialty = '' } = params
  
  let where = {}
  if (specialty) {
    where.specialty = specialty
  }
  
  const teachers = await db.collection('teachers')
    .where(where)
    .limit(20)
    .get()
  
  return {
    success: true,
    code: 0,
    data: teachers.data.map(t => ({
      _id: t._id,
      name: t.name,
      avatar: t.avatar,
      title: t.title,
      specialty: t.specialty,
    })),
  }
}

// ========================================
// 主入口
// ========================================

exports.main = async (event, context) => {
  console.log('=== api 统一入口 ===')
  console.log('event keys:', Object.keys(event).join(', '))
  
  const platform = getPlatform(event)
  console.log('平台:', platform)
  
  // 解析 action 和 data
  let action = ''
  let data = {}
  
  // HTTP 网关传递的参数在 body 中
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || ''
      data = body.data || {}
    } catch (e) {
      console.error('Parse body error:', e.message)
      return { success: false, code: -1, error: '请求格式错误' }
    }
  } else if (event.action) {
    // Event 格式直接传递
    action = event.action
    data = event.data || {}
  }
  
  // 某些路由直接传递参数（如 courseId）
  if (event.courseId) data.courseId = event.courseId
  if (event.classId) data.classId = event.classId
  
  console.log('Action:', action)
  console.log('Data keys:', Object.keys(data).join(', '))
  
  try {
    let result
    
    switch (action) {
      // 课程
      case 'list':
      case 'getList':
      case 'courses-list':
        result = await getCourseList(data)
        break
      case 'detail':
      case 'getDetail':
        result = await getCourseDetail(data.courseId)
        break
      case 'categories':
      case 'getCategories':
        result = await getCategories()
        break
        
      // 班级（核心）
      case 'enrollingClasses':
        result = await enrollingClasses(data)
        break
      case 'classDetail':
        result = await classDetail(data.classId)
        break
      case 'enroll':
        result = await submitEnrollment(data)
        break
        
      // 订单
      case 'orders-create':
      case 'createOrder':
        result = await createOrder(data)
        break
      case 'orders-callback':
        result = await ordersCallback(data)
        break
        
      // 学习进度
      case 'progress-update':
      case 'updateProgress':
        result = await updateProgress(data)
        break
        
      // 其他
      case 'banners':
        result = await getBanners(data.limit)
        break
      case 'learningPaths':
        result = await getLearningPaths(data)
        break
      case 'notices':
        result = await getNotices(data.limit)
        break
      case 'teachers':
        result = await getTeachers(data)
        break
        
      default:
        result = { success: false, code: 1, error: '未知的操作: ' + action }
    }
    
    return result
  } catch (error) {
    console.error('API Error:', error)
    return { success: false, code: 1, error: error.message }
  }
}
