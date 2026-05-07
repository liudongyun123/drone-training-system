// pages/shop/shop.ts
// 商城首页

import { productApi } from '../../utils/api'
import logger from '../../utils/logger'

Page({
  data: {
    categories: [
      { _id: '', name: '全部' },
      { _id: 'drone', name: '无人机' },
      { _id: 'accessory', name: '配件' },
      { _id: 'tool', name: '工具' }
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
      
      let products = await productApi.getList(filters)
      
      // 如果没有真实数据，使用模拟数据
      if (!products || products.length === 0) {
        products = this.getMockProducts()
      }
      
      this.setData({
        products,
        page: 1,
        hasMore: products.length >= 10,
        loading: false
      })
    } catch (err) {
      logger.error('商城', '加载商品失败', err)
      // 使用模拟数据
      this.setData({
        products: this.getMockProducts(),
        loading: false
      })
    }
  },
  
  // 模拟商品数据
  getMockProducts() {
    const mockProducts = [
      {
        _id: 'p1',
        name: '大疆 Mavic 3 无人机',
        price: 9888,
        coverImage: '',
        salesCount: 126,
        stock: 50
      },
      {
        _id: 'p2',
        name: '无人机电池管家',
        price: 299,
        coverImage: '',
        salesCount: 89,
        stock: 100
      },
      {
        _id: 'p3',
        name: '遥控器保护罩',
        price: 128,
        coverImage: '',
        salesCount: 56,
        stock: 200
      },
      {
        _id: 'p4',
        name: 'ND 镜套装',
        price: 199,
        coverImage: '',
        salesCount: 78,
        stock: 80
      },
      {
        _id: 'p5',
        name: '无人机收纳背包',
        price: 459,
        coverImage: '',
        salesCount: 134,
        stock: 30
      },
      {
        _id: 'p6',
        name: '螺旋桨保护架',
        price: 89,
        coverImage: '',
        salesCount: 201,
        stock: 500
      }
    ]
    
    // 根据分类筛选
    if (this.data.currentCategory === 'drone') {
      return mockProducts.filter(p => p._id === 'p1')
    } else if (this.data.currentCategory === 'accessory') {
      return mockProducts.filter(p => ['p2', 'p3', 'p4', 'p6'].includes(p._id))
    } else if (this.data.currentCategory === 'tool') {
      return mockProducts.filter(p => p._id === 'p5')
    }
    
    return mockProducts
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
    const cart = wx.getStorageSync('shop_cart') || []
    
    // 检查是否已存在
    const existIndex = cart.findIndex((item: any) => item._id === product._id)
    
    if (existIndex > -1) {
      cart[existIndex].quantity += 1
    } else {
      cart.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        coverImage: product.coverImage || '',
        stock: product.stock || 99,
        quantity: 1
      })
    }
    
    wx.setStorageSync('shop_cart', cart)
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  },

  goToCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  }
})