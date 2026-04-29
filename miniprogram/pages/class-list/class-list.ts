// pages/class-list/class-list.ts
// 培训班列表页

import { classApi } from '../../utils/api'

Page({
  data: {
    classList: [] as any[],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadClassList()
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, classList: [] })
    this.loadClassList().then(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  async loadClassList() {
    this.setData({ loading: true })

    try {
      const classList = await classApi.getList({ page: 1, pageSize: 10 })
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
    const nextPage = this.data.page + 1

    try {
      const newClasses = await classApi.getList({ page: nextPage, pageSize: 10 })
      this.setData({
        classList: [...this.data.classList, ...newClasses],
        page: nextPage,
        hasMore: newClasses.length >= 10
      })
    } catch (err) {
      console.error('加载更多失败:', err)
    }
  },

  // 跳转培训班详情
  goToDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${id}` })
  }
})