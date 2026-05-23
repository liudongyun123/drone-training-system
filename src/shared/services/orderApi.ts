// ============================================================================
// 订单 API - 共用层（统一通过 adminService HTTP）
// ============================================================================

import { adminService } from '@/services/adminService'
import type { Order, OrderItem, OrderStatus, PaymentMethod } from '@/shared/types/order'
import type { CartItem } from '@/types'

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractSingle(result: any): any | null {
  if (!result) return null;
  if (result.data && !Array.isArray(result.data) && typeof result.data === 'object') return result.data;
  if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
  return result.data || null;
}

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
      paymentMethod: (params.paymentMethod as PaymentMethod) || 'wechat',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await adminService.add('orders', order)
    
    return {
      _id: result.data?.id || '',
      ...order
    } as Order
  },

  /**
   * 获取用户订单列表
   */
  async getByUserId(userId: string): Promise<Order[]> {
    const result = await adminService.list('orders', { userId }, { orderBy: 'createdAt', order: 'desc', limit: 100 })
    return extractList(result) as Order[]
  },

  /**
   * 获取订单详情
   */
  async getById(orderId: string): Promise<Order | null> {
    return extractSingle(await adminService.get('orders', orderId)) as Order || null
  },

  /**
   * 更新订单状态
   */
  async updateStatus(orderId: string, status: OrderStatus, extra?: Partial<Order>): Promise<void> {
    await adminService.update('orders', orderId, {
      status,
      updatedAt: new Date().toISOString(),
      ...extra
    })
  }
}
