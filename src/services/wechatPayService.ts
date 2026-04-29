/**
 * 微信支付前端服务
 * 封装支付创建、轮询、二维码展示逻辑
 */

import { app } from '@/utils/cloudbase'

export interface WechatPayResult {
  codeUrl?: string    // Native Pay 二维码链接
  h5Url?: string      // H5 支付跳转链接
  outTradeNo: string  // 商户订单号
  orderId: string     // 系统订单ID
  payType: 'native' | 'h5'
  _mock?: boolean     // 是否模拟模式
}

/**
 * 创建微信支付订单
 */
export async function createWechatPay(params: {
  orderId: string
  payType?: 'native' | 'h5'
}): Promise<WechatPayResult | null> {
  try {
    const result = await app.callFunction({
      name: 'wechat-pay',
      data: {
        action: 'createOrder',
        orderId: params.orderId,
        payType: params.payType || 'native',
      }
    })

    const response = result.result as any
    
    if (response.code === 0 && response.data) {
      console.log('[WechatPay] 支付订单创建成功:', response.data)
      return response.data as WechatPayResult
    } else {
      console.error('[WechatPay] 创建失败:', response.message)
      throw new Error(response.message || '创建支付订单失败')
    }
  } catch (error: any) {
    console.error('[WechatPay] 请求失败:', error)
    throw error
  }
}

/**
 * 查询支付状态
 */
export async function queryWechatPay(outTradeNo: string): Promise<{
  tradeState: string
  tradeStateDesc: string
  paidAt?: string
} | null> {
  try {
    const result = await app.callFunction({
      name: 'wechat-pay',
      data: {
        action: 'queryOrder',
        outTradeNo
      }
    })

    const response = result.result as any
    
    if (response.code === 0) {
      return response.data
    }
    
    return null
  } catch (error) {
    console.error('[WechatPay] 查询失败:', error)
    return null
  }
}

/**
 * 轮询支付结果（直到用户支付或超时）
 * 
 * @returns 'success' | 'timeout' | 'cancelled'
 */
export async function pollPaymentResult(
  outTradeNo: string,
  options: {
    interval?: number    // 轮询间隔（毫秒），默认 2000
    timeout?: number     // 超时时间（毫秒），默认 300000（5分钟）
    onPolling?: (status: string) => void  // 轮询回调
  } = {}
): Promise<'success' | 'timeout'> {
  const { interval = 2000, timeout = 300000, onPolling } = options
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      // 超时检查
      if (Date.now() - startTime > timeout) {
        clearInterval(timer)
        resolve('timeout')
        return
      }
      
      const result = await queryWechatPay(outTradeNo)
      
      if (onPolling) {
        onPolling(result?.tradeState || 'PENDING')
      }
      
      if (result?.tradeState === 'SUCCESS') {
        clearInterval(timer)
        resolve('success')
      }
      
      if (result?.tradeState === 'CLOSED' || result?.tradeState === 'REVOKED') {
        clearInterval(timer)
        resolve('timeout')
      }
    }, interval)
  })
}

/**
 * 判断是否为移动端
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * 根据设备自动选择支付方式
 */
export function getPayType(): 'native' | 'h5' {
  // 如果在微信内置浏览器中，使用 H5（后续可改为 JSAPI）
  const isWechat = /MicroMessenger/i.test(navigator.userAgent)
  
  if (isMobile() && !isWechat) {
    return 'h5'  // 手机浏览器 → H5 支付
  }
  
  return 'native'  // PC 或微信内 → 扫码支付
}

export default {
  createWechatPay,
  queryWechatPay,
  pollPaymentResult,
  isMobile,
  getPayType
}