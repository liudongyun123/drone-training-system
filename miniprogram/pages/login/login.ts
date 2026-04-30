// pages/login/login.ts
// 小程序登录页面

import { showLoading, hideLoading, showToast, checkLogin } from '../../utils/util'
import { callFunction } from '../../utils/http'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    loading: false
  },

  onLoad() {
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
      
      // 通过 HTTP 调用云函数登录
      const res = await callFunction('login', { code, userInfo })
      
      if (res) {
        wx.setStorageSync('userInfo', userInfo)
        wx.setStorageSync('userId', res.userId)
        wx.setStorageSync('openid', res.openid)
        
        const app = getApp()
        app.globalData.isLoggedIn = true
        app.globalData.userInfo = userInfo
        app.globalData.userId = res.userId
        
        this.setData({ 
          isLoggedIn: true,
          userInfo,
          loading: false
        })
        
        showToast('登录成功', 'success')
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err: any) {
      console.error('登录失败:', err)
      this.setData({ loading: false })
      showToast(err.message || '登录失败')
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
      const res = await callFunction('getPhoneNumber', { code: e.detail.code })
      
      if (res) {
        const phone = res.phoneNumber
        
        wx.setStorageSync('phone', phone)
        
        const app = getApp()
        app.globalData.phone = phone
        
        this.setData({ loading: false })
        showToast('手机号绑定成功', 'success')
      }
    } catch (err: any) {
      console.error('获取手机号失败:', err)
      this.setData({ loading: false })
      showToast(err.message || '获取手机号失败')
    }
  },

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
