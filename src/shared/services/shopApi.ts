// ============================================================================
// 商城 API - 共用层（统一通过 adminService HTTP）
// ============================================================================

import { adminService } from '@/services/adminService'
import type { Product, ProductCategory, CartProductItem, ShippingAddress } from '@/shared/types/shop'
import type { UnifiedOrder } from '@/shared/types/unifiedOrder'

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
    const { categoryId, status = 'active', keyword, page = 1, pageSize = 10 } = filters
    
    const where: Record<string, any> = { status }
    if (categoryId) where.categoryId = categoryId
    if (keyword) {
      where.name = { '$regex': keyword }
    }
    
    // 带操作符的查询（$regex）
    const hasOperators = keyword !== undefined
    const listResult = hasOperators
      ? await adminService.listWithOps('products', where, { orderBy: 'salesCount', order: 'desc', page, pageSize })
      : await adminService.list('products', where, { orderBy: 'salesCount', order: 'desc', page, pageSize })
    
    const products = extractList(listResult) as Product[]
    const total = listResult?.data?.total || products.length
    
    return { products, total }
  },

  /**
   * 获取商品详情
   */
  async getDetail(productId: string): Promise<Product | null> {
    return extractSingle(await adminService.get('products', productId)) as Product || null
  },

  /**
   * 获取推荐商品
   */
  async getFeatured(limit: number = 6): Promise<Product[]> {
    const result = await adminService.list('products', { status: 'active', isFeatured: true }, { orderBy: 'salesCount', order: 'desc', limit })
    return extractList(result) as Product[]
  },

  /**
   * 更新商品库存（使用 $inc 操作符）
   */
  async updateStock(productId: string, delta: number): Promise<void> {
    await adminService.updateWithOps('products', productId, {
      $inc: { stock: delta } as any,
      updatedAt: new Date().toISOString()
    } as any)
  },

  /**
   * 更新商品销量（使用 $inc 操作符）
   */
  async updateSales(productId: string, delta: number): Promise<void> {
    await adminService.updateWithOps('products', productId, {
      $inc: { salesCount: delta } as any,
      updatedAt: new Date().toISOString()
    } as any)
  },

  /**
   * 创建商品（后台）
   */
  async create(data: Omit<Product, '_id' | 'createdAt' | 'updatedAt' | 'salesCount'>): Promise<Product> {
    const product = {
      ...data,
      salesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const result = await adminService.add('products', product)
    return {
      _id: result.data?.id || '',
      ...product
    } as Product
  },

  /**
   * 更新商品（后台）
   */
  async update(productId: string, data: Partial<Product>): Promise<void> {
    await adminService.update('products', productId, {
      ...data,
      updatedAt: new Date().toISOString()
    })
  },

  /**
   * 删除商品（后台）
   */
  async delete(productId: string): Promise<void> {
    await adminService.delete('products', productId)
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
    const result = await adminService.list('product_categories', {}, { orderBy: 'sort', order: 'asc', limit: 100 })
    return extractList(result) as ProductCategory[]
  },

  /**
   * 获取分类详情
   */
  async getDetail(categoryId: string): Promise<ProductCategory | null> {
    return extractSingle(await adminService.get('product_categories', categoryId)) as ProductCategory || null
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
      orderType: 'shop',
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
    
    const result = await adminService.add('orders', order)
    
    return {
      _id: result.data?.id || '',
      ...order
    } as UnifiedOrder
  },

  /**
   * 确认支付（支付成功后调用）
   */
  async confirmPayment(orderId: string, wxTransactionId: string): Promise<void> {
    await adminService.update('orders', orderId, {
      status: 'paid',
      wxTransactionId,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    
    // 更新商品库存和销量
    const order = await adminService.get('orders', orderId)
    const orderData = extractSingle(order) as UnifiedOrder
    if (orderData && orderData.shopItems) {
      for (const item of orderData.shopItems) {
        await productApi.updateStock(item.productId, -item.quantity)
        await productApi.updateSales(item.productId, item.quantity)
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
    await adminService.update('orders', orderId, {
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
    await adminService.update('orders', orderId, {
      status: 'delivered',
      'shippingInfo.status': 'delivered',
      'shippingInfo.deliveredAt': new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}
