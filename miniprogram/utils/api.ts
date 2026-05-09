// utils/api.ts
// API 封装 - 通过 HTTP 请求连接腾讯云 CloudBase

import { dbGetList, dbQuery, callFunction, callMobileLearning, callApiUser, callApiOrder } from './http'

// 等级缓存（从数据库动态加载）
let levelCache: Array<{ code: string; name: string; sourceCode: string }> = []
let levelCacheLoaded = false

// 加载等级列表（从 levels 集合）
async function loadLevels() {
  if (levelCacheLoaded) return levelCache
  
  try {
    const result = await dbGetList('levels', {
      where: { status: 'active' },
      orderBy: 'sortOrder asc'
    })
    if (result.data && result.data.length > 0) {
      levelCache = result.data.map((l: any) => ({
        code: l.code,
        name: l.name,
        sourceCode: l.sourceCode || ''
      }))
    }
    levelCacheLoaded = true
  } catch (error) {
    console.error('加载等级列表失败:', error)
  }
  return levelCache
}

// 根据等级代码获取等级名称
function getLevelName(levelCode: string): string {
  if (!levelCode) return ''
  const level = levelCache.find(l => l.code === levelCode)
  return level?.name || levelCode
}

// 培训班等级中文映射（兼容旧数据）
const CLASS_LEVEL_MAP: Record<string, string> = {
  '入门班': '入门班',
  '基础班': '基础班',
  '进阶班': '进阶班',
  '高级班': '高级班',
  '考证班': '考证班',
  'CAAC入门班': 'CAAC入门班',
  'CAAC基础班': 'CAAC基础班',
  'CAAC进阶班': 'CAAC进阶班',
  'CAAC高级班': 'CAAC高级班',
  'CAAC考证班': 'CAAC考证班'
}

// 根据名称推断等级
function inferClassLevel(name: string): string {
  if (!name) return '入门班'
  if (name.includes('CAAC') || name.includes('考证')) return '考证班'
  if (name.includes('进阶') || name.includes('高级')) return '进阶班'
  if (name.includes('基础')) return '基础班'
  return '入门班'
}

// 转换课程等级（异步，需要先加载等级列表）
async function transformCourseAsync(course: any) {
  await loadLevels()
  const levelText = getLevelName(course.level)
  return {
    ...course,
    levelText
  }
}

// 转换培训班等级
async function transformClassAsync(classItem: any) {
  await loadLevels()
  const level = classItem.level || inferClassLevel(classItem.name || '')
  // 尝试从缓存获取等级名称
  const levelText = getLevelName(level) || CLASS_LEVEL_MAP[level] || level || ''
  return {
    ...classItem,
    levelText
  }
}

// 兼容旧数据的同步转换函数（使用缓存）
function transformCourse(course: any) {
  const levelText = getLevelName(course.level)
  return {
    ...course,
    levelText
  }
}

// 兼容旧数据的同步转换函数（使用缓存）
function transformClass(classItem: any) {
  const level = classItem.level || inferClassLevel(classItem.name || '')
  const levelText = getLevelName(level) || CLASS_LEVEL_MAP[level] || level || ''
  return {
    ...classItem,
    levelText
  }
}

/**
 * 轮播图 API
 */
export const bannerApi = {
  async getList(limit: number = 10) {
    const result = await dbGetList('banners', {
      where: { status: 'active' },
      orderBy: 'order asc',
      limit
    })
    return result.data || []
  }
}

/**
 * 系统配置 API - 获取字典配置
 */
export const systemConfigApi = {
  async getDictionaries() {
    const result = await dbGetList('systemConfig', {
      where: { type: 'dictionaries' }
    })
    if (result.data && result.data.length > 0) {
      return result.data[0].dictionaries || {}
    }
    return null
  },

  async getSources() {
    const result = await dbGetList('sources', {
      where: { status: 'active' },
      orderBy: 'sortOrder asc'
    })
    return result.data || []
  },

  async getCategories(sourceId?: string) {
    const where: any = {}
    if (sourceId) where.sourceId = sourceId
    const result = await dbGetList('categories', {
      where,
      orderBy: 'sortOrder asc'
    })
    return result.data || []
  },

  async getLevels(sourceId?: string) {
    await loadLevels()
    if (!sourceId) return levelCache
    // 根据体系代码筛选
    return levelCache.filter(l => l.sourceCode === sourceId || !l.sourceCode)
  }
}

/**
 * 课程 API
 */
