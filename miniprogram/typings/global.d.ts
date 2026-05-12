/// <reference path="../node_modules/miniprogram-api-typings/index.d.ts" />

declare const wx: WechatMiniprogram.Wx
declare const App: WechatMiniprogram.App
declare const Page: WechatMiniprogram.Page
declare const Component: WechatMiniprogram.Component
declare const getApp: WechatMiniprogram.GetApp
declare const getCurrentPages: WechatMiniprogram.GetCurrentPages

interface UserInfoReadyCallback {
  userInfo: WechatMiniprogram.UserInfo
  rawData: string
  signature: string
  encryptedData: string
  iv: string
}

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    isLoggedIn: boolean
    userId?: string
    phone?: string
    envId: string
    networkType?: string
    isConnected?: boolean
  }
  userInfoReadyCallback?: UserInfoReadyCallback
  initNetworkStatus?: () => void
  checkLoginStatus?: () => void
  onLaunch?: () => void
  onShow?: () => void
  onHide?: () => void
  onError?: (err: string) => void
}

// 扩展 Logger 接口
interface Logger {
  debug(tag: string, message: string, data?: any): void
  error(tag: string, message: string, error?: any): void
  info(tag: string, message: string, data?: any): void
  warn(tag: string, message: string, data?: any): void
}

declare const logger: Logger

// 扩展 SourceService 类型
interface SourceServiceResult {
  count?: number
  fromCache?: boolean
  fromFallback?: boolean
  [key: string]: any
}

