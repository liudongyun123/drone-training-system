// pages/login/login.ts
// 小程序登录页面

import { showToast } from '../../utils/util'
import { parseError } from '../../utils/error'
import logger from '../../utils/logger'

// 腾讯云 CloudBase HTTP API 地址
const API_BASE = 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    loading: false,
    hasPhone: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '登录' })
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

  // 微信一键登录 - 仅获取手机号
  async handleWxLogin(e: any) {
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
      success: (loginRes) => {
        // 调用云函数登录
        wx.request({
          url: `${API_BASE}/login`,
          method: 'POST',
          data: {
            action: 'wxMiniappLogin',
            code: loginRes.code,
            userInfo: null
          },
          success: (res) => {
            const responseData = res.data?.data || res.data
            if (res.statusCode === 200 && responseData) {
              const { openid, userId } = responseData

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
              showToast('登录失败')
              this.setData({ loading: false })
            }
          },
          fail: () => {
            showToast('网络请求失败')
            this.setData({ loading: false })
          }
        })
      },
      fail: () => {
        showToast('微信登录失败')
        this.setData({ loading: false })
      }
    })
  },

  // 获取用户信息（头像昵称）- 单独点击触发
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
        console.error('获取用户信息失败', err)
        showToast('获取用户信息失败')
      }
    })
  },

  // 仅获取手机号（不获取用户信息）
  async handlePhoneOnlyLogin(e: any) {
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
      success: (loginRes) => {
        // 调用云函数登录
        wx.request({
          url: `${API_BASE}/login`,
          method: 'POST',
          data: {
            action: 'wxMiniappLogin',
            code: loginRes.code,
            userInfo: null
          },
          success: (res) => {
            const responseData = res.data?.data || res.data
            if (res.statusCode === 200 && responseData) {
              const { openid, userId } = responseData

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
              showToast('登录失败')
              this.setData({ loading: false })
            }
          },
          fail: () => {
            showToast('网络请求失败')
            this.setData({ loading: false })
          }
        })
      },
      fail: () => {
        showToast('微信登录失败')
        this.setData({ loading: false })
      }
    })
  },

  // 微信登录（只获取 openid，不获取手机号）
  handleWxLoginOnly() {
    this.setData({ loading: true })

    wx.login({
      success: (loginRes) => {
        wx.request({
          url: `${API_BASE}/login`,
          method: 'POST',
          data: {
            action: 'wxMiniappLogin',
            code: loginRes.code,
            userInfo: null
          },
          success: (res) => {
            const responseData = res.data?.data || res.data
            if (res.statusCode === 200 && responseData) {
              const { openid, userId } = responseData

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
              showToast('登录失败')
              this.setData({ loading: false })
            }
          },
          fail: () => {
            showToast('网络请求失败')
            this.setData({ loading: false })
          }
        })
      },
      fail: () => {
        showToast('微信登录失败')
        this.setData({ loading: false })
      }
    })
  },

  // 获取手机号并保存
  getPhoneNumber(code: string, openid: string) {
    wx.request({
      url: `${API_BASE}/login`,
      method: 'POST',
      data: {
        action: 'getPhoneNumber',
        code: code,
        openid: openid
      },
      success: (res: any) => {
        console.log('[登录] getPhoneNumber 返回:', res.data)

        if (res.statusCode === 200 && res.data && res.data.success && res.data.data && res.data.data.phone) {
          const { phone } = res.data.data

          // 保存手机号
          const loginInfo = wx.getStorageSync('loginInfo') || {}
          loginInfo.phone = phone
          loginInfo.phoneBindTime = Date.now()
          wx.setStorageSync('loginInfo', loginInfo)
          wx.setStorageSync('phone', phone)

          // 更新全局数据
          const app = getApp()
          app.globalData.phone = phone

          console.log('[登录] 手机号保存成功:', phone)

          this.setData({
            loading: false,
            hasPhone: true
          })

          showToast('登录并绑定成功', 'success')
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1500)
        } else {
          console.error('[登录] 获取手机号失败:', res.data)
          this.setData({ loading: false })
          showToast('获取手机号失败')
        }
      },
      fail: (err) => {
        console.error('[登录] 获取手机号请求失败:', err)
        this.setData({ loading: false })
        showToast('网络请求失败')
      }
    })
  },

  // 手机号登录（独立使用）
  handlePhoneLogin(e: any) {
    if (!e.detail.code) {
      showToast('获取手机号失败')
      return
    }

    this.setData({ loading: true })

    const openid = wx.getStorageSync('openid')

    wx.request({
      url: `${API_BASE}/login`,
      method: 'POST',
      data: {
        action: 'getPhoneNumber',
        code: e.detail.code,
        openid: openid
      },
      success: (res: any) => {
        console.log('[手机号登录] 返回:', res.data)

        if (res.statusCode === 200 && res.data && res.data.success && res.data.data && res.data.data.phone) {
          const { phone } = res.data.data

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
            wx.switchTab({ url: '/pages/index/index' })
          }, 1500)
        } else {
          console.error('[手机号登录] 获取手机号失败:', res.data)
          this.setData({ loading: false })
          showToast(res.data?.error || '获取手机号失败')
        }
      },
      fail: (err) => {
        console.error('[手机号登录] 请求失败:', err)
        this.setData({ loading: false })
        showToast('网络请求失败')
      }
    })
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
      success: (res) => {
        if (res.confirm) {
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
