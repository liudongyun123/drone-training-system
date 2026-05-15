/**
 * 微信支付云函数 v2.0
 * 支持：Native Pay（PC扫码）+ H5支付（手机浏览器）+ JSAPI（小程序）
 * 
 * 版本: v20260715-jsapi
 */

const crypto = require('crypto')
const tcb = require('tcb-admin-node')

const app = tcb.init()
const db = app.database()

// ========== 支付配置（★ 需要在云函数环境变量中配置） ==========
const CONFIG = {
  // 小程序 AppID
  APPID: process.env.WX_APPID || 'wx25aaf895ab86181a',
  
  // 微信支付商户号
  MCH_ID: process.env.WX_MCH_ID || '1726655499',
  
  // API v3 密钥（★ 必填）
  API_KEY: process.env.WX_API_KEY || '',  // ★ 需要填写
  
  // API 证书序列号
  CERT_SERIAL_NO: process.env.WX_CERT_SERIAL_NO || '',
  
  // 回调通知地址（必须 HTTPS）
  NOTIFY_URL: process.env.WX_NOTIFY_URL || '',  // ★ 需要填写
  
  // 请求超时
  TIMEOUT: 10000,
}

// 微信支付 API 地址
const WX_PAY_BASE = 'https://api.mch.weixin.qq.com'

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}

/**
 * HTTP 请求封装
 */
async function httpRequest(url, method, data, headers = {}) {
  const https = require('https')
  const urlObj = new URL(url)
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          resolve({ raw: body })
        }
      })
    })
    
    req.on('error', reject)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

// ========== 主函数 ==========
exports.main = async (event, context) => {
  const { action } = event
  
  console.log('[WechatPay] 请求:', { action, orderId: event.orderId })
  
  try {
    switch (action) {
      case 'createOrder':
        return await createPayOrder(event)
      case 'createJsapiOrder':
        // JSAPI 支付：先创建支付订单，再返回小程序调起支付所需的参数
        return await createJsapiPayOrder(event)
      case 'queryOrder':
        return await queryPayOrder(event)
      case 'handleCallback':
        return await handlePayCallback(event)
      case 'refund':
        return await createRefund(event)
      case 'getConfig':
        return { code: 0, data: { appId: CONFIG.APPID, mchId: CONFIG.MCH_ID ? '***' : '未配置' } }
      default:
        return { code: 400, message: `未知操作: ${action}` }
    }
  } catch (error) {
    console.error('[WechatPay] 错误:', error)
    return { code: 500, message: error.message }
  }
}

