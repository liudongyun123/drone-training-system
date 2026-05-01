// 云函数: mini-api
// 小程序统一 API 网关
// 替代 mobile-api，专门服务小程序端

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// ============ 辅助函数 ============

function getAuthUser(event) {
  // 小程序通过 cloud.getWXContext 获取用户
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID,
    unionid: wxContext.UNIONID || null
  }
}

async function getUserByOpenid(openid) {
  const result = await db.collection('users')
    .where({ openid })
    .get()
  return result.data[0] || null
}

// ============ 路由处理 ============

const handlers = {
  
  // ---- 用户相关 ----
  'user.getInfo': async (event, user) => {
    const dbUser = await getUserByOpenid(user.openid)
    if (!dbUser) throw new Error('用户不存在')
    return dbUser
  },
  
  'user.update': async (event, user) => {
    const dbUser = await getUserByOpenid(user.openid)
    if (!dbUser) throw new Error('用户不存在')
    
    const updateData = {}
    if (event.nickName) updateData.nickName = event.nickName
    if (event.avatarUrl) updateData.avatarUrl = event.avatarUrl
    
    await db.collection('users').doc(dbUser._id).update({
      data: { ...updateData, updatedAt: db.serverDate() }
    })
    
    return { success: true }
  },
  
  // ---- 课程相关 ----
  'course.list': async (event) => {
    const { status = 'published', category, page = 1, pageSize = 10, keyword } = event
    
    const where = { status }
    if (category) where.category = category
    if (keyword) {
      where.title = db.RegExp({ regexp: keyword, options: 'i' })
    }
    
    const countResult = await db.collection('courses').where(where).count()
    const skip = (page - 1) * pageSize
    
    const result = await db.collection('courses')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return {
      courses: result.data,
      total: countResult.total,
      page,
      pageSize,
      hasMore: skip + pageSize < countResult.total
    }
  },
  
  'course.detail': async (event) => {
    const { courseId } = event
    if (!courseId) throw new Error('缺少 courseId')
    
    const result = await db.collection('courses').doc(courseId).get()
    
    // 获取课程章节
    const lessons = await db.collection('lessons')
      .where({ courseId })
      .orderBy('order', 'asc')
      .get()
    
    return {
      course: result.data,
      lessons: lessons.data
    }
  },
  
  'course.hot': async (event) => {
    const { limit = 6 } = event
    const result = await db.collection('courses')
      .where({ status: 'published' })
      .orderBy('salesCount', 'desc')
      .limit(limit)
      .get()
    return result.data
  },
  
  // ---- 培训班相关 ----
  'class.list': async (event) => {
    const { status = 'enrolling', page = 1, pageSize = 10 } = event
    
    const countResult = await db.collection('classes').where({ status }).count()
    const skip = (page - 1) * pageSize
    
    const result = await db.collection('classes')
      .where({ status })
      .orderBy('startDate', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return { classes: result.data, total: countResult.total }
  },
  
  'class.detail': async (event) => {
    const { classId } = event
    if (!classId) throw new Error('缺少 classId')
    
    const result = await db.collection('classes').doc(classId).get()
    
    // 获取排课
    const schedules = await db.collection('class_schedules')
      .where({ classId })
      .orderBy('date', 'asc')
      .get()
    
    return {
      class: result.data,
      schedules: schedules.data
    }
  },
  
  'class.enroll': async (event, user) => {
    const { classId, paymentMethod } = event
    if (!classId) throw new Error('缺少 classId')
    
    const dbUser = await getUserByOpenid(user.openid)
    if (!dbUser) throw new Error('请先登录')
    if (!dbUser.phone) throw new Error('请先绑定手机号')
    
    // 检查培训班状态
    const classInfo = await db.collection('classes').doc(classId).get()
    if (!classInfo.data) throw new Error('培训班不存在')
    if (classInfo.data.status !== 'enrolling') throw new Error('报名已截止')
    if (classInfo.data.currentStudents >= classInfo.data.maxStudents) throw new Error('名额已满')
    
    // 检查是否已报名
    const existingEnrollment = await db.collection('enrollments')
      .where({ classId, userId: dbUser._id })
      .count()
    if (existingEnrollment.total > 0) throw new Error('已报名该培训班')
    
    // 创建报名记录
    const orderNo = `ENR${Date.now()}`
    const enrollmentData = {
      classId,
      className: classInfo.data.name,
      userId: dbUser._id,
      phone: dbUser.phone,
      openid: user.openid,
      paymentMethod: paymentMethod || 'online',
      paymentStatus: paymentMethod === 'offline' ? 'pending' : 'pending',
      status: 'pending',
      orderNo,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    
    const result = await db.collection('enrollments').add({ data: enrollmentData })
    
    // 更新报名人数
    await db.collection('classes').doc(classId).update({
      data: { currentStudents: _.inc(1) }
    })
    
    return {
      success: true,
      enrollmentId: result._id,
      orderNo
    }
  },
  
  // ---- 商城相关 ----
  'product.list': async (event) => {
    const { status = 'onsale', categoryId, page = 1, pageSize = 10, keyword } = event
    
    const where = { status }
    if (categoryId) where.categoryId = categoryId
    if (keyword) {
      where.name = db.RegExp({ regexp: keyword, options: 'i' })
    }
    
    const countResult = await db.collection('products').where(where).count()
    const skip = (page - 1) * pageSize
    
    const result = await db.collection('products')
      .where(where)
      .orderBy('salesCount', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return { products: result.data, total: countResult.total }
  },
  
  'product.detail': async (event) => {
    const { productId } = event
    if (!productId) throw new Error('缺少 productId')
    const result = await db.collection('products').doc(productId).get()
    
    // 获取 SKU 列表
    const skus = await db.collection('product_skus')
      .where({ productId })
      .get()
    
    return { product: result.data, skus: skus.data }
  },
  
  'product.categories': async () => {
    const result = await db.collection('product_categories')
      .orderBy('sort', 'asc')
      .get()
    return result.data
  },
  
  // ---- 订单相关 ----
  'order.list': async (event, user) => {
    const dbUser = await getUserByOpenid(user.openid)
    if (!dbUser) throw new Error('请先登录')
    
    const { orderType, page = 1, pageSize = 10 } = event
    const where = { userId: dbUser._id }
    if (orderType) where.orderType = orderType
    
    const result = await db.collection('orders')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    return { orders: result.data }
  },
  
  'order.detail': async (event, user) => {
    const { orderId } = event
    if (!orderId) throw new Error('缺少 orderId')
    
    const result = await db.collection('orders').doc(orderId).get()
    return result.data
  },
  
  'order.create': async (event, user) => {
    const dbUser = await getUserByOpenid(user.openid)
    if (!dbUser) throw new Error('请先登录')
    if (!dbUser.phone) throw new Error('请先绑定手机号')
    
    const { orderType, items, totalAmount, paymentMethod } = event
    const orderNo = `${orderType === 'course' ? 'CRS' : 'SHP'}${Date.now()}`
    
    const orderData = {
      orderNo,
      userId: dbUser._id,
      openid: user.openid,
      phone: dbUser.phone,
      orderType,
      items: items || [],
      totalAmount,
      finalAmount: totalAmount,
      paymentMethod: paymentMethod || 'wechat',
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
    
    const result = await db.collection('orders').add({ data: orderData })
    
    return {
      success: true,
      orderId: result._id,
      orderNo
    }
  },
  
  // ---- 学习记录 ----
  'learning.progress': async (event, user) => {
    const dbUser = await getUserByOpenid(user.openid)
    if (!dbUser) throw new Error('请先登录')
    
    const { courseId, lessonId, progress } = event
    
    // 更新或创建学习记录
    const existing = await db.collection('learning_progress')
      .where({ userId: dbUser._id, courseId, lessonId })
      .get()
    
    if (existing.data.length > 0) {
      await db.collection('learning_progress').doc(existing.data[0]._id).update({
        data: { progress, updatedAt: db.serverDate() }
      })
    } else {
      await db.collection('learning_progress').add({
        data: { userId: dbUser._id, courseId, lessonId, progress, createdAt: db.serverDate() }
      })
    }
    
    return { success: true }
  }
}

// ============ 入口 ============

exports.main = async (event, context) => {
  const { action } = event
  
  if (!action) {
    return { error: '缺少 action 参数' }
  }
  
  const handler = handlers[action]
  if (!handler) {
    return { error: `未知 action: ${action}` }
  }
  
  try {
    const user = getAuthUser(event)
    const result = await handler(event, user)
    return { success: true, data: result }
  } catch (err) {
    console.error(`mini-api [${action}] 错误:`, err)
    return { success: false, error: err.message }
  }
}
