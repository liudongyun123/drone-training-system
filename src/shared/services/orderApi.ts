// ============================================================================
// 订单 API - 共用层
// ============================================================================

import { app } from '@/utils/cloudbase'
import type { Order, OrderItem, OrderStatus } from '@/shared/types/order'
import type { CartItem } from '@/types'

const db = app.database()

export const orderApi = {
  /**
   * 创建订单
   */
  async create(params: {
    userId: string
    phone?: string
    items: CartItem[]
    couponId?: string
    paymentMethod?: string
  }): Promise<Order> {
    const orderNo = `ORD${Date.now()}`
    
    const totalAmount = params.items.reduce((sum, item) => sum + item.price, 0)
    
    const orderItems: OrderItem[] = params.items.map(item => ({
      courseId: item.courseId,
      title: item.courseTitle,
      thumbnail: item.coverImage,
      price: item.price,
      quantity: 1
    }))

    const order: Omit<Order, '_id'> = {
      orderNo,
      userId: params.userId,
      phone: params.phone,
      items: orderItems,
      totalAmount,
      discountAmount: 0,
      finalAmount: totalAmount,
      paymentMethod: (params.paymentMethod as any) || 'wechat',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await db.collection('orders').add(order)
    
    return {
      _id: result.id || result.insertedId as string,
      ...order
    } as Order
  },

  /**
   * 获取用户订单列表
   */
  async getByUserId(userId: string): Promise<Order[]> {
    const result = await db.collection('orders')
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data as Order[]
  },

  /**
   * 获取订单详情
   */
  async getById(orderId: string): Promise<Order | null> {
    const result = await db.collection('orders').doc(orderId).get()
    return result.data as Order || null
  },

  /**
   * 更新订单状态
   */
  async updateStatus(orderId: string, status: OrderStatus, extra?: Partial<Order>): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      status,
      updatedAt: new Date().toISOString(),
      ...extra
    })
  }
}