// ========== 创建支付订单 ==========
async function createPayOrder(event) {
  const { orderId, payType = 'native', clientIp = '127.0.0.1' } = event
  
  if (!CONFIG.MCH_ID || !CONFIG.API_KEY) {
    console.error('[WechatPay] 商户号或密钥未配置')
    return { code: 500, message: '微信支付未配置，请联系管理员' }
  }
  
  // 1. 查询订单
  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    return { code: 404, message: '订单不存在' }
  }
  
  const order = orderRes.data
  
  if (order.status === 'paid') {
    return { code: 400, message: '订单已支付' }
  }
  
  // 2. 生成微信支付订单号
  const outTradeNo = order.orderNo || `ORD${Date.now()}`
  
  // 3. 构建请求参数
  const body = {
    appid: CONFIG.APPID,
    mchid: CONFIG.MCH_ID,
    description: order.courseName || `课程购买-${outTradeNo.slice(-8)}`,
    out_trade_no: outTradeNo,
    notify_url: CONFIG.NOTIFY_URL,
    amount: {
      total: Math.round((order.finalAmount || order.amount || 0) * 100),  // 元转分
      currency: 'CNY'
    },
  }
  
  // 根据支付类型添加不同参数
  if (payType === 'native') {
    // PC 扫码支付
    // 无需额外参数，微信会返回 code_url
  } else if (payType === 'h5') {
    // H5 支付（手机浏览器）
    if (!CONFIG.H5_DOMAIN) {
      return { code: 500, message: 'H5 支付域名未配置' }
    }
    body.scene_info = {
      payer_client_ip: clientIp,
      h5_info: {
        type: 'Wap',
        h5_info: {
          type: 'Wap',
          wap_url: CONFIG.H5_DOMAIN,
          wap_name: '无人机培训系统'
        }
      }
    }
  }
  
  console.log('[WechatPay] 创建订单参数:', JSON.stringify(body))
  
  // 4. 调用微信支付 API
  try {
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/pay/transactions/${payType === 'h5' ? 'h5' : 'native'}`,
      'POST',
      body
    )
    
    console.log('[WechatPay] 微信返回:', JSON.stringify(result))
    
    if (result.code_url) {
      // Native Pay：返回二维码链接
      return {
        code: 0,
        message: '支付订单创建成功',
        data: {
          payType: 'native',
          codeUrl: result.code_url,  // 二维码内容
          outTradeNo,
          orderId: order._id
        }
      }
    } else if (result.h5_url) {
      // H5 Pay：返回跳转链接
      return {
        code: 0,
        message: '支付订单创建成功',
        data: {
          payType: 'h5',
          h5Url: result.h5_url,
          outTradeNo,
          orderId: order._id
        }
      }
    } else {
      console.error('[WechatPay] 微信返回异常:', result)
      return { code: 500, message: '创建支付订单失败: ' + JSON.stringify(result) }
    }
  } catch (err) {
    console.error('[WechatPay] 请求微信失败:', err.message)
    
    // 开发环境：返回模拟数据
    if (process.env.NODE_ENV === 'development') {
      console.log('[WechatPay] 开发模式，返回模拟支付二维码')
      return {
        code: 0,
        message: '支付订单创建成功（模拟）',
        data: {
          payType: 'native',
          codeUrl: `https://qr.alipay.com/demo_${outTradeNo}`,
          outTradeNo,
          orderId: order._id,
          _mock: true
        }
      }
    }
    
    return { code: 500, message: '请求微信支付失败: ' + err.message }
  }
}

