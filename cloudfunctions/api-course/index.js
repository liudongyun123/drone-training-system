/**
 * api-course 云函数 - 课程服务
 * 
 * 合并来源：
 * - mobile-course（课程列表、详情、分类）
 * - mobile-learning（学习进度、收藏）
 * - api（课程相关部分）
 * 
 * 功能：
 * - 课程列表（分页、筛选、搜索）
 * - 课程详情（章节、课时）
 * - 课程分类
 * - 学习进度管理
 * - 收藏功能
 * - 热门课程/推荐课程
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
 * 格式化课程数据
 */
function formatCourse(course, teacher = null) {
  // 处理 stats 对象中的统计数据（兼容新旧格式）
  const stats = course.stats || {}
  
  return {
    _id: course._id,
    title: course.title || '',
    cover: course.cover || course.coverImage || course.thumbnail || '',
    coverImage: course.cover || course.coverImage || course.thumbnail || '',
    thumbnail: course.cover || course.coverImage || course.thumbnail || '',
    description: (course.description || '').slice(0, 200),
    shortDescription: (course.description || '').slice(0, 100),
    price: course.price || 0,
    originalPrice: course.originalPrice || course.price || 0,
    category: course.category || course.type || '',
    level: course.level || 'beginner',
    duration: course.duration || 0,
    lessonCount: course.lessonCount || course.lessons || 0,
    lessons: course.lessonCount || course.lessons || 0,
    studentCount: stats.studentCount || course.studentCount || 0,
    reviewCount: stats.reviewCount || course.reviewCount || 0,
    rating: stats.rating || course.rating || 4.5,
    tags: course.tags || [],
    isFree: course.isFree || course.price === 0,
    isFeatured: course.isFeatured || false,
    status: course.status || 'draft',
    type: course.type || 'online',
    teacher: teacher ? {
      _id: teacher._id,
      name: teacher.name,
      avatar: teacher.avatar,
      title: teacher.title
    } : (course.teacherId ? { _id: course.teacherId } : null),
    teacherId: course.teacherId,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    publishedAt: course.publishedAt
  }
}

// ========== 课程相关 ==========

/**
 * 获取课程列表
 */
async function getCourseList(params = {}) {
  const {
    page = 1,
    pageSize = 10,
    category = '',
    level = '',
    keyword = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = params

  let where = { status: 'published' }

  // 分类筛选
  if (category && category !== '全部') {
    where.category = category
  }

  // 难度筛选
  if (level) {
    where.level = level
  }

  // 关键词搜索
  if (keyword) {
    where = {
      ...where,
      $or: [
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]
    }
  }

  // 排序 - CloudBase SDK 用字符串 'asc'/'desc'
  let orderField = sortBy === 'rating' ? 'rating' :
                   sortBy === 'price' ? 'price' :
                   sortBy === 'studentCount' ? 'studentCount' : 'createdAt'
  let orderDirection = sortOrder === 'asc' ? 'asc' : 'desc'

  // 获取总数
  const countResult = await db.collection('courses').where(where).count()

  // 获取列表
  const courses = await db.collection('courses')
    .where(where)
    .orderBy(orderField, orderDirection)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 获取教师信息
  const teacherIds = [...new Set(courses.data.map(c => c.teacherId).filter(Boolean))]
  let teachersMap = {}

  if (teacherIds.length > 0) {
    const teachers = await db.collection('teachers')
      .where({ _id: _.in(teacherIds) })
      .get()
    teachers.data.forEach(t => { teachersMap[t._id] = t })
  }

  const list = courses.data.map(c => formatCourse(c, teachersMap[c.teacherId]))

  return {
    success: true,
    data: {
      list,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize)
    }
  }
}

/**
 * 获取课程详情
 */
