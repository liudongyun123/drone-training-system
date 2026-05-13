// pages/profile/profile.ts
// 个人中心

import { userApi, newUserApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    userInfo: {} as any,
    memberLevel: 'free',
    memberStatus: 'active',
    stats: null as any,
    loading: true,
    cartCount: 0
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '个人中心' })
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
      this.loadMemberInfo()
      this.loadUserStats()
    } else {
      logger.debug('个人中心', '没有 userId，跳转登录')
      wx.navigateTo({ url: '/pages/login/login' })
    }
  },

  onShow() {
    // 每次显示页面时刷新会员状态
    this.loadMemberInfo()
  },

  // 加载用户信息（支持新 API）
  async loadUserInfo() {
    logger.debug('个人中心', 'loadUserInfo 开始')
    try {
      const userId = getUserId()
      let result = null

      // 优先使用新 API
      const newResult = await newUserApi.getProfile()
      if (newResult.success && newResult.data?.user) {
        result = newResult.data.user
      } else {
        // 兜底使用旧 API
        result = await userApi.getUser(userId)
      }

      logger.debug('个人中心', 'result', result)
      
      if (result) {
        // 从全局数据获取基本信息，合并数据库详细信息
        const app = getApp()
        const basicInfo = app.globalData.userInfo || {}
        
        this.setData({
          userInfo: {
            _id: result._id || result.userId,
            nickName: result.nickname || result.name || basicInfo.nickName || '用户' + (userId?.slice(-4) || ''),
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

  // 加载会员信息（使用新 API）
  async loadMemberInfo() {
    try {
      const result = await newUserApi.getMemberLevel()
      if (result.success && result.data) {
        this.setData({
          memberLevel: result.data.level || 'free',
          memberStatus: result.data.status || 'active'
        })
      }
    } catch (err) {
      logger.error('个人中心', '加载会员信息失败', err)
    }
  },

  // 加载用户统计（使用新 API）
  async loadUserStats() {
    try {
      const result = await newUserApi.getStats()
      if (result.success && result.data) {
        this.setData({ stats: result.data })
      }
    } catch (err) {
      logger.error('个人中心', '加载用户统计失败', err)
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

  // 升级会员
  async upgradeMember() {
    wx.showModal({
      title: '升级会员',
      content: '确定要升级为金牌会员吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await newUserApi.upgradeMember('gold', 12)
            if (result.success) {
              wx.showToast({ title: '升级成功！', icon: 'success' })
              this.loadMemberInfo()
            } else {
              wx.showToast({ title: result.error || '升级失败', icon: 'none' })
            }
          } catch (err) {
            wx.showToast({ title: '升级失败', icon: 'none' })
          }
        }
      }
    })
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
    wx.navigateTo({ url: '/pages/cart/cart' })
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