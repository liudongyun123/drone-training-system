/**
 * 统一订单数据模型
 * 
 * 核心原则：
 * 1. 数据库字段 = 前端字段，统一命名
 * 2. 删除冗余字段，保留核心字段
 * 3. 同时支持单课程和多课程订单
 * 
 * 创建日期: 2026-04-05
 */

// ============== 订单项 ==============

/**
 * 订单项 - 包含课程信息
 * 用于 items 数组，支持多课程订单
 */
export interface OrderItem {
  courseId: string      // 课程ID（核心）
  title: string         // 课程标题（核心）
  thumbnail?: string    // 课程封面（可选）
  price: number         // 购买价格（核心）
  instructor?: string   // 授课教师（可选）
  quantity?: number     // 数量（默认1）
}

// ============== 订单状态枚举 ==============

export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pending: 'warning',
  paid: 'success',
  completed: 'success',
  cancelled: 'default',
  refunded: 'error'
}

// ============== 统一订单接口 ==============

/**
 * 统一订单格式
 * 
 * 字段说明：
 * - _id: 数据库主键
 * - userId: 用户ID（核心）
 * - items: 订单项数组（多课程模式，推荐）
 * - courseId/courseName: 单课程订单（兼容旧数据）
 * - amount: 订单金额（核心）
 * - status: 订单状态（核心）
 * - orderNo: 订单编号（可选）
 * - paymentMethod: 支付方式（可选）
 * - createdAt: 创建时间（核心）
 * - paidAt: 支付时间（可选）
 */
export interface Order {
  // ========== 标识符 ==========
  _id?: string          // 数据库ID
  id?: string           // 前端用ID（兼容）

  // ========== 用户信息 ==========
  userId: string        // 用户ID（核心）
  userName?: string     // 用户名（可选）
  _openid?: string      // 微信openid（可选，用于微信小程序）

  // ========== 订单信息 ==========
  orderNo?: string      // 订单编号（可选）

  // ========== 订单内容（多课程，推荐） ==========
  items?: OrderItem[]   // 订单项数组

  // ========== 订单内容（单课程，兼容旧数据） ==========
  courseId?: string     // 课程ID
  courseName?: string  // 课程名称
  courseCover?: string // 课程封面

  // ========== 金额 ==========
  amount: number        // 订单金额（核心）
  totalAmount?: number  // 总金额（兼容）
  discountAmount?: number // 优惠金额
  finalAmount?: number  // 实付金额

  // ========== 状态 ==========
  status: OrderStatus   // 订单状态（核心）
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' // 支付状态（兼容）

  // ========== 支付 ==========
  paymentMethod?: 'wechat' | 'alipay' | 'balance' | 'card'  // 支付方式

  // ========== 时间 ==========
  createdAt: string     // 创建时间（核心）
  updatedAt?: string    // 更新时间
  paidAt?: string       // 支付时间
  cancelAt?: string     // 取消时间
  expireAt?: string     // 过期时间

  // ========== 其他 ==========
  remark?: string       // 备注
  couponId?: string      // 使用的优惠券ID
  couponCode?: string   // 优惠券代码
}

// ============== 辅助函数 ==============

/**
 * 获取订单中的课程ID列表
 * 同时支持 items 数组和 courseId 字段
 */
export function getOrderCourseIds(order: Order): string[] {
  if (order.items && order.items.length > 0) {
    return order.items.map(item => item.courseId).filter(Boolean)
  }
  if (order.courseId) {
    return [order.courseId]
  }
  return []
}

/**
 * 获取订单中的课程名称列表
 * 同时支持 items 数组和 courseName 字段
 */
export function getOrderCourseNames(order: Order): string[] {
  if (order.items && order.items.length > 0) {
    return order.items.map(item => item.title).filter(Boolean)
  }
  if (order.courseName) {
    return [order.courseName]
  }
  return []
}

/**
 * 获取订单金额
 * 优先使用 amount，其次 totalAmount
 */
export function getOrderAmount(order: Order): number {
  return order.amount || order.totalAmount || 0
}

/**
 * 判断订单是否已支付
 * 同时检查 status 和 paymentStatus
 */
export function isOrderPaid(order: Order): boolean {
  return order.status === 'paid' || 
         order.status === 'completed' || 
         order.paymentStatus === 'paid'
}

/**
 * 判断订单是否可支付（待支付状态）
 */
export function isOrderPending(order: Order): boolean {
  return order.status === 'pending' || order.paymentStatus === 'pending'
}

/**
 * 统一订单数据格式 - 用于服务层返回
 * 确保返回的数据包含统一的字段
 */
export function normalizeOrder(rawOrder: any): Order {
  return {
    _id: rawOrder._id || rawOrder.id,
    id: rawOrder._id || rawOrder.id,
    userId: rawOrder.userId || rawOrder._openid || '',
    userName: rawOrder.userName || rawOrder.username,
    _openid: rawOrder._openid,
    orderNo: rawOrder.orderNo,
    items: rawOrder.items,
    courseId: rawOrder.courseId,
    courseName: rawOrder.courseName,
    courseCover: rawOrder.courseCover,
    amount: rawOrder.amount || rawOrder.total || 0,
    totalAmount: rawOrder.totalAmount || rawOrder.total,
    discountAmount: rawOrder.discountAmount,
    finalAmount: rawOrder.finalAmount,
    status: rawOrder.status || rawOrder.paymentStatus || 'pending',
    paymentStatus: rawOrder.paymentStatus,
    paymentMethod: rawOrder.paymentMethod,
    createdAt: rawOrder.createdAt || rawOrder.orderDate || new Date().toISOString(),
    updatedAt: rawOrder.updatedAt,
    paidAt: rawOrder.paidAt || rawOrder.paymentTime,
    cancelAt: rawOrder.cancelAt,
    expireAt: rawOrder.expireAt,
    remark: rawOrder.remark,
    couponId: rawOrder.couponId,
    couponCode: rawOrder.couponCode,
  }
}
