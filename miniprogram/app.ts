// app.ts
// 无人机培训小程序入口

import { initCloud } from './utils/cloudbase'
import logger from './utils/logger'
import { PRIVACY_POPUP_CONTENT } from './utils/constants'

interface IAppOption {
  globalData: {
    userInfo?: any
    isLoggedIn: boolean
    userId?: string
    phone?: string
    envId: string
    networkType?: string
    isConnected?: boolean
    // 体系切换全局状态
    currentSourceId: string
    currentSource: string
  }
  userInfoReadyCallback?: any
  initNetworkStatus?: () => void
  checkLoginStatus?: () => void
  // 体系切换事件回调列表
  _sourceChangeCallbacks?: Array<(sourceId: string, source: string) => void>
}

App<IAppOption>({
  globalData: {
    isLoggedIn: false,
    envId: 'rcwljy-5ghmq2ex26764978',
    isConnected: true,
    currentSourceId: '',
    currentSource: 'RENSHE'
  },

  _sourceChangeCallbacks: [],

  onLaunch() {
    // 初始化云开发
    initCloud()
    
    // 恢复上次选择的体系（Storage 持久化）
    const savedSourceId = wx.getStorageSync('currentSourceId')
    const savedSource = wx.getStorageSync('currentSource')
    if (savedSourceId) {
      this.globalData.currentSourceId = savedSourceId
      this.globalData.currentSource = savedSource || 'RENSHE'
      logger.info('App', '恢复体系状态', { sourceId: savedSourceId, source: savedSource })
    }
    
    // 检查 Storage 状态
    const userId = wx.getStorageSync('userId')
    const loginInfo = wx.getStorageSync('loginInfo')
    logger.debug('App', 'onLaunch Storage', { userId, hasLoginInfo: !!loginInfo })
    
    // 初始化网络状态
    this.initNetworkStatus()
    
    this.checkLoginStatus()
    
    // 首次启动显示隐私政策弹窗（审核要求）
    this.showPrivacyPopup()
  },

  /**
   * 切换体系（全局入口，所有页面应通过此方法切换）
   * @param sourceId - 体系 _id
   * @param source - 体系 code（如 RENSHE/CAAC）
   */
  switchSource(sourceId: string, source: string) {
    if (!sourceId || sourceId === this.globalData.currentSourceId) return
    
    this.globalData.currentSourceId = sourceId
    this.globalData.currentSource = source
    
    // 持久化到 Storage
    wx.setStorageSync('currentSourceId', sourceId)
    wx.setStorageSync('currentSource', source)
    
    logger.info('App', '切换体系', { sourceId, source })
    
    // 通知所有注册的页面回调
    if (this._sourceChangeCallbacks) {
      this._sourceChangeCallbacks.forEach(cb => {
        try { cb(sourceId, source) } catch (e) { logger.error('App', 'sourceChange callback error', e) }
      })
    }
  },

  /**
   * 注册体系变更监听（页面 onLoad 时注册，onUnload 时取消）
   */
  onSourceChange(callback: (sourceId: string, source: string) => void) {
    if (!this._sourceChangeCallbacks) this._sourceChangeCallbacks = []
    this._sourceChangeCallbacks.push(callback)
  },

  /**
   * 取消注册
   */
  offSourceChange(callback: (sourceId: string, source: string) => void) {
    if (!this._sourceChangeCallbacks) return
    const idx = this._sourceChangeCallbacks.indexOf(callback)
    if (idx >= 0) this._sourceChangeCallbacks.splice(idx, 1)
  },

  // 隐私政策弹窗
  showPrivacyPopup() {
    const hasAgreed = wx.getStorageSync('privacy_agreed')
    if (hasAgreed) return
    
    wx.showModal({
      title: '用户隐私政策',
      content: PRIVACY_POPUP_CONTENT,
      confirmText: '同意',
      cancelText: '不同意',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('privacy_agreed', true)
        } else {
          // 用户不同意，提示后再次询问
          wx.showToast({ title: '需要同意隐私政策才能使用', icon: 'none', duration: 2000 })
          setTimeout(() => this.showPrivacyPopup(), 2500)
        }
      }
    })
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
