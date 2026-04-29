// ============================================================================
// 统一订单 API - 共用层
// 课程订单 + 商城订单 统一管理
// ============================================================================

import { app } from '@/utils/cloudbase'
import type { UnifiedOrder, OrderFilters, OrderListResponse, OrderStatistics } from '@/shared/types/unifiedOrder'

const db = app.database()
const _ = db.command

/**
 * 统一订单 API
 */
export const unifiedOrderApi = {
  /**
   * 获取订单列表（支持类型筛选）
   */
  async getList(filters: OrderFilters = {}): Promise<OrderListResponse> {
    const {
      orderType,
      status,
      userId,
      phone,
      startDate,
      endDate,
      keyword,
      page = 1,
      pageSize = 10
    } = filters
    
    const where: any = {}
    
    // 类型筛选
    if (orderType && orderType !== 'all') {
      where.orderType = orderType
    }
    
    // 状态筛选
    if (status) {
      where.status = status
    }
    
    // 用户筛选
    if (userId) {
      where.userId = userId
    }
    
    // 手机号筛选
    if (phone) {
      where.phone = phone
    }
    
    // 时间筛选
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt = _.gte(startDate)
      if (endDate) where.createdAt = _.and(where.createdAt, _.lte(endDate))
    }
    
    // 关键词搜索（订单号）
    if (keyword) {
      where.orderNo = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }
    
    // 查询总数
    const countResult = await db.collection('orders').where(where).count()
    const total = countResult.total
    
    // 查询数据
    const skip = (page - 1) * pageSize
    const result = await db.collection('orders')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return {
      orders: result.data as UnifiedOrder[],
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total
    }
  },

  /**
   * 获取订单详情
   */
  async getDetail(orderId: string): Promise<UnifiedOrder | null> {
    const result = await db.collection('orders').doc(orderId).get()
    return result.data as UnifiedOrder || null
  },

  /**
   * 获取用户的订单列表
   */
  async getByUserId(userId: string, orderType?: 'course' | 'shop'): Promise<UnifiedOrder[]> {
    const where: any = { userId }
    if (orderType) where.orderType = orderType
    
    const result = await db.collection('orders')
      .where(where)
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data as UnifiedOrder[]
  },

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * 退款
   */
  async refundOrder(orderId: string, reason?: string): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      status: 'refunded',
      refundedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    
    // 如果是商城订单，恢复库存
    const order = await db.collection('orders').doc(orderId).get()
    if (order.data) {
      const orderData = order.data as UnifiedOrder
      if (orderData.orderType === 'shop' && orderData.shopItems) {
        // 这里需要引入 productApi，暂时用 db 直接操作
        for (const item of orderData.shopItems) {
          await db.collection('products').doc(item.productId).update({
            stock: _.inc(item.quantity),
            updatedAt: new Date().toISOString()
          })
        }
      }
    }
  },

  /**
   * 获取订单统计
   */
  async getStatistics(params: {
    startDate?: string
    endDate?: string
  } = {}): Promise<OrderStatistics> {
    const { startDate, endDate } = params
    
    const where: any = {}
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt = _.gte(startDate)
      if (endDate) where.createdAt = _.and(where.createdAt, _.lte(endDate))
    }
    
    // 获取所有订单
    const result = await db.collection('orders').where(where).get()
    const orders = result.data as UnifiedOrder[]
    
    // 统计课程订单
    const courseOrders = orders.filter(o => o.orderType === 'course')
    const courseOrderCount = courseOrders.length
    const courseOrderAmount = courseOrders.reduce((sum, o) => sum + o.finalAmount, 0)
    
    // 统计商城订单
    const shopOrders = orders.filter(o => o.orderType === 'shop')
    const shopOrderCount = shopOrders.length
    const shopOrderAmount = shopOrders.reduce((sum, o) => sum + o.finalAmount, 0)
    
    return {
      courseOrderCount,
      courseOrderAmount,
      shopOrderCount,
      shopOrderAmount,
      totalOrderCount: courseOrderCount + shopOrderCount,
      totalAmount: courseOrderAmount + shopOrderAmount
    }
  }
}