export const courseApi = {
  async getList(filters: any = {}) {
    const { status = 'published', category, categoryId, sourceId, page = 1, pageSize = 10 } = filters
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (status) where.status = status
    if (category) where.category = category  // 按名称过滤
    if (categoryId) where.categoryId = categoryId  // 按ID过滤
    if (sourceId) where.sourceId = sourceId  // 按体系过滤

    const result = await dbGetList('courses', {
      where,
      orderBy: 'createdAt desc',
      skip,
      limit: pageSize
    })
    // 先加载等级缓存，再转换
    await loadLevels()
    return (result.data || []).map(transformCourse)
  },

  async getDetail(courseId: string) {
    const result = await dbQuery('courses', { _id: courseId })
    if (result.data) {
      await loadLevels()
      return transformCourse(result.data)
    }
    return result.data
  },

  async getLessons(courseId: string) {
    const result = await dbGetList('lessons', {
      where: { courseId },
      orderBy: 'order asc'
    })
    return result.data || []
  },

  async getHotCourses(limit: number = 6, sourceId?: string) {
    const where: any = { status: 'published' }
    if (sourceId) where.sourceId = sourceId
    const result = await dbGetList('courses', {
      where,
      orderBy: 'salesCount desc',
      limit
    })
    await loadLevels()
    return (result.data || []).map(transformCourse)
  },

  async getCategories(sourceId?: string) {
    const where: any = {}
    if (sourceId) where.sourceId = sourceId
    const result = await dbGetList('categories', {
      where,
      orderBy: 'sort asc'
    })
    return result.data || []
  }
}

/**
 * 培训班 API
 */
export const classApi = {
  async getList(filters: any = {}) {
    const { status, sourceId, page = 1, pageSize = 100, category } = filters
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (status) where.status = status
    if (sourceId) where.sourceId = sourceId  // 按体系过滤
    if (category) where.category = category  // 支持按分类过滤

    const result = await dbGetList('classes', {
      where,
      orderBy: 'startDate asc',
      skip,
      limit: pageSize
    })
    // 先加载等级缓存，再转换
    await loadLevels()
    return (result.data || []).map(transformClass)
  },

  async getDetail(classId: string) {
    const result = await dbQuery('classes', { _id: classId })
    if (result.data) {
      await loadLevels()
      return transformClass(result.data)
    }
    return result.data
  }
}

/**
 * 商品 API（商城）
 */
export const productApi = {
  async getList(filters: any = {}) {
    const { status = 'active', categoryId, page = 1, pageSize = 10 } = filters
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (status) where.status = status
    if (categoryId) where.category = categoryId  // 数据库用 category

    const result = await dbGetList('products', {
      where,
      orderBy: 'salesCount desc',
      skip,
      limit: pageSize
    })

    // 映射字段：数据库 title -> name, cover -> coverImage
    const products = (result.data || []).map((p: any) => {
      let cover = p.cover || p.coverImage
      // 如果图片 URL 包含 unsplash（未配置合法域名），使用占位图
      if (cover && cover.includes('unsplash.com')) {
        cover = 'https://via.placeholder.com/400x320/2563eb/ffffff?text=' + encodeURIComponent(p.title || '商品')
      }
      return {
        _id: p._id,
        name: p.title || p.name,  // 数据库用 title
        price: p.price,
        coverImage: cover,
        cover: cover,
        categoryId: p.category || p.categoryId,
        salesCount: p.sales || p.salesCount || 0,
        stock: p.stock || 99,
        description: p.description
      }
    })

    return products
  },

  async getDetail(productId: string) {
    const result = await dbQuery('products', { _id: productId })
    return result.data
  },

  async getCategories() {
    const result = await dbGetList('product_categories', {
      orderBy: 'sort asc'
    })
    return result.data || []
  },

  async getFeatured(limit: number = 4) {
    const result = await dbGetList('products', {
      where: { status: 'active', isFeatured: true },
      orderBy: 'salesCount desc',
      limit
    })
    return result.data || []
  }
}

/**
 * 订单 API
 */
