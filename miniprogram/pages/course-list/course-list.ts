// pages/course-list/course-list.ts
// 课程列表页

import { courseApi, systemConfigApi } from '../../utils/api'
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
    currentSource: 'RENSHE',
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️' }
    ]
  },

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '课程列表' })
    // 如果有传入分类参数
    if (options.category) {
      const category = decodeURIComponent(options.category)
      this.setData({ currentCategory: category })
      // 清除 storage
      wx.removeStorageSync('targetCategory')
    }
    this.loadSources()
  },

  onShow() {
    // 检查是否有从首页跳转过来的分类
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
      logger.error('课程', '加载体系配置失败', err)
    }
    this.loadCategories()
  },

  // 加载分类
  async loadCategories() {
    try {
      const categories = await systemConfigApi.getCategories(this.data.currentSource)
      const categoryNames = categories.map((c: any) => c.name || c)
      this.setData({ categories: ['全部', ...categoryNames] })
    } catch (err) {
      logger.error('课程', '加载分类失败', err)
      this.setData({ categories: ['全部'] })
    }
    this.loadCourses()
  },

  async loadCourses() {
    this.setData({ loading: true })
    
    try {
      const filters: any = { page: 1, pageSize: 10 }
      
      // 分类筛选
      if (this.data.currentCategory && this.data.currentCategory !== '全部') {
        filters.category = this.data.currentCategory
      }
      
      // 搜索关键词
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      // 排序
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
      logger.error('课程', '加载课程失败', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    
    const nextPage = this.data.page + 1
    
    try {
      const filters: any = { page: nextPage, pageSize: 10 }
      
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
      logger.error('课程', '加载更多失败', err)
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
    const source = e.currentTarget.dataset.source
    if (source !== this.data.currentSource) {
      this.setData({ 
        currentSource: source,
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