// pages/course-list/course-list.ts
// 课程列表页

import { courseApi } from '../../utils/api'
import { SourceService } from '../../utils/SourceService'
import logger from '../../utils/logger'

Page({
  data: {
    courses: [] as any[],
    loading: false,
    page: 1,
    hasMore: true,
    categories: [] as { name: string; id: string }[],  // 修改为对象数组
    currentCategoryId: '',  // 使用 categoryId 过滤
    currentCategoryName: '',  // 当前分类名称（用于显示）
    currentSort: 'newest',
    searchKeyword: '',
    currentSource: 'RENSHE',  // 体系的 code（用于显示）
    currentSourceId: '',       // 体系的 _id（用于查询）
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️', id: '' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️', id: '' }
    ]
  },

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '课程列表' })
    if (options.categoryId) {
      const categoryId = decodeURIComponent(options.categoryId)
      this.setData({ currentCategoryId: categoryId })
      wx.removeStorageSync('targetCategoryId')
    }
    this.loadSources()
  },

  onShow() {
    const targetCategoryId = wx.getStorageSync('targetCategoryId')
    if (targetCategoryId && this.data.currentCategoryId !== targetCategoryId) {
      this.setData({ currentCategoryId: targetCategoryId })
      wx.removeStorageSync('targetCategoryId')
      this.loadCourses()
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, courses: [] })
    this.loadCourses().then(() => wx.stopPullDownRefresh())
  },

  // 加载体系配置
  async loadSources() {
    try {
      const sources = await SourceService.getSources()
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
      }
    } catch (err) {
      logger.error('[课程列表] 加载体系配置失败', err)
    }
    this.loadCategories()
  },

  // 加载分类
  async loadCategories() {
    try {
      const sourceId = this.data.currentSourceId
      if (!sourceId) {
        this.setData({ categories: [] })
        return
      }
      
      const categories = await SourceService.getCategories(sourceId)
      // 保存 name 和 id 用于显示和过滤
      const categoryList = categories.map((c) => ({ name: c.name, id: c._id || '' }))
      this.setData({ categories: categoryList })
    } catch (err) {
      logger.error('[课程列表] 加载分类失败', err)
      this.setData({ categories: [] })
    }
    this.loadCourses()
  },

  async loadCourses() {
    this.setData({ loading: true })
    
    try {
      const sourceId = this.data.currentSourceId
      
      if (!sourceId) {
        logger.warn('[课程列表] sourceId 为空')
        this.setData({ courses: [], loading: false })
        return
      }
      
      const filters: any = { page: 1, pageSize: 10, sourceId }
      
      // 使用 categoryId 过滤
      if (this.data.currentCategoryId) {
        filters.categoryId = this.data.currentCategoryId
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      switch (this.data.currentSort) {
        case 'newest':
          filters.sortBy = 'createdAt'
          filters.sortOrder = 'desc'
          break
        case 'hot':
          filters.sortBy = 'salesCount'
          filters.sortOrder = 'desc'
          break
        case 'price_asc':
          filters.sortBy = 'price'
          filters.sortOrder = 'asc'
          break
        case 'price_desc':
          filters.sortBy = 'price'
          filters.sortOrder = 'desc'
          break
      }
      
      console.log('[课程列表] 加载课程, filters:', filters)
      const courses = await courseApi.getList(filters)
      this.setData({
        courses,
        page: 1,
        hasMore: courses.length >= 10,
        loading: false
      })
    } catch (err) {
      logger.error('[课程列表] 加载课程失败', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    
    const nextPage = this.data.page + 1
    
    try {
      const sourceId = this.data.currentSourceId
      if (!sourceId) return
      
      const filters: any = { page: nextPage, pageSize: 10, sourceId }
      
      // 使用 categoryId 过滤
      if (this.data.currentCategoryId) {
        filters.categoryId = this.data.currentCategoryId
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      switch (this.data.currentSort) {
        case 'newest':
          filters.sortBy = 'createdAt'
          filters.sortOrder = 'desc'
          break
        case 'hot':
          filters.sortBy = 'salesCount'
          filters.sortOrder = 'desc'
          break
        case 'price_asc':
          filters.sortBy = 'price'
          filters.sortOrder = 'asc'
          break
        case 'price_desc':
          filters.sortBy = 'price'
          filters.sortOrder = 'desc'
          break
      }
      
      const newCourses = await courseApi.getList(filters)
      
      this.setData({
        courses: [...this.data.courses, ...newCourses],
        page: nextPage,
        hasMore: newCourses.length >= 10
      })
    } catch (err) {
      logger.error('[课程列表] 加载更多失败', err)
    }
  },

  // 切换分类
  switchCategory(e: any) {
    const categoryId = e.currentTarget.dataset.categoryid
    const categoryName = e.currentTarget.dataset.category
    this.setData({ 
      currentCategoryId: categoryId || '',
      currentCategoryName: categoryName || ''
    })
    this.loadCourses()
  },

  // 切换排序
  switchSort(e: any) {
    const sort = e.currentTarget.dataset.sort
    console.log('[课程列表] 切换排序:', sort)
    this.setData({ currentSort: sort })
    this.loadCourses()
  },

  // 切换体系
  switchSource(e: any) {
    const sourceKey = e.currentTarget.dataset.source
    const sourceInfo = this.data.sourceList.find((s: any) => s.key === sourceKey)
    if (sourceKey !== this.data.currentSource && sourceInfo) {
      this.setData({ 
        currentSource: sourceKey,
        currentSourceId: sourceInfo.id || '',
        currentCategoryId: '',
        currentCategoryName: '',
        page: 1,
        hasMore: true,
        courses: []
      }, () => {
        this.loadCategories()
        this.loadCourses()
      })
    }
  },

  // 搜索 - 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  // 跳转课程详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` })
  },

  // 图片加载失败处理
  onImageError(e: any) {
    const index = e.currentTarget.dataset.index
    const courses = this.data.courses
    if (courses[index]) {
      courses[index].coverImage = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      this.setData({ courses })
    }
  }
})
