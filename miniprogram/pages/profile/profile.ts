// pages/profile/profile.ts
// 个人中心

import { userApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    userInfo: {} as any,
    loading: true,
    cartCount: 0
  },

  onLoad() {
    logger.debug('个人中心', 'onLoad 被调用')
    
    // 优先从全局数据获取
    const app = getApp()
    let userId = app.globalData.userId
    logger.debug('个人中心', '全局数据 userId', userId)
    
    // 如果全局数据没有，尝试 Storage
    if (!userId) {
      userId = wx.getStorageSync('userId')
      logger.debug('个人中心', 'Storage userId', userId)
    }
    
    if (userId) {
      this.loadUserInfo()
    } else {
      logger.debug('个人中心', '没有 userId，跳转登录')
      wx.navigateTo({ url: '/pages/login/login' })
    }
  },

  async loadUserInfo() {
    logger.debug('个人中心', 'loadUserInfo 开始')
    try {
      const userId = getUserId()
      const result = await userApi.getUser(userId)
      logger.debug('个人中心', 'result', result)
      
      if (result) {
        // 从全局数据获取基本信息，合并数据库详细信息
        const app = getApp()
        const basicInfo = app.globalData.userInfo || {}
        
        this.setData({
          userInfo: {
            _id: result._id,
            nickName: result.name || basicInfo.nickName || '用户' + userId.slice(-4),
            phone: result.phone || basicInfo.phone || '',
            avatarUrl: result.avatar || basicInfo.avatarUrl || '/assets/icons/profile.png',
            createdAt: result.createdAt
          },
          loading: false
        })
        logger.debug('个人中心', '用户信息已更新')
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      logger.error('个人中心', '错误', err)
      this.setData({ loading: false })
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        setTimeout(() => {
          wx.hideLoading()
          const userInfo = { ...this.data.userInfo, avatar: tempFilePath }
          this.setData({ userInfo })
          showToast('头像已更新')
        }, 1000)
      }
    })
  },

  // 绑定手机号
  bindPhone() {
    wx.showToast({ title: '手机号绑定功能开发中', icon: 'none' })
  },

  // ==================== 页面跳转 ====================

  goToMyLearning() {
    wx.navigateTo({ url: '/pages/my-learning/my-learning' })
  },

  goToMyClasses() {
    wx.navigateTo({ url: '/pages/my-classes/my-classes' })
  },

  goToMySchedule() {
    wx.navigateTo({ url: '/pages/my-schedule/my-schedule' })
  },

  goToPractice() {
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  goToCart() {
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  goToMyOrders() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' })
  },

  goToMyCertificates() {
    wx.navigateTo({ url: '/pages/my-certificates/my-certificates' })
  },

  contactService() {
    wx.showToast({ title: '客服功能开发中', icon: 'none' })
  },

  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '无人机培训中心\n中国航空运输协会认证培训机构',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          wx.reLaunch({ url: '/pages/login/login' })
        }
      }
    })
  }
})