export const orderApi = {
  async getByUserId(userId: string, orderType?: 'course' | 'shop') {
    const phone = wx.getStorageSync('phone') || ''
    const where: any = phone ? { phone } : { userId }
    if (orderType) where.orderType = orderType

    const result = await dbGetList('orders', {
      where,
      orderBy: 'createdAt desc'
    })
    return result.data || []
  },

  async create(orderData: any) {
    // 确保传入 phone，使用 wx.cloud.callFunction 调用云函数
    const phone = wx.getStorageSync('phone') || ''
    return wx.cloud.callFunction({
      name: 'api-order',
      data: {
        action: 'create',
        data: { ...orderData, phone }
      }
    })
  },

  async createShopOrder(params: {
    userId: string
    phone: string
    items: any[]
    shippingAddress: { name: string; phone: string; address: string }
    remark?: string
  }) {
    const orderNo = `SHP${Date.now()}`
    const totalAmount = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const phone = wx.getStorageSync('phone') || params.phone

    const order = {
      orderNo,
      phone,  // 使用 phone 作为主要标识
      userId: params.userId,
      orderType: 'shop',
      shopItems: params.items.map(item => ({
        productId: item._id || item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        coverImage: item.coverImage || item.cover || ''
      })),
      shippingAddress: params.shippingAddress,
      remark: params.remark || '',
      totalAmount,
      discountAmount: 0,
      finalAmount: totalAmount,
      freight: totalAmount >= 99 ? 0 : 10,
      paymentMethod: 'wechat',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    return await callFunction('createOrder', { action: 'createShopOrder', order })
  }
}

/**
 * 用户 API
 */
export const userApi = {
  async getUser(userId: string) {
    const result = await dbQuery('users', { _id: userId })
    // 返回单个用户对象而不是数组
    if (result.data && result.data.length > 0) {
      return result.data[0]
    }
    return null
  },

  async updateUser(userId: string, data: any) {
    return await callFunction('updateUser', { userId, ...data })
  }
}

// ============== 新云函数 API (Feature-Based) ==============

/**
 * 学习路径 API - mobile-learning
 */
export const learningPathApi = {
  /**
   * 获取学习路径列表
   */
  async getList(filters: any = {}) {
    const res = await callMobileLearning({
      action: 'getLearningPaths',
      data: filters
    })
    // 云函数返回 { list, total, page, pageSize }
    return res.data?.list || res.data || []
  },

  /**
   * 获取学习路径详情
   */
  async getDetail(pathId: string) {
    const res = await callMobileLearning({
      action: 'getLearningPathDetail',
      data: { pathId }
    })
    return res.data
  },

  /**
   * 获取路径学习进度
   */
  async getProgress(pathId: string) {
    const res = await callMobileLearning({
      action: 'getPathProgress',
      data: { pathId }
    })
    return res.data
  },

  /**
   * 开始学习路径
   */
  async start(pathId: string) {
    const res = await callMobileLearning({
      action: 'startPath',
      data: { pathId }
    })
    return res.data
  },

  /**
   * 更新学习进度
   */
  async updateProgress(pathId: string, courseId: string, lessonId: string) {
    const res = await callMobileLearning({
      action: 'updateProgress',
      data: { pathId, courseId, lessonId }
    })
    return res.data
  },

  /**
   * 完成学习路径
   */
  async complete(pathId: string) {
    const res = await callMobileLearning({
      action: 'completePath',
      data: { pathId }
    })
    return res.data
  }
}

/**
 * 证书 API - mobile-learning
 */
export const certificateApi = {
  /**
   * 获取证书列表
   */
  async getList(filters: any = {}) {
    const res = await callMobileLearning({
      action: 'getCertificates',
      data: filters
    })
    // 云函数返回 { list, total, page, pageSize }
    return res.data?.list || res.data || []
  },

  /**
   * 获取证书详情
   */
  async getDetail(certificateId: string) {
    const res = await callMobileLearning({
      action: 'getCertificateDetail',
      data: { certificateId }
    })
    return res.data
  },

  /**
   * 下载证书
   */
  async download(certificateId: string) {
    const res = await callMobileLearning({
      action: 'downloadCertificate',
      data: { certificateId }
    })
    return res.data
  },

  /**
   * 生成证书
   */
  async generate(params: { courseId?: string; examId?: string; pathId?: string }) {
    const res = await callMobileLearning({
      action: 'generateCertificate',
      data: params
    })
    return res.data
  },

  /**
   * 验证证书
   */
  async verify(certificateCode: string) {
    const res = await callMobileLearning({
      action: 'verifyCertificate',
      data: { certificateCode }
    })
    return res.data
  }
}

/**
 * 用户 API (新) - api-user
 */
export const newUserApi = {
  /**
   * 用户注册
   */
  async register(params: { phone: string; password: string; nickname?: string }) {
    const res = await callApiUser({
      action: 'register',
      data: params
    })
    return res
  },

  /**
   * 用户登录
   */
  async login(params: { phone: string; password: string }) {
    const res = await callApiUser({
      action: 'login',
      data: params
    })
    if (res.success && res.data?.user) {
      // 保存用户信息到本地
      wx.setStorageSync('user', res.data.user)
      wx.setStorageSync('phone', res.data.user.phone)
    }
    return res
  },

  /**
   * 获取个人资料
   */
  async getProfile() {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'getProfile',
      openid
    })
    return res
  },

  /**
   * 更新个人资料
   */
  async updateProfile(data: { nickname?: string; avatar?: string; gender?: string; birthday?: string; bio?: string }) {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'updateProfile',
      openid,
      data
    })
    return res
  },

  /**
   * 获取会员等级
   */
  async getMemberLevel() {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'getMemberLevel',
      openid
    })
    return res
  },

  /**
   * 升级会员
   */
  async upgradeMember(level: string, months: number = 1) {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'upgradeMember',
      openid,
      data: { level, months }
    })
    return res
  },

  /**
   * 获取会员权益
   */
  async getMemberBenefits(level: string) {
    const res = await callApiUser({
      action: 'getMemberBenefits',
      data: { level }
    })
    return res.data
  },

  /**
   * 获取用户设置
   */
  async getSettings() {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'getSettings',
      openid
    })
    return res
  },

  /**
   * 更新用户设置
   */
  async updateSettings(data: any) {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'updateSettings',
      openid,
      data
    })
    return res
  },

  /**
   * 获取用户统计
   */
  async getStats() {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'getStats',
      openid
    })
    return res
  },

  /**
   * 获取学习统计
   */
  async getLearningStats() {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'getLearningStats',
      openid
    })
    return res
  },

  /**
   * 获取每日统计
   */
  async getDailyStats(date?: string) {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'getDailyStats',
      openid,
      data: { date }
    })
    return res
  },

  /**
   * 更新每日统计
   */
  async updateDailyStats(data: { date?: string; learningTime?: number; coursesCompleted?: number; examsTaken?: number }) {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'updateDailyStats',
      openid,
      data
    })
    return res
  },

  /**
   * 增量更新统计
   */
  async incrementStat(field: 'totalLearningTime' | 'totalCourses' | 'totalExams' | 'points') {
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      return { success: false, error: '未登录' }
    }
    const res = await callApiUser({
      action: 'incrementStat',
      openid,
      data: { field }
    })
    return res
  }
}

