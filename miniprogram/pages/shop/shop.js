// pages/shop/shop.js
// 商城首页

const { productApi, cartApi } = require('../../utils/api')

Page({
  data: {
    // 搜索相关
    searchKeyword: '',
    showSearch: false,
    
    // 分类相关
    categories: [],
    selectedCategoryId: '',
    
    // 商品列表
    products: [],
    loading: false,
    page: 1,
    pageSize: 20,
    hasMore: true,
    
    // 购物车
    cartCount: 0
  },

  onLoad(options) {
    // 加载分类和商品
    this.loadCategories()
    this.loadProducts()
  },

  onShow() {
    // 更新购物车数量
    this.updateCartCount()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, products: [], hasMore: true })
    Promise.all([
      this.loadCategories(),
      this.loadProducts()
    ]).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreProducts()
    }
  },

  // 加载分类
  async loadCategories() {
    try {
      const categories = await productApi.getCategories()
      this.setData({ categories })
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  },

  // 加载商品列表
  async loadProducts() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const filters = {
        status: 'onsale',
        page: 1,
        pageSize: this.data.pageSize
      }
      
      if (this.data.selectedCategoryId) {
        filters.categoryId = this.data.selectedCategoryId
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      const products = await productApi.getList(filters)
      
      this.setData({
        products: products || [],
        page: 1,
        hasMore: (products || []).length >= this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载商品失败:', err)
      this.setData({ loading: false })
    }
  },

  // 加载更多商品
  async loadMoreProducts() {
    if (!this.data.hasMore || this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const nextPage = this.data.page + 1
      const filters = {
        status: 'onsale',
        page: nextPage,
        pageSize: this.data.pageSize
      }
      
      if (this.data.selectedCategoryId) {
        filters.categoryId = this.data.selectedCategoryId
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      const products = await productApi.getList(filters)
      const currentProducts = this.data.products
      
      this.setData({
        products: [...currentProducts, ...(products || [])],
        page: nextPage,
        hasMore: (products || []).length >= this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载更多商品失败:', err)
      this.setData({ loading: false })
    }
  },

  // 切换分类
  onSelectCategory(e) {
    const categoryId = e.currentTarget.dataset.id || ''
    this.setData({
      selectedCategoryId: categoryId,
      page: 1,
      products: [],
      hasMore: true
    })
    this.loadProducts()
  },

  // 搜索
  onSearch(e) {
    const keyword = e.detail.value || ''
    this.setData({
      searchKeyword: keyword,
      page: 1,
      products: [],
      hasMore: true
    })
    this.loadProducts()
  },

  // 清除搜索
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      showSearch: false,
      page: 1,
      products: [],
      hasMore: true
    })
    this.loadProducts()
  },

  // 显示搜索框
  onShowSearch() {
    this.setData({ showSearch: true })
  },

  // 隐藏搜索框
  onHideSearch() {
    if (!this.data.searchKeyword) {
      this.setData({ showSearch: false })
    }
  },

  // 添加到购物车
  onAddToCart(e) {
    const product = e.currentTarget.dataset.product
    
    // 检查库存
    if (product.stock <= 0) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }
    
    try {
      cartApi.addToCart(product, 1)
      this.updateCartCount()
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (err) {
      console.error('加入购物车失败:', err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  },

  // 更新购物车数量
  updateCartCount() {
    const count = cartApi.getCartCount()
    this.setData({ cartCount: count })
  },

  // 跳转商品详情
  onGoToDetail(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  // 跳转购物车
  onGoToCart() {
    wx.switchTab({
      url: '/pages/cart/cart'
    })
  }
})
