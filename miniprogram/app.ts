// app.ts
// 无人机培训小程序入口

import { initCloud } from './utils/cloudbase'

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
    this.checkLoginStatus()
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
