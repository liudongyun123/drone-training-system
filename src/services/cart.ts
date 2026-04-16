// ============================================================================
// 购物车服务
// ============================================================================
import { app } from '@/utils/cloudbase';
import type { CartItem } from '@/types';

const CART_COLLECTION = 'cart';

export const cartService = {
  /**
   * 获取购物车
   */
  async getCart(userId: string): Promise<CartItem[]> {
    const db = app.database();
    const { data } = await db.collection(CART_COLLECTION).where({ userId }).get();
    return data as CartItem[];
  },

  /**
   * 添加到购物车
   */
  async addToCart(userId: string, item: Omit<CartItem, '_id' | 'userId'>): Promise<CartItem> {
    const db = app.database();

    // 检查是否已存在
    const { data: existing } = await db
      .collection(CART_COLLECTION)
      .where({ userId, courseId: item.courseId })
      .get();

    if (existing.length > 0) {
      return existing[0] as CartItem;
    }

    // 添加到购物车
    const doc = {
      ...item,
      userId,
      createdAt: new Date().toISOString(),
    };

    const { data: result } = await db.collection(CART_COLLECTION).add(doc);
    return { _id: result.id, ...doc } as CartItem;
  },

  /**
   * 从购物车删除
   */
  async removeFromCart(userId: string, courseId: string): Promise<boolean> {
    const db = app.database();

    const { data } = await db
      .collection(CART_COLLECTION)
      .where({ userId, courseId })
      .get();

    if (data.length > 0) {
      await db.collection(CART_COLLECTION).doc(data[0]._id).remove();
      return true;
    }

    return false;
  },

  /**
   * 清空购物车
   */
  async clearCart(userId: string): Promise<boolean> {
    const db = app.database();

    const { data } = await db.collection(CART_COLLECTION).where({ userId }).get();

    for (const item of data) {
      await db.collection(CART_COLLECTION).doc(item._id).remove();
    }

    return true;
  },

  /**
   * 更新购物车数量
   */
  async updateQuantity(userId: string, courseId: string, quantity: number): Promise<boolean> {
    const db = app.database();

    const { data } = await db
      .collection(CART_COLLECTION)
      .where({ userId, courseId })
      .get();

    if (data.length > 0) {
      await db
        .collection(CART_COLLECTION)
        .doc(data[0]._id)
        .update({ quantity, updatedAt: new Date().toISOString() });
      return true;
    }

    return false;
  },
};

export default cartService;
