// pages/search/search.ts
// 搜索页面

import { courseApi } from '../../utils/api'
import { classApi } from '../../utils/api'
import logger from '../../utils/logger'

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10

Page({
  data: {
    keyword: '',
    results: [] as any[],
    loading: false,
    hasMore: true,
    page: 1,
    hasSearched: false,  // 是否已执行搜索
    history: [] as string[],  // 搜索历史
    hotKeywords: ['无人机', 'CAAC', '考证', '飞行', '基础'],  // 热门关键词
    recommendations: [] as any[],  // 推荐内容
    searchType: 'course'  // 搜索类型: course 或 class
  },

  onLoad(options: any) {
    // 支持从外部传入搜索类型
    const searchType = options.type || 'course'
    this.setData({ searchType })
    
    if (searchType === 'class') {
      wx.setNavigationBarTitle({ title: '搜索培训班' })
      this.loadRecommendations('class')
    } else {
      wx.setNavigationBarTitle({ title: '搜索课程' })
      this.loadRecommendations('course')
    }
    
    this.loadHistory()
  },

  // 加载搜索历史
  loadHistory() {
    const history = wx.getStorageSync(HISTORY_KEY) || []
    this.setData({ history })
  },

  // 加载推荐内容
  async loadRecommendations(type: string = 'course') {
    try {
      if (type === 'class') {
        // 推荐培训班
        const classes = await classApi.getList({ pageSize: 6 })
        this.setData({ recommendations: classes })
      } else {
        // 推荐课程
        const courses = await courseApi.getList({ pageSize: 6 })
        this.setData({ recommendations: courses })
      }
    } catch (err) {
      logger.error('[搜索] 加载推荐内容失败', err)
    }
  },

  // 输入事件
  onInput(e: any) {
    const keyword = e.detail.value || ''
    this.setData({ 
      keyword,
      hasSearched: false  // 重置搜索状态
    })
  },

  // 执行搜索
  async onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      wx.showToast({ title: '请输入关键词', icon: 'none' })
      return
    }

    this.setData({ 
      hasSearched: true,
      results: [],
      page: 1,
      hasMore: true
    })

    await this.search(keyword)
    this.saveHistory(keyword)
  },

  // 搜索请求
  async search(keyword: string) {
    this.setData({ loading: true })

    try {
      const filters: any = {
        page: 1,
        pageSize: 10,
        keyword
      }

      let results
      if (this.data.searchType === 'class') {
        // 搜索培训班
        filters.sortBy = 'createdAt'
        filters.sortOrder = 'desc'
        results = await classApi.getList(filters)
      } else {
        // 搜索课程
        filters.sortBy = 'salesCount'
        filters.sortOrder = 'desc'
        results = await courseApi.getList(filters)
      }
      
      this.setData({
        results,
        page: 1,
        hasMore: results.length >= 10,
        loading: false
      })
    } catch (err) {
      logger.error('[搜索] 搜索失败', err)
      this.setData({ loading: false })
    }
  },

  // 加载更多
  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return

    const nextPage = this.data.page + 1

    try {
      const filters: any = {
        page: nextPage,
        pageSize: 10,
        keyword: this.data.keyword
      }

      let newResults
      if (this.data.searchType === 'class') {
        filters.sortBy = 'createdAt'
        filters.sortOrder = 'desc'
        newResults = await classApi.getList(filters)
      } else {
        filters.sortBy = 'salesCount'
        filters.sortOrder = 'desc'
        newResults = await courseApi.getList(filters)
      }

      this.setData({
        results: [...this.data.results, ...newResults],
        page: nextPage,
        hasMore: newResults.length >= 10
      })
    } catch (err) {
      logger.error('[搜索] 加载更多失败', err)
    }
  },

  // 保存搜索历史
  saveHistory(keyword: string) {
    let history = this.data.history
    // 去重
    history = history.filter(h => h !== keyword)
    // 插入到最前面
    history.unshift(keyword)
    // 限制数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY)
    }
    wx.setStorageSync(HISTORY_KEY, history)
    this.setData({ history })
  },

  // 清除历史
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定清除搜索历史？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(HISTORY_KEY)
          this.setData({ history: [] })
        }
      }
    })
  },

  // 从历史记录搜索
  searchFromHistory(e: any) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword })
    this.onSearch()
  },

  // 清除关键词
  clearKeyword() {
    this.setData({ 
      keyword: '',
      results: [],
      hasSearched: false
    })
  },

  // 取消返回
  cancel() {
    wx.navigateBack()
  },

  // 跳转详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    if (this.data.searchType === 'class') {
      wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${id}` })
    } else {
      wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` })
    }
  },

  // 图片加载失败处理
  onImageError(e: any) {
    const index = e.currentTarget.dataset.index
    const results = this.data.results
    if (results && results[index]) {
      results[index].coverImage = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      this.setData({ results })
    }
  }
})
