// pages/login/login.ts
// 小程序登录页面

import { showToast } from '../../utils/util'
import { parseError } from '../../utils/error'
import logger from '../../utils/logger'
import { request } from '../../utils/http'
import { USER_AGREEMENT, PRIVACY_POLICY } from '../../utils/constants'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    loading: false,
    hasPhone: false,
    hasAgreed: false
  },

  // 重定向标识：从其他页面跳来绑定手机号
  bindPhoneRedirect: false,

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '登录' })
    // 如果是"去绑定"的重定向，标记一下
    if (options.redirect === 'bindPhone') {
      this.bindPhoneRedirect = true
    }
    this.checkLoginStatus()
  },

  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const loginInfo = wx.getStorageSync('loginInfo')
    const userInfo = wx.getStorageSync('userInfo')
    const phone = wx.getStorageSync('phone')
    
    if (loginInfo && loginInfo.openid) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo || loginInfo.userInfo || { nickName: '用户' },
        hasPhone: !!phone
      })
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        hasPhone: false
      })
    }
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({ hasAgreed: !this.data.hasAgreed })
  },

  // 显示用户协议
  showUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: USER_AGREEMENT,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: PRIVACY_POLICY,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 检查是否同意协议
  checkAgreement(): boolean {
    if (!this.data.hasAgreed) {
      wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' })
      return false
    }
    return true
  },

  // 微信一键登录 - 获取 openid + 手机号
  async handleWxLogin(e: any) {
    // 检查是否同意协议
    if (!this.checkAgreement()) return

    // 检查是否获取到手机号
    if (!e.detail.code) {
      wx.showModal({
        title: '提示',
        content: '需要获取您的手机号才能完成登录，请允许授权',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    this.setData({ loading: true })

    // 获取登录 code
    wx.login({
      success: async (loginRes) => {
        try {
          const result: any = await request('/api-auth', 'POST', {
            action: 'wxMiniappLogin',
            code: loginRes.code,
            userInfo: null
          })

          if (result.success && result.data) {
            const { openid, userId } = result.data

            // 保存登录信息
            const loginInfoData = {
              openid,
              userId,
              loginTime: Date.now()
            }
            wx.setStorageSync('loginInfo', loginInfoData)
            wx.setStorageSync('userId', userId)
            wx.setStorageSync('openid', openid)

            // 更新全局数据
            const app = getApp()
            app.globalData.isLoggedIn = true
            app.globalData.userId = userId
            app.globalData.openid = openid

            // 获取手机号
            this.getPhoneNumber(e.detail.code, openid)
          } else {
            showToast(result?.error || '登录失败')
            this.setData({ loading: false })
          }
        } catch (err: any) {
          logger.error('登录', 'wxMiniappLogin 请求失败', err)
          showToast(err?.message || '网络请求失败')
          this.setData({ loading: false })
        }
      },
      fail: () => {
        showToast('微信登录失败')
        this.setData({ loading: false })
      }
    })
  },

  // 获取用户信息（头像昵称）
  // 注意：wx.getUserProfile 自基础库 2.27.1 起已废弃，返回默认头像和"微信用户"昵称
  // 建议使用 <button open-type="chooseAvatar"> + <input type="nickname"> 方案
  handleGetUserInfo() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userRes) => {
        const userInfo = userRes.userInfo
        
        // 保存用户信息
        wx.setStorageSync('userInfo', userInfo)
        
        // 更新 loginInfo
        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.userInfo = userInfo
        wx.setStorageSync('loginInfo', loginInfo)
        
        // 更新全局数据
        const app = getApp()
        app.globalData.userInfo = userInfo
        
        showToast('头像昵称已更新', 'success')
      },
      fail: (err) => {
        logger.error('错误', '获取用户信息失败', err)
        showToast('获取用户信息失败')
      }
    })
  },

  // 仅获取手机号（不获取用户信息）
  async handlePhoneOnlyLogin(e: any) {
    // 检查是否同意协议
    if (!this.checkAgreement()) return

    if (!e.detail.code) {
      wx.showModal({
        title: '提示',
        content: '需要获取您的手机号才能完成登录，请允许授权',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    this.setData({ loading: true })

    // 获取登录 code
    wx.login({
      success: async (loginRes) => {
        try {
          const result: any = await request('/api-auth', 'POST', {
            action: 'wxMiniappLogin',
            code: loginRes.code,
            userInfo: null
          })

          if (result.success && result.data) {
            const { openid, userId } = result.data

            // 保存登录信息
            const loginInfoData = {
              openid,
              userId,
              loginTime: Date.now()
            }
            wx.setStorageSync('loginInfo', loginInfoData)
            wx.setStorageSync('userId', userId)
            wx.setStorageSync('openid', openid)

            // 更新全局数据
            const app = getApp()
            app.globalData.isLoggedIn = true
            app.globalData.userId = userId
            app.globalData.openid = openid

            // 获取手机号
            this.getPhoneNumber(e.detail.code, openid)
          } else {
            showToast(result?.error || '登录失败')
            this.setData({ loading: false })
          }
        } catch (err: any) {
          logger.error('登录', 'wxMiniappLogin 请求失败', err)
          showToast(err?.message || '网络请求失败')
          this.setData({ loading: false })
        }
      },
      fail: () => {
        showToast('微信登录失败')
        this.setData({ loading: false })
      }
    })
  },

  // 微信登录（只获取 openid，不获取手机号）
  handleWxLoginOnly() {
    // 检查是否同意协议
    if (!this.checkAgreement()) return

    this.setData({ loading: true })

    wx.login({
      success: async (loginRes) => {
        try {
          const result: any = await request('/api-auth', 'POST', {
            action: 'wxMiniappLogin',
            code: loginRes.code,
            userInfo: null
          })

          if (result.success && result.data) {
            const { openid, userId } = result.data

            // 保存登录信息
            const loginInfoData = {
              openid,
              userId,
              loginTime: Date.now()
            }
            wx.setStorageSync('loginInfo', loginInfoData)
            wx.setStorageSync('userId', userId)
            wx.setStorageSync('openid', openid)

            // 更新全局数据
            const app = getApp()
            app.globalData.isLoggedIn = true
            app.globalData.userId = userId
            app.globalData.openid = openid

            this.setData({
              isLoggedIn: true,
              loading: false
            })

            showToast('登录成功', 'success')
            setTimeout(() => {
              wx.reLaunch({ url: '/pages/index/index' })
            }, 1000)
          } else {
            showToast(result?.error || '登录失败')
            this.setData({ loading: false })
          }
        } catch (err: any) {
          logger.error('登录', 'wxMiniappLogin 请求失败', err)
          showToast(err?.message || '网络请求失败')
          this.setData({ loading: false })
        }
      },
      fail: () => {
        showToast('微信登录失败')
        this.setData({ loading: false })
      }
    })
  },

  // 获取手机号并保存
  async getPhoneNumber(code: string, openid: string) {
    try {
      const result: any = await request('/api-auth', 'POST', {
        action: 'wxPhoneLogin',
        code: code,
        openid: openid
      })

      logger.debug('登录', 'wxPhoneLogin 返回:', result)

      if (result.success && result.data && result.data.phone) {
        const { phone } = result.data

        // 保存手机号
        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.phone = phone
        loginInfo.phoneBindTime = Date.now()
        wx.setStorageSync('loginInfo', loginInfo)
        wx.setStorageSync('phone', phone)

        // 更新全局数据
        const app = getApp()
        app.globalData.phone = phone

        logger.debug('登录', '手机号保存成功:', phone)

        this.setData({
          loading: false,
          hasPhone: true
        })

        showToast('登录并绑定成功', 'success')
        setTimeout(() => {
          if (this.bindPhoneRedirect) {
            wx.navigateBack({ delta: 1 })
          } else {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        }, 1500)
      } else {
        logger.error('登录', '获取手机号失败:', result)
        this.setData({ loading: false })
        showToast(result?.error || '获取手机号失败')
      }
    } catch (err: any) {
      logger.error('登录', '获取手机号请求失败:', err)
      this.setData({ loading: false })
      showToast(err?.message || '网络请求失败')
    }
  },

  // 手机号登录（独立使用）
  async handlePhoneLogin(e: any) {
    if (!e.detail.code) {
      showToast('获取手机号失败')
      return
    }

    this.setData({ loading: true })

    const openid = wx.getStorageSync('openid')

    try {
      const result: any = await request('/api-auth', 'POST', {
        action: 'wxPhoneLogin',
        code: e.detail.code,
        openid: openid
      })

      logger.debug('手机号登录', '返回:', result)

      if (result.success && result.data && result.data.phone) {
        const { phone } = result.data

        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.phone = phone
        loginInfo.phoneBindTime = Date.now()
        wx.setStorageSync('loginInfo', loginInfo)
        wx.setStorageSync('phone', phone)

        const app = getApp()
        app.globalData.phone = phone

        this.setData({
          loading: false,
          hasPhone: true
        })

    showToast('手机号绑定成功', 'success')
    setTimeout(() => {
      // ★ 如果是后置绑定（从其他页面跳来），返回上一页
      if (this.bindPhoneRedirect) {
        wx.navigateBack({ delta: 1 })
      } else {
        wx.switchTab({ url: '/pages/index/index' })
      }
    }, 1500)
      } else {
        logger.error('手机号登录', '获取手机号失败:', result)
        this.setData({ loading: false })
        showToast(result?.error || '获取手机号失败')
      }
    } catch (err: any) {
      logger.error('手机号登录', '请求失败:', err)
      this.setData({ loading: false })
      showToast(err?.message || '网络请求失败')
    }
  },

  // 跳过手机号绑定
  handleSkip() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          // 通知服务器登出（非阻塞）
          const token = wx.getStorageSync('loginInfo')?.token
          if (token) {
            request('/api-auth', 'POST', { action: 'logout', token }).catch(() => {})
          }

          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userId')
          wx.removeStorageSync('phone')
          wx.removeStorageSync('openid')
          wx.removeStorageSync('loginInfo')

          const app = getApp()
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = null
          app.globalData.userId = null
          app.globalData.phone = null
          app.globalData.openid = null

          this.setData({
            isLoggedIn: false,
            userInfo: null,
            hasPhone: false
          })

          showToast('已退出登录')
        }
      }
    })
  }
})
