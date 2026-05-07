// pages/class-list/class-list.ts
// 培训班列表页

import { classApi, systemConfigApi } from '../../utils/api'
import logger from '../../utils/logger'

Page({
  data: {
    classList: [] as any[],
    loading: false,
    page: 1,
    hasMore: true,
    currentStatus: '',
    currentCategory: '',
    categories: [] as string[],
    searchKeyword: '',
    currentSource: 'RENSHE',
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️' }
    ]
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '培训班' })
    this.loadSources()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, classList: [] })
    this.loadClassList().then(() => wx.stopPullDownRefresh())
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
      logger.error('培训班', '加载体系配置失败', err)
    }
    this.loadCategories()
  },

  // 加载分类
  async loadCategories() {
    try {
      const categories = await systemConfigApi.getCategories(this.data.currentSource)
      const categoryNames = categories.map((c: any) => c.name || c)
      this.setData({ categories: categoryNames })
    } catch (err) {
      logger.error('培训班', '加载分类失败', err)
      this.setData({ categories: [] })
    }
    this.loadClassList()
  },

  async loadClassList() {
    this.setData({ loading: true })

    try {
      const filters: any = { page: 1, pageSize: 10, sourceId: this.data.currentSource }
      
      // 状态筛选
      if (this.data.currentStatus) {
        filters.status = this.data.currentStatus
      }
      
      // 分类筛选
      if (this.data.currentCategory) {
        filters.category = this.data.currentCategory
      }
      
      // 搜索关键词
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      const classList = await classApi.getList(filters)
      this.setData({
        classList,
        page: 1,
        hasMore: classList.length >= 10,
        loading: false
      })
    } catch (err) {
      logger.error('培训班', '加载培训班列表失败', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return

    const nextPage = this.data.page + 1

    try {
      const filters: any = { page: nextPage, pageSize: 10, sourceId: this.data.currentSource }
      
      if (this.data.currentStatus) {
        filters.status = this.data.currentStatus
      }
      
      if (this.data.currentCategory) {
        filters.category = this.data.currentCategory
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      const newClasses = await classApi.getList(filters)
      this.setData({
        classList: [...this.data.classList, ...newClasses],
        page: nextPage,
        hasMore: newClasses.length >= 10
      })
    } catch (err) {
      logger.error('培训班', '加载更多失败', err)
    }
  },

  // 切换分类
  switchCategory(e: any) {
    const category = e.currentTarget.dataset.category
    this.setData({ 
      currentCategory: category,
      currentStatus: ''  // 切换分类时重置状态
    })
    this.loadClassList()
  },

  // 切换状态筛选
  switchStatus(e: any) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status })
    this.loadClassList()
  },

  // 切换体系
  switchSource(e: any) {
    const source = e.currentTarget.dataset.source
    if (source !== this.data.currentSource) {
      this.setData({ 
        currentSource: source,
        currentCategory: '',
        currentStatus: '',
        page: 1,
        hasMore: true,
        classList: []
      }, () => {
        this.loadCategories()
      })
    }
  },

  // 搜索
  goToSearch() {
    wx.showModal({
      title: '搜索培训班',
      editable: true,
      placeholderText: '请输入培训班名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ searchKeyword: res.content })
          this.loadClassList()
        }
      }
    })
  },

  // 跳转培训班详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${id}` })
  }
})