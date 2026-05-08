/**
 * Order API - 订单接口
 */

import { platform } from '../../../platform/adapters';
import { BaseResponse, PaginatedResponse } from '../../../platform/adapters/IRequestAdapter';
import { apiCache } from '../../../infrastructure/cache/CacheManager';
import { apiMonitor } from '../../../infrastructure/monitor/APIMonitor';
import { apiLogger } from '../../../infrastructure/logger/Logger';
import type {
  Order,
  OrderListParams,
  CreateOrderParams,
  PayOrderParams,
  Cart,
  CartItem,
  Coupon,
} from '../types/Order';

// ============================================================================
// API 端点
// ============================================================================

const API_BASE = '/orders';

const endpoints = {
  list: `${API_BASE}`,
  detail: (id: string) => `${API_BASE}/${id}`,
  create: `${API_BASE}`,
  cancel: (id: string) => `${API_BASE}/${id}/cancel`,
  refund: (id: string) => `${API_BASE}/${id}/refund`,
  pay: (id: string) => `${API_BASE}/${id}/pay`,
  payCallback: `${API_BASE}/callback`,
};

const cartEndpoints = {
  get: '/cart',
  add: '/cart/add',
  remove: (id: string) => `/cart/${id}`,
  clear: '/cart/clear',
};

const couponEndpoints = {
  myList: '/coupons/my',
  available: '/coupons/available',
  check: '/coupons/check',
};

// ============================================================================
// 订单 API 函数
// ============================================================================

/**
 * 获取订单列表
 */
export async function getOrderList(
  params: OrderListParams = {}
): Promise<PaginatedResponse<Order>> {
  const { page = 1, pageSize = 10, ...rest } = params;
  
  return apiMonitor.track('GET', endpoints.list, () =>
    platform.request.get<PaginatedResponse<Order>>(endpoints.list, {
      page,
      pageSize,
      ...rest,
    })
  );
}

/**
 * 获取订单详情
 */
export async function getOrderDetail(
  orderId: string
): Promise<BaseResponse<Order>> {
  return apiMonitor.track('GET', endpoints.detail(orderId), () =>
    platform.request.get<BaseResponse<Order>>(endpoints.detail(orderId))
  );
}

/**
 * 创建订单
 */
export async function createOrder(
  params: CreateOrderParams
): Promise<BaseResponse<Order>> {
  apiLogger.info('[Order] 创建订单', params);
  
  return apiMonitor.track('POST', endpoints.create, () =>
    platform.request.post<BaseResponse<Order>>(endpoints.create, params)
  );
}

/**
 * 取消订单
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<BaseResponse<void>> {
  apiLogger.info('[Order] 取消订单', { orderId, reason });
  
  return apiMonitor.track('POST', endpoints.cancel(orderId), () =>
    platform.request.post<BaseResponse<void>>(endpoints.cancel(orderId), { reason })
  );
}

/**
 * 申请退款
 */
export async function refundOrder(
  orderId: string,
  reason: string
): Promise<BaseResponse<void>> {
  apiLogger.info('[Order] 申请退款', { orderId, reason });
  
  return apiMonitor.track('POST', endpoints.refund(orderId), () =>
    platform.request.post<BaseResponse<void>>(endpoints.refund(orderId), { reason })
  );
}

/**
 * 发起支付
 */
export async function payOrder(
  params: PayOrderParams
): Promise<BaseResponse<{ paymentParams: any; payUrl?: string }>> {
  const { orderId, ...rest } = params;
  
  apiLogger.info('[Order] 发起支付', { orderId, paymentMethod: rest.paymentMethod });
  
  return apiMonitor.track('POST', endpoints.pay(orderId), () =>
    platform.request.post<BaseResponse<{ paymentParams: any; payUrl?: string }>>(
      endpoints.pay(orderId),
      rest
    )
  );
}

/**
 * 支付回调（由后端使用）
 */
