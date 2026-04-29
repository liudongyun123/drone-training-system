// ============================================================================
// 统一订单类型定义 - 共用层
// 课程订单 + 商城订单 统一管理
// ============================================================================

import type { OrderItem } from './order'
import type { CartProductItem, ShippingAddress, ShippingInfo } from './shop'

export type OrderType = 'course' | 'shop'
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded' | 'shipped' | 'delivered' | 'completed'

/**
 * 统一订单（课程订单 + 商城订单）
 */
export interface UnifiedOrder {
  _id: string
  orderNo: string
  userId: string
  phone?: string
  
  // 🆕 订单类型（核心区分）
  orderType: OrderType
  
  // 课程订单字段
  courseItems?: OrderItem[]     // 课程项（orderType='course'时）
  
  // 商城订单字段
  shopItems?: CartProductItem[] // 商品项（orderType='shop'时）
  shippingAddress?: ShippingAddress // 收货地址
  shippingInfo?: ShippingInfo   // 物流信息
  
  // 公共字段
  totalAmount: number           // 总金额
  discountAmount: number        // 折扣金额
  finalAmount: number           // 实付金额
  
  paymentMethod: 'wechat' | 'offline'
  status: OrderStatus
  
  // 微信支付信息
  wxTransactionId?: string
  paidAt?: string
  
  createdAt: string
  updatedAt: string
}

/**
 * 订单筛选条件
 */
export interface OrderFilters {
  orderType?: OrderType | 'all'
  status?: OrderStatus
  userId?: string
  phone?: string
  startDate?: string
  endDate?: string
  keyword?: string
  page?: number
  pageSize?: number
}

/**
 * 订单列表响应
 */
export interface OrderListResponse {
  orders: UnifiedOrder[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * 订单统计
 */
export interface OrderStatistics {
  // 课程订单
  courseOrderCount: number
  courseOrderAmount: number
  
  // 商城订单
  shopOrderCount: number
  shopOrderAmount: number
  
  // 合计
  totalOrderCount: number
  totalAmount: number
  
  // 按日期
  dailyStats?: {
    date: string
    courseCount: number
    courseAmount: number
    shopCount: number
    shopAmount: number
  }[]
}

// ========== 工具函数 ==========

/**
 * 根据订单类型获取状态列表
 */
export function getStatusListByOrderType(orderType: OrderType): OrderStatus[] {
  if (orderType === 'course') {
    return ['pending', 'paid', 'cancelled', 'refunded']
  } else {
    return ['pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded']
  }
}

/**
 * 获取订单状态显示文本
 */
export function getOrderStatusTextByType(status: OrderStatus, orderType: OrderType): string {
  const courseMap: Record<OrderStatus, string> = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消',
    refunded: '已退款',
    shipped: '—',
    delivered: '—',
    completed: '已完成'
  }
  
  const shopMap: Record<OrderStatus, string> = {
    pending: '待支付',
    paid: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    completed: '已完成',
    cancelled: '已取消',
    refunded: '已退款'
  }
  
  return orderType === 'course' ? courseMap[status] : shopMap[status]
}

/**
 * 判断订单是否可退款
 */
export function canRefund(order: UnifiedOrder): boolean {
  if (order.orderType === 'course') {
    return order.status === 'paid'
  } else {
    return ['paid', 'shipped'].includes(order.status)
  }
}