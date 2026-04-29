// ============================================================================
// 商城 API - 共用层
// ============================================================================

import { app } from '@/utils/cloudbase'
import type { Product, ProductCategory, CartProductItem, ShippingAddress } from '@/shared/types/shop'
import type { UnifiedOrder } from '@/shared/types/unifiedOrder'

const db = app.database()
const _ = db.command

/**
 * 商品 API
 */
export const productApi = {
  /**
   * 获取商品列表
   */
  async getList(filters: {
    categoryId?: string
    status?: Product['status']
    keyword?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ products: Product[], total: number }> {
    const { categoryId, status = 'onsale', keyword, page = 1, pageSize = 10 } = filters
    
    const where: any = { status }
    if (categoryId) where.categoryId = categoryId
    if (keyword) {
      where.name = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }
    
    const countResult = await db.collection('products').where(where).count()
    const total = countResult.total
    
    const skip = (page - 1) * pageSize
    const result = await db.collection('products')
      .where(where)
      .orderBy('salesCount', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    return {
      products: result.data as Product[],
      total
    }
  },

  /**
   * 获取商品详情
   */
  async getDetail(productId: string): Promise<Product | null> {
    const result = await db.collection('products').doc(productId).get()
    return result.data as Product || null
  },

  /**
   * 获取推荐商品
   */
  async getFeatured(limit: number = 6): Promise<Product[]> {
    const result = await db.collection('products')
      .where({ status: 'onsale', isFeatured: true })
      .orderBy('salesCount', 'desc')
      .limit(limit)
      .get()
    
    return result.data as Product[]
  },

  /**
   * 更新商品库存
   */
  async updateStock(productId: string, delta: number): Promise<void> {
    await db.collection('products').doc(productId).update({
      stock: _.inc(delta),
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * 更新商品销量
   */
  async updateSales(productId: string, delta: number): Promise<void> {
    await db.collection('products').doc(productId).update({
      salesCount: _.inc(delta),
      updatedAt: new Date().toISOString()
    })
  }
}

/**
 * 商品分类 API
 */
export const categoryApi = {
  /**
   * 获取分类列表
   */
  async getList(): Promise<ProductCategory[]> {
    const result = await db.collection('product_categories')
      .orderBy('sort', 'asc')
      .get()
    
    return result.data as ProductCategory[]
  },

  /**
   * 获取分类详情
   */
  async getDetail(categoryId: string): Promise<ProductCategory | null> {
    const result = await db.collection('product_categories').doc(categoryId).get()
    return result.data as ProductCategory || null
  }
}

/**
 * 商城订单 API（创建商城订单）
 */
export const shopOrderApi = {
  /**
   * 创建商城订单
   */
  async create(params: {
    userId: string
    phone: string
    items: CartProductItem[]
    shippingAddress: ShippingAddress
  }): Promise<UnifiedOrder> {
    const orderNo = `SHP${Date.now()}`
    
    const totalAmount = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    const order: Omit<UnifiedOrder, '_id'> = {
      orderNo,
      userId: params.userId,
      phone: params.phone,
      orderType: 'shop',  // 🔑 商城订单
      shopItems: params.items,
      shippingAddress: params.shippingAddress,
      totalAmount,
      discountAmount: 0,
      finalAmount: totalAmount,
      paymentMethod: 'wechat',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const result = await db.collection('orders').add(order)
    
    return {
      _id: result.id || result.insertedId as string,
      ...order
    } as UnifiedOrder
  },

  /**
   * 确认支付（支付成功后调用）
   */
  async confirmPayment(orderId: string, wxTransactionId: string): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      status: 'paid',
      wxTransactionId,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    
    // 更新商品库存和销量
    const order = await db.collection('orders').doc(orderId).get()
    if (order.data) {
      const orderData = order.data as UnifiedOrder
      if (orderData.shopItems) {
        for (const item of orderData.shopItems) {
          await productApi.updateStock(item.productId, -item.quantity)
          await productApi.updateSales(item.productId, item.quantity)
        }
      }
    }
  },

  /**
   * 发货
   */
  async shipOrder(orderId: string, params: {
    company: string
    trackingNumber: string
  }): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      status: 'shipped',
      shippingInfo: {
        company: params.company,
        trackingNumber: params.trackingNumber,
        shippedAt: new Date().toISOString(),
        status: 'shipped'
      },
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * 确认签收
   */
  async confirmDelivery(orderId: string): Promise<void> {
    await db.collection('orders').doc(orderId).update({
      status: 'delivered',
      'shippingInfo.status': 'delivered',
      'shippingInfo.deliveredAt': new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}