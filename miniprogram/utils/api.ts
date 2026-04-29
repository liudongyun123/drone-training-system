// utils/api.ts
// API 封装 - 与 Web 端 shared/services 保持一致

import { callFunction, getDatabase } from './cloudbase'

const db = getDatabase()

/**
 * 课程 API
 */
export const courseApi = {
  // 获取课程列表
  async getList(filters: any = {}) {
    const { status = 'published', page = 1, pageSize = 10 } = filters
    
    const skip = (page - 1) * pageSize
    const result = await db.collection('courses')
      .where({ status })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return result.data
  },
  
  // 获取课程详情
  async getDetail(courseId: string) {
    const result = await db.collection('courses').doc(courseId).get()
    return result.data
  },
  
  // 获取课程章节
  async getLessons(courseId: string) {
    const result = await db.collection('lessons')
      .where({ courseId })
      .orderBy('order', 'asc')
      .get()
    return result.data
  },
  
  // 获取热门课程
  async getHotCourses(limit: number = 6) {
    const result = await db.collection('courses')
      .where({ status: 'published' })
      .orderBy('salesCount', 'desc')
      .limit(limit)
      .get()
    return result.data
  }
}

/**
 * 培训班 API
 */
export const classApi = {
  // 获取培训班列表
  async getList(filters: any = {}) {
    const { status = 'enrolling', page = 1, pageSize = 10 } = filters
    
    const skip = (page - 1) * pageSize
    const result = await db.collection('classes')
      .where({ status })
      .orderBy('startDate', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return result.data
  },
  
  // 获取培训班详情
  async getDetail(classId: string) {
    const result = await db.collection('classes').doc(classId).get()
    return result.data
  }
}

/**
 * 商品 API（商城）
 */
export const productApi = {
  // 获取商品列表
  async getList(filters: any = {}) {
    const { status = 'onsale', categoryId, page = 1, pageSize = 10 } = filters
    
    const where: any = { status }
    if (categoryId) where.categoryId = categoryId
    
    const skip = (page - 1) * pageSize
    const result = await db.collection('products')
      .where(where)
      .orderBy('salesCount', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return result.data
  },
  
  // 获取商品详情
  async getDetail(productId: string) {
    const result = await db.collection('products').doc(productId).get()
    return result.data
  },
  
  // 获取分类列表
  async getCategories() {
    const result = await db.collection('product_categories')
      .orderBy('sort', 'asc')
      .get()
    return result.data
  }
}

/**
 * 订单 API
 */
export const orderApi = {
  // 获取用户订单
  async getByUserId(userId: string, orderType?: 'course' | 'shop') {
    const where: any = { userId }
    if (orderType) where.orderType = orderType
    
    const result = await db.collection('orders')
      .where(where)
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data
  },
  
  // 创建订单
  async create(orderData: any) {
    const result = await db.collection('orders').add(orderData)
    return result
  }
}

/**
 * 用户 API
 */
export const userApi = {
  // 获取用户信息
  async getUser(userId: string) {
    const result = await db.collection('users').doc(userId).get()
    return result.data
  },
  
  // 更新用户信息
  async updateUser(userId: string, data: any) {
    await db.collection('users').doc(userId).update(data)
  }
}