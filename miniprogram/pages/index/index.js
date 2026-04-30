// pages/index/index.js
// 首页

const { courseApi, classApi, productApi } = require('../../utils/api')

Page({
  data: {
    // 加载状态
    loading: true,
    
    // 热门课程
    hotCourses: [],
    
    // 报名中的培训班
    enrollingClasses: [],
    
    // 推荐商品
    featuredProducts: []
  },

  onLoad(options) {
    // 检查是否需要登录
    this.checkLogin()
  },

  onShow() {
    // 每次显示刷新数据
    this.loadData()
  },

  // 检查登录状态
  checkLogin() {
    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')
    
    if (!userId && !openid) {
      // 未登录，跳转到登录页
      // 可以在这里显示登录引导
      console.log('未登录状态')
    }
  },

  // 加载首页数据
  async loadData() {
    this.setData({ loading: true })
    
    try {
      const promises = [
        courseApi.getHotCourses(4),
        classApi.getList({ status: 'enrolling', pageSize: 3 }),
        productApi.getFeatured(4)
      ]
      
      const [courses, classes, products] = await Promise.all(promises)
      
      this.setData({
        loading: false,
        hotCourses: courses || [],
        enrollingClasses: classes || [],
        featuredProducts: products || []
      })
    } catch (err) {
      console.error('加载首页数据失败:', err)
      this.setData({ loading: false })
      
      // 即使失败也尝试加载热门课程
      this.loadFallbackData()
    }
  },

  // 备用数据加载
  async loadFallbackData() {
    try {
      const courses = await courseApi.getList({ status: 'published', pageSize: 4 })
      this.setData({ hotCourses: courses || [] })
    } catch (err) {
      console.error('备用数据加载失败:', err)
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 页面相关处理函数
  goToSearch() {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    })
  },

  goToCourseList() {
    wx.switchTab({
      url: '/pages/course-list/course-list'
    })
  },

  goToPath(e) {
    const category = e.currentTarget.dataset.category
    // 保存分类到 storage，课程列表页面 onShow 时读取
    wx.setStorageSync('targetCategory', category)
    wx.switchTab({
      url: '/pages/course-list/course-list'
    })
  },

  goToCourse(e) {
    const courseId = e.currentTarget.dataset.id
    if (courseId) {
      wx.navigateTo({
        url: `/pages/course-detail/course-detail?id=${courseId}`
      })
    }
  },

  goToClassList() {
    wx.switchTab({
      url: '/pages/class-list/class-list'
    })
  },

  goToClass(e) {
    const classId = e.currentTarget.dataset.id
    if (classId) {
      wx.navigateTo({
        url: `/pages/class-detail/class-detail?id=${classId}`
      })
    }
  },

  goToShop() {
    wx.switchTab({
      url: '/pages/shop/shop'
    })
  },

  goToProduct(e) {
    const productId = e.currentTarget.dataset.id
    if (productId) {
      wx.navigateTo({
        url: `/pages/product-detail/product-detail?id=${productId}`
      })
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '无人机培训 - 专业飞行执照培训',
      path: '/pages/index/index'
    }
  }
})
