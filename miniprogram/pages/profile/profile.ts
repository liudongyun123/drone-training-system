// pages/profile/profile.ts
// 个人中心

import { userApi, newUserApi } from '../../utils/api'
import { dbQuery } from '../../utils/http'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    userInfo: {} as any,
    memberLevel: 'free',
    memberStatus: 'active',
    stats: null as any,
    loading: true,
    cartCount: 0,
    notificationCount: 0
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '个人中心' })
    
    const userId = this.getUserId()
    if (!userId) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    this.loadUserInfo()
    this.loadMemberInfo()
    this.loadUserStats()
    this.loadCartCount()
    this.loadNotificationCount()
  },

  onShow() {
    if (checkLogin()) {
      this.loadMemberInfo()
      this.loadCartCount()
      this.loadNotificationCount()
    }
  },

  // 获取用户 ID
  getUserId(): string {
    const app = getApp()
    return app.globalData.userId || wx.getStorageSync('userId') || ''
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      // 优先从本地存储获取手机号（登录时已保存）
      const localPhone = wx.getStorageSync('phone') || ''
      const loginInfo = wx.getStorageSync('loginInfo') || {}
      const app = getApp()

      // 尝试从服务器获取用户信息
      const newResult = await newUserApi.getProfile()
      if (newResult.success && newResult.data?.user) {
        const user = newResult.data.user
        const basicInfo = app.globalData.userInfo || {}

        // 服务器手机号或本地手机号
        const phone = user.phone || localPhone || loginInfo.phone || basicInfo.phone || ''

        // 如果服务器有手机号但本地没有，同步到本地
        if (user.phone && !localPhone) {
          wx.setStorageSync('phone', user.phone)
          loginInfo.phone = user.phone
          wx.setStorageSync('loginInfo', loginInfo)
        }

        this.setData({
          userInfo: {
            _id: user._id || user.userId,
            nickName: user.nickname || user.name || basicInfo.nickName || '用户',
            phone: phone,
            avatarUrl: user.avatar || basicInfo.avatarUrl || '/assets/icons/profile.png'
          },
          loading: false
        })
      } else {
        // 服务器获取失败，使用本地数据
        const userId = this.getUserId()
        const result = userId ? await userApi.getUser(userId) : null
        if (result) {
          const phone = result.phone || localPhone || loginInfo.phone || ''
          this.setData({
            userInfo: {
              _id: result._id,
              nickName: result.nickname || result.name || '用户',
              phone: phone,
              avatarUrl: result.avatar || '/assets/icons/profile.png'
            },
            loading: false
          })
        } else {
          // 完全使用本地数据
          this.setData({
            userInfo: {
              nickName: app.globalData.userInfo?.nickName || '用户',
              phone: localPhone || loginInfo.phone || '',
              avatarUrl: app.globalData.userInfo?.avatarUrl || '/assets/icons/profile.png'
            },
            loading: false
          })
        }
      }
    } catch (err) {
      logger.error('个人中心', '加载用户信息失败', err)
      // 出错时也使用本地数据
      const localPhone = wx.getStorageSync('phone') || ''
      const loginInfo = wx.getStorageSync('loginInfo') || {}
      const app = getApp()
      this.setData({
        userInfo: {
          nickName: app.globalData.userInfo?.nickName || '用户',
          phone: localPhone || loginInfo.phone || '',
          avatarUrl: app.globalData.userInfo?.avatarUrl || '/assets/icons/profile.png'
        },
        loading: false
      })
    }
  },

  // 加载会员信息
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

  // 加载用户统计
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

  // 加载购物车数量
  loadCartCount() {
    try {
      const cart = wx.getStorageSync('cart') || []
      this.setData({ cartCount: cart.length })
    } catch (err) {
      logger.error('个人中心', '加载购物车数量失败', err)
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

        try {
          // 上传到云存储
          const cloudPath = `avatars/${wx.getStorageSync('openid') || 'user'}_${Date.now()}.jpg`

          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath
          })

          const fileID = uploadResult.fileID
          console.log('[头像] 上传成功:', fileID)

          // 获取永久链接
          const getUrlResult = await wx.cloud.getTempFileURL({
            fileList: [fileID]
          })

          const avatarUrl = getUrlResult.fileList[0]?.tempFileURL || fileID

          // 更新本地显示
          const userInfo = { ...this.data.userInfo, avatarUrl: avatarUrl }
          this.setData({ userInfo })

          // 保存到本地存储
          const loginInfo = wx.getStorageSync('loginInfo') || {}
          loginInfo.userInfo = loginInfo.userInfo || {}
          loginInfo.userInfo.avatarUrl = avatarUrl
          wx.setStorageSync('loginInfo', loginInfo)
          wx.setStorageSync('userInfo', loginInfo.userInfo)

          // 更新到服务器
          const openid = wx.getStorageSync('openid')
          if (openid) {
            await this.updateUserAvatarToServer(avatarUrl)
          }

          wx.hideLoading()
          showToast('头像已更新', 'success')

        } catch (err) {
          console.error('[头像] 上传失败:', err)
          wx.hideLoading()
          // 上传到云存储失败，仅保存本地临时路径
          const userInfo = { ...this.data.userInfo, avatarUrl: tempFilePath }
          this.setData({ userInfo })

          const loginInfo = wx.getStorageSync('loginInfo') || {}
          loginInfo.userInfo = loginInfo.userInfo || {}
          loginInfo.userInfo.avatarUrl = tempFilePath
          wx.setStorageSync('loginInfo', loginInfo)
          wx.setStorageSync('userInfo', loginInfo.userInfo)

          showToast('头像已保存（本地）', 'success')
        }
      },
      fail: (err) => {
        console.error('[头像] 选择失败:', err)
        if (err.errMsg !== 'chooseMedia:fail cancel') {
          showToast('选择图片失败')
        }
      }
    })
  },

  // 更新头像到服务器
  async updateUserAvatarToServer(avatarUrl: string) {
    try {
      const openid = wx.getStorageSync('openid')
      if (!openid) return

      // 使用 callFunction 调用 login-http 云函数
      const { callFunction } = require('../../utils/http')
      const res = await callFunction('login-http', {
        action: 'updateUserInfo',
        openid: openid,
        userInfo: { avatarUrl: avatarUrl }
      })
      
      console.log('[头像] 服务器更新结果:', res)
    } catch (err) {
      console.error('[头像] 更新服务器失败:', err)
    }
  },

  // 绑定手机号 - 使用微信 getPhoneNumber 组件
  async bindPhone(e: any) {
    // 检查是否获取到手机号授权码
    if (!e.detail || !e.detail.code) {
      wx.showModal({
        title: '提示',
        content: '需要获取您的手机号才能绑定，请允许授权',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    wx.showLoading({ title: '绑定中...' })

    try {
      // 使用统一的 HTTP API 调用云函数
      const { callFunction } = require('../../utils/http')
      const res: any = await callFunction('login-http', {
        action: 'getPhoneNumber',
        code: e.detail.code
      })
      
      wx.hideLoading()
      console.log('[绑定手机号] 返回:', res)

      if (res && res.success && res.data && res.data.phone) {
        const { phone } = res.data

        // 保存手机号
        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.phone = phone
        loginInfo.phoneBindTime = Date.now()
        wx.setStorageSync('loginInfo', loginInfo)
        wx.setStorageSync('phone', phone)

        // 更新全局数据
        const app = getApp()
        app.globalData.phone = phone

        // 更新页面显示
        const userInfo = { ...this.data.userInfo, phone }
        this.setData({ userInfo })

        wx.showToast({ title: '手机号绑定成功', icon: 'success' })
      } else {
        console.error('[绑定手机号] 失败:', res)
        wx.showToast({ title: res?.error || '绑定失败，请重试', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('[绑定手机号] 请求失败:', err)
      wx.showToast({ title: '网络请求失败', icon: 'none' })
    }
  },

  // 升级会员
  upgradeMember() {
    wx.showModal({
      title: '开通金牌会员',
      content: '开通后可享受：\n• 专属课程折扣\n• 优先客服响应\n• 线下培训优惠\n\n确认开通吗？',
      confirmText: '立即开通',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await newUserApi.upgradeMember('gold', 12)
            if (result.success) {
              wx.showToast({ title: '开通成功！', icon: 'success' })
              this.loadMemberInfo()
            } else {
              wx.showToast({ title: result.error || '开通失败', icon: 'none' })
            }
          } catch (err) {
            wx.showToast({ title: '开通失败', icon: 'none' })
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

  goToMyOrders(e: any) {
    const status = e?.currentTarget?.dataset?.status
    const url = status ? `/pages/my-orders/my-orders?status=${status}` : '/pages/my-orders/my-orders'
    wx.navigateTo({ url })
  },

  goToMyCertificates() {
    wx.navigateTo({ url: '/pages/my-certificates/my-certificates' })
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-888-8888\n工作时间：周一至周五 9:00-18:00',
      showCancel: true,
      cancelText: '复制电话',
      confirmText: '拨打热线',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '4008888888' })
        } else if (res.cancel) {
          wx.setClipboardData({ data: '400-888-8888' })
          wx.showToast({ title: '已复制', icon: 'success' })
        }
      }
    })
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '无人机培训中心\n\n中国航空运输协会认证培训机构\n专业无人机驾驶员培训机构\n\n版本：V1.0.0',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 帮助中心
  showHelp() {
    wx.showModal({
      title: '帮助中心',
      content: '常见问题：\n\n1. 如何报名培训？\n进入课程详情页，点击立即报名即可。\n\n2. 证书如何获取？\n完成培训课程并通过考试后自动生成。\n\n3. 如何联系客服？\n点击联系客服查看电话。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 设置
  showSettings() {
    wx.showModal({
      title: '设置',
      content: '设置功能开发中...\n\n即将上线：\n• 隐私设置\n• 清除缓存',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 加载未读消息数量
  async loadNotificationCount() {
    try {
      const phone = wx.getStorageSync('userPhone') || ''
      if (!phone) {
        this.setData({ notificationCount: 0 })
        return
      }

      const result = await dbQuery('messages', {
        phone: phone,
        status: 'unread'
      })

      const count = result.data?.length || 0
      this.setData({ notificationCount: count })
    } catch (err) {
      logger.error('消息', '加载未读数量失败', err)
    }
  },

  // 跳转消息通知页面
  goToNotifications() {
    wx.navigateTo({ url: '/pages/notifications/notifications' })
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
