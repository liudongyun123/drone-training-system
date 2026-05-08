/**
 * useCheckout - 结算 Hook
 */

import { useState, useCallback } from 'react';
import { orderApi } from '../api/orderApi';
import type { CreateOrderParams, Coupon, Order } from '../types/Order';
import { apiLogger } from '../../../infrastructure/logger/Logger';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseCheckoutResult {
  /** 订单信息 */
  order: Order | null;
  /** 可用优惠券 */
  availableCoupons: Coupon[];
  /** 已选优惠券 */
  selectedCoupon: Coupon | null;
  /** 优惠金额 */
  discountAmount: number;
  /** 应付金额 */
  payAmount: number;
  /** 加载状态 */
  loading: boolean;
  /** 支付加载状态 */
  paying: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 选择优惠券 */
  selectCoupon: (coupon: Coupon | null) => void;
  /** 检查优惠券 */
  checkCoupon: (code: string) => Promise<{ available: boolean; coupon?: Coupon; discount?: number }>;
  /** 创建订单 */
  createOrder: (params: CreateOrderParams) => Promise<Order>;
  /** 发起支付 */
  pay: (orderId: string, paymentMethod: 'wechat' | 'alipay' | 'offline' | 'balance') => Promise<{ paymentParams: any; payUrl?: string }>;
  /** 重置 */
  reset: () => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useCheckout() {
  const [order, setOrder] = useState<Order | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 计算优惠金额
  const discountAmount = selectedCoupon?.value || 0;
  const payAmount = order ? Math.max(0, order.amount - discountAmount) : 0;

  // 选择优惠券
  const selectCoupon = useCallback((coupon: Coupon | null) => {
    setSelectedCoupon(coupon);
  }, []);

  // 检查优惠券
  const checkCoupon = useCallback(
    async (code: string) => {
      if (!order) {
        return { available: false };
      }

      try {
        const response = await orderApi.checkCoupon(
          code,
          order.amount,
          order.type,
          order.targetId
        );

        if (response.code === 0) {
          return response.data;
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[Order] 检查优惠券失败', { code, error: err });
        throw err;
      }
    },
    [order]
  );

  // 获取可用优惠券
  const loadAvailableCoupons = useCallback(
    async (amount: number, type: 'course' | 'class' | 'product', targetId: string) => {
      try {
        setLoading(true);
        const response = await orderApi.getAvailableCoupons(amount, type, targetId);
        
        if (response.code === 0) {
          setAvailableCoupons(response.data);
        }
      } catch (err) {
        apiLogger.error('[Order] 获取可用优惠券失败', { error: err });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 创建订单
  const createOrder = useCallback(
    async (params: CreateOrderParams) => {
      try {
        setLoading(true);
        setError(null);

        // 应用优惠券
        if (selectedCoupon) {
          params.couponCode = selectedCoupon._id;
        }

        const response = await orderApi.create(params);

        if (response.code === 0) {
          const newOrder = response.data;
          setOrder(newOrder);
          
          // 加载可用优惠券
          await loadAvailableCoupons(newOrder.amount, newOrder.type, newOrder.targetId);
          
          return newOrder;
        } else {
          throw new Error(response.message || '创建订单失败');
        }
      } catch (err) {
        setError(err as Error);
        apiLogger.error('[Order] 创建订单失败', { params, error: err });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedCoupon, loadAvailableCoupons]
  );

  // 发起支付
  const pay = useCallback(
    async (orderId: string, paymentMethod: 'wechat' | 'alipay' | 'offline' | 'balance') => {
      try {
        setPaying(true);
        setError(null);

        const response = await orderApi.pay({
          orderId,
          paymentMethod,
        });

        if (response.code === 0) {
          return response.data;
        } else {
          throw new Error(response.message || '发起支付失败');
        }
      } catch (err) {
        setError(err as Error);
        apiLogger.error('[Order] 发起支付失败', { orderId, paymentMethod, error: err });
        throw err;
      } finally {
        setPaying(false);
      }
    },
    []
  );

  // 重置
  const reset = useCallback(() => {
    setOrder(null);
    setAvailableCoupons([]);
    setSelectedCoupon(null);
    setError(null);
  }, []);

  return {
    order,
    availableCoupons,
    selectedCoupon,
    discountAmount,
    payAmount,
    loading,
    paying,
    error,
    selectCoupon,
    checkCoupon,
    createOrder,
    pay,
    reset,
  };
}
