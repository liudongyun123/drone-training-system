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
    categories: [] as string[],
    currentCategory: '',
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
    if (options.category) {
      const category = decodeURIComponent(options.category)
      this.setData({ currentCategory: category })
      wx.removeStorageSync('targetCategory')
    }
    this.loadSources()
  },

  onShow() {
    const targetCategory = wx.getStorageSync('targetCategory')
    if (targetCategory && this.data.currentCategory !== targetCategory) {
      this.setData({ currentCategory: targetCategory })
      wx.removeStorageSync('targetCategory')
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
        this.setData({ categories: ['全部'] })
        return
      }
      
      const categories = await SourceService.getCategories(sourceId)
      const categoryNames = categories.map((c) => c.name)
      this.setData({ categories: ['全部', ...categoryNames] })
    } catch (err) {
      logger.error('[课程列表] 加载分类失败', err)
      this.setData({ categories: ['全部'] })
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
      
      if (this.data.currentCategory && this.data.currentCategory !== '全部') {
        filters.category = this.data.currentCategory
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
      
      if (this.data.currentCategory && this.data.currentCategory !== '全部') {
        filters.category = this.data.currentCategory
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
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.loadCourses()
  },

  // 切换排序
  switchSort(e: any) {
    const sort = e.currentTarget.dataset.sort
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
        currentCategory: '',
        page: 1,
        hasMore: true,
        courses: []
      }, () => {
        this.loadCategories()
        this.loadCourses()
      })
    }
  },

  // 搜索
  goToSearch() {
    wx.showModal({
      title: '搜索课程',
      editable: true,
      placeholderText: '请输入课程名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ searchKeyword: res.content })
          this.loadCourses()
        }
      }
    })
  },

  // 跳转课程详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` })
  }
})
