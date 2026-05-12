// pages/product-detail/product-detail.ts
// 商品详情页

import { productApi } from '../../utils/api'
import logger from '../../utils/logger'

Page({
  data: {
    product: null as any,
    loading: true,
    skuList: [] as any[],
    selectedSku: null as any,
    selectedSpecs: {} as Record<string, string>,
    quantity: 1,
    showSkuPicker: false,
    buyType: 'cart' as 'cart' | 'buy',
    defaultCover: 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
  },

  productId: '',

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '商品详情' })
    this.productId = options.id
    this.loadProduct()
  },

  async loadProduct() {
    try {
      const product = await productApi.getDetail(this.productId)
      
      // 如果商品不存在，显示空状态
      if (!product) {
        this.setData({ product: null, loading: false })
        return
      }
      
      // 适配字段：数据库用 title/name, coverImage/cover
      const adaptedProduct = {
        ...product,
        title: product.title || product.name || '未命名商品',
        coverImage: product.coverImage || product.cover || '',
        price: product.price || 0,
        stock: product.stock || 99,
        specs: product.specs || [],
        skus: product.skus || []
      }
      this.setData({
        product: adaptedProduct,
        loading: false,
        skuList: adaptedProduct.skus || []
      })
    } catch (err) {
      logger.error('商品', '加载商品失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'error' })
    }
  },

  // 直接加入购物车（无规格）
  addToCartDirect() {
    const product = this.data.product
    if (!product) return

    const cart = wx.getStorageSync('cart') || []
    const existIndex = cart.findIndex((item: any) => item.productId === this.productId)

    if (existIndex > -1) {
      cart[existIndex].quantity += 1
    } else {
      cart.push({
        productId: this.productId,
        product: product,
        sku: null,
        specs: {},
        quantity: 1
      })
    }

    wx.setStorageSync('cart', cart)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  // 直接立即购买（无规格）
  buyNowDirect() {
    const product = this.data.product
    if (!product) return

    const orderItem = {
      productId: this.productId,
      product: product,
      sku: null,
      specs: {},
      quantity: 1
    }

    wx.setStorageSync('checkoutItems', [orderItem])
    wx.navigateTo({ url: '/pages/checkout/checkout?type=shop' })
  },

  // 打开 SKU 选择器
  openSkuPicker(e: any) {
    const buyType = e.currentTarget.dataset.type || 'cart'
    this.setData({ showSkuPicker: true, buyType })
  },

  // 关闭 SKU 选择器
  closeSkuPicker() {
    this.setData({ showSkuPicker: false })
  },

  // 选择规格
  selectSpec(e: any) {
    const { specName, specValue } = e.currentTarget.dataset
    const selectedSpecs = { ...this.data.selectedSpecs, [specName]: specValue }
    this.setData({ selectedSpecs })
    this.checkSelectedSku(selectedSpecs)
  },

  // 检查是否已选中完整 SKU
  checkSelectedSku(selectedSpecs: Record<string, string>) {
    const specKeys = Object.keys(selectedSpecs)
    const product = this.data.product
    if (!product || !product.specs) return

    if (specKeys.length === product.specs.length) {
      // 找到匹配的 SKU
      const sku = this.data.skuList.find((s: any) => {
        return product.specs.every((spec: any) => 
          s.specs[spec.name] === selectedSpecs[spec.name]
        )
      })
      this.setData({ selectedSku: sku || null })
    }
  },

  // 数量减少
  decreaseQty() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 })
    }
  },

  // 数量增加
  increaseQty() {
    const stock = this.data.selectedSku?.stock || this.data.product?.stock || 999
    if (this.data.quantity < stock) {
      this.setData({ quantity: this.data.quantity + 1 })
    }
  },

  // 加入购物车
  addToCart() {
    if (!this.data.selectedSku && this.data.skuList.length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }

    const cart = wx.getStorageSync('cart') || []
    const cartItem = {
      productId: this.productId,
      product: this.data.product,
      sku: this.data.selectedSku,
      specs: this.data.selectedSpecs,
      quantity: this.data.quantity
    }

    // 检查是否已在购物车
    const existIndex = cart.findIndex((item: any) => 
      item.productId === this.productId && 
      JSON.stringify(item.specs) === JSON.stringify(this.data.selectedSpecs)
    )

    if (existIndex > -1) {
      cart[existIndex].quantity += this.data.quantity
    } else {
      cart.push(cartItem)
    }

    wx.setStorageSync('cart', cart)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
    this.closeSkuPicker()
  },

  // 立即购买
  buyNow() {
    if (!this.data.selectedSku && this.data.skuList.length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }

    const orderItem = {
      productId: this.productId,
      product: this.data.product,
      sku: this.data.selectedSku,
      specs: this.data.selectedSpecs,
      quantity: this.data.quantity
    }

    wx.setStorageSync('checkoutItems', [orderItem])
    wx.navigateTo({ url: '/pages/checkout/checkout?type=shop' })
    this.closeSkuPicker()
  },

  // 确认操作
  confirmAction() {
    if (this.data.buyType === 'cart') {
      this.addToCart()
    } else {
      this.buyNow()
    }
  },

  // 预览图片
  previewImage(e: any) {
    const urls = this.data.product?.images || []
    const current = e.currentTarget.dataset.src
    wx.previewImage({ urls, current })
  },

  // 去购物车
  goToCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  }
})