async function getCourseDetail(courseId) {
  const courses = await db.collection('courses').doc(courseId).get()

  if (!courses.data) {
    return { success: false, error: '课程不存在' }
  }

  const course = courses.data

  // 获取教师信息
  let teacher = null
  if (course.teacherId) {
    const teachers = await db.collection('teachers').doc(course.teacherId).get()
    if (teachers.data) {
      teacher = {
        _id: teachers.data._id,
        name: teachers.data.name,
        avatar: teachers.data.avatar,
        title: teachers.data.title,
        bio: teachers.data.bio
      }
    }
  }

  // 获取章节和课时
  const lessons = await db.collection('lessons')
    .where({ courseId })
    .orderBy('order', 'asc')
    .get()

  // 按章节分组
  const chapterMap = {}
  lessons.data.forEach(lesson => {
    const chapterId = lesson.chapterId || 'default'
    if (!chapterMap[chapterId]) {
      chapterMap[chapterId] = {
        _id: chapterId,
        title: lesson.chapterTitle || '课程内容',
        order: lesson.chapterOrder || 0,
        lessons: []
      }
    }
    chapterMap[chapterId].lessons.push({
      _id: lesson._id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration || 0,
      order: lesson.order,
      isFree: lesson.isFree || false,
      description: lesson.description
    })
  })

  // 计算总时长
  const totalDuration = lessons.data.reduce((sum, l) => sum + (l.duration || 0), 0)

  return {
    success: true,
    data: {
      ...formatCourse(course, teacher),
      chapters: Object.values(chapterMap).sort((a, b) => a.order - b.order),
      lessonCount: lessons.data.length,
      totalDuration
    }
  }
}

/**
 * 获取课时详情
 */
async function getLessonDetail(lessonId) {
  const lessons = await db.collection('lessons').doc(lessonId).get()

  if (!lessons.data) {
    return { success: false, error: '课时不存在' }
  }

  const lesson = lessons.data

  // 获取上一课和下一课
  const siblings = await db.collection('lessons')
    .where({
      courseId: lesson.courseId,
      chapterId: lesson.chapterId
    })
    .orderBy('order', 'asc')
    .get()

  const currentIndex = siblings.data.findIndex(l => l._id === lessonId)
  const prevLesson = currentIndex > 0 ? siblings.data[currentIndex - 1] : null
  const nextLesson = currentIndex < siblings.data.length - 1 ? siblings.data[currentIndex + 1] : null

  return {
    success: true,
    data: {
      _id: lesson._id,
      courseId: lesson.courseId,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration || 0,
      order: lesson.order,
      isFree: lesson.isFree || false,
      description: lesson.description,
      prevLesson: prevLesson ? { _id: prevLesson._id, title: prevLesson.title } : null,
      nextLesson: nextLesson ? { _id: nextLesson._id, title: nextLesson.title } : null
    }
  }
}

/**
 * 获取课程分类
 */
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
    data: [
      { name: '全部', count: courses.data.length },
      ...categories
    ]
  }
}

/**
 * 获取热门课程
 */
async function getHotCourses(limit = 10) {
  const courses = await db.collection('courses')
    .where({ status: 'published' })
    .orderBy('studentCount', 'desc')
    .limit(limit)
    .get()

  return {
    success: true,
    data: courses.data.map(formatCourse)
  }
}

/**
 * 获取推荐课程
 */
async function getRecommendedCourses(courseId, limit = 6) {
  const currentCourse = await db.collection('courses').doc(courseId).get()

  if (!currentCourse.data) {
    return { success: false, error: '课程不存在' }
  }

  const course = currentCourse.data

  const recommended = await db.collection('courses')
    .where({
      status: 'published',
      _id: _.neq(courseId),
      $or: [
        { category: course.category },
        { teacherId: course.teacherId }
      ]
    })
    .limit(limit)
    .get()

  return {
    success: true,
    data: recommended.data.map(formatCourse)
  }
}

/**
 * 获取精选课程
 */
async function getFeaturedCourses(limit = 5) {
  const courses = await db.collection('courses')
    .where({
      status: 'published',
      isFeatured: true
    })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return {
    success: true,
    data: courses.data.map(formatCourse)
  }
}

// ========== 学习进度 ==========

/**
 * 获取用户课程学习进度
 */
async function getCourseProgress(courseId, userId) {
  const openid = userId || getOpenId()

  const progress = await db.collection('learning_progress')
    .where({ _openid: openid, courseId })
    .limit(1)
    .get()

  if (!progress.data || progress.data.length === 0) {
    return {
      success: true,
      data: {
        progress: 0,
        completedLessons: [],
        totalLessons: 0,
        lastLessonId: null,
        lastLessonTitle: null,
        lastStudyAt: null
      }
    }
  }

  return {
    success: true,
    data: progress.data[0]
  }
}

/**
 * 更新学习进度
 */
