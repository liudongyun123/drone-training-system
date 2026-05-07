// pages/index/index.ts
// 小程序首页

import { courseApi, classApi, productApi, bannerApi } from '../../utils/api'
import logger from '../../utils/logger'

interface IndexData {
  hotCourses: any[]
  enrollingClasses: any[]
  featuredProducts: any[]
  heroBanners: any[]
  loading: boolean
}

Page<IndexData>({
  data: {
    hotCourses: [],
    enrollingClasses: [],
    featuredProducts: [],
    heroBanners: [],
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData() {
    this.setData({ loading: true })
    
    try {
      // 并行加载四个模块数据
      const [courses, classes, products, banners] = await Promise.all([
        courseApi.getHotCourses(6),
        classApi.getList({ status: 'enrolling' }),
        productApi.getList({ pageSize: 6 }),
        bannerApi.getList(10)
      ])
      
      this.setData({
        hotCourses: courses,
        enrollingClasses: classes,
        featuredProducts: products,
        heroBanners: banners,
        loading: false
      })
    } catch (err) {
      logger.error('首页', '加载首页数据失败', err)
      this.setData({ loading: false })
    }
  },

  // 轮播图点击
  onBannerTap(e: any) {
    const banner = e.currentTarget.dataset.banner
    if (banner.courseId) {
      wx.navigateTo({
        url: `/pages/course-detail/course-detail?id=${banner.courseId}`
      })
    } else if (banner.link) {
      // 如果是外部链接，复制到剪贴板
      if (banner.link.startsWith('http')) {
        wx.setClipboardData({
          data: banner.link,
          success: () => {
            wx.showToast({ title: '链接已复制', icon: 'success' })
          }
        })
      }
    }
  },

  // 跳转课程详情
  goToCourse(e: any) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/course-detail/course-detail?id=${courseId}`
    })
  },

  // 跳转课程列表
  goToCourseList() {
    wx.switchTab({ url: '/pages/course-list/course-list' })
  },

  // 跳转学习路径
  goToPath(e: any) {
    const category = e.currentTarget.dataset.category || ''
    // 保存分类到 storage，课程列表页面 onShow 时读取
    wx.setStorageSync('targetCategory', category)
    wx.switchTab({ url: '/pages/course-list/course-list' })
  },

  // 跳转培训班列表
  goToClassList() {
    wx.switchTab({ url: '/pages/class-list/class-list' })
  },

  // 跳转商品详情
  goToProduct(e: any) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  // 跳转商城
  goToShop() {
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  // 跳转培训班详情
  goToClass(e: any) {
    const classId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/class-detail/class-detail?id=${classId}`
    })
  },

  onShareAppMessage() {
    return {
      title: '无人机培训',
      path: '/pages/index/index'
    }
  }
})