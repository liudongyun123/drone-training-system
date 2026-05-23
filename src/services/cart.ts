// ============================================================================
// 购物车服务
// ============================================================================
import { adminService } from '@/services/adminService';
import type { CartItem } from '@/types';

const CART_COLLECTION = 'cart';

/** 辅助：将 adminService.list 的结果转为数组 */
function extractList(result: any): any[] {
  return result?.data?.list || result?.data || [];
}

export const cartService = {
  /**
   * 获取购物车
   */
  async getCart(userId: string): Promise<CartItem[]> {
    const result = await adminService.list(CART_COLLECTION, { userId });
    return extractList(result) as CartItem[];
  },

  /**
   * 添加到购物车
   */
  async addToCart(userId: string, item: Omit<CartItem, '_id' | 'userId'>): Promise<CartItem> {
    // 检查是否已存在
    const existing = extractList(await adminService.list(CART_COLLECTION, { userId, courseId: item.courseId }));

    if (existing.length > 0) {
      return existing[0] as CartItem;
    }

    // 添加到购物车
    const doc = {
      ...item,
      userId,
      createdAt: new Date().toISOString(),
    };

    const addResult = await adminService.add(CART_COLLECTION, doc);
    return { _id: addResult.data?.id || '', ...doc } as CartItem;
  },

  /**
   * 从购物车删除
   */
  async removeFromCart(userId: string, courseId: string): Promise<boolean> {
    const data = extractList(await adminService.list(CART_COLLECTION, { userId, courseId }));

    if (data.length > 0) {
      await adminService.delete(CART_COLLECTION, data[0]._id);
      return true;
    }

    return false;
  },

  /**
   * 清空购物车
   */
  async clearCart(userId: string): Promise<boolean> {
    const data = extractList(await adminService.list(CART_COLLECTION, { userId }));

    for (const item of data) {
      await adminService.delete(CART_COLLECTION, item._id);
    }

    return true;
  },

  /**
   * 更新购物车数量
   */
  async updateQuantity(userId: string, courseId: string, quantity: number): Promise<boolean> {
    const data = extractList(await adminService.list(CART_COLLECTION, { userId, courseId }));

    if (data.length > 0) {
      await adminService.update(CART_COLLECTION, data[0]._id, { quantity, updatedAt: new Date().toISOString() });
      return true;
    }

    return false;
  },
};

export default cartService;
