// utils/util.ts
// 通用工具函数

/**
 * 格式化日期
 */
export function formatDate(dateStr: string, format = 'YYYY-MM-DD'): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化价格
 */
export function formatPrice(price: number): string {
  return (price / 100).toFixed(2)
}

/**
 * 格式化时长（秒转时分秒）
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

/**
 * 显示加载
 */
export function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载
 */
export function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示提示
 */
export function showToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  wx.showToast({ title, icon, duration: 2000 })
}

/**
 * 显示错误
 */
export function showError(title: string) {
  wx.showToast({ title, icon: 'error', duration: 2000 })
}

/**
 * 显示成功
 */
export function showSuccess(title: string) {
  wx.showToast({ title, icon: 'success', duration: 2000 })
}

/**
 * 确认弹窗
 */
export async function confirm(title: string, content: string): Promise<boolean> {
  try {
    const res = await wx.showModal({ title, content })
    return res.confirm
  } catch {
    return false
  }
}

/**
 * 检查登录状态
 * @deprecated 请使用 getUserPhone() 判断
 */
export function checkLogin(): boolean {
  return !!wx.getStorageSync('phone') || !!wx.getStorageSync('userId')
}

/**
 * 获取用户 ID（内部使用）
 * @deprecated 建议使用 getUserPhone() 用于数据库查询
 */
export function getUserId(): string | null {
  return wx.getStorageSync('userId') || null
}

/**
 * 获取用户手机号（统一用于数据库查询）
 * 兼容旧数据：优先从 phone 获取，其次从 userId 获取
 */
export function getPhone(): string | null {
  // 优先使用正确的 phone key
  const phone = wx.getStorageSync('phone');
  if (phone) return phone;
  
  // 兼容旧数据：userId 实际存的是 phone
  const userId = wx.getStorageSync('userId');
  return userId || null;
}

/**
 * 跳转页面
 */
export function navigateTo(url: string) {
  wx.navigateTo({ url })
}

/**
 * 返回页面
 */
export function navigateBack(delta = 1) {
  wx.navigateBack({ delta })
}

/**
 * 切换 Tab
 */
export function switchTab(url: string) {
  wx.switchTab({ url })
}

/**
 * 统一手机号绑定检查（所有需要手机号的页面调用）
 * 
 * 设计理念：渐进式绑定 — 用户可以先用微信登录浏览内容，
 * 但在涉及交易、支付、报名、合同等操作时，必须绑定手机号。
 * 
 * @param reason - 需要绑定的原因，如"购买课程"、"支付订单"
 * @param fromPage - 当前页面路径（绑定成功后返回），可选
 * @returns true=已绑定可继续，false=未绑定已弹出引导
 * 
 * @example
 * if (!await requirePhoneBinding('支付订单')) return  // 未绑定，已弹窗引导
 * // 继续支付流程...
 */
export async function requirePhoneBinding(reason: string, fromPage?: string): Promise<boolean> {
  // 1. 先检查本地是否已有手机号
  const phone = getPhone()
  if (phone) return true
  
  // 2. 尝试从服务器获取（用户可能在其他端绑定过）
  try {
    const { callFunction } = require('./http')
    const openid = wx.getStorageSync('openid') || ''
    const result = await callFunction('api-user', { action: 'getProfile', openid })
    if (result?.success && result?.data?.user?.phone) {
      const serverPhone = result.data.user.phone
      wx.setStorageSync('phone', serverPhone)
      // 更新 loginInfo
      const loginInfo = wx.getStorageSync('loginInfo') || {}
      loginInfo.phone = serverPhone
      wx.setStorageSync('loginInfo', loginInfo)
      return true
    }
  } catch (err) {
    // 服务器获取失败，继续弹窗引导
  }
  
  // 3. 未绑定，弹出统一引导弹窗
  return new Promise((resolve) => {
    wx.showModal({
      title: '绑定手机号',
      content: `${reason}需要绑定手机号，是否前往绑定？`,
      confirmText: '去绑定',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          // 保存返回路径，绑定成功后跳回
          if (fromPage) {
            wx.setStorageSync('bindPhoneReturnPath', fromPage)
          }
          wx.navigateTo({ url: '/pages/login/login?redirect=bindPhone' })
        }
        resolve(false)
      }
    })
  })
}

/**
 * 获取用户 OpenID
 * 使用 HTTP API 调用云函数，与项目架构一致
 */
export async function getOpenId(): Promise<{ openid: string } | null> {
  try {
    // 优先从本地缓存获取
    const cached = wx.getStorageSync('openid')
    if (cached) {
      return { openid: cached }
    }
    
    // 调用 wx.login 获取 code
    const loginResult = await new Promise<{ code?: string }>((resolve) => {
      wx.login({
        success: (res) => resolve(res),
        fail: () => resolve({})
      })
    })
    
    if (!loginResult.code) {
      console.warn('[util] wx.login 失败，无法获取 openid')
      return null
    }
    
    // 使用 HTTP API 调用 api-auth 云函数获取 openid
    const { callFunction } = require('./http')
    const res = await callFunction('api-auth', { 
      action: 'wxMiniappLogin',
      code: loginResult.code
    })
    
    if (res && res.success && res.data && res.data.openid) {
      wx.setStorageSync('openid', res.data.openid)
      return { openid: res.data.openid }
    }
    
    return null
  } catch (err) {
    console.error('[util] getOpenId failed:', err)
    return null
  }
}

