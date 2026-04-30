// pages/class-detail/class-detail.js
// 培训班详情页面

const { classApi } = require('../../utils/api')

Page({
  data: {
    classId: '',
    classData: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ classId: options.id })
      this.loadClassDetail(options.id)
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  // 加载培训班详情
  async loadClassDetail(classId) {
    this.setData({ loading: true })
    
    try {
      const classData = await classApi.getDetail(classId)
      
      if (classData) {
        this.setData({
          classData,
          loading: false
        })
        wx.setNavigationBarTitle({ title: classData.name || '培训班详情' })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: '培训班不存在', icon: 'none' })
      }
    } catch (err) {
      console.error('加载详情失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 立即报名
  onEnroll() {
    const { classData } = this.data
    
    if (!classData) return
    
    if (classData.status !== 'enrolling') {
      wx.showToast({ title: '当前无法报名', icon: 'none' })
      return
    }
    
    if (classData.currentStudents >= classData.maxStudents) {
      wx.showToast({ title: '名额已满', icon: 'none' })
      return
    }
    
    wx.navigateTo({
      url: `/pages/class-enrollment/class-enrollment?id=${classData._id}`
    })
  },

  // 分享
  onShareAppMessage() {
    const { classData } = this.data
    return {
      title: classData?.name || '无人机培训班',
      path: `/pages/class-detail/class-detail?id=${this.data.classId}`
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadClassDetail(this.data.classId).finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})
