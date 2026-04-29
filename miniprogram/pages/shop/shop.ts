// pages/shop/shop.ts
// 商城首页

import { productApi } from '../../utils/api'

Page({
  data: {
    categories: [] as any[],
    currentCategory: '',
    products: [] as any[],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadCategories()
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
      console.error('加载分类失败:', err)
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
      console.error('加载商品失败:', err)
      this.setData({ loading: false })
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
      console.error('加载更多失败:', err)
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

  goToCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  }
})