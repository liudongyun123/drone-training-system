// pages/class-detail/class-detail.ts
// 培训班详情页

import { classApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { dbGetList } from '../../utils/http'
import logger from '../../utils/logger'

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
      wx.setNavigationBarTitle({ title: '培训班详情' })
      this.loadClass(options.id)
    }
  },

  async loadClass(classId: string) {
    this.setData({ loading: true })
    try {
      console.log('[培训班详情] 加载培训班, classId:', classId)
      
      const classInfo = await classApi.getDetail(classId)
      
      console.log('[培训班详情] 培训班数据:', classInfo)
      
      // 获取排课
      const schedulesResult = await dbGetList('class_schedules', {
        where: { classId },
        orderBy: 'date asc'
      })
      
      console.log('[培训班详情] 日程数据:', schedulesResult.data)
      
      // 确保封面图片有值（数据库可能没有封面字段）
      if (classInfo && !classInfo.coverImage && !classInfo.cover) {
        // 使用默认封面图
        classInfo.coverImage = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      }
      
      this.setData({
        classInfo,
        schedules: schedulesResult.data || [],
        loading: false
      })
    } catch (err) {
      logger.error('培训班', '加载培训班失败', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  goToEnrollment() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    wx.navigateTo({
      url: `/pages/class-enrollment/class-enrollment?id=${this.data.classId}`
    })
  },

  shareClass() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '如有疑问，请拨打客服电话：400-888-8888',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4008888888'
          })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.classInfo?.name || '培训班报名',
      path: `/pages/class-detail/class-detail?id=${this.data.classId}`
    }
  },

  // 封面图片加载失败处理
  onCoverError() {
    const classInfo = this.data.classInfo
    if (classInfo) {
      classInfo.coverImage = '/assets/images/default-cover.png'
      this.setData({ classInfo })
    }
  }
})
