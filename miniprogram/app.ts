// app.ts
// 无人机培训小程序入口

import { initCloud } from './utils/cloudbase'
import logger from './utils/logger'

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    isLoggedIn: boolean
    userId?: string
    phone?: string
    envId: string
  }
  userInfoReadyCallback?: WechatMiniprogram.UserInfoReadyCallback
}

App<IAppOption>({
  globalData: {
    isLoggedIn: false,
    envId: 'rcwljy-5ghmq2ex26764978'
  },

  onLaunch() {
    // 初始化云开发
    initCloud()
    
    // 检查 Storage 状态
    const userId = wx.getStorageSync('userId')
    const loginInfo = wx.getStorageSync('loginInfo')
    logger.debug('App', 'onLaunch Storage', { userId, hasLoginInfo: !!loginInfo })
    
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
