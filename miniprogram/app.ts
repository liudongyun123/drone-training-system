// app.ts
// 无人机培训小程序入口

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    isLoggedIn: boolean
    userId?: string
    phone?: string
    envId: string  // CloudBase 环境 ID
  }
  userInfoReadyCallback?: WechatMiniprogram.UserInfoReadyCallback
}

App<IAppOption>({
  globalData: {
    isLoggedIn: false,
    envId: 'drone-training-xxx'  // 替换为实际的 CloudBase 环境ID
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true
      })
    }

    // 检查登录状态
    this.checkLoginStatus()
  },

  onShow() {
    // 小程序显示时的逻辑
  },

  onHide() {
    // 小程序隐藏时的逻辑
  },

  // 检查登录状态
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
  },

  // 登录
  async login() {
    try {
      // 获取微信登录 code
      const { code } = await wx.login()
      
      // 调用云函数获取 openid
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { code }
      })

      if (res.result) {
        const openid = res.result.openid
        wx.setStorageSync('openid', openid)
        return openid
      }
    } catch (err) {
      console.error('登录失败', err)
      throw err
    }
  },

  // 获取用户信息
  async getUserProfile() {
    try {
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      })
      
      this.globalData.userInfo = userInfo
      wx.setStorageSync('userInfo', userInfo)
      
      return userInfo
    } catch (err) {
      console.error('获取用户信息失败', err)
      throw err
    }
  }
})