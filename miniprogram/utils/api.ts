// utils/api.ts
// API 封装 - 通过 HTTP 请求连接腾讯云 CloudBase

import { dbGetList, dbQuery, callFunction } from './http'

// 等级中文映射（英文 -> 中文）
const LEVEL_MAP: Record<string, string> = {
  'beginner': '初级工',
  'basic': '中级工',
  'intermediate': '高级工',
  'advanced': '技师',
  'expert': '高级技师'
}

// 直接的中文等级映射（用于已经是中文的level字段）
const LEVEL_TEXT_MAP: Record<string, string> = {
  // 职业技能等级（课程用）
  '初级工': '初级工',
  '中级工': '中级工',
  '高级工': '高级工',
  '技师': '技师',
  '高级技师': '高级技师',
  // 培训班等级（兼容旧数据）
  '入门班': '初级工',
  '基础班': '中级工',
  '进阶班': '高级工',
  '高级班': '技师',
  '考证班': '高级技师',
  // CAAC等级
  '视距内驾驶员': '视距内驾驶员',
  '超视距驾驶员': '超视距驾驶员',
  '教员': '教员',
  'CAAC入门班': '视距内驾驶员',
  'CAAC基础班': '超视距驾驶员',
  'CAAC进阶班': '教员'
}

// 培训班等级中文映射
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

// 转换课程等级
function transformCourse(course: any) {
  // 优先使用英文映射，否则直接使用level字段（可能是中文）
  const levelText = LEVEL_MAP[course.level] || LEVEL_TEXT_MAP[course.level] || course.level || ''
  return {
    ...course,
    levelText
  }
}

// 转换培训班等级
function transformClass(classItem: any) {
  const level = classItem.level || inferClassLevel(classItem.name || '')
  return {
    ...classItem,
    levelText: CLASS_LEVEL_MAP[level] || level || ''
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
    return (result.data || []).map(transformCourse)
  },

  async getDetail(courseId: string) {
    const result = await dbQuery('courses', { _id: courseId })
    if (result.data) {
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
    return (result.data || []).map(transformClass)
  },

  async getDetail(classId: string) {
    const result = await dbQuery('classes', { _id: classId })
    if (result.data) {
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