// ========== 小程序 JSAPI 支付 ==========
async function createJsapiPayOrder(event) {
  const { orderId, openid } = event
  
  if (!CONFIG.MCH_ID || !CONFIG.API_KEY) {
    console.error('[WechatPay] 商户号或密钥未配置')
    return { code: 500, message: '微信支付未配置，请联系管理员' }
  }
  
  if (!openid) {
    return { code: 400, message: '缺少用户 openid' }
  }
  
  // 1. 查询订单
  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    return { code: 404, message: '订单不存在' }
  }
  
  const order = orderRes.data
  
  if (order.status === 'paid') {
    return { code: 400, message: '订单已支付' }
  }
  
  // 2. 生成微信支付订单号
  const outTradeNo = order.orderNo || `ORD${Date.now()}`
  
  // 3. 构建 JSAPI 请求参数
  const body = {
    appid: CONFIG.APPID,
    mchid: CONFIG.MCH_ID,
    description: order.courseName || order.items?.[0]?.title || `订单-${outTradeNo.slice(-8)}`,
    out_trade_no: outTradeNo,
    notify_url: CONFIG.NOTIFY_URL,
    amount: {
      total: Math.round((order.finalAmount || order.amount || order.totalPrice || 0) * 100),
      currency: 'CNY'
    },
    payer: {
      openid: openid
    }
  }
  
  console.log('[WechatPay JSAPI] 创建订单参数:', JSON.stringify(body))
  
  // 4. 调用微信支付 API
  try {
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/pay/transactions/jsapi`,
      'POST',
      body
    )
    
    console.log('[WechatPay JSAPI] 微信返回:', JSON.stringify(result))
    
    if (result.prepay_id) {
      // 5. 构建小程序调起支付的参数
      const timeStamp = Math.floor(Date.now() / 1000).toString()
      const nonceStr = generateNonceStr(32)
      const packageStr = `prepay_id=${result.prepay_id}`
      
      // 6. 签名（使用 APIv3 密钥）
      const signParams = [CONFIG.APPID, timeStamp, nonceStr, packageStr].join('\n')
      const sign = crypto.createHmac('sha256', CONFIG.API_KEY).update(signParams).digest('hex').toUpperCase()
      
      console.log('[WechatPay JSAPI] 支付签名完成')
      
      // 更新订单的微信支付订单号
      await db.collection('orders').doc(orderId).update({
        wxPrepayId: result.prepay_id,
        wxOutTradeNo: outTradeNo,
        updatedAt: new Date().toISOString()
      })
      
      return {
        code: 0,
        message: '支付参数获取成功',
        data: {
          orderId: order._id,
          outTradeNo,
          timeStamp,
          nonceStr,
          package: packageStr,
          signType: 'RSA',
          paySign: sign,
          appId: CONFIG.APPID
        }
      }
    } else {
      console.error('[WechatPay JSAPI] 微信返回异常:', result)
      return { code: 500, message: '创建支付订单失败: ' + JSON.stringify(result) }
    }
  } catch (err) {
    console.error('[WechatPay JSAPI] 请求微信失败:', err.message)
    return { code: 500, message: '请求微信支付失败: ' + err.message }
  }
}

// ========== 查询支付状态 ==========
async function queryPayOrder(event) {
  const { outTradeNo } = event
  
  if (!CONFIG.MCH_ID) {
    return { code: 500, message: '微信支付未配置' }
  }
  
  try {
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${CONFIG.MCH_ID}`,
      'GET'
    )
    
    return {
      code: 0,
      data: {
        tradeState: result.trade_state,  // SUCCESS / NOTPAY / CLOSED
        tradeStateDesc: result.trade_state_desc,
        paidAt: result.success_time
      }
    }
  } catch (err) {
    console.error('[WechatPay] 查询失败:', err.message)
    return { code: 500, message: '查询支付状态失败' }
  }
}

