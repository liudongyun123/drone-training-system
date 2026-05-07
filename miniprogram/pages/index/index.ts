// pages/index/index.ts
// 小程序首页

import { courseApi, classApi, productApi, bannerApi } from '../../utils/api'
import logger from '../../utils/logger'

// 培训班等级映射
const CLASS_LEVEL_MAP: Record<string, string> = {
  '入门班': '入门班', '基础班': '基础班', '进阶班': '进阶班', '高级班': '高级班', '考证班': '考证班'
}

interface IndexData {
  hotCourses: any[]
  enrollingClasses: any[]
  featuredProducts: any[]
  heroBanners: any[]
  learningPaths: any[]  // 学习路径分类
  loading: boolean
}

Page<IndexData>({
  data: {
    hotCourses: [],
    enrollingClasses: [],
    featuredProducts: [],
    heroBanners: [],
    learningPaths: [],
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
      // 并行加载五个模块数据
      const [courses, classes, products, banners, categories] = await Promise.all([
        courseApi.getHotCourses(6),
        classApi.getList({ status: 'enrolling' }),
        productApi.getList({ pageSize: 6 }),
        bannerApi.getList(10),
        courseApi.getCategories()
      ])

      // 处理培训班等级显示
      const processedClasses = (classes || []).map((cls: any) => ({
        ...cls,
        levelText: cls.level || CLASS_LEVEL_MAP[cls.name] || '入门班'
      }))

      this.setData({
        hotCourses: courses,
        enrollingClasses: processedClasses,
        featuredProducts: products,
        heroBanners: banners,
        learningPaths: categories || [],
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

  // 跳转学习路径详情页
  goToPath(e: any) {
    const path = e.currentTarget.dataset.path || {}
    const categoryId = path._id || ''
    const categoryName = path.name || ''
    wx.navigateTo({
      url: `/pages/learning-path/learning-path?id=${categoryId}&name=${encodeURIComponent(categoryName)}`
    })
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