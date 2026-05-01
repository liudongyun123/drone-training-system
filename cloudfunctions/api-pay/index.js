/**
 * api-pay 云函数 - 微信支付服务
 *
 * 功能：
 * - createPayment: 创建微信支付订单（unifiedOrder）
 * - payCallback:  微信支付回调处理
 * - queryPayment: 查询支付状态
 *
 * 依赖环境变量：
 *   WX_MCH_ID / WX_API_KEY / WX_NOTIFY_URL  — 商户配置
 */

// 动态选择 SDK（兼容小程序 & Web/H5）
let cloud
let isWxEnv = false
try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (_) {
  cloud = require('tcb-admin-node')
}
cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ==================== 配置 ====================

const CONFIG = {
  APPID: process.env.WX_APPID || 'wx25aaf895ab86181a',
  MCH_ID: process.env.WX_MCH_ID || '',
  API_KEY: process.env.WX_API_KEY || '',
  NOTIFY_URL: process.env.WX_NOTIFY_URL || '',
  // 订单过期时间（分钟）
  ORDER_EXPIRE_MINUTES: 30
}

// ==================== 工具函数 ====================

function getCorsHeaders (origin = '') {
  const allowed = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com'
  ]
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  }
}

/** 生成商户订单号 30 位 */
function generateOutTradeNo () {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const rand = Math.random().toString(36).slice(2, 11).toUpperCase()
  return `PAY${date}${rand}`
}

function getOpenId (event) {
  if (isWxEnv) return cloud.getWXContext().OPENID
  return event.userId || event._openid || ''
}

function now () {
  return new Date().toISOString()
}

// ==================== createPayment ====================

/**
 * 创建微信支付订单
 *
 * @param {string} outTradeNo  — 商户订单号（可选，不传则自动生成）
 * @param {number} totalFee    — 金额，单位：分
 * @param {string} body        — 商品描述
 * @param {string} openid      — 用户 openid（微信端必传）
 * @param {string} orderId     — 系统内部订单 _id（可选）
 */
async function createPayment (params, userId) {
  const openid = userId || getOpenId(params)

  if (!params.totalFee || params.totalFee <= 0) {
    return { success: false, error: '金额无效' }
  }
  if (!params.body) {
    return { success: false, error: '商品描述不能为空' }
  }

  const outTradeNo = params.outTradeNo || generateOutTradeNo()
  const totalFee = Math.round(Number(params.totalFee)) // 确保整数（分）
  const payOpenid = openid || params.openid || ''

  // ---- 调用 unifiedOrder ----
  let paymentResult
  try {
    const tradePayload = {
      body: params.body,
      outTradeNo,
      totalFee,
      envId: cloud.getWXContext?.().ENV_ID || cloud.DYNAMIC_CURRENT_ENV || '',
      functionName: 'api-pay', // 回调云函数
      nonceStr: Math.random().toString(36).slice(2, 15),
      notifyUrl: CONFIG.NOTIFY_URL || undefined
    }

    // 微信小程序支付需要 subMchId / spbillCreateIp 等字段由 unifiedOrder 自动补充
    if (isWxEnv && cloud.cloudPay) {
      // wx-server-sdk 内置的 cloudPay 能力
      const res = await cloud.cloudPay.unifiedOrder({
        ...tradePayload,
        subMchId: CONFIG.MCH_ID || undefined,
        subAppid: CONFIG.APPID || undefined
      })
      paymentResult = res
    } else if (!isWxEnv) {
      // tcb-admin-node / Web 端：使用 HTTP API 方式（需要商户密钥）
      const crypto = require('crypto')
      const signStr = `appid=${CONFIG.APPID}&mch_id=${CONFIG.MCH_ID}&nonce_str=${tradePayload.nonceStr}&body=${params.body}&out_trade_no=${outTradeNo}&total_fee=${totalFee}&spbill_create_ip=127.0.0.1&notify_url=${CONFIG.NOTIFY_URL}&trade_type=NATIVE`
      const sign = crypto.createHash('md5').update(signStr + '&key=' + CONFIG.API_KEY).digest('hex').toUpperCase()

      const https = require('https')
      const xmlBody = `<xml>
        <appid>${CONFIG.APPID}</appid>
        <mch_id>${CONFIG.MCH_ID}</mch_id>
        <nonce_str>${tradePayload.nonceStr}</nonce_str>
        <sign>${sign}</sign>
        <body>${params.body}</body>
        <out_trade_no>${outTradeNo}</out_trade_no>
        <total_fee>${totalFee}</total_fee>
        <spbill_create_ip>127.0.0.1</spbill_create_ip>
        <notify_url>${CONFIG.NOTIFY_URL}</notify_url>
        <trade_type>NATIVE</trade_type>
      </xml>`

      const xmlResult = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.mch.weixin.qq.com',
          path: '/pay/unifiedorder',
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' }
        }, res => {
          let data = ''
          res.on('data', chunk => data += chunk)
          res.on('end', () => resolve(data))
        })
        req.on('error', reject)
        req.write(xmlBody)
        req.end()
      })

      // 简易 XML 解析
      const codeUrlMatch = xmlResult.match(/<code_url><!\[CDATA\[(.+?)\]\]><\/code_url>/)
      const prepayIdMatch = xmlResult.match(/<prepay_id><!\[CDATA\[(.+?)\]\]><\/prepay_id>/)
      const returnCodeMatch = xmlResult.match(/<return_code><!\[CDATA\[(.+?)\]\]><\/return_code>/)
      const returnMsgMatch = xmlResult.match(/<return_msg><!\[CDATA\[(.+?)\]\]><\/return_msg>/)

      if (returnCodeMatch?.[1] !== 'SUCCESS') {
        return {
          success: false,
          error: returnMsgMatch?.[1] || '微信支付下单失败',
          raw: xmlResult
        }
      }

      paymentResult = {
        payment: {
          codeUrl: codeUrlMatch?.[1] || '',
          prepayId: prepayIdMatch?.[1] || ''
        }
      }
    } else {
      return { success: false, error: '当前环境不支持支付' }
    }
  } catch (err) {
    console.error('[api-pay] unifiedOrder 异常:', err)
    return { success: false, error: '支付下单失败: ' + (err.message || String(err)) }
  }

  // ---- 记录支付流水 ----
  const ts = now()
  const payRecord = {
    outTradeNo,
    _openid: openid,
    userId: openid,
    orderId: params.orderId || '',
    totalFee,
    body: params.body,
    status: 'pending',
    payType: isWxEnv ? 'wxapp' : 'native',
    paymentResult,
    createdAt: ts,
    updatedAt: ts
  }

  await db.collection('payments').add({ data: payRecord })

  // 如果传了 orderId，更新订单的支付流水号
  if (params.orderId) {
    await db.collection('orders').doc(params.orderId).update({
      outTradeNo,
      updatedAt: ts
    }).catch(() => {}) // 忽略更新失败（orderId 可能无效）
  }

  return {
    success: true,
    data: {
      outTradeNo,
      totalFee,
      payment: paymentResult.payment || paymentResult
    }
  }
}

