// pages/class-list/class-list.ts
// 培训班列表页

import { classApi } from '../../utils/api'
import { SourceService } from '../../utils/SourceService'
import logger from '../../utils/logger'

Page({
  data: {
    classList: [] as any[],
    loading: false,
    page: 1,
    hasMore: true,
    currentStatus: '',
    currentCategoryId: '',  // 使用 categoryId 过滤
    currentCategoryName: '',  // 当前分类名称
    categories: [] as { name: string; id: string }[],
    searchKeyword: '',
    currentSort: 'newest',
    currentSource: 'RENSHE',  // 体系的 code（用于显示）
    currentSourceId: '',      // 体系的 _id（用于查询）
    sourceList: [
      { key: 'RENSHE', name: '人社培训', icon: '🏛️', id: '' },
      { key: 'CAAC', name: 'CAAC培训', icon: '✈️', id: '' }
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
      logger.error('[培训班列表] 加载体系配置失败', err)
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
      logger.error('[培训班列表] 加载分类失败', err)
      this.setData({ categories: [] })
    }
    this.loadClassList()
  },

  async loadClassList() {
    this.setData({ loading: true })

    try {
      const sourceId = this.data.currentSourceId
      
      if (!sourceId) {
        logger.warn('[培训班列表] sourceId 为空')
        this.setData({ classList: [], loading: false })
        return
      }
      
      const filters: any = { page: 1, pageSize: 10, sourceId }
      
      if (this.data.currentStatus) {
        filters.status = this.data.currentStatus
      }
      
      // 使用 categoryId 过滤
      if (this.data.currentCategoryId) {
        filters.categoryId = this.data.currentCategoryId
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      // 排序
      switch (this.data.currentSort) {
        case 'newest':
          filters.sortBy = 'createdAt'
          filters.sortOrder = 'desc'
          break
        case 'startDate':
          filters.sortBy = 'startDate'
          filters.sortOrder = 'asc'
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
      
      console.log('[培训班列表] 加载培训班, filters:', filters)
      const classList = await classApi.getList(filters)
      console.log('[培训班列表] 获取到 classList, 长度:', classList.length)
      if (classList.length > 0) {
        console.log('[培训班列表] 第一个培训班的封面:', classList[0].coverImage || classList[0].cover)
      }
      this.setData({
        classList,
        page: 1,
        hasMore: classList.length >= 10,
        loading: false
      })
    } catch (err) {
      logger.error('[培训班列表] 加载培训班列表失败', err)
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
      
      if (this.data.currentStatus) {
        filters.status = this.data.currentStatus
      }
      
      if (this.data.currentCategoryId) {
        filters.categoryId = this.data.currentCategoryId
      }
      
      if (this.data.searchKeyword) {
        filters.keyword = this.data.searchKeyword
      }
      
      // 排序
      switch (this.data.currentSort) {
        case 'newest':
          filters.sortBy = 'createdAt'
          filters.sortOrder = 'desc'
          break
        case 'startDate':
          filters.sortBy = 'startDate'
          filters.sortOrder = 'asc'
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
      
      const newClasses = await classApi.getList(filters)
      this.setData({
        classList: [...this.data.classList, ...newClasses],
        page: nextPage,
        hasMore: newClasses.length >= 10
      })
    } catch (err) {
      logger.error('[培训班列表] 加载更多失败', err)
    }
  },

  // 切换分类
  switchCategory(e: any) {
    const categoryId = e.currentTarget.dataset.categoryid
    const categoryName = e.currentTarget.dataset.category
    this.setData({ 
      currentCategoryId: categoryId || '',
      currentCategoryName: categoryName || '',
      currentStatus: ''
    })
    this.loadClassList()
  },

  // 切换状态筛选
  switchStatus(e: any) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status })
    this.loadClassList()
  },

  // 切换排序
  switchSort(e: any) {
    const sort = e.currentTarget.dataset.sort
    console.log('[培训班列表] 切换排序:', sort)
    this.setData({ currentSort: sort })
    this.loadClassList()
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
        currentStatus: '',
        currentSort: 'newest',
        page: 1,
        hasMore: true,
        classList: []
      }, () => {
        this.loadCategories()
      })
    }
  },

  // 搜索 - 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({ url: '/pages/search/search?type=class' })
  },

  // 跳转培训班详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${id}` })
  },

  // 图片加载失败处理
  onImageError(e: any) {
    const index = e.currentTarget.dataset.index
    console.log('[培训班列表] 图片加载失败, index:', index)
    const classList = this.data.classList
    if (classList[index]) {
      const defaultCover = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      classList[index].coverImage = defaultCover
      classList[index].cover = defaultCover
      console.log('[培训班列表] 已设置默认封面')
      this.setData({ classList })
    }
  }
})
