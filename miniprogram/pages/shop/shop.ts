// pages/shop/shop.ts
// 商城首页

import { productApi } from '../../utils/api'
import logger from '../../utils/logger'

Page({
  data: {
    categories: [
      { _id: '', name: '全部' },
      { _id: 'drone', name: '无人机' },
      { _id: 'battery', name: '电池' },
      { _id: 'propeller', name: '桨叶' }
    ] as any[],
    currentCategory: '',
    products: [] as any[],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '商城' })
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, products: [] })
    this.loadProducts().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  async loadCategories() {
    try {
      const categories = await productApi.getCategories()
      this.setData({ categories: [{ _id: '', name: '全部' }, ...categories] })
    } catch (err) {
      logger.error('商城', '加载分类失败', err)
    }
  },

  async loadProducts() {
    this.setData({ loading: true })
    try {
      const filters: any = { page: 1, pageSize: 10 }
      if (this.data.currentCategory) {
        filters.categoryId = this.data.currentCategory
      }

      const products = await productApi.getList(filters)

      this.setData({
        products,
        page: 1,
        hasMore: products.length >= 10,
        loading: false
      })
    } catch (err) {
      logger.error('商城', '加载商品失败', err)
      this.setData({
        products: [],
        loading: false
      })
    }
  },

  async loadMore() {
    const nextPage = this.data.page + 1
    try {
      const filters: any = { page: nextPage, pageSize: 10 }
      if (this.data.currentCategory) {
        filters.categoryId = this.data.currentCategory
      }
      
      const newProducts = await productApi.getList(filters)
      this.setData({
        products: [...this.data.products, ...newProducts],
        page: nextPage,
        hasMore: newProducts.length >= 10
      })
    } catch (err) {
      logger.error('商城', '加载更多失败', err)
    }
  },

  switchCategory(e: any) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({ currentCategory: categoryId })
    this.loadProducts()
  },

  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
  },

  // 加入购物车
  addToCart(e: any) {
    const product = e.currentTarget.dataset.product
    
    if (!product) return
    
    // 获取购物车
    const cart = wx.getStorageSync('cart') || []
    
    // 检查是否已存在
    const existIndex = cart.findIndex((item: any) => item._id === product._id)
    
    if (existIndex > -1) {
      cart[existIndex].quantity += 1
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        coverImage: product.coverImage || product.cover || '',
        stock: product.stock || 99,
        quantity: 1
      })
    }
    
    wx.setStorageSync('cart', cart)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  goToCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  }
})