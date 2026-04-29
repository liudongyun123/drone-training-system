// pages/product-detail/product-detail.ts
// 商品详情页

import { productApi } from '../../utils/api'
import { checkLogin, showToast } from '../../utils/util'

Page({
  data: {
    productId: '',
    product: null as any,
    quantity: 1,
    loading: true
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ productId: options.id })
      this.loadProduct(options.id)
    }
  },

  async loadProduct(productId: string) {
    this.setData({ loading: true })
    try {
      const product = await productApi.getDetail(productId)
      this.setData({ product, loading: false })
    } catch (err) {
      console.error('加载商品失败:', err)
      this.setData({ loading: false })
      showToast('加载商品失败')
    }
  },

  // 减少数量
  decreaseQuantity() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },

  // 增加数量
  increaseQuantity() {
    const maxStock = this.data.product?.stock || 99
    if (this.data.quantity < maxStock) {
      this.setData({ quantity: this.data.quantity + 1 })
    }
  },

  // 加入购物车
  addToCart() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    const cart = wx.getStorageSync('cart') || []
    const existItem = cart.find((item: any) => item.productId === this.data.productId)
    
    if (existItem) {
      existItem.quantity += this.data.quantity
    } else {
      cart.push({
        productId: this.data.productId,
        productName: this.data.product.name,
        productImage: this.data.product.coverImage,
        price: this.data.product.price,
        quantity: this.data.quantity
      })
    }
    
    wx.setStorageSync('cart', cart)
    showToast('已加入购物车', 'success')
  },

  // 立即购买
  buyNow() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    wx.navigateTo({
      url: `/pages/checkout/checkout?type=product&id=${this.data.productId}&quantity=${this.data.quantity}`
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.product?.name || '无人机配件',
      path: `/pages/product-detail/product-detail?id=${this.data.productId}`
    }
  }
})