async function updateProgress(data) {
  const { courseId, lessonId, progress, position, userId } = data
  const openid = userId || getOpenId()

  const now = new Date().toISOString()

  // 获取课时信息
  const lesson = await db.collection('lessons').doc(lessonId).get()
  const lessonData = lesson.data || {}

  // 查找现有进度记录
  const existing = await db.collection('learning_progress')
    .where({ _openid: openid, courseId })
    .limit(1)
    .get()

  const completedLessons = existing.data?.[0]?.completedLessons || []

  // 如果完成，添加到已完成列表
  if (progress >= 100 && !completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId)
  }

  // 获取课程总课时数
  const totalLessons = await db.collection('lessons')
    .where({ courseId })
    .count()

  const overallProgress = Math.round((completedLessons.length / totalLessons.total) * 100)

  // 更新或创建进度记录
  if (existing.data && existing.data.length > 0) {
    await db.collection('learning_progress')
      .doc(existing.data[0]._id)
      .update({
        progress: overallProgress,
        completedLessons,
        lastLessonId: lessonId,
        lastLessonTitle: lessonData.title,
        lastPosition: position,
        lastStudyAt: now,
        updatedAt: now
      })
  } else {
    await db.collection('learning_progress').add({
      data: {
        _openid: openid,
        courseId,
        lessonId,
        progress: overallProgress,
        completedLessons,
        lastLessonId: lessonId,
        lastLessonTitle: lessonData.title,
        lastPosition: position,
        lastStudyAt: now,
        createdAt: now,
        updatedAt: now
      }
    })
  }

  return { success: true }
}

/**
 * 获取我的课程
 */
async function getMyCourses(params, userId) {
  const openid = userId || getOpenId()
  const { tab = 'studying' } = params

  // 获取已支付订单
  const orders = await db.collection('orders')
    .where({
      _openid: openid,
      status: 'paid'
    })
    .get()

  if (!orders.data || orders.data.length === 0) {
    return { success: true, data: [] }
  }

  const courseIds = orders.data.map(order => order.courseId).filter(Boolean)

  if (courseIds.length === 0) {
    return { success: true, data: [] }
  }

  // 获取课程信息
  const courses = await db.collection('courses')
    .where({
      _id: _.in(courseIds),
      status: 'published'
    })
    .get()

  // 获取学习进度
  const progressList = await db.collection('learning_progress')
    .where({
      _openid: openid,
      courseId: _.in(courseIds)
    })
    .get()

  const progressMap = {}
  progressList.data.forEach(p => {
    progressMap[p.courseId] = p
  })

  let myCourses = courses.data.map(course => {
    const p = progressMap[course._id] || {}
    return {
      ...formatCourse(course),
      progress: p.progress || 0,
      lastLessonId: p.lastLessonId,
      lastLessonTitle: p.lastLessonTitle,
      lastStudyAt: p.lastStudyAt
    }
  })

  // 筛选
  if (tab === 'studying') {
    myCourses = myCourses.filter(c => c.progress > 0 && c.progress < 100)
  } else if (tab === 'completed') {
    myCourses = myCourses.filter(c => c.progress >= 100)
  }

  return {
    success: true,
    data: myCourses.sort((a, b) => 
      new Date(b.lastStudyAt || 0) - new Date(a.lastStudyAt || 0)
    )
  }
}

// ========== 收藏功能 ==========

/**
 * 获取收藏列表
 */
async function getFavorites(userId) {
  const openid = userId || getOpenId()

  const favorites = await db.collection('favorites')
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .get()

  if (!favorites.data || favorites.data.length === 0) {
    return { success: true, data: [] }
  }

  const courseIds = favorites.data.map(f => f.courseId).filter(Boolean)
  
  if (courseIds.length === 0) {
    return { success: true, data: [] }
  }

  const courses = await db.collection('courses')
    .where({
      _id: _.in(courseIds),
      status: 'published'
    })
    .get()

  return {
    success: true,
    data: courses.data.map(formatCourse)
  }
}

/**
 * 添加收藏
 */
async function addFavorite(courseId, userId) {
  const openid = userId || getOpenId()

  const existing = await db.collection('favorites')
    .where({ _openid: openid, courseId })
    .count()

  if (existing.total === 0) {
    await db.collection('favorites').add({
      data: {
        _openid: openid,
        courseId,
        createdAt: new Date().toISOString()
      }
    })
  }

  return { success: true }
}

/**
 * 移除收藏
 */
async function removeFavorite(courseId, userId) {
  const openid = userId || getOpenId()

  await db.collection('favorites')
    .where({ _openid: openid, courseId })
    .remove()

  return { success: true }
}

