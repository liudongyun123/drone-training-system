/**
 * api-home 云函数 - 首页聚合服务
 * 
 * 三端共用（Web端 / 小程序端），一次性返回首页所有配置数据。
 * 所有"展示什么、什么顺序"的决策都在服务端完成。
 * 
 * 功能：
 * - 首页全部数据聚合（1次请求替代N次请求）
 * - 读取后台配置的热门课程、最新开班、学习路径
 * - 按配置顺序返回，自动过滤已删除的ID
 * - 无配置时降级到默认排序
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

// ========== CORS ==========

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

// ========== 工具函数 ==========

/**
 * 安全读取配置文档
 */
async function getFeaturedConfig(collectionName, docId) {
  try {
    const result = await db.collection(collectionName).doc(docId).get()
    if (result.data && result.data.length > 0) {
      return result.data[0]
    }
    return null
  } catch (e) {
    // 文档不存在
    return null
  }
}

/**
 * 按配置ID顺序排序数据库结果
 */
function sortByConfigIds(items, configIds, idField = '_id') {
  if (!configIds || configIds.length === 0) return items
  const orderMap = {}
  configIds.forEach((id, index) => { orderMap[id] = index })
  return items.sort((a, b) => {
    const orderA = orderMap[a[idField]] ?? 9999
    const orderB = orderMap[b[idField]] ?? 9999
    return orderA - orderB
  })
}

// ========== 数据获取函数 ==========

/**
 * 获取轮播图
 */
async function getBanners() {
  try {
    const result = await db.collection('banners')
      .where({ status: 'active' })
      .orderBy('order', 'asc')
      .limit(10)
      .get()
    return result.data.map(b => ({
      id: b._id,
      title: b.title || '',
      subtitle: b.subtitle || '',
      image: b.imageUrl || b.image || '',
      link: b.link || '',
      courseId: b.courseId || '',
      order: b.order || 0
    }))
  } catch (e) {
    console.error('[api-home] 获取轮播图失败:', e)
    return []
  }
}

/**
 * 获取热门课程（读配置）
 */
async function getFeaturedCourses(limit = 8) {
  try {
    // 1. 读取配置
    const config = await getFeaturedConfig('featuredCourses', 'home-featured')
    
    if (config && config.courseIds && config.courseIds.length > 0) {
      // 2. 有配置 → 按配置获取，过滤失效ID
      const courseIds = config.courseIds.slice(0, limit)
      
      const result = await db.collection('courses')
        .where({
          _id: _.in(courseIds),
          status: 'published'
        })
        .limit(limit)
        .get()
      
      // 按配置顺序排序
      const courses = sortByConfigIds(result.data, courseIds)
      return courses.map(formatCourse)
    }
    
    // 3. 无配置 → 降级：按学员数排序
    const result = await db.collection('courses')
      .where({ status: 'published' })
      .orderBy('studentCount', 'desc')
      .limit(limit)
      .get()
    
    return result.data.map(formatCourse)
  } catch (e) {
    console.error('[api-home] 获取热门课程失败:', e)
    return []
  }
}

/**
 * 获取最新开班（读配置）
 */
async function getFeaturedClasses(limit = 6) {
  try {
    // 1. 读取配置
    const config = await getFeaturedConfig('featuredClasses', 'home-featured-classes')
    
    if (config && config.classIds && config.classIds.length > 0) {
      // 2. 有配置 → 按配置获取
      const classIds = config.classIds.slice(0, limit)
      
      const classes = await db.collection('classes')
        .where({
          _id: _.in(classIds),
          status: _.in(['open', 'enrolling'])
        })
        .limit(limit)
        .get()
      
      // 按配置顺序排序
      return sortByConfigIds(classes.data, classIds)
    }
    
    // 3. 无配置 → 降级：查招生中的班级
    const result = await db.collection('classes')
      .where({ status: _.in(['open', 'enrolling']) })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    
    return result.data
  } catch (e) {
    console.error('[api-home] 获取最新开班失败:', e)
    return []
  }
}

/**
 * 获取学习路径（读配置）
 */
async function getFeaturedPaths(limit = 3) {
  try {
    // 1. 读取配置
    const config = await getFeaturedConfig('featuredLearningPaths', 'home-featured-paths')
    
    if (config && config.pathIds && config.pathIds.length > 0) {
      // 2. 有配置 → 按配置获取
      const pathIds = config.pathIds.slice(0, limit)
      
      const result = await db.collection('learning_paths')
        .where({ _id: _.in(pathIds) })
        .limit(limit)
        .get()
      
      return sortByConfigIds(result.data, pathIds)
    }
    
    // 3. 无配置 → 降级：取前N个
    const result = await db.collection('learning_paths')
      .orderBy('order', 'asc')
      .limit(limit)
      .get()
    
    return result.data
  } catch (e) {
    console.error('[api-home] 获取学习路径失败:', e)
    return []
  }
}

/**
 * 获取最新公告
 */
async function getNotices(limit = 5) {
  try {
    const result = await db.collection('notices')
      .where({ status: 'published' })
      .orderBy('publishedAt', 'desc')
      .limit(limit)
      .get()
    return result.data
  } catch (e) {
    console.error('[api-home] 获取公告失败:', e)
    return []
  }
}

// ========== 数据格式化 ==========

function formatCourse(course) {
  return {
    _id: course._id,
    id: course._id,
    title: course.title || '',
    description: course.description || '',
    cover: course.cover || course.coverImage || '',
    coverImage: course.cover || course.coverImage || '',
    price: course.price || 0,
    originalPrice: course.originalPrice || course.price || 0,
    category: course.category || '',
    level: course.level || 'beginner',
    duration: course.duration || 0,
    lessonCount: course.lessonCount || 0,
    lessons: course.lessons || 0,
    studentCount: course.studentCount || 0,
    students: course.students || 0,
    rating: course.rating || 0,
    tags: course.tags || [],
    isFree: course.isFree || false,
    status: course.status || 'published',
    instructor: course.instructor || '',
    createdAt: course.createdAt
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: getCorsHeaders(event.headers?.origin || ''),
      body: ''
    }
  }

  const { action } = event

  try {
    switch (action) {
      case 'getHomeData': {
        // 并行获取所有首页数据
        const [banners, courses, classes, paths, notices] = await Promise.all([
          getBanners(),
          getFeaturedCourses(8),
          getFeaturedClasses(6),
          getFeaturedPaths(3),
          getNotices(5)
        ])

        return {
          code: 0,
          success: true,
          data: {
            banners,
            featuredCourses: courses,
            featuredClasses: classes,
            featuredPaths: paths,
            notices
          }
        }
      }

      case 'getBanners':
        return { code: 0, success: true, data: await getBanners() }

      case 'getFeaturedCourses':
        return { code: 0, success: true, data: await getFeaturedCourses(event.limit || 8) }

      case 'getFeaturedClasses':
        return { code: 0, success: true, data: await getFeaturedClasses(event.limit || 6) }

      case 'getFeaturedPaths':
        return { code: 0, success: true, data: await getFeaturedPaths(event.limit || 3) }

      case 'getNotices':
        return { code: 0, success: true, data: await getNotices(event.limit || 5) }

      default:
        return { code: -1, success: false, message: `未知action: ${action}` }
    }
  } catch (e) {
    console.error('[api-home] 错误:', e)
    return { code: -1, success: false, message: e.message || '服务异常' }
  }
}
