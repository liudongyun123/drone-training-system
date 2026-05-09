// pages/index/index.ts
// 小程序首页

import { courseApi, classApi, productApi, bannerApi, systemConfigApi } from '../../utils/api'
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
  learningPathLevelCount: number  // 学习路径等级数量
  currentSource: string  // 当前体系 code
  currentSourceId: string  // 当前体系 _id
  sourceList: Array<{ key: string; name: string; icon: string; id: string }>
  loading: boolean
}

Page<IndexData>({
  data: {
    hotCourses: [],
    enrollingClasses: [],
    featuredProducts: [],
    heroBanners: [],
    learningPaths: [],
    learningPathLevelCount: 5,  // 默认5级
    currentSource: 'RENSHE',
    currentSourceId: '',
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️', id: '' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️', id: '' }
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
          icon: s.icon || '📚',
          id: s._id || s.id || ''
        }))
        this.setData({
          sourceList,
          currentSource: sources[0].code || 'RENSHE',
          currentSourceId: sources[0]._id || sources[0].id || ''
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
      // 优先使用 _id 查询，如果没有则使用 code
      const currentSourceId = this.data.currentSourceId || this.data.currentSource
      
      // 先获取字典配置获取首页显示数量
      let hotCourseCount = 6
      let enrollingClassCount = 6
      let productCount = 6
      
      try {
        const dictionaries = await systemConfigApi.getDictionaries()
        const homePageConfig = dictionaries?.homePage || {}
        hotCourseCount = homePageConfig.hotCourseCount || 6
        enrollingClassCount = homePageConfig.enrollingClassCount || 6
        productCount = homePageConfig.productCount || 6
      } catch (e) {
        console.log('获取首页配置失败，使用默认值')
      }
      
      // 并行加载数据
      const [courses, classes, products, banners, categories] = await Promise.all([
        courseApi.getHotCourses(hotCourseCount, currentSourceId),  // 按体系过滤，动态数量
        classApi.getList({ status: 'enrolling', sourceId: currentSourceId, pageSize: enrollingClassCount }),  // 按体系过滤，动态数量
        productApi.getList({ pageSize: productCount }),  // 动态数量
        bannerApi.getList(10),
        systemConfigApi.getLearningPathConfig(currentSourceId)
      ])

      // 获取等级数量 - 从 categories 数据中推断
      let levelCount = 5  // 默认值
      // 从分类数量推断等级数量（如果有多个分类）
      if (categories && categories.length > 0) {
        // 假设等级数等于分类数或默认5
        levelCount = Math.min(categories.length, 10) || 5
      }

      // 按体系过滤分类（使用 _id 匹配）
      const filteredCategories = (categories || []).filter((cat: any) => {
        return cat.sourceId === currentSourceId
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
        learningPathLevelCount: levelCount,
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
    // 优先使用 _id 查询
    const sourceId = this.data.currentSourceId || this.data.currentSource
    wx.navigateTo({
      url: `/pages/learning-path/learning-path?id=${categoryId}&name=${encodeURIComponent(categoryName)}&source=${this.data.currentSource}&sourceId=${sourceId}`
    })
  },

  // 切换体系
  switchSource(e: any) {
    const sourceKey = e.currentTarget.dataset.source
    // 找到对应的体系信息
    const sourceInfo = this.data.sourceList.find((s: any) => s.key === sourceKey)
    if (sourceKey !== this.data.currentSource && sourceInfo) {
      this.setData({ 
        currentSource: sourceKey,
        currentSourceId: sourceInfo.id || ''
      }, () => {
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
