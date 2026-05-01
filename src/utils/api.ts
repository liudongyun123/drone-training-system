/**
 * 统一API调用工具
 * 
 * 所有前端对云函数的调用都走这里
 * 自动处理模块路由、错误处理、响应规范化
 */

import { app } from './cloudbase'

// API模块类型
export type ApiModule = 'auth' | 'course' | 'exam' | 'training' | 'shop' | 'admin'

// 统一响应格式
export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

// 调用选项
export interface CallOptions {
  module: ApiModule
  action: string
  data?: Record<string, any>
  timeout?: number
}

/**
 * 统一API调用入口
 * 
 * @example
 * // 登录
 * const res = await callApi({
 *   module: 'auth',
 *   action: 'login',
 *   data: { code: 'xxx' }
 * })
 * 
 * // 获取课程列表
 * const courses = await callApi({
 *   module: 'course',
 *   action: 'list',
 *   data: { category: 'UAV' }
 * })
 */
export async function callApi<T = any>(options: CallOptions): Promise<ApiResponse<T>> {
  const { module, action, data = {}, timeout = 15000 } = options

  // 云函数名称
  const fnName = `api-${module}`

  console.log(`[API] 调用 ${fnName}/${action}`, data)

  try {
    const result = await app.callFunction({
      name: fnName,
      data: { action, ...data }
    })

    const response = result.result as ApiResponse<T>

    if (response.code !== 0) {
      console.error(`[API] ${fnName}/${action} 失败:`, response.message)
    } else {
      console.log(`[API] ${fnName}/${action} 成功`)
    }

    return response
  } catch (error: any) {
    console.error(`[API] ${fnName}/${action} 异常:`, error)
    return {
      code: -1,
      message: error.message || '网络请求失败'
    }
  }
}

// ========== 便捷方法 ==========

export const api = {
  /** 认证模块 */
  auth: {
    login: (data: { code?: string; phone?: string; password?: string }) =>
      callApi({ module: 'auth', action: 'login', data }),
    
    register: (data: { phone: string; password?: string; name?: string }) =>
      callApi({ module: 'auth', action: 'register', data }),
    
    sendSms: (phone: string) =>
      callApi({ module: 'auth', action: 'sendSms', data: { phone } }),
    
    getPhone: (code: string) =>
      callApi({ module: 'auth', action: 'getPhone', data: { code } }),
    
    checkToken: () =>
      callApi({ module: 'auth', action: 'checkToken' }),
    
    logout: () =>
      callApi({ module: 'auth', action: 'logout' })
  },

  /** 课程模块 */
  course: {
    list: (data: { category?: string; level?: string; page?: number; pageSize?: number }) =>
      callApi({ module: 'course', action: 'list', data }),
    
    detail: (id: string) =>
      callApi({ module: 'course', action: 'detail', data: { id } }),
    
    lessons: (courseId: string) =>
      callApi({ module: 'course', action: 'lessons', data: { courseId } }),
    
    progress: (courseId: string) =>
      callApi({ module: 'course', action: 'progress', data: { courseId } }),
    
    updateProgress: (data: { courseId: string; lessonId: string; currentTime: number }) =>
      callApi({ module: 'course', action: 'updateProgress', data })
  },

  /** 考试模块 */
  exam: {
    list: () =>
      callApi({ module: 'exam', action: 'list' }),
    
    detail: (id: string) =>
      callApi({ module: 'exam', action: 'detail', data: { id } }),
    
    start: (examId: string) =>
      callApi({ module: 'exam', action: 'start', data: { examId } }),
    
    submit: (data: { attemptId: string; answers: Record<string, any> }) =>
      callApi({ module: 'exam', action: 'submit', data }),
    
    result: (attemptId: string) =>
      callApi({ module: 'exam', action: 'result', data: { attemptId } }),
    
    // 题库
    banks: () =>
      callApi({ module: 'exam', action: 'banks' }),
    
    bankDetail: (bankId: string) =>
      callApi({ module: 'exam', action: 'bankDetail', data: { bankId } }),
    
    practice: (data: { bankId: string; questionIds?: string[] }) =>
      callApi({ module: 'exam', action: 'practice', data }),
    
    recordPractice: (data: { bankId: string; questionId: string; answer: string | string[] }) =>
      callApi({ module: 'exam', action: 'recordPractice', data })
  },

  /** 培训模块 */
  training: {
    classList: (data: { status?: string; page?: number }) =>
      callApi({ module: 'training', action: 'classList', data }),
    
    classDetail: (classId: string) =>
      callApi({ module: 'training', action: 'classDetail', data: { classId } }),
    
    classSchedules: (classId: string) =>
      callApi({ module: 'training', action: 'classSchedules', data: { classId } }),
    
    // 我的班级
    myClasses: () =>
      callApi({ module: 'training', action: 'myClasses' }),
    
    // 报名
    enroll: (data: { classId: string; courseId?: string }) =>
      callApi({ module: 'training', action: 'enroll', data }),
    
    myRegistrations: () =>
      callApi({ module: 'training', action: 'myRegistrations' })
  },

  /** 商城模块 */
  shop: {
    products: (data: { category?: string; page?: number }) =>
      callApi({ module: 'shop', action: 'products', data }),
    
    productDetail: (productId: string) =>
      callApi({ module: 'shop', action: 'productDetail', data: { productId } }),
    
    // 购物车
    cartList: () =>
      callApi({ module: 'shop', action: 'cartList' }),
    
    cartAdd: (productId: string, quantity: number = 1) =>
      callApi({ module: 'shop', action: 'cartAdd', data: { productId, quantity } }),
    
    cartRemove: (productId: string) =>
      callApi({ module: 'shop', action: 'cartRemove', data: { productId } }),
    
    // 订单
    createOrder: (data: { type: 'course' | 'class' | 'product'; items: any[] }) =>
      callApi({ module: 'shop', action: 'createOrder', data }),
    
    myOrders: (data: { type?: string; status?: string }) =>
      callApi({ module: 'shop', action: 'myOrders', data }),
    
    payOrder: (orderId: string) =>
      callApi({ module: 'shop', action: 'payOrder', data: { orderId } })
  },

  /** 管理模块 */
  admin: {
    // 通用CRUD
    list: (collection: string, data: any) =>
      callApi({ module: 'admin', action: 'list', data: { collection, ...data } }),
    
    get: (collection: string, id: string) =>
      callApi({ module: 'admin', action: 'get', data: { collection, id } }),
    
    create: (collection: string, data: any) =>
      callApi({ module: 'admin', action: 'create', data: { collection, ...data } }),
    
    update: (collection: string, id: string, data: any) =>
      callApi({ module: 'admin', action: 'update', data: { collection, id, ...data } }),
    
    delete: (collection: string, id: string) =>
      callApi({ module: 'admin', action: 'delete', data: { collection, id } }),
    
    // 统计
    stats: () =>
      callApi({ module: 'admin', action: 'stats' })
  }
}

export default api
