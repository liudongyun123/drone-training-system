// pages/index/index.ts
// 小程序首页 - 生产级优化版
// 特性：骨架屏、错误处理、空状态、请求优化

import { productApi, bannerApi, loadLevels, getLevelName } from '../../utils/api'
import { SourceService } from '../../utils/SourceService'
import logger from '../../utils/logger'

// 数据状态枚举
enum LoadState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  EMPTY = 'empty'
}

interface IndexData {
  // 加载状态
  loadState: LoadState
  errorMessage: string
  
  // 体系相关
  hotCourses: any[]
  enrollingClasses: any[]
  featuredProducts: any[]
  heroBanners: any[]
  learningPaths: any[]
  learningPathLevelCount: number
  currentSource: string
  currentSourceId: string
  sourceList: Array<{ key: string; name: string; icon: string; id: string }>
  
  // 骨架屏
  skeletonVisible: boolean
  
  // 空状态
  isCoursesEmpty: boolean
  isClassesEmpty: boolean
  isPathsEmpty: boolean
}

Page<IndexData>({
  data: {
    // 初始状态
    loadState: LoadState.IDLE,
    errorMessage: '',
    
    hotCourses: [],
    enrollingClasses: [],
    featuredProducts: [],
    heroBanners: [],
    learningPaths: [],
    learningPathLevelCount: 5,
    currentSource: 'RENSHE',
    currentSourceId: '',
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️', id: '' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️', id: '' }
    ],
    
    // 骨架屏
    skeletonVisible: true,
    
    // 空状态
    isCoursesEmpty: true,
    isClassesEmpty: true,
    isPathsEmpty: true
  },

  onLoad() {
    this.initApp()
  },

  onShow() {
    // 页面显示时刷新数据（可选）
    // this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 初始化应用
  async initApp() {
    try {
      this.setData({ loadState: LoadState.LOADING })
      await this.loadSources()
    } catch (error) {
      logger.error('[首页] 初始化失败', error)
      this.handleError('应用初始化失败，请下拉刷新')
    }
  },

  // 加载体系配置
  async loadSources() {
    try {
      const sources = await SourceService.getSources()
      logger.info('[首页] loadSources', { count: sources.length })
      
      if (sources && sources.length > 0) {
        const sourceList = sources.map((s) => ({
          key: s.code,
          name: s.name,
          icon: s.icon || '📚',
          id: s._id || ''
        }))
        
        const defaultSource = sources[0]
        
        this.setData({
          sourceList,
          currentSource: defaultSource.code || 'RENSHE',
          currentSourceId: defaultSource._id || ''
        })
        
        logger.info('[首页] 默认体系', { 
          code: defaultSource.code, 
          _id: defaultSource._id 
        })
        
        // 加载体系数据
        await this.loadData()
      } else {
        logger.warn('[首页] 未获取到体系列表')
        this.handleEmpty('暂无可用的培训体系')
      }
    } catch (error) {
      logger.error('[首页] 加载体系配置失败', error)
      this.handleError('加载体系配置失败')
    }
  },

  // 加载首页数据
  async loadData() {
    const { currentSourceId, currentSource } = this.data
    
    // 验证 sourceId
    if (!currentSourceId) {
      logger.error('[首页] sourceId 为空')
      this.handleEmpty('请先选择培训体系')
      return
    }
    
    this.setData({ 
      loadState: LoadState.LOADING,
      skeletonVisible: true,
      errorMessage: ''
    })

    try {
      logger.info('[首页] loadData', { currentSourceId, currentSource })
      
      // 并行加载所有数据
      const [
        coursesResult,
        classesResult,
        productsResult,
        bannersResult,
        pathsResult
      ] = await Promise.allSettled([
        SourceService.getHotCoursesConfig(currentSourceId, 6),
        SourceService.getClassesConfig(currentSourceId, 6),
        productApi.getList({ pageSize: 6 }),
        bannerApi.getList(10),
        SourceService.getLearningPathConfig(currentSourceId)
      ])

      // 处理各模块结果
      const courses = this.extractResult(coursesResult, '热门课程')
      const classes = this.extractResult(classesResult, '培训班')
      const products = this.extractResult(productsResult, '商品')
      const banners = this.extractResult(bannersResult, '轮播图')
      const paths = this.extractResult(pathsResult, '学习路径')

      // 加载等级数据并处理等级显示
      await loadLevels()

      // 处理课程等级显示
      const processedCourses = (courses || []).map((course: any) => ({
        ...course,
        levelText: getLevelName(course.level) || course.level || ''
      }))

      // 处理培训班等级显示
      const processedClasses = (classes || []).map((cls: any) => ({
        ...cls,
        levelText: getLevelName(cls.level) || cls.level || '入门班'
      }))

      // 获取等级数量 - 根据当前体系返回固定的等级数量
      const levelCount = currentSource === 'CAAC' ? 3 : 5  // CAAC 3级，RENSHE 5级

      // 判断空状态
      const isCoursesEmpty = !courses || courses.length === 0
      const isClassesEmpty = !classes || classes.length === 0
      const isPathsEmpty = !paths || paths.length === 0

      this.setData({
        loadState: LoadState.SUCCESS,
        skeletonVisible: false,
        hotCourses: processedCourses || [],
        enrollingClasses: processedClasses || [],
        featuredProducts: products || [],
        heroBanners: banners || [],
        learningPaths: paths || [],
        learningPathLevelCount: levelCount,
        isCoursesEmpty,
        isClassesEmpty,
        isPathsEmpty
      })

      logger.info('[首页] 数据加载完成', {
        courses: courses?.length || 0,
        classes: classes?.length || 0,
        paths: paths?.length || 0
      })
    } catch (error) {
      logger.error('[首页] 加载数据失败', error)
      this.handleError('数据加载失败，请下拉刷新')
    }
  },

  // 刷新数据（强制从服务器获取）
  async refreshData() {
    try {
      // 刷新体系数据
      await SourceService.refreshSourceData(this.data.currentSourceId)
      // 重新加载数据
      await this.loadData()
    } catch (error) {
      logger.error('[首页] 刷新失败', error)
      this.handleError('刷新失败，请稍后重试')
    }
  },

  // 提取 Promise.allSettled 结果
  extractResult(result: PromiseSettledResult<any>, name: string): any {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      logger.warn(`[首页] ${name}加载失败`, result.reason)
      return null
    }
  },

  // 处理错误状态
  handleError(message: string) {
    this.setData({
      loadState: LoadState.ERROR,
      errorMessage: message,
      skeletonVisible: false
    })
  },

  // 处理空状态
  handleEmpty(message: string) {
    this.setData({
      loadState: LoadState.EMPTY,
      errorMessage: message,
      skeletonVisible: false,
      isCoursesEmpty: true,
      isClassesEmpty: true,
      isPathsEmpty: true
    })
  },

  // 轮播图点击
  onBannerTap(e: any) {
    const banner = e.currentTarget.dataset.banner
    if (banner.courseId) {
      wx.navigateTo({
        url: `/pages/course-detail/course-detail?id=${banner.courseId}`
      })
    } else if (banner.link) {
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
    // 现在 _id 就是 SOURCE:CODE 格式（如 "RENSHE:PLANT_PROTECTION"）
    const categoryId = path._id || ''
    const categoryName = path.name || ''
    const source = this.data.currentSource
    
    console.log('[首页] goToPath', { categoryId, categoryName, source })
    
    const url = `/pages/learning-path/learning-path?id=${categoryId}&name=${encodeURIComponent(categoryName)}&source=${source}`
    wx.navigateTo({ url })
  },

  // 切换体系
  switchSource(e: any) {
    const sourceKey = e.currentTarget.dataset.source
    const sourceInfo = this.data.sourceList.find((s: any) => s.key === sourceKey)
    
    logger.info('[首页] 切换体系', { 
      sourceKey, 
      sourceId: sourceInfo?.id,
      currentSource: this.data.currentSource 
    })
    
    if (sourceKey !== this.data.currentSource && sourceInfo) {
      // 切换体系时显示骨架屏
      this.setData({ 
        skeletonVisible: true,
        currentSource: sourceKey,
        currentSourceId: sourceInfo.id || ''
      }, () => {
        this.loadData()
      })
      
      // 提示用户
      wx.showToast({
        title: `已切换至${sourceInfo.name}`,
        icon: 'none',
        duration: 1500
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

  // 重新加载（用于错误状态重试）
  onRetryTap() {
    this.refreshData()
  },

  // 课程图片加载失败处理
  onCourseImageError(e: any) {
    const index = e.currentTarget.dataset.index
    const hotCourses = this.data.hotCourses
    if (hotCourses[index]) {
      hotCourses[index].coverImage = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      this.setData({ hotCourses })
    }
  },

  // 轮播图加载失败处理
  onBannerImageError(e: any) {
    const index = e.currentTarget.dataset.index
    const heroBanners = this.data.heroBanners
    if (heroBanners[index]) {
      heroBanners[index].image = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      this.setData({ heroBanners })
    }
  },

  onShareAppMessage() {
    return {
      title: '无人机培训',
      path: '/pages/index/index'
    }
  }
})
