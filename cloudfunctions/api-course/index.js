/**
 * api-course 云函数 - 课程服务
 * 
 * 功能：课程列表、详情、分类、学习进度、收藏
 * 
 * 功能：
 * - 课程列表（分页、筛选、搜索）
 * - 课程详情（章节、课时）
 * - 课程分类
 * - 学习进度管理
 * - 收藏功能
 * - 热门课程/推荐课程
 */

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command

// 云函数以 HTTP 触发器运行，CloudBase Node 运行时不存在全局 WX 环境（isWxEnv/cloud 非注入变量）
const isWxEnv = false

// ========== 工具函数 ==========

const { getCorsHeaders } = require('./lib/cors')

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
async function getCourseProgress(courseId, phone) {
  const key = phone || getOpenId()

  const progress = await db.collection('user_progress')
    .where({ phone: key, courseId })
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
  const { courseId, lessonId, progress, position, userId, phone } = data
  const key = phone || userId || getOpenId()

  const now = new Date().toISOString()

  // 获取课时信息
  const lesson = await db.collection('lessons').doc(lessonId).get()
  const lessonData = lesson.data || {}

  // 查找现有进度记录（统一读写 user_progress，按手机号标识）
  const existing = await db.collection('user_progress')
    .where({ phone: key, courseId })
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

  const totalLessonCount = totalLessons.total || 0
  const overallProgress = totalLessonCount > 0 ? Math.round((completedLessons.length / totalLessonCount) * 100) : 0
  // 同步 status 字段，供 getProgressStats 按 not_started/in_progress/completed 三分类统计
  const progressStatus =
    overallProgress >= 100 ? 'completed' : overallProgress > 0 ? 'in_progress' : 'not_started'

  // 更新或创建进度记录
  if (existing.data && existing.data.length > 0) {
    await db.collection('user_progress')
      .doc(existing.data[0]._id)
      .update({
        progress: overallProgress,
        status: progressStatus,
        completedLessons,
        lastLessonId: lessonId,
        lastLessonTitle: lessonData.title,
        lastPosition: position,
        lastStudyAt: now,
        updatedAt: now
      })
  } else {
    await db.collection('user_progress').add({
      data: {
        phone: key,
        courseId,
        lessonId,
        progress: overallProgress,
        status: progressStatus,
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

  // 获取已支付订单（已付款状态集合须含 completed/paid_offline，否则线下报名/已完成订单用户的「我的课程」不显示）
  const orders = await db.collection('orders')
    .where({
      _openid: openid,
      status: _.in(['paid', 'completed', 'paid_offline'])
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

  // 获取学习进度（统一读 user_progress：小程序 saveProgress/markCompleted 实际写入此集合；
  // learning_progress 在 HTTP 环境下 _openid 恒空导致查不到，故改读 user_progress 并按课程聚合）
  const identity = openid
  const progressList = await db.collection('user_progress')
    .where(_.or([
      { userId: identity, courseId: _.in(courseIds) },
      { phone: identity, courseId: _.in(courseIds) }
    ]))
    .get()

  const progressMap = {}
  progressList.data.forEach(p => {
    const cid = p.courseId
    if (!progressMap[cid]) progressMap[cid] = { completed: 0, lastWatchAt: '', lastLessonId: '' }
    if (p.completed) progressMap[cid].completed += 1
    if (p.lastWatchAt && p.lastWatchAt > progressMap[cid].lastWatchAt) {
      progressMap[cid].lastWatchAt = p.lastWatchAt
      progressMap[cid].lastLessonId = p.lessonId
    }
  })

  let myCourses = courses.data.map(course => {
    const pm = progressMap[course._id] || { completed: 0, lastWatchAt: '', lastLessonId: '' }
    const totalLessons = course.lessonCount || (course.lessons && course.lessons.length) || 0
    const progress = totalLessons > 0 ? Math.round((pm.completed / totalLessons) * 100) : 0
    return {
      ...formatCourse(course),
      progress,
      lastLessonId: pm.lastLessonId,
      lastLessonTitle: '',
      lastStudyAt: pm.lastWatchAt
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

    // 检查是否已颁发过（统一写 certificates 集合，与 getCertificates/verify/revoke 读取端一致）
    const existing = await db.collection('certificates')
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

    // 创建证书（统一写入 certificates 集合，避免与读取端 training_certificates/certificates 割裂）
    const certResult = await db.collection('certificates').add({
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

// ========== 学习路径 (from api-course) ==========

async function getLearningPaths(data) {
  const { level, page = 1, pageSize = 10 } = data

  let query = db.collection('learning_paths')
    .where({ status: 'published' })
    .orderBy('sort', 'asc')
    .orderBy('createdAt', 'desc')

  if (level) {
    query = query.where({ level })
  }

  const skip = (page - 1) * pageSize

  const result = await query.skip(skip).limit(pageSize).get()
  const countResult = await query.count()

  return {
    success: true,
    data: {
      list: result.data,
      total: countResult.total,
      page,
      pageSize,
    }
  }
}

async function getLearningPathDetail(data) {
  const { pathId } = data

  const path = await db.collection('learning_paths').doc(pathId).get()

  if (!path.data || path.data.length === 0) {
    return { success: false, error: '学习路径不存在' }
  }

  const courseIds = (path.data[0].courses || []).map(c => c.id)
  let courses = []

  if (courseIds.length > 0) {
    const coursesResult = await db.collection('courses')
      .where({ _id: _.in(courseIds), status: 'published' })
      .get()
    courses = coursesResult.data
  }

  const pathData = {
    ...path.data[0],
    courses: (path.data[0].courses || []).map(c => {
      const course = courses.find(co => co._id === c.id) || {}
      return { ...c, cover: course.cover, price: course.price }
    }),
  }

  return { success: true, data: pathData }
}

async function getPathProgress(data, userId) {
  const { pathId } = data
  // 统一身份为手机号；兼容 userId / _openid（HTTP 环境下 _openid 恒空，必须以 phone 为主键）
  const phone = data.phone || userId || getOpenId() || ''

  const path = await db.collection('learning_paths').doc(pathId).get()

  if (!path.data || path.data.length === 0) {
    return { success: false, error: '学习路径不存在' }
  }

  const courseIds = (path.data[0].courses || []).map(c => c.id)

  // 统一读 user_progress（与课程/课时进度同一集合，按手机号标识），不再使用 learning_progress
  const or = []
  if (phone) or.push({ phone })
  if (userId) or.push({ userId })
  const openid = getOpenId()
  if (openid) or.push({ _openid: openid })

  let progressList = { data: [] }
  if (or.length > 0) {
    progressList = await db.collection('user_progress')
      .where(_.and([
        _.or(or),
        { courseId: _.in(courseIds) },
        _.or([{ completed: true }, { status: 'completed' }, { progress: _.gte(100) }])
      ]))
      .get()
  }

  const completedCourseIds = progressList.data.map(p => p.courseId)
  const completedCount = completedCourseIds.length
  const totalCount = courseIds.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return {
    success: true,
    data: { courseIds: completedCourseIds, completedCount, totalCount, percentage }
  }
}

// ========== 证书 (使用 certificates 集合) ==========

function generateCertificateNo() {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `CERT-${timestamp}-${random}`
}

async function getCertificates(data, userId) {
  const { page = 1, pageSize = 10 } = data
  const openid = userId || getOpenId()

  const query = db.collection('certificates')
    .where({ _openid: openid, status: 'active' })
    .orderBy('issuedAt', 'desc')

  const skip = (page - 1) * pageSize

  const result = await query.skip(skip).limit(pageSize).get()
  const countResult = await query.count()

  return {
    success: true,
    data: { list: result.data, total: countResult.total, page, pageSize }
  }
}

async function getCertificateDetail(data, userId) {
  const { certificateId } = data
  const openid = userId || getOpenId()

  const certificate = await db.collection('certificates')
    .where({ _id: certificateId, _openid: openid })
    .limit(1)
    .get()

  if (!certificate.data || certificate.data.length === 0) {
    return { success: false, error: '证书不存在' }
  }

  const course = await db.collection('courses').doc(certificate.data[0].courseId).get()

  return {
    success: true,
    data: { ...certificate.data[0], course: course.data?.[0] || null }
  }
}

async function downloadCertificate(data, userId) {
  const { certificateId } = data
  const openid = userId || getOpenId()

  const certificate = await db.collection('certificates')
    .where({ _id: certificateId, _openid: openid })
    .limit(1)
    .get()

  if (!certificate.data || certificate.data.length === 0) {
    return { success: false, error: '证书不存在' }
  }

  const pdfUrl = certificate.data[0].pdfUrl || `https://example.com/certificates/${certificateId}.pdf`

  return { success: true, data: { url: pdfUrl } }
}

async function generateCertificateByCourse(data, userId) {
  const { courseId } = data
  const openid = userId || getOpenId()

  const existing = await db.collection('certificates')
    .where({ _openid: openid, courseId, status: 'active' })
    .get()

  if (existing.data && existing.data.length > 0) {
    return { success: true, data: existing.data[0] }
  }

  const course = await db.collection('courses').doc(courseId).get()

  if (!course.data || course.data.length === 0) {
    return { success: false, error: '课程不存在' }
  }

  const certificateNo = generateCertificateNo()
  const result = await db.collection('certificates').add({
    _openid: openid,
    name: `${course.data[0].title} 结业证书`,
    courseId,
    courseName: course.data[0].title,
    issuedAt: new Date().toISOString(),
    certificateNo,
    verified: false,
    status: 'active',
  })

  return {
    success: true,
    data: {
      _id: result._id || result.id,
      certificateNo,
      name: `${course.data[0].title} 结业证书`,
      courseName: course.data[0].title,
      issuedAt: new Date().toISOString(),
    }
  }
}

// ========== 进度管理 - 管理端 (from api-course) ==========

async function getProgressStats() {
  // 统一读 user_progress（与小程序 saveProgress/markCompleted 写入端一致）
  const totalResult = await db.collection('user_progress').count()
  const completedResult = await db.collection('user_progress').where({ completed: true }).count()

  // createdAt 以 ISO 字符串写入，需用同格式字符串比较（数字无法按时间语义匹配）
  const weekAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thisWeekResult = await db.collection('user_progress')
    .where({ createdAt: _.gte(weekAgoStr) })
    .count()

  const total = totalResult.total || 0
  const completed = completedResult.total || 0
  // user_progress 无百分比字段，用「已完成课时记录 / 总记录」近似平均进度
  const avgProgress = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    success: true,
    data: {
      total,
      notStarted: 0,
      inProgress: total - completed,
      completed,
      thisWeek: thisWeekResult.total || 0,
      avgProgress,
    }
  }
}

// ========== 学习路径管理 (新增) ==========

async function createPath(data) {
  const { title, description, courses, level, sort } = data
  if (!title) return { success: false, error: '路径标题不能为空' }

  const result = await db.collection('learning_paths').add({
    title,
    description: description || '',
    courses: courses || [],
    level: level || 'beginner',
    sort: sort || 0,
    status: 'published',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  return { success: true, data: { _id: result._id || result.id } }
}

async function updatePath(data) {
  const { pathId, title, description, courses, level, sort, status } = data
  if (!pathId) return { success: false, error: '路径ID不能为空' }

  const updateData = { updatedAt: Date.now() }
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (courses !== undefined) updateData.courses = courses
  if (level !== undefined) updateData.level = level
  if (sort !== undefined) updateData.sort = sort
  if (status !== undefined) updateData.status = status

  await db.collection('learning_paths').doc(pathId).update(updateData)
  return { success: true, data: { updated: true } }
}

async function deletePath(data) {
  const { pathId } = data
  if (!pathId) return { success: false, error: '路径ID不能为空' }

  await db.collection('learning_paths').doc(pathId).remove()
  return { success: true, data: { deleted: true } }
}

async function startPath(data, userId) {
  const { pathId } = data
  // 统一身份为手机号；HTTP 环境下 _openid 恒空，必须以 phone 为主键
  const phone = data.phone || userId || getOpenId() || ''
  if (!pathId || !phone) return { success: false, error: '参数不足' }

  const openid = getOpenId()
  const now = Date.now()
  // 统一写 user_progress（type:'path' 区分路径进度，按手机号标识），不再使用 learning_progress
  await db.collection('user_progress').add({
    data: {
      phone,
      userId: userId || '',
      _openid: openid || '',
      pathId,
      type: 'path',
      status: 'in_progress',
      progress: 0,
      completed: false,
      startedAt: now,
      lastStudyTime: now,
      createdAt: now,
      updatedAt: now,
    }
  })

  return { success: true, data: { started: true } }
}

async function completePath(data, userId) {
  const { pathId } = data
  // 统一身份为手机号；HTTP 环境下 _openid 恒空，必须以 phone 为主键
  const phone = data.phone || userId || getOpenId() || ''
  if (!pathId || !phone) return { success: false, error: '参数不足' }

  const openid = getOpenId()
  const or = []
  if (phone) or.push({ phone, pathId })
  if (userId) or.push({ userId, pathId })
  if (openid) or.push({ _openid: openid, pathId })

  if (or.length > 0) {
    // 将路径下所有进度标记完成（统一写 user_progress）
    await db.collection('user_progress')
      .where(_.or(or))
      .update({
        status: 'completed',
        progress: 100,
        completed: true,
        completedAt: Date.now(),
        updatedAt: Date.now(),
      })
  }

  return { success: true, data: { completed: true } }
}

// ========== 证书管理 (新增) ==========

async function revokeCertificate(data) {
  const { certificateId } = data
  if (!certificateId) return { success: false, error: '证书ID不能为空' }

  await db.collection('certificates').doc(certificateId).update({
    status: 'revoked',
    revokedAt: Date.now(),
  })

  return { success: true, data: { revoked: true } }
}

async function verifyCertificate(data) {
  const { certificateId, certificateNo } = data
  const filter = {}
  if (certificateId) filter._id = certificateId
  else if (certificateNo) filter.certificateNo = certificateNo
  else return { success: false, error: '请提供证书ID或证书编号' }

  const result = await db.collection('certificates').where(filter).limit(1).get()

  if (!result.data || result.data.length === 0) {
    return { success: true, data: { valid: false, message: '证书不存在' } }
  }

  const cert = result.data[0]
  return {
    success: true,
    data: {
      valid: cert.status === 'active',
      status: cert.status,
      certificateNo: cert.certificateNo,
      courseName: cert.courseName,
      issuedAt: cert.issuedAt,
    }
  }
}

async function getCertificateStats() {
  const totalResult = await db.collection('certificates').count()
  const activeResult = await db.collection('certificates').where({ status: 'active' }).count()
  const revokedResult = await db.collection('certificates').where({ status: 'revoked' }).count()

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weekResult = await db.collection('certificates').where({ issuedAt: _.gte(weekAgo) }).count()

  return {
    success: true,
    data: {
      total: totalResult.total,
      active: activeResult.total,
      revoked: revokedResult.total,
      thisWeek: weekResult.total,
    }
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
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
        result = await getCourseProgress(data.courseId, data.phone || userId)
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

      // ===== 学习路径 (from api-course) =====
      case 'getLearningPaths':
        result = await getLearningPaths(data)
        break
      case 'getLearningPathDetail':
        result = await getLearningPathDetail(data)
        break
      case 'getPathProgress':
        result = await getPathProgress(data, userId)
        break

      // ===== 证书 (使用 certificates 集合) =====
      case 'getCertificates':
        result = await getCertificates(data, userId)
        break
      case 'getCertificateDetail':
        result = await getCertificateDetail(data, userId)
        break
      case 'downloadCertificate':
        result = await downloadCertificate(data, userId)
        break
      case 'generateCertificate':
        result = await generateCertificateByCourse(data, userId)
        break

      // ===== 进度管理 - 管理端 (from api-course) =====
      case 'getProgressStats':
        result = await getProgressStats()
        break

      // ===== 学习路径管理 (新增) =====
      case 'createPath':
        result = await createPath(data)
        break
      case 'updatePath':
        result = await updatePath(data)
        break
      case 'deletePath':
        result = await deletePath(data)
        break
      case 'startPath':
        result = await startPath(data, userId)
        break
      case 'completePath':
        result = await completePath(data, userId)
        break

      // ===== 证书管理 (新增) =====
      case 'revokeCertificate':
        result = await revokeCertificate(data)
        break
      case 'verifyCertificate':
        result = await verifyCertificate(data)
        break
      case 'getCertificateStats':
        result = await getCertificateStats()
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