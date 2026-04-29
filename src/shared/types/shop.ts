// ============================================================================
// 商城类型定义 - 共用层
// ============================================================================

/**
 * 商品分类
 */
export interface ProductCategory {
  _id: string
  name: string
  parentId?: string        // 支持多级分类
  sort: number
  icon?: string
  createdAt: string
}

/**
 * 商品规格
 */
export interface ProductSpec {
  name: string             // 规格名（如"颜色"）
  options: string[]        // 选项（如["白色", "灰色"]）
}

/**
 * 商品 SKU
 */
export interface ProductSKU {
  _id: string
  productId: string
  specs: Record<string, string>  // 规格组合 {"颜色": "白色", "型号": "标准版"}
  price: number
  stock: number
  skuCode: string          // SKU编码
}

/**
 * 商品
 */
export interface Product {
  _id: string
  name: string
  description: string
  coverImage: string
  images: string[]
  categoryId: string
  
  // 价格库存
  price: number            // 基础价格
  originalPrice?: number   // 原价
  costPrice?: number       // 成本价（管理员可见）
  stock: number            // 总库存
  salesCount: number       // 销量
  
  // 规格
  specList: ProductSpec[]  // 规格列表
  skuList?: ProductSKU[]   // SKU列表
  
  // 状态
  status: 'draft' | 'onsale' | 'offsale'
  isFeatured?: boolean     // 是否推荐
  
  createdAt: string
  updatedAt: string
}

/**
 * 购物车商品项
 */
export interface CartProductItem {
  productId: string
  productName: string
  coverImage: string
  price: number
  quantity: number
  skuId?: string           // 如果有规格
  specs?: Record<string, string>
}

/**
 * 收货地址
 */
export interface ShippingAddress {
  name: string             // 收货人姓名
  phone: string            // 手机号
  province: string         // 省份
  city: string             // 城市
  district: string         // 区县
  detail: string           // 详细地址
  isDefault?: boolean      // 是否默认地址
}

/**
 * 物流信息
 */
export interface ShippingInfo {
  company: string          // 快递公司
  trackingNumber: string   // 快递单号
  shippedAt?: string       // 发货时间
  deliveredAt?: string     // 签收时间
  status: 'pending' | 'shipped' | 'delivered'
}

// ========== 工具函数 ==========

/**
 * 获取商品状态显示文本
 */
export function getProductStatusText(status: Product['status']): string {
  const map: Record<Product['status'], string> = {
    draft: '草稿',
    onsale: '在售',
    offsale: '下架'
  }
  return map[status] || status
}

/**
 * 计算商品折扣
 */
export function getProductDiscount(product: Product): {
  discount: number
  hasDiscount: boolean
  discountText: string
} {
  const current = product.price
  const original = product.originalPrice || product.price
  const hasDiscount = original > current
  const discount = hasDiscount ? Math.round((1 - current / original) * 100) : 0
  const discountText = hasDiscount ? `${discount}% OFF` : ''
  
  return { discount, hasDiscount, discountText }
}