// ==================== payCallback ====================

/**
 * 微信支付回调处理
 *
 * unifiedOrder 指定 functionName='api-pay'，微信会调用此云函数的回调。
 * 微信端会自动验签，这里直接处理业务逻辑。
 *
 * 对于 Web 端 HTTP 回调，需要自行验签（解析 XML + 验证签名）。
 *
 * 回调成功后：
 * 1. 更新 orders 集合状态为 paid
 * 2. 创建 course_permissions 记录（课程权限）
 * 3. 创建 user_roles 记录（如果首次购买）
 */
async function payCallback (params) {
  console.log('[api-pay] 收到支付回调:', JSON.stringify(params).slice(0, 500))

  const { outTradeNo, resultCode } = params

  if (!outTradeNo) {
    console.error('[api-pay] 回调缺少 outTradeNo')
    return { errcode: 0, errmsg: '' } // 告诉微信已收到
  }

  // 幂等：检查是否已处理
  const existing = await db.collection('payments')
    .where({ outTradeNo, status: _.in(['paid', 'success']) })
    .limit(1)
    .get()

  if (existing.data && existing.data.length > 0) {
    console.log(`[api-pay] ${outTradeNo} 已处理，跳过`)
    return { errcode: 0, errmsg: '' }
  }

  const ts = now()

  // 判断支付结果
  const isSuccess = resultCode === 'SUCCESS' ||
    params.trade_state === 'SUCCESS' ||
    params.resultCode === 'SUCCESS' ||
    (isWxEnv && !resultCode) // wx-server-sdk 回调无 resultCode 视为成功

  // 更新支付流水
  await db.collection('payments')
    .where({ outTradeNo })
    .limit(1)
    .get()
    .then(async res => {
      if (res.data && res.data.length > 0) {
        const payId = res.data[0]._id
        await db.collection('payments').doc(payId).update({
          status: isSuccess ? 'paid' : 'failed',
          callbackRaw: params,
          updatedAt: ts
        })
      }
    })

  if (!isSuccess) {
    console.warn('[api-pay] 支付未成功:', outTradeNo, resultCode)
    return { errcode: 0, errmsg: '' }
  }

  // ---- 支付成功，处理业务 ----

  // 1. 更新订单状态为 paid
  const paymentDoc = existing.data?.[0]
  const orderId = paymentDoc?.orderId || params.orderId || ''

  if (orderId) {
    try {
      const order = await db.collection('orders').doc(orderId).get()
      if (order.data && order.data.status === 'pending') {
        await db.collection('orders').doc(orderId).update({
          status: 'paid',
          paymentMethod: 'wechat',
          paidAt: ts,
          updatedAt: ts
        })
        console.log(`[api-pay] 订单 ${orderId} 已标记为 paid`)

        // 2. 授予课程权限
        const openid = paymentDoc?._openid || order.data._openid || ''
        const items = order.data.items || []

        for (const item of items) {
          const courseId = item.courseId || item.productId
          if (!courseId) continue

          // 检查是否已有权限（幂等）
          const hasPermission = await db.collection('course_permissions')
            .where({ _openid: openid, courseId, status: 'active' })
            .limit(1)
            .get()

          if (!hasPermission.data || hasPermission.data.length === 0) {
            await db.collection('course_permissions').add({
              data: {
                _openid: openid,
                userId: openid,
                courseId,
                orderId,
                source: 'purchase',
                status: 'active',
                grantedAt: ts,
                createdAt: ts
              }
            })
            console.log(`[api-pay] 授予用户 ${openid} 课程 ${courseId} 权限`)

            // 更新课程学员数
            await db.collection('courses').doc(courseId).update({
              studentCount: _.inc(1)
            }).catch(() => {})
          }
        }

        // 3. 创建/更新 user_roles（首次购买 → 添加 student 角色）
        if (openid) {
          const existingRole = await db.collection('user_roles')
            .where({ _openid: openid, role: 'student' })
            .limit(1)
            .get()

          if (!existingRole.data || existingRole.data.length === 0) {
            await db.collection('user_roles').add({
              data: {
                _openid: openid,
                userId: openid,
                role: 'student',
                grantedBy: 'system',
                grantedAt: ts,
                createdAt: ts
              }
            })
            console.log(`[api-pay] 首次购买，为用户 ${openid} 分配 student 角色`)
          }
        }
      }
    } catch (err) {
      console.error('[api-pay] 处理订单业务逻辑异常:', err)
    }
  }

  return { errcode: 0, errmsg: '' }
}

