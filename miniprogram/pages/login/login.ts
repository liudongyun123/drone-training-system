// pages/login/login.ts
// 小程序登录页面

import { showToast } from '../../utils/util'
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

  // 检查登录状态
  checkLoginStatus() {
    const loginInfo = wx.getStorageSync('loginInfo')
    if (loginInfo && loginInfo.openid) {
      this.setData({
        isLoggedIn: true,
        hasPhone: !!loginInfo.phone
      })
    }
  },

  // 微信登录 - 获取用户信息 + 登录
  handleWxLogin() {
    this.setData({ loading: true })

    // 必须先获取用户信息（必须在点击事件中直接调用）
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userRes) => {
        logger.debug('登录', '用户信息', userRes.userInfo)
        const userInfo = userRes.userInfo

        // 获取登录 code
        wx.login({
          success: (loginRes) => {
            logger.debug('登录', 'login code', loginRes.code)

            // 调用云函数登录（HTTP 调用方式）
            wx.request({
              url: `${API_BASE}/login`,
              method: 'POST',
              data: {
                action: 'wxMiniappLogin',
                code: loginRes.code,
                userInfo: userInfo
              },
              success: (res) => {
                logger.debug('登录', '云函数返回', res.data)

                // 直接获取 data 字段（兼容两种格式）
                const responseData = res.data?.data || res.data
                if (res.statusCode === 200 && responseData) {
                  const { openid, userId } = responseData
                  logger.debug('登录', '解析到 openid', { openid, userId })

                  // 保存登录信息到本地
                  const loginInfo = {
                    openid,
                    userId,
                    userInfo: userInfo,
                    loginTime: Date.now()
                  }

                  logger.debug('登录', '保存 loginInfo', loginInfo)
                  wx.setStorageSync('loginInfo', loginInfo)
                  wx.setStorageSync('userInfo', userInfo)
                  wx.setStorageSync('userId', userId)
                  wx.setStorageSync('openid', openid)
                  logger.debug('登录', 'Storage 保存完成', { userId: wx.getStorageSync('userId') })

                  // 使用异步方法保存，确保完成后再跳转
                  wx.setStorage({
                    key: 'loginInfo',
                    data: loginInfo,
                    success: () => {
                      logger.debug('登录', 'loginInfo 保存成功')
                    }
                  })
                  wx.setStorage({
                    key: 'userInfo',
                    data: userInfo,
                    success: () => {
                      logger.debug('登录', 'userInfo 保存成功')
                    }
                  })
                  wx.setStorage({
                    key: 'userId',
                    data: userId,
                    success: () => {
                      logger.debug('登录', 'userId 保存成功')
                    }
                  })
                  wx.setStorage({
                    key: 'openid',
                    data: openid,
                    success: () => {
                      logger.debug('登录', 'openid 保存成功')
                    }
                  })

                  // 更新全局数据
                  const app = getApp()
                  app.globalData.isLoggedIn = true
                  app.globalData.userInfo = userInfo
                  app.globalData.userId = userId
                  app.globalData.openid = openid
                  logger.debug('登录', '全局数据已更新', { userId: app.globalData.userId })

                  this.setData({
                    isLoggedIn: true,
                    userInfo,
                    loading: false
                  })

                  showToast('登录成功', 'success')

                  // 延迟跳转，确保 Storage 写入完成
                  setTimeout(() => {
                    logger.debug('登录', '准备跳转', { userId: wx.getStorageSync('userId') })
                    // 使用 reLaunch 完全重启页面上下文
                    wx.reLaunch({ url: '/pages/index/index' })
                  }, 500)

                } else {
                  const errorMsg = res.data?.error || '登录失败'
                  showToast(errorMsg)
                  this.setData({ loading: false })
                }
              },
              fail: (err) => {
                logger.error('登录', '请求失败', err)
                showToast('网络请求失败')
                this.setData({ loading: false })
              }
            })
          },
          fail: (err) => {
            logger.error('登录', 'wx.login 失败', err)
            showToast('微信登录失败')
            this.setData({ loading: false })
          }
        })
      },
      fail: (err) => {
        logger.error('登录', '获取用户信息失败', err)
        showToast('获取用户信息失败')
        this.setData({ loading: false })
      }
    })
  },

  // 手机号登录
  async handlePhoneLogin(e: any) {
    if (!e.detail.code) {
      showToast('获取手机号失败')
      return
    }

    this.setData({ loading: true })

    try {
      // 获取 openid
      const openid = wx.getStorageSync('openid')

      // 调用云函数获取手机号（HTTP 调用方式）
      const res = await wx.request({
        url: `${API_BASE}/login`,
        method: 'POST',
        data: {
          action: 'getPhoneNumber',
          code: e.detail.code,
          openid: openid
        }
      })

      logger.debug('手机号登录', '云函数返回', res)

      if (res.statusCode === 200 && res.data && res.data.success && res.data.data && res.data.data.phone) {
        const { phone } = res.data.data

        // 更新本地存储
        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.phone = phone
        loginInfo.phoneBindTime = Date.now()
        wx.setStorageSync('loginInfo', loginInfo)
        wx.setStorageSync('phone', phone)

        // 更新全局数据
        const app = getApp()
        app.globalData.phone = phone

        this.setData({
          loading: false,
          hasPhone: true
        })

        showToast('手机号绑定成功', 'success')

        // 绑定成功后跳转到首页
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)

      } else {
        throw new Error(res.errMsg || '获取手机号失败')
      }
    } catch (err: any) {
      logger.error('登录', '获取手机号失败', err)
      this.setData({ loading: false })
      showToast(err.message || '获取手机号失败')
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
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
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