// pages/index/index.ts
// 小程序首页

import { courseApi, classApi, productApi, bannerApi, systemConfigApi } from '../../utils/api'
import logger from '../../utils/logger'

// 体系配置映射 - 用于获取体系 ID
const SOURCE_CONFIG = {
  RENSHE: { id: 'RENSHE', name: '人社培训' },
  CAAC: { id: 'CAAC', name: 'CAAC培训' },
} as const

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
  currentSource: string  // 当前体系
  sourceList: Array<{ key: string; name: string; icon: string }>
  loading: boolean
}

Page<IndexData>({
  data: {
    hotCourses: [],
    enrollingClasses: [],
    featuredProducts: [],
    heroBanners: [],
    learningPaths: [],
    currentSource: 'RENSHE',
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️' }
    ],
    loading: true
  },

  onLoad() {
    this.loadSources()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载体系配置
  async loadSources() {
    try {
      const sources = await systemConfigApi.getSources()
      if (sources && sources.length > 0) {
        const sourceList = sources.map((s: any) => ({
          key: s.code,
          name: s.name,
          icon: s.icon || '📚'
        }))
        this.setData({
          sourceList,
          currentSource: sources[0].code || 'RENSHE'
        })
      }
    } catch (err) {
      logger.error('首页', '加载体系配置失败', err)
    }
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })

    try {
      // 按当前体系过滤分类
      const currentSource = this.data.currentSource
      
      // 并行加载数据
      const [courses, classes, products, banners, categories] = await Promise.all([
        courseApi.getHotCourses(6, currentSource),  // 按体系过滤
        classApi.getList({ status: 'enrolling', sourceId: currentSource }),  // 按体系过滤
        productApi.getList({ pageSize: 6 }),
        bannerApi.getList(10),
        systemConfigApi.getCategories()
      ])

      // 按体系过滤分类
      const filteredCategories = (categories || []).filter((cat: any) => {
        // RENSHE 的 sourceId 是 "RENSHE"，CAAC 的 sourceId 是 _id
        if (currentSource === 'RENSHE') {
          return cat.sourceId === 'RENSHE'
        } else if (currentSource === 'CAAC') {
          // CAAC 分类的 sourceId 是 _id，需要特殊处理
          return cat.sourceId !== 'RENSHE'
        }
        return true
      })

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
        learningPaths: filteredCategories || [],
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
    const sourceId = SOURCE_CONFIG[this.data.currentSource as keyof typeof SOURCE_CONFIG]?.id || ''
    wx.navigateTo({
      url: `/pages/learning-path/learning-path?id=${categoryId}&name=${encodeURIComponent(categoryName)}&source=${this.data.currentSource}&sourceId=${sourceId}`
    })
  },

  // 切换体系
  switchSource(e: any) {
    const source = e.currentTarget.dataset.source
    if (source !== this.data.currentSource) {
      this.setData({ currentSource: source }, () => {
        this.loadData()
      })
    }
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