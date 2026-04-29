// pages/login/login.ts
// 小程序登录页面

import { showLoading, hideLoading, showToast, checkLogin } from '../../utils/util'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    loading: false
  },

  onLoad() {
    // 检查登录状态
    if (checkLogin()) {
      this.setData({ isLoggedIn: true })
    }
  },

  // 微信登录
  async handleWxLogin() {
    this.setData({ loading: true })
    
    try {
      // 获取用户信息
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })
      
      // 获取登录 code
      const { code } = await wx.login()
      
      // 调用云函数登录
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { code, userInfo }
      })
      
      if (res.result) {
        // 存储用户信息
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('userId', res.result.userId)
        wx.setStorageSync('openid', res.result.openid)
        
        // 更新全局数据
        const app = getApp()
        app.globalData.isLoggedIn = true
        app.globalData.userInfo = userInfo
        app.globalData.userId = res.result.userId
        
        this.setData({ 
          isLoggedIn: true,
          userInfo,
          loading: false
        })
        
        showToast('登录成功', 'success')
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err: any) {
      console.error('登录失败:', err)
      this.setData({ loading: false })
      showToast(err.errMsg || '登录失败')
    }
  },

  // 手机号登录
  async handlePhoneLogin(e: any) {
    if (!e.detail.code) {
      showToast('获取手机号失败')
      return
    }
    
    this.setData({ loading: true })
    
    try {
      // 调用云函数获取手机号
      const res = await wx.cloud.callFunction({
        name: 'getPhoneNumber',
        data: { code: e.detail.code }
      })
      
      if (res.result) {
        const phone = res.result.phoneNumber
        
        // 存储手机号
        wx.setStorageSync('phone', phone)
        
        const app = getApp()
        app.globalData.phone = phone
        
        this.setData({ loading: false })
        showToast('手机号绑定成功', 'success')
      }
    } catch (err: any) {
      console.error('获取手机号失败:', err)
      this.setData({ loading: false })
      showToast(err.errMsg || '获取手机号失败')
    }
  },

  // 已登录状态下的操作
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userId')
          wx.removeStorageSync('phone')
          wx.removeStorageSync('openid')
          
          const app = getApp()
          app.globalData.isLoggedIn = false
          app.globalData.userInfo = null
          app.globalData.userId = null
          app.globalData.phone = null
          
          this.setData({ 
            isLoggedIn: false,
            userInfo: null
          })
          
          showToast('已退出登录')
        }
      }
    })
  }
})