// ============================================================================
// 订单类型定义 - 共用层
// ============================================================================

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'
export type PaymentMethod = 'wechat' | 'alipay' | 'offline'

export interface OrderItem {
  courseId: string
  title: string
  thumbnail?: string
  price: number
  quantity: number
}

export interface Order {
  _id: string
  orderNo: string
  userId: string
  phone?: string
  
  items: OrderItem[]
  totalAmount: number
  discountAmount: number
  finalAmount: number
  
  paymentMethod: PaymentMethod
  status: OrderStatus
  
  // 微信支付信息
  wxTransactionId?: string
  paidAt?: string
  refundedAt?: string
  
  createdAt: string
  updatedAt: string
}

/**
 * 获取订单状态显示文本
 */
export function getOrderStatusText(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: '待支付',
    paid: '已支付',
    cancelled: '已取消',
    refunded: '已退款'
  }
  return map[status] || status
}

/**
 * 获取订单状态颜色
 */
export function getOrderStatusColor(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: 'text-yellow-500',
    paid: 'text-green-500',
    cancelled: 'text-gray-500',
    refunded: 'text-red-500'
  }
  return map[status] || 'text-gray-500'
}