/**
 * 获取 openid（小程序环境）
 */
function getOpenId() {
  if (isWxEnv) {
    return cloud.getWXContext().OPENID
  }
  return ''
}

// ========== 其他 ==========

async function getBanners(limit = 5) {
  const banners = await db.collection('banners')
    .where({ status: 'active' })
    .orderBy('order', 'asc')
    .limit(limit)
    .get()

  return {
    success: true,
    data: banners.data.map(b => ({
      _id: b._id,
      image: b.image || b.imageUrl || b.url || '',
      imageUrl: b.image || b.imageUrl || b.url || '',
      url: b.image || b.imageUrl || b.url || '',
      link: b.link || b.url || '',
      courseId: b.courseId || '',
      title: b.title || '',
      subtitle: b.subtitle || '',
      order: b.order || 0
    }))
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
    data: teachers.data.map(t => ({
      _id: t._id,
      name: t.name,
      avatar: t.avatar,
      title: t.title,
      specialty: t.specialty,
      bio: t.bio
    }))
  }
}

// ========== 课时与学习进度 ==========

/**
 * 获取课时列表
 */
async function getLessons(courseId) {
  if (!courseId) return { success: false, error: '缺少 courseId' }

  const lessons = await db.collection('lessons')
    .where({ courseId })
    .orderBy('order', 'asc')
    .get()

  return { success: true, data: lessons.data || [] }
}

/**
 * 保存学习进度
 * 支持 phone 或 userId（优先使用 phone）
 */
async function saveProgress(data) {
  const { phone, userId, courseId, lessonId, watchedDuration, duration, completed } = data
  // 优先使用 phone，兼容 userId
  const identity = phone || userId
  if (!identity || !courseId || !lessonId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 查找已有记录（支持 phone 或 userId）
    const existing = await db.collection('user_progress')
      .where(_.or(
        { phone: identity, courseId, lessonId },
        { userId: identity, courseId, lessonId }
      ))
      .limit(1)
      .get()

    const now = new Date().toISOString()

    if (existing.data && existing.data.length > 0) {
      // 更新已有记录
      await db.collection('user_progress').doc(existing.data[0]._id).update({
        data: {
          watchedDuration: _.max(watchedDuration || 0),
          totalDuration: duration || existing.data[0].totalDuration,
          completed: completed || existing.data[0].completed,
          lastWatchAt: now,
          updatedAt: now,
          phone: phone || existing.data[0].phone // 确保有 phone
        }
      })
    } else {
      // 创建新记录
      await db.collection('user_progress').add({
        data: {
          phone, // 使用 phone 作为主要标识
          userId: userId || null, // 保留 userId 以备兼容
          courseId,
          lessonId,
          watchedDuration: watchedDuration || 0,
          totalDuration: duration || 0,
          completed: completed || false,
          lastWatchAt: now,
          createdAt: now,
          updatedAt: now
        }
      })
    }

    return { success: true }
  } catch (e) {
    console.error('[saveProgress] 保存失败:', e)
    return { success: false, error: e.message }
  }
}

/**
 * 标记课时完成
 * 支持 phone 或 userId（优先使用 phone）
 */
async function markCompleted(data) {
  const { phone, userId, courseId, lessonId } = data
  // 优先使用 phone，兼容 userId
  const identity = phone || userId
  if (!identity || !courseId || !lessonId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    const now = new Date().toISOString()

    // 更新进度为已完成（支持 phone 或 userId）
    const existing = await db.collection('user_progress')
      .where(_.or(
        { phone: identity, courseId, lessonId },
        { userId: identity, courseId, lessonId }
      ))
      .limit(1)
      .get()

    if (existing.data && existing.data.length > 0) {
      await db.collection('user_progress').doc(existing.data[0]._id).update({
        data: {
          completed: true,
          completedAt: now,
          updatedAt: now
        }
      })
    } else {
      await db.collection('user_progress').add({
        data: {
          phone, // 使用 phone 作为主要标识
          userId: userId || null,
          courseId, lessonId,
          watchedDuration: 0,
          completed: true,
          completedAt: now,
          createdAt: now,
          updatedAt: now
        }
      })
    }

    return { success: true }
  } catch (e) {
    console.error('[markCompleted] 失败:', e)
    return { success: false, error: e.message }
  }
}

/**
 * 颁发培训证书
 * 条件：课程全部课时完成 或 考试通过
 */
