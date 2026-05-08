/**
 * Feature API 服务 - 管理后台
 * 
 * 调用新云函数 API：
 * - api-user: 用户管理、会员管理、设置、统计
 * - api-order: 订单管理、购物车、优惠券
 * - mobile-learning: 学习路径、证书管理
 */

import { app } from '@/utils/cloudbase'
import type { ApiResponse } from '@/types'

// 环境ID
const ENV_ID = 'rcwljy-5ghmq2ex26764978'

// API 响应格式
interface FeatureApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || ''

/**
 * 调用云函数（HTTP 方式）
 */
async function callFunction<T = any>(
  functionName: string,
  data: {
    action: string
    data?: any
    openid?: string
  }
): Promise<FeatureApiResponse<T>> {
  const url = `https://${ENV_ID}.ap-shanghai.tcb-api.tencentcloudapi.com/${functionName}`

  console.log(`[FeatureAPI] 调用 ${functionName}.${data.action}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CloudBase-Environment': ENV_ID,
        'X-CloudBase-PublishableKey': PUBLISHABLE_KEY,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        data: result.data,
        message: result.message
      }
    } else {
      return {
        success: false,
        error: result.error || result.message || '操作失败',
        message: result.message
      }
    }
  } catch (error: any) {
    console.error(`[FeatureAPI] ${functionName}.${data.action} 失败:`, error)
    return {
      success: false,
      error: error.message || '网络请求失败'
    }
  }
}

// ============================================================================
// 用户管理 API (api-user)
// ============================================================================

export const adminUserApi = {
  /**
   * 获取用户列表
   */
  async getList(params?: { page?: number; pageSize?: number; keyword?: string }): Promise<FeatureApiResponse<any[]>> {
    return callFunction('api-user', {
      action: 'getList',
      data: params || {}
    })
  },

  /**
   * 获取用户详情
   */
  async getDetail(userId: string): Promise<FeatureApiResponse<any>> {
    return callFunction('api-user', {
      action: 'getUserById',
      data: { userId }
    })
  },

  /**
   * 获取用户统计
   */
  async getStats(): Promise<FeatureApiResponse<{
    totalLearningTime: number
    totalCourses: number
    learningPaths: number
    certificates: number
    weekLearningTime: number
    avgDailyTime: number
  }>> {
    return callFunction('api-user', {
      action: 'getLearningStats'
    })
  },

  /**
   * 获取会员列表
   */
  async getMemberList(): Promise<FeatureApiResponse<any[]>> {
    return callFunction('api-user', {
      action: 'getMemberList',
      data: {}
    })
  },

  /**
   * 升级会员
   */
  async upgradeMember(openid: string, level: string, months: number = 12): Promise<FeatureApiResponse<any>> {
    return callFunction('api-user', {
      action: 'upgradeMember',
      openid,
      data: { level, months }
    })
  },

  /**
   * 获取会员权益配置
   */
  async getMemberBenefits(level: string): Promise<FeatureApiResponse<any>> {
    return callFunction('api-user', {
      action: 'getMemberBenefits',
      data: { level }
    })
  },

  /**
   * 更新用户设置
   */
  async updateSettings(openid: string, settings: any): Promise<FeatureApiResponse<void>> {
    return callFunction('api-user', {
      action: 'updateSettings',
      openid,
      data: settings
    })
  },

  /**
   * 获取每日统计
   */
  async getDailyStats(date?: string): Promise<FeatureApiResponse<any>> {
    return callFunction('api-user', {
      action: 'getDailyStats',
      data: { date }
    })
  },

  /**
   * 获取学习统计概览
   */
  async getLearningStats(): Promise<FeatureApiResponse<{
    totalLearningTime: number
    totalCourses: number
    learningPaths: number
    certificates: number
    weekLearningTime: number
    avgDailyTime: number
  }>> {
    return callFunction('api-user', {
      action: 'getLearningStats'
    })
  }
}

// ============================================================================
// 订单管理 API (api-order)
// ============================================================================

export const adminOrderApi = {
  /**
   * 获取订单列表
   */
  async getList(params?: {
    page?: number
    pageSize?: number
    status?: string
    keyword?: string
  }): Promise<FeatureApiResponse<any[]>> {
    return callFunction('api-order', {
      action: 'getList',
      data: params || {}
    })
  },

  /**
   * 获取订单详情
   */
  async getDetail(orderId: string): Promise<FeatureApiResponse<any>> {
    return callFunction('api-order', {
      action: 'getDetail',
      data: { orderId }
    })
  },

  /**
   * 创建订单
   */
  async create(orderData: any): Promise<FeatureApiResponse<any>> {
    return callFunction('api-order', {
      action: 'create',
      data: orderData
    })
  },

  /**
   * 更新订单状态
   */
  async updateStatus(orderId: string, status: string): Promise<FeatureApiResponse<void>> {
    return callFunction('api-order', {
      action: 'updateStatus',
      data: { orderId, status }
    })
  },

  /**
   * 取消订单
   */
  async cancel(orderId: string, reason?: string): Promise<FeatureApiResponse<void>> {
    return callFunction('api-order', {
      action: 'cancel',
      data: { orderId, reason }
    })
  },

  /**
   * 删除订单
   */
  async delete(orderId: string): Promise<FeatureApiResponse<void>> {
    return callFunction('api-order', {
      action: 'delete',
      data: { orderId }
    })
  },

  /**
   * 获取优惠券列表
   */
  async getCoupons(status?: string): Promise<FeatureApiResponse<any[]>> {
    return callFunction('api-order', {
      action: 'getCoupons',
      data: { status }
    })
  },

  /**
   * 验证优惠券
   */
  async validateCoupon(code: string, amount: number): Promise<FeatureApiResponse<any>> {
    return callFunction('api-order', {
      action: 'validateCoupon',
      data: { code, amount }
    })
  },

  /**
   * 发放优惠券
   */
  async grantCoupon(userId: string, couponTemplateId: string): Promise<FeatureApiResponse<void>> {
    return callFunction('api-order', {
      action: 'claimCoupon',
      data: { couponTemplateId },
      openid: userId
    })
  },

  /**
   * 获取购物车列表
   */
  async getCart(): Promise<FeatureApiResponse<any[]>> {
    return callFunction('api-order', {
      action: 'getCart'
    })
  },

  /**
   * 清空购物车
   */
  async clearCart(): Promise<FeatureApiResponse<void>> {
    return callFunction('api-order', {
      action: 'clearCart'
    })
  },

  /**
   * 获取订单统计
   */
  async getStats(): Promise<FeatureApiResponse<{
    total: number
    pending: number
    paid: number
    cancelled: number
    totalAmount: number
  }>> {
    return callFunction('api-order', {
      action: 'getStats',
      data: {}
    })
  }
}

// ============================================================================
// 学习路径 API (mobile-learning)
// ============================================================================

export const adminLearningApi = {
  /**
   * 获取学习路径列表
   */
  async getLearningPaths(params?: { page?: number; pageSize?: number }): Promise<FeatureApiResponse<any[]>> {
    return callFunction('mobile-learning', {
      action: 'getLearningPaths',
      data: params || {}
    })
  },

  /**
   * 获取学习路径详情
   */
  async getLearningPathDetail(pathId: string): Promise<FeatureApiResponse<any>> {
    return callFunction('mobile-learning', {
      action: 'getLearningPathDetail',
      data: { pathId }
    })
  },

  /**
   * 获取路径学习进度
   */
  async getPathProgress(pathId: string): Promise<FeatureApiResponse<any>> {
    return callFunction('mobile-learning', {
      action: 'getPathProgress',
      data: { pathId }
    })
  },

  /**
   * 创建学习路径
   */
  async createPath(pathData: any): Promise<FeatureApiResponse<any>> {
    return callFunction('mobile-learning', {
      action: 'createPath',
      data: pathData
    })
  },

  /**
   * 更新学习路径
   */
  async updatePath(pathId: string, pathData: any): Promise<FeatureApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'updatePath',
      data: { pathId, ...pathData }
    })
  },

  /**
   * 删除学习路径
   */
  async deletePath(pathId: string): Promise<FeatureApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'deletePath',
      data: { pathId }
    })
  },

  /**
   * 获取证书列表
   */
  async getCertificates(params?: { page?: number; pageSize?: number; status?: string }): Promise<FeatureApiResponse<any[]>> {
    return callFunction('mobile-learning', {
      action: 'getCertificates',
      data: params || {}
    })
  },

  /**
   * 获取证书详情
   */
  async getCertificateDetail(certificateId: string): Promise<FeatureApiResponse<any>> {
    return callFunction('mobile-learning', {
      action: 'getCertificateDetail',
      data: { certificateId }
    })
  },

  /**
   * 发放证书
   */
  async issueCertificate(certificateData: any): Promise<FeatureApiResponse<any>> {
    return callFunction('mobile-learning', {
      action: 'generateCertificate',
      data: certificateData
    })
  },

  /**
   * 撤销证书
   */
  async revokeCertificate(certificateId: string): Promise<FeatureApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'revokeCertificate',
      data: { certificateId }
    })
  },

  /**
   * 验证证书
   */
  async verifyCertificate(certificateCode: string): Promise<FeatureApiResponse<any>> {
    return callFunction('mobile-learning', {
      action: 'verifyCertificate',
      data: { certificateCode }
    })
  },

  /**
   * 获取证书统计
   */
  async getCertificateStats(): Promise<FeatureApiResponse<{
    total: number
    issued: number
    pending: number
    revoked: number
  }>> {
    return callFunction('mobile-learning', {
      action: 'getCertificateStats',
      data: {}
    })
  }
}

// ============================================================================
// 导出所有 Feature API
// ============================================================================

export const featureApi = {
  user: adminUserApi,
  order: adminOrderApi,
  learning: adminLearningApi
}

export default featureApi
