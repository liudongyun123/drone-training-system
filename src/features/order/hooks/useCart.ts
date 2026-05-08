/**
 * useCart - 购物车 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '../api/orderApi';
import type { Cart, CartItem } from '../types/Order';
import { apiLogger } from '../../../infrastructure/logger/Logger';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseCartResult {
  /** 购物车 */
  cart: Cart | null;
  /** 商品列表 */
  items: CartItem[];
  /** 总数量 */
  totalCount: number;
  /** 总金额 */
  totalAmount: number;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 是否为空 */
  isEmpty: boolean;
  /** 刷新 */
  refresh: () => Promise<void>;
  /** 添加到购物车 */
  addItem: (type: 'course' | 'class' | 'product', targetId: string) => Promise<void>;
  /** 移除商品 */
  removeItem: (cartItemId: string) => Promise<void>;
  /** 清空购物车 */
  clear: () => Promise<void>;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useCart(): UseCartResult {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载购物车
  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await orderApi.getCart();

      if (response.code === 0) {
        setCart(response.data);
      } else {
        throw new Error(response.message || '获取购物车失败');
      }
    } catch (err) {
      setError(err as Error);
      apiLogger.error('[Order] 获取购物车失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // 刷新
  const refresh = useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  // 添加到购物车
  const addItem = useCallback(
    async (type: 'course' | 'class' | 'product', targetId: string) => {
      try {
        const response = await orderApi.addToCart(type, targetId);
        
        if (response.code === 0) {
          setCart(response.data);
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[Order] 添加到购物车失败', { type, targetId, error: err });
        throw err;
      }
    },
    []
  );

  // 移除商品
  const removeItem = useCallback(
    async (cartItemId: string) => {
      try {
        await orderApi.removeFromCart(cartItemId);
        await loadCart(); // 刷新购物车
      } catch (err) {
        apiLogger.error('[Order] 从购物车移除失败', { cartItemId, error: err });
        throw err;
      }
    },
    [loadCart]
  );

  // 清空购物车
  const clear = useCallback(async () => {
    try {
      await orderApi.clearCart();
      setCart(null);
    } catch (err) {
      apiLogger.error('[Order] 清空购物车失败', { error: err });
      throw err;
    }
  }, []);

  return {
    cart,
    items: cart?.items || [],
    totalCount: cart?.totalCount || 0,
    totalAmount: cart?.totalAmount || 0,
    loading,
    error,
    isEmpty: !cart || cart.items.length === 0,
    refresh,
    addItem,
    removeItem,
    clear,
  };
}