/**
 * 订单 API (扩展) - api-order
 */
export const newOrderApi = {
  /**
   * 获取订单列表
   */
  async getList(filters: any = {}) {
    const res = await callApiOrder({
      action: 'getList',
      data: filters
    })
    return res.data || []
  },

  /**
   * 获取订单详情
   */
  async getDetail(orderId: string) {
    const res = await callApiOrder({
      action: 'getDetail',
      data: { orderId }
    })
    return res.data
  },

  /**
   * 创建订单
   */
  async create(params: any) {
    const res = await callApiOrder({
      action: 'create',
      data: params
    })
    return res
  },

  /**
   * 更新订单状态
   */
  async updateStatus(orderId: string, status: string) {
    const res = await callApiOrder({
      action: 'updateStatus',
      data: { orderId, status }
    })
    return res
  },

  /**
   * 取消订单
   */
  async cancel(orderId: string, reason?: string) {
    const res = await callApiOrder({
      action: 'cancel',
      data: { orderId, reason }
    })
    return res
  },

  /**
   * 获取购物车
   */
  async getCart() {
    const res = await callApiOrder({
      action: 'getCart'
    })
    return res.data
  },

  /**
   * 添加到购物车
   */
  async addToCart(item: { type: string; id: string; name: string; price: number; cover?: string }) {
    const res = await callApiOrder({
      action: 'addToCart',
      data: { item }
    })
    return res
  },

  /**
   * 从购物车移除
   */
  async removeFromCart(itemId: string) {
    const res = await callApiOrder({
      action: 'removeFromCart',
      data: { itemId }
    })
    return res
  },

  /**
   * 清空购物车
   */
  async clearCart() {
    const res = await callApiOrder({
      action: 'clearCart'
    })
    return res
  },

  /**
   * 获取优惠券列表
   */
  async getCoupons(status?: string) {
    const res = await callApiOrder({
      action: 'getCoupons',
      data: { status }
    })
    return res.data || []
  },

  /**
   * 验证优惠券
   */
  async validateCoupon(code: string, amount: number) {
    const res = await callApiOrder({
      action: 'validateCoupon',
      data: { code, amount }
    })
    return res.data
  },

  /**
   * 使用优惠券
   */
  async useCoupon(couponId: string, orderId?: string) {
    const res = await callApiOrder({
      action: 'useCoupon',
      data: { couponId, orderId }
    })
    return res
  },

  /**
   * 领取优惠券
   */
  async claimCoupon(couponTemplateId: string) {
    const res = await callApiOrder({
      action: 'claimCoupon',
      data: { couponTemplateId }
    })
    return res
  }
}
