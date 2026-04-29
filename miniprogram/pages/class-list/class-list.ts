// pages/class-list/class-list.ts
// 培训班列表页

import { classApi } from '../../utils/api'

Page({
  data: {
    classList: [] as any[],
    loading: false,
    page: 1,
    hasMore: true,
    currentStatus: '',
    searchKeyword: ''
  },

  onLoad() {
    this.loadClassList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, classList: [] })
    this.loadClassList().then(() => wx.stopPullDownRefresh())
  },

  async loadClassList() {
    this.setData({ loading: true })

    try {
      const filters: any = { page: 1, pageSize: 10 }
      
      // 状态筛选
      if (this.data.currentStatus) {
        filters.status = this.data.currentStatus
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
      console.error('加载培训班列表失败:', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return

    const nextPage = this.data.page + 1

    try {
      const filters: any = { page: nextPage, pageSize: 10 }
      
      if (this.data.currentStatus) {
        filters.status = this.data.currentStatus
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
      console.error('加载更多失败:', err)
    }
  },

  // 切换状态筛选
  switchStatus(e: any) {
    const status = e.currentTarget.dataset.status
    this.setData({ currentStatus: status })
    this.loadClassList()
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