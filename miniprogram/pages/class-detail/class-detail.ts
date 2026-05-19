// pages/class-detail/class-detail.ts
// 培训班详情页

import { classApi, orderApi } from '../../utils/api'
import { checkLogin, getPhone, showToast } from '../../utils/util'
import { dbGetList } from '../../utils/http'
import logger from '../../utils/logger'

Page({
  data: {
    classId: '',
    classInfo: null as any,
    includedCourses: [] as any[],
    schedules: [] as any[],
    loading: true,
    isEnrolled: false  // 是否已购买/已报名
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
      
      // 检查用户是否已购买/已报名
      const isEnrolled = await this.checkEnrollmentStatus(classId)
      
      this.setData({
        classInfo,
        schedules: schedulesResult.data || [],
        isEnrolled,
        loading: false
      })
    } catch (err) {
      logger.error('培训班', '加载培训班失败', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  // 检查用户是否已购买/已报名该培训班
  async checkEnrollmentStatus(classId: string): Promise<boolean> {
    const phone = getPhone()
    if (!phone) {
      return false
    }
    
    try {
      // 检查 class_members 表（包含更多状态）
      const membersResult = await dbGetList('class_members', {
        where: {
          classId,
          phone,
          status: { $in: ['enrolled', 'learning', 'pending', 'confirmed', 'active', 'completed'] }
        }
      })
      
      if (membersResult.data && membersResult.data.length > 0) {
        console.log('[培训班详情] 已在 class_members 中找到报名记录')
        return true
      }
      
      // 检查 enrollments 表（新格式）
      const enrollmentsResult = await dbGetList('enrollments', {
        where: {
          classId,
          phone,
          status: { $in: ['enrolled', 'learning', 'pending', 'confirmed', 'active', 'completed'] }
        }
      })
      
      if (enrollmentsResult.data && enrollmentsResult.data.length > 0) {
        console.log('[培训班详情] 已在 enrollments 中找到报名记录')
        return true
      }
      
      // 检查 orders 表
      const orders = await orderApi.getByUserId('', 'class')
      const hasOrder = orders.some((o: any) => 
        o.classId === classId && ['pending', 'paid', 'completed'].includes(o.status)
      )
      
      console.log('[培训班详情] 订单检查结果:', hasOrder)
      return hasOrder
    } catch (err) {
      console.error('[培训班详情] 检查报名状态失败:', err)
      return false
    }
  },

  goToEnrollment() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    // 如果已报名，提示并跳转到我的班级
    if (this.data.isEnrolled) {
      wx.showModal({
        title: '已报名',
        content: '您已报名此培训班，是否查看详情？',
        confirmText: '查看',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/my-classes/my-classes' })
          }
        }
      })
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
