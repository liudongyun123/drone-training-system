/**
 * Order Types - 订单类型定义
 */

// ============================================================================
// 订单
// ============================================================================

export interface Order {
  /** 订单 ID */
  _id: string;
  /** 订单编号 */
  orderNo: string;
  /** 用户 ID */
  userId: string;
  /** 订单类型 */
  type: OrderType;
  /** 关联 ID（课程ID或班级ID） */
  targetId: string;
  /** 关联名称 */
  targetName: string;
  /** 关联封面图 */
  targetCover?: string;
  /** 订单金额 */
  amount: number;
  /** 优惠金额 */
  discountAmount?: number;
  /** 实际支付金额 */
  paidAmount: number;
  /** 订单状态 */
  status: OrderStatus;
  /** 支付方式 */
  paymentMethod?: PaymentMethod;
  /** 支付时间 */
  paidAt?: string;
  /** 创建时间 */
  createdAt: string;
  /** 过期时间 */
  expiredAt?: string;
  /** 备注 */
  remark?: string;
  /** 用户信息 */
  user?: {
    name: string;
    phone: string;
  };
  /** 关联课程/班级信息 */
  target?: {
    title: string;
    coverImage?: string;
    teacher?: string;
  };
}

export type OrderType = 'course' | 'class' | 'product';

export type OrderStatus = 
  | 'pending'    // 待支付
  | 'paid'       // 已支付
  | 'cancelled'  // 已取消
  | 'refunded'   // 已退款
  | 'expired';   // 已过期

export type PaymentMethod = 'wechat' | 'alipay' | 'offline' | 'balance';

// ============================================================================
// 订单查询参数
// ============================================================================

export interface OrderListParams {
  /** 订单类型 */
  type?: OrderType;
  /** 订单状态 */
  status?: OrderStatus;
  /** 搜索关键词 */
  keyword?: string;
  /** 排序字段 */
  orderBy?: 'createdAt' | 'amount' | 'paidAt';
  /** 排序方向 */
  orderDir?: 'asc' | 'desc';
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

// ============================================================================
// 订单操作
// ============================================================================

export interface CreateOrderParams {
  /** 订单类型 */
  type: OrderType;
  /** 关联 ID */
  targetId: string;
  /** 优惠码 */
  couponCode?: string;
  /** 备注 */
  remark?: string;
}

export interface PayOrderParams {
  /** 订单 ID */
  orderId: string;
  /** 支付方式 */
  paymentMethod: PaymentMethod;
}

// ============================================================================
// 购物车
// ============================================================================

export interface CartItem {
  /** 购物车 ID */
  _id: string;
  /** 商品类型 */
  type: OrderType;
  /** 商品 ID */
  targetId: string;
  /** 商品名称 */
  targetName: string;
  /** 商品封面 */
  targetCover?: string;
  /** 商品价格 */
  price: number;
  /** 添加时间 */
  addedAt: string;
}

export interface Cart {
  /** 用户 ID */
  userId: string;
  /** 购物车商品列表 */
  items: CartItem[];
  /** 商品总数量 */
  totalCount: number;
  /** 商品总金额 */
  totalAmount: number;
}

// ============================================================================
// 优惠券
// ============================================================================

export interface Coupon {
  /** 优惠券 ID */
  _id: string;
  /** 优惠券名称 */
  name: string;
  /** 优惠券类型 */
  type: CouponType;
  /** 优惠金额/折扣 */
  value: number;
  /** 使用条件（满X元可用） */
  minAmount?: number;
  /** 最高优惠金额 */
  maxDiscount?: number;
  /** 有效期开始 */
  validFrom: string;
  /** 有效期结束 */
  validUntil: string;
  /** 适用范围 */
  scope: CouponScope;
  /** 状态 */
  status: CouponStatus;
  /** 已使用次数 */
  usedCount?: number;
  /** 总数量 */
  totalCount?: number;
}

export type CouponType = 'discount' | 'cash';
export type CouponScope = 'all' | 'course' | 'class' | 'product';
export type CouponStatus = 'available' | 'used' | 'expired' | 'disabled';

// ============================================================================
// 订单状态
// ============================================================================

export const ORDER_STATUS = {
  pending: { label: '待支付', color: 'orange' },
  paid: { label: '已支付', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
  refunded: { label: '已退款', color: 'red' },
  expired: { label: '已过期', color: 'gray' },
} as const;

// ============================================================================
// 导出
// ============================================================================

export type {
  Order,
  OrderListParams,
  CreateOrderParams,
  PayOrderParams,
  CartItem,
  Cart,
  Coupon,
};
