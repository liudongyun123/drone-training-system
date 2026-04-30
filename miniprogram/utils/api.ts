// utils/api.ts
// API 封装 - 通过 HTTP 请求连接腾讯云 CloudBase

import { dbGetList, dbQuery, callFunction } from './http'

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
    const { status = 'published', category, page = 1, pageSize = 10 } = filters
    const skip = (page - 1) * pageSize
    
    const where: any = {}
    if (status) where.status = status
    if (category) where.category = category
    
    const result = await dbGetList('courses', {
      where,
      orderBy: 'createdAt desc',
      skip,
      limit: pageSize
    })
    return result.data || []
  },
  
  async getDetail(courseId: string) {
    const result = await dbQuery('courses', { _id: courseId })
    return result.data
  },
  
  async getLessons(courseId: string) {
    const result = await dbGetList('lessons', {
      where: { courseId },
      orderBy: 'order asc'
    })
    return result.data || []
  },

  async getHotCourses(limit: number = 6) {
    const result = await dbGetList('courses', {
      where: { status: 'published' },
      orderBy: 'salesCount desc',
      limit
    })
    return result.data || []
  },

  async getCategories() {
    const result = await dbGetList('categories', {
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
    const { status = 'enrolling', page = 1, pageSize = 10 } = filters
    const skip = (page - 1) * pageSize
    
    const where: any = {}
    if (status) where.status = status
    
    const result = await dbGetList('classes', {
      where,
      orderBy: 'startDate asc',
      skip,
      limit: pageSize
    })
    return result.data || []
  },
  
  async getDetail(classId: string) {
    const result = await dbQuery('classes', { _id: classId })
    return result.data
  }
}

/**
 * 商品 API（商城）
 */
export const productApi = {
  async getList(filters: any = {}) {
    const { status = 'onsale', categoryId, page = 1, pageSize = 10 } = filters
    const skip = (page - 1) * pageSize
    
    const where: any = {}
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    
    const result = await dbGetList('products', {
      where,
      orderBy: 'salesCount desc',
      skip,
      limit: pageSize
    })
    return result.data || []
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
      where: { status: 'onsale', isFeatured: true },
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
    const where: any = { userId }
    if (orderType) where.orderType = orderType
    
    const result = await dbGetList('orders', {
      where,
      orderBy: 'createdAt desc'
    })
    return result.data || []
  },
  
  async create(orderData: any) {
    return await callFunction('createOrder', orderData)
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
    
    const order = {
      orderNo,
      userId: params.userId,
      phone: params.phone,
      orderType: 'shop',
      shopItems: params.items.map(item => ({
        productId: item._id || item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        coverImage: item.coverImage || ''
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
    return result.data
  },
  
  async updateUser(userId: string, data: any) {
    return await callFunction('updateUser', { userId, ...data })
  }
}
