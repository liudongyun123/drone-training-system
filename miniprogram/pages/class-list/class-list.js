// pages/class-list/class-list.js
// 培训班列表页面

const { classApi } = require('../../utils/api')

Page({
  data: {
    // 状态列表
    status: [
      { key: 'enrolling', name: '报名中' },
      { key: 'ongoing', name: '进行中' },
      { key: 'ended', name: '已结束' }
    ],
    currentStatus: 'enrolling',
    
    // 培训班列表
    classes: [],
    
    // 状态
    loading: false,
    page: 1,
    pageSize: 10,
    hasMore: true
  },

  onLoad(options) {
    if (options.status) {
      this.setData({ currentStatus: options.status })
    }
    this.loadClasses()
  },

  onShow() {
    // 每次显示刷新
  },

  onPullDownRefresh() {
    this.setData({ page: 1, classes: [], hasMore: true })
    this.loadClasses().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreClasses()
    }
  },

  // 切换状态
  switchStatus(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      currentStatus: status,
      page: 1,
      classes: [],
      hasMore: true
    })
    this.loadClasses()
  },

  // 加载培训班
  async loadClasses() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const filters = {
        status: this.data.currentStatus,
        page: 1,
        pageSize: this.data.pageSize
      }
      
      const classes = await classApi.getList(filters)
      
      this.setData({
        classes: classes || [],
        page: 1,
        hasMore: (classes || []).length >= this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载培训班失败:', err)
      this.setData({ loading: false })
    }
  },

  // 加载更多
  async loadMoreClasses() {
    if (!this.data.hasMore || this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const nextPage = this.data.page + 1
      const filters = {
        status: this.data.currentStatus,
        page: nextPage,
        pageSize: this.data.pageSize
      }
      
      const classes = await classApi.getList(filters)
      
      this.setData({
        classes: [...this.data.classes, ...(classes || [])],
        page: nextPage,
        hasMore: (classes || []).length >= this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载更多失败:', err)
      this.setData({ loading: false })
    }
  },

  // 跳转详情
  goToDetail(e) {
    const classId = e.currentTarget.dataset.id
    if (classId) {
      wx.navigateTo({
        url: `/pages/class-detail/class-detail?id=${classId}`
      })
    }
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '无人机培训班',
      path: '/pages/class-list/class-list'
    }
  }
})
