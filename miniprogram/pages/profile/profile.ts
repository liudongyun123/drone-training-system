// pages/profile/profile.ts
// 个人中心

import { userApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'

Page({
  data: {
    userInfo: null as any,
    loading: true,
    cartCount: 0
  },

  onLoad() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.loadUserInfo()
  },

  async loadUserInfo() {
    this.setData({ loading: true })

    try {
      const userId = getUserId()!
      const userInfo = await userApi.getUser(userId)
      this.setData({
        userInfo,
        loading: false
      })
    } catch (err) {
      console.error('加载用户信息失败:', err)
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