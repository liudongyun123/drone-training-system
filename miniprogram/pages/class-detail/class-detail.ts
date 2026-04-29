// pages/class-detail/class-detail.ts
// 培训班详情页

import { classApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'

Page({
  data: {
    classId: '',
    classInfo: null as any,
    includedCourses: [] as any[],
    schedules: [] as any[],
    loading: true
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ classId: options.id })
      this.loadClass(options.id)
    }
  },

  async loadClass(classId: string) {
    this.setData({ loading: true })
    try {
      const classInfo = await classApi.getDetail(classId)
      
      // 获取排课
      const db = wx.cloud.database()
      const schedulesResult = await db.collection('class_schedules')
        .where({ classId })
        .orderBy('date', 'asc')
        .get()
      
      this.setData({
        classInfo,
        schedules: schedulesResult.data,
        loading: false
      })
    } catch (err) {
      console.error('加载培训班失败:', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  // 报名
  goToEnrollment() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({
      url: `/pages/class-enrollment/class-enrollment?id=${this.data.classId}`
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.classInfo?.name || '培训班报名',
      path: `/pages/class-detail/class-detail?id=${this.data.classId}`
    }
  }
})