// ========== 支付回调处理 ==========
async function handlePayCallback(event) {
  // 微信支付回调会以 HTTP POST 形式调用
  const { body: callbackBody, headers } = event
  
  console.log('[WechatPay] 收到支付回调')
  
  // 1. 验签（生产环境必须实现）
  // TODO: 实现 RSA 签名验证
  
  // 2. 解密回调数据
  // API v3 使用 AEAD_AES_256_GCM 加密
  
  try {
    // 从回调中提取订单信息
    const resource = callbackBody?.resource || {}
    const notification = resource.ciphertext ? 
      JSON.parse(Buffer.from(resource.ciphertext, 'base64').toString()) :
      callbackBody
    
    const outTradeNo = notification.out_trade_no
    const tradeState = notification.trade_state
    
    console.log('[WechatPay] 回调订单:', outTradeNo, '状态:', tradeState)
    
    if (tradeState !== 'SUCCESS') {
      return { code: 200, message: '非成功状态，忽略' }
    }
    
    // 3. 更新订单状态
    const orderRes = await db.collection('orders')
      .where({ orderNo: outTradeNo })
      .limit(1)
      .get()
    
    if (!orderRes.data || orderRes.data.length === 0) {
      console.error('[WechatPay] 订单不存在:', outTradeNo)
      return { code: 404, message: '订单不存在' }
    }
    
    const order = orderRes.data[0]
    
    if (order.status === 'paid') {
      console.log('[WechatPay] 订单已处理，跳过:', outTradeNo)
      return { code: 200, message: '已处理' }
    }
    
    // 4. 更新订单
    await db.collection('orders').doc(order._id).update({
      status: 'paid',
      paidAt: new Date().toISOString(),
      payMethod: 'wechat',
      wxTransactionId: notification.transaction_id,
      updatedAt: new Date().toISOString()
    })
    
    // 5. 授予课程权限（写入 course_permissions + members）
    const phone = order.phone
    const courseIds = []
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (item.courseId) courseIds.push(item.courseId)
      })
    }
    if (order.courseId && !courseIds.includes(order.courseId)) {
      courseIds.push(order.courseId)
    }
    
    if (phone && courseIds.length > 0) {
      for (const courseId of courseIds) {
        // 写入 course_permissions
        try {
          const existing = await db.collection('course_permissions')
            .where({ phone, courseId })
            .limit(1)
            .get()
          
          if (!existing.data || existing.data.length === 0) {
            await db.collection('course_permissions').add({
              phone,
              courseId,
              orderId: order._id,
              source: 'purchase',
              status: 'active',
              grantedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            console.log('[WechatPay] course_permissions 写入成功:', phone, courseId)
          }
        } catch (err) {
          console.error('[WechatPay] course_permissions 写入失败:', err)
        }
        
        // 更新 members.enrolledCourses
        try {
          const memberRes = await db.collection('members')
            .where({ phone })
            .limit(1)
            .get()
          
          if (memberRes.data && memberRes.data.length > 0) {
            const member = memberRes.data[0]
            const existingCourses = member.enrolledCourses || []
            const alreadyEnrolled = existingCourses.some(c => 
              typeof c === 'string' ? c === courseId : c.courseId === courseId
            )
            
            if (!alreadyEnrolled) {
              await db.collection('members').doc(member._id).update({
                enrolledCourses: [...existingCourses, {
                  courseId,
                  source: 'purchase',
                  orderId: order._id,
                  grantedAt: new Date().toISOString()
                }],
                type: 'student',
                updatedAt: new Date().toISOString()
              })
              console.log('[WechatPay] members 更新成功:', phone)
            }
          }
        } catch (err) {
          console.error('[WechatPay] members 更新失败:', err)
        }
      }
    }
    
    console.log('[WechatPay] 支付回调处理完成:', outTradeNo)
    
    // 6. 返回成功响应给微信
    return { code: 'SUCCESS', message: '处理成功' }
    
  } catch (err) {
    console.error('[WechatPay] 回调处理失败:', err)
    return { code: 500, message: '处理失败' }
  }
}

// ========== 申请退款 ==========
async function createRefund(event) {
  const { orderId, reason = '用户申请退款' } = event
  
  if (!CONFIG.MCH_ID) {
    return { code: 500, message: '微信支付未配置' }
  }
  
  // 查询订单
  const orderRes = await db.collection('orders').doc(orderId).get()
  if (!orderRes.data) {
    return { code: 404, message: '订单不存在' }
  }
  
  const order = orderRes.data
  
  if (order.status !== 'paid') {
    return { code: 400, message: '只能退款已支付的订单' }
  }
  
  // 生成退款单号
  const outRefundNo = `REF${Date.now()}`
  
  try {
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/refund/domestic/refunds`,
      'POST',
      {
        out_trade_no: order.orderNo,
        out_refund_no: outRefundNo,
        reason,
        amount: {
          refund: Math.round((order.finalAmount || order.amount || 0) * 100),
          total: Math.round((order.finalAmount || order.amount || 0) * 100),
          currency: 'CNY'
        }
      }
    )
    
    console.log('[WechatPay] 退款结果:', result)
    
    if (result.refund_id) {
      // 更新订单状态
      await db.collection('orders').doc(orderId).update({
        status: 'refunded',
        refundNo: outRefundNo,
        refundReason: reason,
        refundedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      return { code: 0, message: '退款申请成功', data: { refundId: result.refund_id } }
    }
    
    return { code: 500, message: '退款失败: ' + JSON.stringify(result) }
  } catch (err) {
    return { code: 500, message: '退款失败: ' + err.message }
  }
}
