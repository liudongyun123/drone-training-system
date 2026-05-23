// ============================================================================
// 统一订单 API - 共用层（统一通过 adminService HTTP）
// 课程订单 + 商城订单 统一管理
// ============================================================================

import { adminService } from '@/services/adminService'
import type { UnifiedOrder, OrderFilters, OrderListResponse, OrderStatistics } from '@/shared/types/unifiedOrder'

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractSingle(result: any): any | null {
  if (!result) return null;
  if (result.data && !Array.isArray(result.data) && typeof result.data === 'object') return result.data;
  if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
  return result.data || null;
}

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
    
    const where: Record<string, any> = {}
    
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
      const dateFilter: Record<string, any> = {}
      if (startDate) dateFilter['$gte'] = startDate
      if (endDate) dateFilter['$lte'] = endDate
      where.createdAt = dateFilter
    }
    
    // 关键词搜索（订单号）
    if (keyword) {
      where.orderNo = { '$regex': keyword }
    }
    
    // 使用操作符查询（支持 $regex, $gte, $lte）
    const hasOperators = keyword !== undefined || startDate !== undefined || endDate !== undefined
    const listResult = hasOperators
      ? await adminService.listWithOps('orders', where, { orderBy: 'createdAt', order: 'desc', page, pageSize })
      : await adminService.list('orders', where, { orderBy: 'createdAt', order: 'desc', page, pageSize })
    
    const orders = extractList(listResult) as UnifiedOrder[]
    const total = listResult?.data?.total || orders.length

    return {
      orders,
      total,
      page,
      pageSize,
      hasMore: ((page - 1) * pageSize + orders.length) < total
    }
  },

  /**
   * 获取订单详情
   */
  async getDetail(orderId: string): Promise<UnifiedOrder | null> {
    return extractSingle(await adminService.get('orders', orderId)) as UnifiedOrder || null
  },

  /**
   * 获取用户的订单列表
   */
  async getByUserId(userId: string, orderType?: 'course' | 'shop'): Promise<UnifiedOrder[]> {
    const where: Record<string, any> = { userId }
    if (orderType) where.orderType = orderType
    
    const result = await adminService.list('orders', where, { orderBy: 'createdAt', order: 'desc', limit: 100 })
    return extractList(result) as UnifiedOrder[]
  },

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<void> {
    await adminService.update('orders', orderId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * 发货（商城订单）
   */
  async shipOrder(orderId: string, params: { company: string; trackingNumber: string }): Promise<void> {
    await adminService.update('orders', orderId, {
      status: 'shipped',
      shippingInfo: {
        company: params.company,
        trackingNumber: params.trackingNumber,
        shippedAt: new Date().toISOString(),
        status: 'shipped'
      },
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * 退款
   */
  async refundOrder(orderId: string, _reason?: string): Promise<void> {
    await adminService.update('orders', orderId, {
      status: 'refunded',
      refundedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    
    // 如果是商城订单，恢复库存（使用 $inc 操作符）
    const orderResult = await adminService.get('orders', orderId)
    const orderData = extractSingle(orderResult) as UnifiedOrder
    if (orderData && orderData.orderType === 'shop' && orderData.shopItems) {
      for (const item of orderData.shopItems) {
        await adminService.updateWithOps('products', item.productId, {
          $inc: { stock: item.quantity } as any,
          updatedAt: new Date().toISOString()
        } as any)
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
    
    const where: Record<string, any> = {}
    if (startDate || endDate) {
      const dateFilter: Record<string, any> = {}
      if (startDate) dateFilter['$gte'] = startDate
      if (endDate) dateFilter['$lte'] = endDate
      where.createdAt = dateFilter
    }
    
    // 获取所有订单（用于统计）
    const hasOperators = startDate !== undefined || endDate !== undefined
    const result = hasOperators
      ? await adminService.listWithOps('orders', where, { limit: 5000 })
      : await adminService.list('orders', where, { limit: 5000 })
    const orders = extractList(result) as UnifiedOrder[]
    
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