// ==================== queryPayment ====================

/**
 * 查询支付状态
 *
 * @param {string} outTradeNo — 商户订单号
 * @param {string} orderId    — 系统订单 _id（可选）
 */
async function queryPayment (params, userId) {
  const openid = userId || getOpenId(params)

  if (!params.outTradeNo && !params.orderId) {
    return { success: false, error: '请提供 outTradeNo 或 orderId' }
  }

  let where = {}
  if (params.outTradeNo) {
    where.outTradeNo = params.outTradeNo
  }
  if (params.orderId) {
    where.orderId = params.orderId
  }
  // 非管理员只能查自己的
  if (!params.admin) {
    where._openid = openid
  }

  const res = await db.collection('payments')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (!res.data || res.data.length === 0) {
    return { success: false, error: '支付记录不存在' }
  }

  const pay = res.data[0]

  // 微信端可以通过 cloudPay.orderQuery 查询实时状态
  let realtimeStatus = null
  if (isWxEnv && cloud.cloudPay && pay.outTradeNo) {
    try {
      const queryRes = await cloud.cloudPay.queryOrder({
        outTradeNo: pay.outTradeNo
      })
      realtimeStatus = queryRes
      // 同步状态
      if (queryRes.tradeState === 'SUCCESS' && pay.status !== 'paid') {
        await db.collection('payments').doc(pay._id).update({
          status: 'paid',
          callbackRaw: queryRes,
          updatedAt: now()
        })
        pay.status = 'paid'
      }
    } catch (err) {
      console.warn('[api-pay] orderQuery 异常:', err.message)
    }
  }

  return {
    success: true,
    data: {
      outTradeNo: pay.outTradeNo,
      totalFee: pay.totalFee,
      body: pay.body,
      status: pay.status,
      payType: pay.payType,
      createdAt: pay.createdAt,
      updatedAt: pay.updatedAt,
      realtimeStatus
    }
  }
}

// ==================== 主入口 ====================

exports.main = async (event, context) => {
  console.log('[api-pay] 收到请求:', event.action || event.httpMethod || 'callback')

  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: 0, message: 'OK' })
    }
  }

  // ---- 微信支付回调（由微信直接调用，结构不同） ----
  // wx-server-sdk 回调格式: { outTradeNo, resultCode, ... }
  if (!event.action && event.outTradeNo) {
    const cbResult = await payCallback(event)
    if (event.httpMethod) {
      return {
        statusCode: 200,
        headers: getCorsHeaders(event.headers?.origin),
        body: JSON.stringify(cbResult)
      }
    }
    return cbResult
  }

  // ---- 解析参数 ----
  let action = event.action || ''
  let data = event.data || event

  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || action
      data = body.data || body
    } catch (_) {}
  }

  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : '')

  let result
  try {
    switch (action) {
      case 'create':
      case 'createPayment':
        result = await createPayment(data, userId)
        break

      case 'callback':
      case 'payCallback':
        result = await payCallback(data)
        break

      case 'query':
      case 'queryPayment':
        result = await queryPayment(data, userId)
        break

      default:
        result = { success: false, error: '未知的操作: ' + action }
    }
  } catch (err) {
    console.error('[api-pay] 处理异常:', err)
    result = { success: false, error: '服务器内部错误: ' + (err.message || String(err)) }
  }

  // HTTP 返回
  if (event.httpMethod || event.headers) {
    return {
      statusCode: result.success ? 200 : 400,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: result.success ? 0 : -1, ...result })
    }
  }

  return result
}
