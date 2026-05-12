// app.ts
// 无人机培训小程序入口

import { initCloud } from './utils/cloudbase'
import logger from './utils/logger'

interface IAppOption {
  globalData: {
    userInfo?: any
    isLoggedIn: boolean
    userId?: string
    phone?: string
    envId: string
    networkType?: string
    isConnected?: boolean
  }
  userInfoReadyCallback?: any
  initNetworkStatus?: () => void
  checkLoginStatus?: () => void
}

App<IAppOption>({
  globalData: {
    isLoggedIn: false,
    envId: 'rcwljy-5ghmq2ex26764978',
    isConnected: true
  },

  onLaunch() {
    // 初始化云开发
    initCloud()
    
    // 检查 Storage 状态
    const userId = wx.getStorageSync('userId')
    const loginInfo = wx.getStorageSync('loginInfo')
    logger.debug('App', 'onLaunch Storage', { userId, hasLoginInfo: !!loginInfo })
    
    // 初始化网络状态
    this.initNetworkStatus()
    
    this.checkLoginStatus()
  },

  onError(err) {
    logger.error('App', 'Error', err)
  },

  onShow() {
    // 小程序显示时的逻辑
  },

  onHide() {
    // 小程序隐藏时的逻辑
  },

  initNetworkStatus() {
    // 获取当前网络状态
    wx.getNetworkType({
      success: (res) => {
        this.globalData.networkType = res.networkType
        this.globalData.isConnected = res.networkType !== 'none'
      }
    })
    
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.globalData.networkType = res.networkType
      this.globalData.isConnected = res.isConnected
      
      if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开',
          icon: 'none',
          duration: 3000
        })
      } else {
        wx.showToast({
          title: '网络已恢复',
          icon: 'success',
          duration: 2000
        })
      }
    })
  },

  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    const userId = wx.getStorageSync('userId')
    const phone = wx.getStorageSync('phone')

    if (userInfo && userId) {
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
      this.globalData.userId = userId
      this.globalData.phone = phone
    }
  }
})