async function issueCertificate(data) {
  const { userId, courseId } = data
  if (!userId || !courseId) {
    return { success: false, error: '缺少必要参数' }
  }

  try {
    // 检查课程信息
    const course = await db.collection('courses').doc(courseId).get()
    if (!course.data) return { success: false, error: '课程不存在' }

    // 检查是否已颁发过
    const existing = await db.collection('training_certificates')
      .where({ userId, courseId, status: 'active' })
      .limit(1)
      .get()
    if (existing.data && existing.data.length > 0) {
      return { success: false, error: '证书已颁发', certificateId: existing.data[0]._id }
    }

    // 检查完成课时数
    const progress = await db.collection('user_progress')
      .where({ userId, courseId, completed: true })
      .get()
    const completedCount = progress.data?.length || 0

    // 检查考试是否通过
    let examPassed = false
    const exams = await db.collection('exams')
      .where({ courseId, status: 'published' })
      .limit(1)
      .get()
    if (exams.data && exams.data.length > 0) {
      const examResults = await db.collection('exam_results')
        .where({ userId, examId: exams.data[0]._id, passed: true })
        .limit(1)
        .get()
      examPassed = examResults.data && examResults.data.length > 0
    }

    // 获取课时总数
    const totalLessons = await db.collection('lessons')
      .where({ courseId })
      .count()
    const totalLessonCount = totalLessons.total || 0

    // 判断是否满足颁发条件（100% 课时完成 或 考试通过）
    const lessonsComplete = totalLessonCount > 0 && completedCount >= totalLessonCount
    if (!lessonsComplete && !examPassed) {
      return { success: false, error: '尚未满足证书颁发条件' }
    }

    // 生成证书编号
    const certNo = `UAV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    const now = new Date().toISOString()

    // 创建证书
    const certResult = await db.collection('training_certificates').add({
      data: {
        certNo,
        userId,
        courseId,
        courseName: course.data.title,
        type: examPassed ? 'exam' : 'completion',
        status: 'active',
        issuedAt: now,
        completedLessons: completedCount,
        totalLessons: totalLessonCount,
        examScore: examPassed ? 'passed' : null,
        createdAt: now
      }
    })

    return {
      success: true,
      data: {
        certificateId: certResult.id,
        certNo,
        courseName: course.data.title,
        type: examPassed ? 'exam' : 'completion'
      }
    }
  } catch (e) {
    console.error('[issueCertificate] 失败:', e)
    return { success: false, error: e.message }
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[api-course] 收到请求:', event.action)

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

  // 获取用户标识
  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : '')

  try {
    let result

    switch (action) {
      // 课程
      case 'list':
      case 'getCourseList':
        result = await getCourseList(data)
        break
      case 'detail':
      case 'getCourseDetail':
        result = await getCourseDetail(data.courseId)
        break
      case 'lesson':
      case 'getLessonDetail':
        result = await getLessonDetail(data.lessonId)
        break
      case 'categories':
      case 'getCategories':
        result = await getCategories()
        break
      case 'hot':
      case 'getHotCourses':
        result = await getHotCourses(data.limit)
        break
      case 'recommended':
      case 'getRecommendedCourses':
        result = await getRecommendedCourses(data.courseId, data.limit)
        break
      case 'featured':
      case 'getFeaturedCourses':
        result = await getFeaturedCourses(data.limit)
        break

      // 学习进度
      case 'progress':
      case 'getCourseProgress':
        result = await getCourseProgress(data.courseId, userId)
        break
      case 'updateProgress':
        result = await updateProgress({ ...data, userId })
        break
      case 'myCourses':
      case 'getMyCourses':
        result = await getMyCourses(data, userId)
        break

      // 收藏
      case 'favorites':
      case 'getFavorites':
        result = await getFavorites(userId)
        break
      case 'addFavorite':
        result = await addFavorite(data.courseId, userId)
        break
      case 'removeFavorite':
        result = await removeFavorite(data.courseId, userId)
        break

      // 其他
      case 'banners':
        result = await getBanners(data.limit)
        break
      case 'teachers':
        result = await getTeachers(data)
        break

      // 课时学习
      case 'getLessons':
        result = await getLessons(data.courseId)
        break
      case 'saveProgress':
        result = await saveProgress(data)
        break
      case 'markCompleted':
        result = await markCompleted(data)
        break
      case 'issueCertificate':
        result = await issueCertificate(data)
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
    console.error('[api-course] 错误:', error)
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