export async function handlePayCallback(
  callbackData: any
): Promise<BaseResponse<void>> {
  return platform.request.post<BaseResponse<void>>(endpoints.payCallback, callbackData);
}

// ============================================================================
// 购物车 API 函数
// ============================================================================

/**
 * 获取购物车
 */
export async function getCart(): Promise<BaseResponse<Cart>> {
  return apiMonitor.track('GET', cartEndpoints.get, () =>
    apiCache.get<Cart>(cartEndpoints.get, undefined, {
      ttl: 1 * 60 * 1000, // 1分钟缓存
      key: 'cart',
    })
  );
}

/**
 * 添加到购物车
 */
export async function addToCart(
  type: 'course' | 'class' | 'product',
  targetId: string
): Promise<BaseResponse<Cart>> {
  apiLogger.info('[Order] 添加到购物车', { type, targetId });
  
  // 清除购物车缓存
  apiCache.invalidate(cartEndpoints.get);
  
  return apiMonitor.track('POST', cartEndpoints.add, () =>
    platform.request.post<BaseResponse<Cart>>(cartEndpoints.add, { type, targetId })
  );
}

/**
 * 从购物车移除
 */
export async function removeFromCart(
  cartItemId: string
): Promise<BaseResponse<void>> {
  apiLogger.info('[Order] 从购物车移除', { cartItemId });
  
  // 清除购物车缓存
  apiCache.invalidate(cartEndpoints.get);
  
  return apiMonitor.track('DELETE', cartEndpoints.remove(cartItemId), () =>
    platform.request.delete(cartEndpoints.remove(cartItemId))
  );
}

/**
 * 清空购物车
 */
export async function clearCart(): Promise<BaseResponse<void>> {
  apiLogger.info('[Order] 清空购物车');
  
  // 清除购物车缓存
  apiCache.invalidate(cartEndpoints.get);
  
  return apiMonitor.track('POST', cartEndpoints.clear, () =>
    platform.request.post(cartEndpoints.clear)
  );
}

// ============================================================================
// 优惠券 API 函数
// ============================================================================

/**
 * 获取我的优惠券
 */
export async function getMyCoupons(
  status?: 'available' | 'used' | 'expired'
): Promise<BaseResponse<Coupon[]>> {
  return apiMonitor.track('GET', couponEndpoints.myList, () =>
    platform.request.get<BaseResponse<Coupon[]>>(couponEndpoints.myList, { status })
  );
}

/**
 * 获取可用优惠券
 */
export async function getAvailableCoupons(
  orderAmount: number,
  orderType: 'course' | 'class' | 'product',
  targetId?: string
): Promise<BaseResponse<Coupon[]>> {
  return apiMonitor.track('GET', couponEndpoints.available, () =>
    platform.request.get<BaseResponse<Coupon[]>>(couponEndpoints.available, {
      amount: orderAmount,
      type: orderType,
      targetId,
    })
  );
}

/**
 * 检查优惠券是否可用
 */
export async function checkCoupon(
  couponCode: string,
  orderAmount: number,
  orderType: 'course' | 'class' | 'product',
  targetId?: string
): Promise<BaseResponse<{ available: boolean; coupon?: Coupon; discount?: number }>> {
  return apiMonitor.track('POST', couponEndpoints.check, () =>
    platform.request.post<BaseResponse<{ available: boolean; coupon?: Coupon; discount?: number }>>(
      couponEndpoints.check,
      { code: couponCode, amount: orderAmount, type: orderType, targetId }
    )
  );
}

// ============================================================================
// 导出
// ============================================================================

export const orderApi = {
  // 订单
  getList: getOrderList,
  getDetail: getOrderDetail,
  create: createOrder,
  cancel: cancelOrder,
  refund: refundOrder,
  pay: payOrder,
  
  // 购物车
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  
  // 优惠券
  getMyCoupons,
  getAvailableCoupons,
  checkCoupon,
};

export default orderApi;
