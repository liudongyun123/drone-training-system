/**
 * api-order 云函数
 * 处理订单创建、查询、更新、取消等操作
 * 支持微信支付 JSAPI
 */

const crypto = require('crypto')
const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command

// CORS 响应头
const { corsHeaders } = require('./lib/cors')

// 统一返回格式
function createResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(data)
  }
}

// 生成订单号
function generateOrderNo() {
  return `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
}

// ========== 微信支付配置 ==========
const WX_PAY_CONFIG = {
  APPID: process.env.WX_APPID || 'wx25aaf895ab86181a',
  MCH_ID: process.env.WX_MCH_ID || '1726655499',
  API_KEY: process.env.WX_API_KEY || '',
  NOTIFY_URL: process.env.WX_NOTIFY_URL || 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/api-order',
  PRIVATE_KEY: (process.env.WX_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  CERT_SERIAL_NO: process.env.WX_CERT_SERIAL_NO || '',
}
const WX_PAY_BASE = 'https://api.mch.weixin.qq.com'

// 生成随机字符串
function generateNonceStr(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}

// CloudBase doc().get() 返回格式可能为 { data: { _id, data: {...} } } 或 { data: [{ _id, data: {...} }] }
function getDocData(docResult) {
  if (!docResult || !docResult.data) return null
  const data = docResult.data
  // 兼容数组格式
  if (Array.isArray(data)) {
    if (data.length === 0) return null
    return data[0].data || data[0]
  }
  // 兼容对象格式
  return data.data || data
}

// 微信支付 v3 RSA-SHA256 签名（用于调起支付参数）
function signWithRSA(data) {
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(data)
  sign.end()
  return sign.sign(WX_PAY_CONFIG.PRIVATE_KEY, 'base64')
}

// 生成微信支付 v3 HTTP 请求的 Authorization 头
function getWxPayAuth(method, urlPath, body) {
  const nonceStr = generateNonceStr(32)
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const bodyStr = body ? JSON.stringify(body) : ''
  
  // 构造签名串
  const signMessage = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`
  
  // RSA-SHA256 签名
  const signature = signWithRSA(signMessage)
  
  // 构造 Authorization 头
  return {
    'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${WX_PAY_CONFIG.MCH_ID}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${WX_PAY_CONFIG.CERT_SERIAL_NO}"`,
    'Wechatpay-Serial': WX_PAY_CONFIG.CERT_SERIAL_NO
  }
}

// HTTP 请求封装（支持微信支付 v3 认证）
async function httpRequest(url, method, data) {
  const https = require('https')
  const urlObj = new URL(url)
  
  const headers = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; DroneTraining/1.0)'
  }
  
  // 微信支付 API 需要 v3 认证
  if (urlObj.hostname.includes('mch.weixin.qq.com') && WX_PAY_CONFIG.PRIVATE_KEY && WX_PAY_CONFIG.CERT_SERIAL_NO) {
    const authHeaders = getWxPayAuth(method, urlObj.pathname + urlObj.search, data)
    Object.assign(headers, authHeaders)
  }
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    }
    
    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) } 
        catch { resolve({ raw: body }) }
      })
    })
    
    req.on('error', reject)
    if (data) req.write(JSON.stringify(data))
    req.end()
  })
}

// ========== 站内消息通知（B5 修复）==========
// 下单/报名/支付成功后调用同环境 api-message 云函数写入 messages 集合，
// 保证「下单/报名 → 收到站内消息」的端到端闭环。
// api-message 为 Event 类型云函数，使用 Node SDK app.callFunction 同环境调用（已验证可写入 messages）；
// 全程 try/catch，通知失败不影响主流程返回。
async function notifyMessage(action, params) {
  try {
    const res = await app.callFunction({ name: 'api-message', data: { action, ...params } })
    console.log('[notifyMessage]', action, JSON.stringify(res).slice(0, 200))
  } catch (e) {
    console.error('[notifyMessage] 通知发送失败(忽略):', action, e && e.message)
  }
}

// 主函数
exports.main = async (event, context) => {
  
  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return createResponse({ ok: true })
  }
  
  // 解析请求参数
  let action = event.action || ''
  let data = event.data || {}
  
  // 处理 HTTP 触发器的 body
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || action
      data = body.data || body
    } catch (e) {
      console.error('[api-order] 解析 body 失败:', e)
    }
  }
  
  try {
    switch (action) {
      case 'create':
        return await createOrder(data)
      case 'updateStatus':
        return await updateOrderStatus(data)
      case 'cancel':
        return await cancelOrder(data)
      case 'delete':
        return await deleteOrder(data)
      case 'getList':
        return await getOrderList(data)
      case 'getDetail':
        return await getOrderDetail(data)
      case 'createCoursePermission':
        return await createCoursePermission(data)
      case 'enrollClass':
        return await enrollClass(data)
      case 'handlePayCallback':
        return await handlePayCallback(event)
      case 'createJsapiOrder':
        return await createJsapiPayOrder(data)
      case 'createPayOrder':
        return await createPayOrder(data)
      case 'queryOrder':
        return await queryPayOrder(data)
      case 'getRefundConfig':
        return await getRefundConfigAction()
      case 'saveRefundConfig':
        return await saveRefundConfigAction(data)
      case 'calcRefund':
        return await calcRefundAction(data)
      case 'createRefundRequest':
        return await createRefundRequestAction(data)
      case 'approveRefund':
        return await approveRefundAction(data)
      case 'rejectRefund':
        return await rejectRefundAction(data)
      case 'createContract':
        return await createContract(data)
      case 'signContract':
        return await signContract(data)
      case 'companyStamp':
        return await companyStamp(data)
      case 'getContract':
        return await getContract(data)
      case 'getContractList':
        return await getContractList(data)
      case 'getStats':
        return await getOrderStats(data)
      case 'normalizeOrders':
        return await normalizeOrders()
      case 'getCoupons':
        return await getCoupons(data)
      case 'validateCoupon':
        return await validateCoupon(data)
      case 'claimCoupon':
        return await claimCoupon(data)
      case 'getCart':
        return await getCartApi(data)
      case 'addToCart':
        return await addToCartApi(data)
      case 'removeFromCart':
        return await removeFromCartApi(data)
      case 'clearCart':
        return await clearCartApi(data)
      case 'useCoupon':
        return await useCoupon(data)
      default:
        return createResponse({ 
          code: 400, 
          success: false, 
          error: `未知操作: ${action}` 
        })
    }
  } catch (error) {
    console.error('[api-order] 错误:', error)
    return createResponse({ 
      code: 500, 
      success: false, 
      error: error.message || '服务器错误' 
    })
  }
}

// 创建订单
// C1 防资损：按商品库解析商城商品的权威单价（products 优先，courses 兜底）
async function resolveShopPrice(productId, skuId) {
  if (!productId) return null
  let doc = null
  const pRes = await db.collection('products').where({ _id: productId }).limit(1).get()
  if (pRes.data && pRes.data.length > 0) {
    doc = pRes.data[0]
  } else {
    const cRes = await db.collection('courses').where({ _id: productId }).limit(1).get()
    if (cRes.data && cRes.data.length > 0) doc = cRes.data[0]
  }
  if (!doc) return null
  let price = typeof doc.price === 'number' ? doc.price : 0
  if (skuId && Array.isArray(doc.skus)) {
    const sku = doc.skus.find((s) => s && (s._id === skuId || s.id === skuId))
    if (sku && typeof sku.price === 'number') price = sku.price
  }
  return { price, status: doc.status }
}

async function createOrder(data) {
  const { 
    orderNo, 
    phone, 
    openid = '',
    userId, 
    orderType = 'course',
    status = 'pending',
    totalPrice,
    finalAmount,
    remark = '',
    address = {},
    items = [],
    courseId,
    classId,
    className = '',
    courseInfo,
    createdAt
  } = data
  
  if (!phone) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少用户手机号'
    })
  }
  
  try {
    // ★ 防重复购买：仅拦截已支付/已完成的订单；pending 表示支付未完成，允许重新下单
    const PURCHASED_STATUSES = ['paid', 'completed', 'paid_offline']
    if (orderType === 'course' && courseId) {
      const existingCourseOrder = await db.collection('orders')
        .where({
          phone,
          courseId,
          status: _.in(PURCHASED_STATUSES)
        })
        .limit(1)
        .get()
      
      if (existingCourseOrder.data && existingCourseOrder.data.length > 0) {
        return createResponse({
          code: 400,
          success: false,
          error: '您已购买过该课程，无需重复购买'
        })
      }
      // 清理该用户遗留的未支付订单，避免重复堆积并防止被误判为重复购买
      await cancelStalePendingOrders({ phone, courseId })
    }
    
    if (orderType === 'class' && classId) {
      const existingClassOrder = await db.collection('orders')
        .where({
          phone,
          classId,
          status: _.in(PURCHASED_STATUSES)
        })
        .limit(1)
        .get()
      
      if (existingClassOrder.data && existingClassOrder.data.length > 0) {
        return createResponse({
          code: 400,
          success: false,
          error: '您已报名此培训班，无需重复报名'
        })
      }
      await cancelStalePendingOrders({ phone, classId })
    }
    
    // C1(主路径) 防资损：商城订单服务端重算商品总额，拦截前端篡改 finalAmount
    let serverGoodsTotal = null
    if (orderType === 'shop' && items && items.length > 0) {
      let sum = 0
      for (const it of items) {
        const r = await resolveShopPrice(it.productId, it.skuId)
        if (!r) {
          return createResponse({ code: 400, success: false, error: '商品已下架或不存在' })
        }
        if (r.status && r.status !== 'published' && r.status !== 'active' && r.status !== 'on_sale') {
          return createResponse({ code: 400, success: false, error: '商品已下架，请重新下单' })
        }
        const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1
        sum += r.price * qty
      }
      serverGoodsTotal = Math.round(sum * 100) / 100
      // 前端付款金额低于商品总额（含容差）即视为篡改，直接拒绝
      if (typeof finalAmount === 'number' && finalAmount < serverGoodsTotal - 0.01) {
        console.warn('[api-order createOrder] 商城金额篡改拦截: 前端', finalAmount, '服务端商品总额', serverGoodsTotal)
        return createResponse({ code: 400, success: false, error: '订单金额异常，请重新下单' })
      }
    }

    // C1 扩展：课程/培训班订单服务端重算权威单价（下单流程无优惠券参与，前端金额应等于权威单价）
    if (serverGoodsTotal == null && (orderType === 'course' || orderType === 'class')) {
      let unitPrice = null
      if (orderType === 'course' && courseId) {
        const r = await db.collection('courses').doc(courseId).get()
        const c = getDocData(r)
        if (!c) return createResponse({ code: 404, success: false, error: '课程不存在' })
        unitPrice = typeof c.price === 'number' ? c.price : 0
      } else if (orderType === 'class') {
        const cid = classId || (items && items[0] && (items[0].classId || items[0].productId))
        if (cid) {
          const r = await db.collection('classes').doc(cid).get()
          const c = getDocData(r)
          if (!c) return createResponse({ code: 404, success: false, error: '班级不存在' })
          unitPrice = typeof c.price === 'number' ? c.price
            : (c.enrollmentConfig && typeof c.enrollmentConfig.price === 'number' ? c.enrollmentConfig.price : 0)
        }
      }
      if (unitPrice != null) {
        serverGoodsTotal = Math.round(unitPrice * 100) / 100
        if (typeof finalAmount === 'number' && finalAmount < serverGoodsTotal - 0.01) {
          console.warn('[api-order createOrder] 课程/班级金额篡改拦截: 前端', finalAmount, '服务端', serverGoodsTotal)
          return createResponse({ code: 400, success: false, error: '订单金额异常，请重新下单' })
        }
      }
    }

    const orderData = {
      orderNo: orderNo || generateOrderNo(),
      phone,
      _openid: openid || '',  // ★ CloudBase 安全规则需要 _openid 字段
      openid: openid || '',   // 同时存一份便于查询
      userId: userId || '',
      orderType,
      type: orderType,  // ★ 双写 type，兼容后台按 type 查询（AdminCourseOrders/AdminClassOrders/financeService）
      status,
      // C1: 商城订单以服务端重算的商品总额为准；其余类型保持前端传值（已做兼容）
      totalAmount: serverGoodsTotal != null ? serverGoodsTotal : (finalAmount || totalPrice || 0),
      totalPrice: finalAmount != null ? finalAmount : (totalPrice || serverGoodsTotal || 0),
      finalAmount: finalAmount != null ? finalAmount : (totalPrice || serverGoodsTotal || 0),
      amount: finalAmount != null ? finalAmount : (totalPrice || serverGoodsTotal || 0),
      remark,
      address,
      items,
      courseId: courseId || '',
      classId: classId || '',
      className: className || '',
      courseInfo: courseInfo || null,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // ★ Admin SDK: add() 直接传数据对象，不需要 { data: } 包裹
    const result = await db.collection('orders').add(orderData)
    const docId = result.id || result._id
    
    console.log('[api-order] 订单创建成功:', docId)

    // B5 修复：下单成功后发送站内消息通知
    const goodsName = (items && items.length > 0)
      ? items.map(i => i.title || i.name || i.courseName || '').filter(Boolean).join('、')
      : (className || (courseInfo && courseInfo.title) || '课程')
    await notifyMessage('notifyOrderStatus', {
      phone,
      orderId: docId,
      status,
      goodsName,
      amount: finalAmount || totalPrice || 0
    })

    return createResponse({
      code: 0,
      success: true,
      data: {
        _id: docId,
        id: docId,
        ...orderData
      }
    })
    } catch (error) {
    console.error('[api-order] 创建订单失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '创建订单失败: ' + error.message
    })
  }
}

// 取消用户遗留的未支付订单（支付未完成/已取消），避免重复下单被拦截
async function cancelStalePendingOrders({ phone, courseId, classId }) {
  try {
    const where = { phone, status: 'pending' }
    if (courseId) where.courseId = courseId
    if (classId) where.classId = classId
    const pending = await db.collection('orders').where(where).get()
    for (const o of (pending.data || [])) {
      await db.collection('orders').doc(o._id).update({
        status: 'cancelled',
        cancelReason: '重复下单自动取消',
        updatedAt: new Date().toISOString()
      })
    }
  } catch (e) {
    console.error('[api-order] 清理 pending 订单失败:', e)
  }
}

// 更新订单状态
async function updateOrderStatus(data) {
  const { orderId, status } = data
  
  if (!orderId || !status) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少订单ID或状态'
    })
  }
  
  try {
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    }
    
    if (status === 'paid') {
      updateData.paidAt = new Date().toISOString()
      updateData.paymentMethod = 'wechat'
    }
    
    // ★ Admin SDK: update() 直接传数据对象
    await db.collection('orders').doc(orderId).update(updateData)

    // B5 修复：关键状态变更后通知用户
    if (['paid', 'shipped', 'completed', 'cancelled'].includes(status)) {
      try {
        const orderRes = await db.collection('orders').doc(orderId).get()
        const od = orderRes.data || {}
        const goodsName = (od.items && od.items.length > 0)
          ? od.items.map(i => i.title || i.name || '').filter(Boolean).join('、')
          : (od.className || '订单')
        await notifyMessage('notifyOrderStatus', {
          phone: od.phone,
          orderId,
          status,
          goodsName,
          amount: od.finalAmount || od.totalPrice || 0
        })
      } catch (e) {
        console.error('[api-order] 状态变更通知失败:', e.message)
      }
    }

    return createResponse({
      code: 0,
      success: true,
      message: '订单状态更新成功'
    })
  } catch (error) {
    console.error('[api-order] 更新订单状态失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '更新订单状态失败: ' + error.message
    })
  }
}

// 取消订单
async function cancelOrder(data) {
  const { orderId } = data
  
  if (!orderId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少订单ID'
    })
  }
  
  try {
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    
    return createResponse({
      code: 0,
      success: true,
      message: '订单已取消'
    })
  } catch (error) {
    console.error('[api-order] 取消订单失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '取消订单失败: ' + error.message
    })
  }
}

// 删除订单
async function deleteOrder(data) {
  const { orderId } = data
  
  if (!orderId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少订单ID'
    })
  }
  
  try {
    await db.collection('orders').doc(orderId).remove()
    
    return createResponse({
      code: 0,
      success: true,
      message: '订单已删除'
    })
  } catch (error) {
    console.error('[api-order] 删除订单失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '删除订单失败: ' + error.message
    })
  }
}

// 获取订单列表
async function getOrderList(data) {
  const { phone, openid, status, page = 1, pageSize = 20 } = data
  
  try {
    const where = {}
    if (phone) where.phone = phone
    // ★ 同时使用 openid 做数据隔离
    if (openid) where._openid = openid
    if (status) where.status = status
    
    const result = await db.collection('orders')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    return createResponse({
      code: 0,
      success: true,
      data: {
        list: result.data || [],
        total: result.data?.length || 0,
        page,
        pageSize
      }
    })
  } catch (error) {
    console.error('[api-order] 获取订单列表失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '获取订单列表失败: ' + error.message
    })
  }
}

// ========== 历史订单金额字段回填（一次性归一化 totalAmount/finalAmount/amount）==========
async function normalizeOrders() {
  const res = await db.collection('orders').where({}).limit(1000).get()
  const list = res.data || []
  let fixed = 0
  for (const o of list) {
    const amt = o.finalAmount ?? o.totalAmount ?? o.totalPrice ?? o.amount ?? 0
    const patch = {}
    if (o.totalAmount === undefined) patch.totalAmount = amt
    if (o.finalAmount === undefined) patch.finalAmount = amt
    if (o.amount === undefined) patch.amount = amt
    if (Object.keys(patch).length) {
      await db.collection('orders').doc(o._id).update(patch)
      fixed++
    }
  }
  return createResponse({ code: 0, success: true, data: { scanned: list.length, fixed } })
}

// ========== 订单统计 ==========
async function getOrderStats(data) {
  const { phone, status } = data || {}
  const where = {}
  if (phone) where.phone = phone
  if (status) where.status = status
  const all = await db.collection('orders').where(where).get()
  const list = all.data || []
  // 已收款状态集合：须包含 paid_offline（线下报名），否则统计漏算（与前端财务 PAID_STATUSES 一致）
  const PAID_STATUSES = ['paid', 'completed', 'paid_offline']
  const amountOf = (o) => o.finalAmount || o.totalAmount || o.totalPrice || o.amount || 0
  const total = list.length
  const pending = list.filter(o => o.status === 'pending').length
  const paid = list.filter(o => o.status === 'paid').length
  const paidOffline = list.filter(o => o.status === 'paid_offline').length
  const completed = list.filter(o => o.status === 'completed').length
  const cancelled = list.filter(o => ['cancelled', 'refunded'].includes(o.status)).length
  const totalAmount = list.reduce((s, o) => s + amountOf(o), 0)
  const paidAmount = list.filter(o => PAID_STATUSES.includes(o.status)).reduce((s, o) => s + amountOf(o), 0)
  return createResponse({
    code: 0,
    success: true,
    data: { total, pending, paid, paidOffline, completed, cancelled, totalAmount, paidAmount }
  })
}

// ========== 优惠券 ==========
async function getCoupons(data) {
  const { userId, phone, status, page = 1, pageSize = 20 } = data || {}
  const where = {}
  if (userId) where.userId = userId
  if (phone) where.phone = phone
  if (status) where.status = status
  const countRes = await db.collection('userCoupons').where(where).count()
  const res = await db.collection('userCoupons').where(where)
    .orderBy('obtainedAt', 'desc').skip((page - 1) * pageSize).limit(pageSize).get()
  return createResponse({
    code: 0,
    success: true,
    data: { list: res.data || [], total: countRes.total || 0, page, pageSize }
  })
}

async function validateCoupon(data) {
  const { code, amount } = data || {}
  if (!code) return createResponse({ code: 400, success: false, error: '缺少优惠券码' })
  const res = await db.collection('coupons').where({ code, status: 'active' }).limit(1).get()
  if (!res.data || res.data.length === 0) {
    return createResponse({ code: 404, success: false, error: '优惠券无效或已失效' })
  }
  const c = res.data[0]
  const amt = Number(amount) || 0
  // 使用门槛校验：低于门槛不可用（与前端计算一致），避免无效优惠
  if (c.minAmount && amt < Number(c.minAmount)) {
    return createResponse({ code: 400, success: false, error: '订单金额不满足优惠券使用门槛' })
  }
  // 折扣计算对齐 coupon.ts calculateDiscount（修复按金额直减导致折扣券失效/超额优惠）
  let discount = 0
  if (c.type === 'fixed') {
    discount = Math.min(Number(c.value || c.discount || 0), amt)
  } else {
    const rate = Number(c.value || c.discount || 0)
    discount = amt * (rate / 100)
    if (c.maxDiscount) discount = Math.min(discount, Number(c.maxDiscount))
  }
  discount = Math.max(0, Math.round(discount * 100) / 100)
  const finalAmount = Math.max(0, Math.round((amt - discount) * 100) / 100)
  return createResponse({ code: 0, success: true, data: { coupon: c, discount, finalAmount } })
}

async function claimCoupon(data) {
  const { userId, phone, couponTemplateId } = data || {}
  if (!couponTemplateId) return createResponse({ code: 400, success: false, error: '缺少优惠券模板ID' })
  // 优惠券模板实际存放在 coupons 集合（couponService.COUPON_COLLECTION='coupons'），coupon_templates 为空集合
  // 使用 where({_id}) 读取（与 validateCoupon 一致），避免 doc(id).get() 返回结构差异导致字段丢失
  const tplRes = await db.collection('coupons').where({ _id: couponTemplateId }).limit(1).get()
  const t = tplRes.data && tplRes.data[0]
  if (!t) return createResponse({ code: 404, success: false, error: '优惠券模板不存在' })
  // 配额校验：已领取数量达到总库存则不可再领（防止超发）
  const totalCount = Number(t.totalCount || 0)
  const usedCount = Number(t.usedCount || 0)
  if (totalCount > 0 && usedCount >= totalCount) {
    return createResponse({ code: 400, success: false, error: '优惠券已领取完' })
  }
  // 去重：同一手机号不可重复领取同一模板（防止刷券）
  if (phone) {
    const dupRes = await db.collection('userCoupons').where({ phone, couponId: couponTemplateId }).limit(1).get()
    if (dupRes.data && dupRes.data.length > 0) {
      return createResponse({ code: 400, success: false, error: '您已领取过该优惠券' })
    }
  }
  const now = new Date().toISOString()
  // 写入用户持有券集合 userCoupons（与 couponService.USER_COUPON_COLLECTION 一致），状态置 unused 使其可被选用
  const doc = {
    userId: userId || '',
    phone: phone || '',
    couponId: couponTemplateId,
    couponCode: t.code || ('C' + Date.now()),
    coupon: {
      code: t.code || '',
      name: t.name || t.title || '',
      type: t.type || '',
      value: t.value || 0,
      maxDiscount: t.maxDiscount || 0,
      minAmount: t.minAmount || 0
    },
    status: 'unused',
    obtainedAt: now,
    expiresAt: t.validTo || t.expireAt || t.endDate || '',
    createdAt: now,
    updatedAt: now
  }
  const r = await db.collection('userCoupons').add(doc)
  // 领取成功后递增模板已领数量（与配额校验配合，避免超发）
  try {
    await db.collection('coupons').doc(couponTemplateId).update({ usedCount: _.inc(1) })
  } catch (e) {
    console.error('[api-order] 更新优惠券 usedCount 失败:', e && e.message)
  }
  return createResponse({ code: 0, success: true, data: { id: r.id, ...doc } })
}

// ========== 购物车 ==========
async function getCartApi(data) {
  const { phone, userId } = data || {}
  const where = phone ? { phone } : (userId ? { _openid: userId } : {})
  const res = await db.collection('cart').where(where).orderBy('createdAt', 'desc').get()
  return createResponse({ code: 0, success: true, data: { list: res.data || [] } })
}

async function clearCartApi(data) {
  const { phone, userId } = data || {}
  const where = phone ? { phone } : (userId ? { _openid: userId } : {})
  await db.collection('cart').where(where).remove()
  return createResponse({ code: 0, success: true, message: '购物车已清空' })
}

// ========== 购物车：加入 ==========
// 入参：{ item: { type, id, name, price, cover }, phone?, openid?/userId? }
async function addToCartApi(data) {
  const { item } = data || {}
  if (!item || !item.id) {
    return createResponse({ code: 400, success: false, error: '缺少商品信息' })
  }
  try {
    // 去重：同 item.id 不重复加，仅 +1
    const existing = await db.collection('cart').where({ productId: item.id }).limit(1).get()
    if (existing.data && existing.data.length > 0) {
      const doc = existing.data[0]
      const qty = (doc.quantity || 1) + 1
      await db.collection('cart').doc(doc._id).update({ quantity: qty, updatedAt: new Date().toISOString() })
    } else {
      const addData = {
        productId: item.id,
        type: item.type || 'product',
        name: item.name || '',
        price: item.price || 0,
        cover: item.cover || '',
        quantity: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      if (data.phone) addData.phone = data.phone
      if (data.openid || data.userId) addData._openid = data.openid || data.userId
      await db.collection('cart').add(addData)
    }
    return createResponse({ code: 0, success: true, message: '已加入购物车' })
  } catch (error) {
    console.error('[api-order] 加入购物车失败:', error)
    return createResponse({ code: 500, success: false, error: '加入购物车失败: ' + error.message })
  }
}

// ========== 购物车：移除 ==========
// 入参：{ itemId, phone?, openid?/userId? }
async function removeFromCartApi(data) {
  const { itemId } = data || {}
  if (!itemId) {
    return createResponse({ code: 400, success: false, error: '缺少商品ID' })
  }
  try {
    const query = { _id: itemId }
    if (data.phone) query.phone = data.phone
    else if (data.openid || data.userId) query._openid = data.openid || data.userId
    await db.collection('cart').where(query).remove()
    return createResponse({ code: 0, success: true, message: '已移除' })
  } catch (error) {
    console.error('[api-order] 移除购物车失败:', error)
    return createResponse({ code: 500, success: false, error: '移除失败: ' + error.message })
  }
}

// ========== 优惠券：使用 ==========
// 入参：{ couponId, orderId?, phone? }
async function useCoupon(data) {
  const { couponId, orderId, phone } = data || {}
  if (!couponId) {
    return createResponse({ code: 400, success: false, error: '缺少优惠券ID' })
  }
  try {
    const res = await db.collection('userCoupons').doc(couponId).get()
    if (!res.data) {
      return createResponse({ code: 404, success: false, error: '优惠券不存在' })
    }
    const updateData = {
      status: 'used',
      orderId: orderId || '',
      usedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    if (phone) updateData.phone = phone
    await db.collection('userCoupons').doc(couponId).update(updateData)
    return createResponse({
      code: 0,
      success: true,
      data: { id: couponId, status: 'used', orderId: orderId || '' }
    })
  } catch (error) {
    console.error('[api-order] 使用优惠券失败:', error)
    return createResponse({ code: 500, success: false, error: '使用优惠券失败: ' + error.message })
  }
}

// 获取订单详情
async function getOrderDetail(data) {
  const { orderId } = data
  
  if (!orderId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少订单ID'
    })
  }
  
  try {
    const result = await db.collection('orders').doc(orderId).get()
    const orderData = getDocData(result)
    
    if (!orderData) {
      return createResponse({
        code: 404,
        success: false,
        error: '订单不存在'
      })
    }
    
    return createResponse({
      code: 0,
      success: true,
      data: orderData
    })
  } catch (error) {
    console.error('[api-order] 获取订单详情失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '获取订单详情失败: ' + error.message
    })
  }
}

// 创建课程学习权限
async function createCoursePermission(data) {
  const { courseId, phone, openid, source = 'purchase', expiresAt = null, orderId = null } = data

  if (!courseId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少课程ID'
    })
  }

  // 如果没有用户标识但有 orderId，尝试从订单获取
  if (!phone && !openid && orderId) {
    try {
      const orderRes = await db.collection('orders').doc(orderId).get()
      const orderData = getDocData(orderRes)
      if (orderData) {
        data.phone = orderData.phone
        data.openid = orderData.userId
      }
    } catch (err) {
      console.error('[api-order] 从订单获取用户标识失败:', err)
    }
  }

  if (!data.phone && !data.openid) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少用户标识'
    })
  }

  try {
    // 检查课程是否存在（如果 courseId 是 _id 格式）
    let courseName = ''
    try {
      const courseRes = await db.collection('courses').doc(courseId).get()
      const courseData = getDocData(courseRes)
      if (courseData) {
        courseName = courseData.title || ''
      }
    } catch (e) {
      // 课程可能不存在，但仍然创建权限（兼容外部课程ID）
      courseName = data.courseName || courseId
    }

    // 检查是否已有权限
    const existingWhere = {}
    existingWhere.courseId = courseId
    if (phone) existingWhere.phone = phone
    if (openid) existingWhere.openid = openid

    const existing = await db.collection('course_permissions')
      .where(existingWhere)
      .get()

    if (existing.data && existing.data.length > 0) {
      // 已存在权限，直接返回
      return createResponse({
        code: 0,
        success: true,
        data: {
          permissionId: existing.data[0]._id,
          courseId,
          alreadyExists: true
        },
        message: '权限已存在'
      })
    }

    // 创建权限记录
    const now = new Date().toISOString()
    const permissionData = {
      courseId,
      courseName: courseName || '',
      phone: data.phone || '',
      openid: data.openid || '',
      source,
      status: 'active',
      expiresAt: expiresAt,
      grantedAt: now,
      createdAt: now,
      updatedAt: now
    }

    // 如果有 openid，添加 _openid 字段（CloudBase 安全规则需要）
    if (data.openid) {
      permissionData._openid = data.openid
    }

    // ★ Admin SDK: add() 直接传数据对象
    const result = await db.collection('course_permissions').add(permissionData)

    console.log('[api-order] 权限创建成功:', result.id)

    return createResponse({
      code: 0,
      success: true,
      data: {
        permissionId: result.id,
        courseId,
        courseName: courseName,
        phone: data.phone,
        alreadyExists: false
      },
      message: '权限创建成功'
    })
  } catch (error) {
    console.error('[api-order] 创建权限失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '创建权限失败: ' + error.message
    })
  }
}

// 班级报名
async function enrollClass(data) {
  const {
    classId,
    userName = '',
    phone = '',
    idCard = '',
    emergencyContact = '',
    emergencyPhone = '',
    contactPhone = '',
    notes = '',
    remark = '',
    userId = '',
    openid = '',
    status = 'pending',
    source = 'online_enroll',
    orderId = '',
    paymentStatus = ''
  } = data

  if (!classId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少班级ID'
    })
  }
  if (!phone) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少用户手机号（phone 是报名记录的查询条件）'
    })
  }
  if (!userName) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少用户姓名'
    })
  }

  // 字段映射：前端传 remark/contactPhone，统一映射到 notes/emergencyPhone
  const finalNotes = notes || remark || ''
  const finalEmergencyPhone = emergencyPhone || contactPhone || ''

  try {
    // 检查班级是否存在
    const classRes = await db.collection('classes').doc(classId).get()
    const cls = getDocData(classRes)
    if (!cls) {
      return createResponse({
        code: 404,
        success: false,
        error: '班级不存在'
      })
    }

    // 报名时间段 / 招生状态 校验
    const serverNow = new Date()
    if (cls.status && !['enrolling', 'full'].includes(cls.status)) {
      return createResponse({
        code: 400,
        success: false,
        error: `该班级当前不可报名（状态：${cls.status}）`
      })
    }
    if (cls.enrollStart) {
      const s = new Date(cls.enrollStart)
      if (!isNaN(s.getTime()) && serverNow < s) {
        return createResponse({ code: 400, success: false, error: '报名尚未开始' })
      }
    }
    if (cls.enrollDeadline) {
      const d = new Date(cls.enrollDeadline)
      if (!isNaN(d.getTime())) {
        // 若只填日期（YYYY-MM-DD），视为当天 23:59:59 截止
        if (/^\d{4}-\d{2}-\d{2}$/.test(cls.enrollDeadline)) d.setHours(23, 59, 59, 999)
        if (serverNow > d) {
          return createResponse({ code: 400, success: false, error: '报名已截止' })
        }
      }
    }

    // 若携带订单ID，关联订单信息（统一身份、金额、支付方式），便于生成审核记录
    let orderInfo = null
    if (orderId) {
      try {
        const orderRes = await db.collection('orders').doc(orderId).get()
        orderInfo = getDocData(orderRes) || null
      } catch (e) {
        orderInfo = null
      }
    }
    const finalUserId = userId || (orderInfo && orderInfo.userId) || ''
    const finalPaymentStatus = paymentStatus || (orderInfo ? (orderInfo.status === 'paid' ? 'paid' : 'unpaid') : 'unpaid')
    const finalAmount = (orderInfo && (orderInfo.finalAmount || orderInfo.amount)) ? (orderInfo.finalAmount || orderInfo.amount) : 0
    // 线下待审核（status=pending）不立即开放课程权限，待后台审核确认后再授权
    const grantNow = status !== 'pending'
    const memberStatus = grantNow ? 'enrolled' : status

    // 检查是否已满员
    const memberCount = await db.collection('class_members')
      .where({
        classId: classId,
        status: db.command.in(['enrolled', 'learning'])
      })
      .count()

    const maxStudents = cls.maxStudents || 30

    // C5: 原子占座，防止并发超员。
    // 历史数据可能未维护 classes.enrolledCount，先将其对齐到真实名单人数
    if (typeof cls.enrolledCount !== 'number') {
      try {
        await db.collection('classes').doc(classId).update({ enrolledCount: memberCount.total })
      } catch (e) { /* 不影响主流程 */ }
    }
    // 用 compare-and-set 原子地占用一个名额：仅当 enrolledCount < maxStudents 时 +1
    const seatClaim = await db.collection('classes')
      .where({ _id: classId, enrolledCount: _.lt(maxStudents) })
      .update({ enrolledCount: _.inc(1) })
    if (!seatClaim || seatClaim.updated === 0) {
      return createResponse({
        code: 400,
        success: false,
        error: '班级已满员'
      })
    }
    // 快照复核：防止 enrolledCount 与真实名单因历史数据不一致导致超员（回滚占座）
    if (memberCount.total >= maxStudents) {
      try { await db.collection('classes').doc(classId).update({ enrolledCount: _.inc(-1) }) } catch (e) {}
      return createResponse({
        code: 400,
        success: false,
        error: '班级已满员'
      })
    }

    // 检查是否已报名（检查 class_members 表）
    const existing = await db.collection('class_members')
      .where({
        classId: classId,
        phone: phone,
        status: db.command.in(['enrolled', 'learning', 'pending', 'confirmed'])
      })
      .get()

    if (existing.data && existing.data.length > 0) {
      return createResponse({
        code: 0,
        success: true,
        data: {
          enrollmentId: existing.data[0]._id,
          classId,
          className: cls.name
        },
        message: '您已报名此班级'
      })
    }

    // 同时检查 orders 表是否有该班级的订单
    const existingOrder = await db.collection('orders')
      .where({
        classId: classId,
        phone: phone,
        status: db.command.in(['pending', 'paid', 'completed'])
      })
      .get()

    // ★ 如果 orders 存在但 class_members 不存在，说明之前 enrollClass 失败
    // 此时不应报错，而应补写 class_members（幂等处理）

    // 创建报名记录
    const now = new Date().toISOString()
    const memberData = {
      classId,
      className: cls.name,
      courseId: cls.courseId || '',
      userId: finalUserId,
      userName,
      phone,
      idCard,
      emergencyContact,
      emergencyPhone: finalEmergencyPhone,
      notes: finalNotes,
      status: memberStatus,
      source,
      orderId,
      paymentStatus: finalPaymentStatus,
      amount: finalAmount,
      enrollmentTime: now,
      createdAt: now,
      updatedAt: now
    }

    // 如果有 openid，添加 _openid 字段（CloudBase 安全规则需要）
    if (openid) {
      memberData._openid = openid
    }

    const result = await db.collection('class_members').add(memberData)

    console.log('[api-order] 班级报名成功:', result.id)

    // 写入报名审核记录（enrollments），供后台「报名审核」展示与审核
    try {
      await db.collection('enrollments').add({
        orderId,
        memberId: finalUserId,
        userId: finalUserId,
        phone,
        userName,
        idCard,
        classId,
        className: cls.name,
        courseId: cls.courseId || '',
        courseName: cls.courseName || cls.name || '',
        source,
        paymentStatus: finalPaymentStatus,
        status: status,
        amount: finalAmount,
        enrollmentDate: now,
        enrollmentTime: now,
        notes: finalNotes,
        createdAt: now,
        updatedAt: now
      })
    } catch (e) {
      console.error('[api-order] 写入报名审核记录失败:', e)
    }

    // ★ 报名成功后，自动授权关联课程（仅线下待审核以外的状态立即授权）
    try {
      // 获取班级关联的所有课程ID
      const courseIds = []
      // 单个 courseId（主关联课程）
      if (cls.courseId) {
        courseIds.push(cls.courseId)
      }
      // includedCourseIds 数组（新格式，ID 数组）
      if (cls.includedCourseIds && Array.isArray(cls.includedCourseIds)) {
        for (const id of cls.includedCourseIds) {
          if (id && !courseIds.includes(id)) courseIds.push(id)
        }
      }
      // includedCourses 数组（旧格式兼容，可能是ID数组或名称数组）
      if (cls.includedCourses && Array.isArray(cls.includedCourses)) {
        const nameItems = []
        for (const item of cls.includedCourses) {
          if (typeof item === 'string') {
            if (/^[a-f0-9]{24}$/i.test(item)) {
              if (!courseIds.includes(item)) courseIds.push(item)
            } else if (item.trim()) {
              nameItems.push(item.trim())
            }
          }
        }
        // 名称数组：按课程标题解析为课程ID（best-effort），避免名称格式 includedCourses 被静默丢弃
        if (nameItems.length > 0) {
          try {
            const courseRes = await db.collection('courses')
              .where({ title: _.in(nameItems) })
              .limit(100)
              .get()
            for (const c of (courseRes.data || [])) {
              if (c._id && !courseIds.includes(c._id)) courseIds.push(c._id)
            }
          } catch (e) {
            console.warn('[api-order] includedCourses 名称解析失败:', e.message)
          }
        }
      }

      if (grantNow && phone && courseIds.length > 0) {
        for (const courseId of courseIds) {
          // 检查是否已有权限
          const existingPerm = await db.collection('course_permissions')
            .where({ phone, courseId })
            .get()

          if (!existingPerm.data || existingPerm.data.length === 0) {
            const now2 = new Date().toISOString()
            await db.collection('course_permissions').add({
              phone,
              courseId,
              source: 'class_enrollment',
              classId,
              status: 'active',
              createdAt: now2,
              updatedAt: now2
            })
            console.log('[api-order] 课程权限已授予:', { phone, courseId, classId })
          } else {
            console.log('[api-order] 课程权限已存在，跳过:', { phone, courseId })
          }
        }
      }
      } catch (permErr) {
      // 授权失败不影响报名结果
      console.error('[api-order] 授予课程权限失败:', permErr)
    }

    // B5 修复：报名成功后发送站内消息通知
    await notifyMessage('notifyClassEnrollment', {
      phone,
      userName,
      className: cls.name,
      classId,
      startDate: cls.startDate || cls.startTime || '',
      location: cls.location || cls.address || ''
    })

    return createResponse({
      code: 0,
      success: true,
      data: {
        enrollmentId: result.id,
        classId,
        className: cls.name
      },
      message: '报名成功'
    })
  } catch (error) {
    console.error('[api-order] 班级报名失败:', error)
    return createResponse({
      code: 500,
      success: false,
      error: '报名失败: ' + error.message
    })
  }
}

// ========== 微信支付 JSAPI ==========
async function createJsapiPayOrder(data) {
  const { orderId, openid } = data
  
  if (!WX_PAY_CONFIG.PRIVATE_KEY || !WX_PAY_CONFIG.CERT_SERIAL_NO) {
    return createResponse({ code: 500, error: '微信支付证书未配置（需要 WX_PRIVATE_KEY 和 WX_CERT_SERIAL_NO）' })
  }
  
  if (!openid) {
    return createResponse({ code: 400, error: '缺少 openid' })
  }
  
  // 1. 查询订单
  let order
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    order = getDocData(orderRes)
    if (!order) {
      return createResponse({ code: 404, error: '订单不存在' })
    }
  } catch (err) {
    console.error('[api-order] 查询订单失败:', err)
    return createResponse({ code: 500, error: '查询订单失败' })
  }
  
  if (order.status === 'paid') {
    return createResponse({ code: 400, error: '订单已支付' })
  }
  
  // 2. 生成微信支付订单号
  const outTradeNo = order.orderNo || `ORD${Date.now()}`
  
  // 3. 构建 JSAPI 请求参数
  const body = {
    appid: WX_PAY_CONFIG.APPID,
    mchid: WX_PAY_CONFIG.MCH_ID,
    description: order.courseName || order.items?.[0]?.title || `订单-${outTradeNo.slice(-8)}`,
    out_trade_no: outTradeNo,
    notify_url: WX_PAY_CONFIG.NOTIFY_URL,
    amount: {
      total: Math.round((order.finalAmount || order.amount || order.totalPrice || 0) * 100),
      currency: 'CNY'
    },
    payer: { openid }
  }
  
  // 4. 调用微信支付 API
  try {
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/pay/transactions/jsapi`,
      'POST',
      body
    )
    
    if (result.prepay_id) {
      // 5. 构建小程序调起支付的参数
      const timeStamp = Math.floor(Date.now() / 1000).toString()
      const nonceStr = generateNonceStr(32)
      const packageStr = `prepay_id=${result.prepay_id}`
      
      // 6. RSA-SHA256 签名（微信支付 v3 要求）
      const signMessage = `${WX_PAY_CONFIG.APPID}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`
      const paySign = signWithRSA(signMessage)
      
      // 更新订单的微信支付订单号
      await db.collection('orders').doc(orderId).update({
        wxPrepayId: result.prepay_id,
        wxOutTradeNo: outTradeNo,
        updatedAt: new Date().toISOString()
      })
      
      console.log('[api-order] 支付签名完成')
      
      return createResponse({
        code: 0,
        success: true,
        data: {
          orderId: order._id,
          outTradeNo,
          timeStamp,
          nonceStr,
          package: packageStr,
          signType: 'RSA',
          paySign,
          appId: WX_PAY_CONFIG.APPID
        },
        message: '支付参数获取成功'
      })
    } else {
      console.error('[api-order] 微信返回异常:', result)
      return createResponse({ code: 500, error: '创建支付订单失败: ' + JSON.stringify(result) })
    }
  } catch (err) {
    console.error('[api-order] 请求微信支付失败:', err)
    return createResponse({ code: 500, error: '请求微信支付失败: ' + err.message })
  }
}

// ========== 微信支付回调处理 ==========
// API v3 回调密文解密（AEAD_AES_256_GCM）
function decryptWechatResource(resource, apiV3Key) {
  try {
    const key = Buffer.from(apiV3Key)
    const buf = Buffer.from(resource.ciphertext, 'base64')
    const authTag = buf.slice(buf.length - 16)
    const data = buf.slice(0, buf.length - 16)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, resource.nonce)
    decipher.setAuthTag(authTag)
    if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data))
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return JSON.parse(decrypted.toString('utf8'))
  } catch (e) {
    console.error('[api-order] 回调解密异常:', e && e.message)
    return null
  }
}

async function handlePayCallback(event) {
  try {
    // 从 event 中提取回调数据
    const callbackBody = event.body || event

    // 解密回调数据（API v3 使用 AEAD_AES_256_GCM 加密）
    let notification = callbackBody

    // 如果有加密的 resource 字段，需要解密
    if (callbackBody.resource && callbackBody.resource.ciphertext) {
      // 配置了 WX_API_V3_KEY 时做真实 AES-256-GCM 解密，防止伪造回调
      const apiV3Key = process.env.WX_API_V3_KEY || ''
      if (apiV3Key) {
        const decrypted = decryptWechatResource(callbackBody.resource, apiV3Key)
        if (!decrypted) {
          console.error('[api-order] 支付回调解密失败')
          return createResponse({ code: 400, success: false, error: '回调解密失败' })
        }
        notification = decrypted
      } else {
        // 未配置密钥：仅测试环境兼容，明文处理并记录告警（生产务必配置 WX_API_V3_KEY）
        console.warn('[api-order] 未配置 WX_API_V3_KEY，支付回调按明文处理（存在伪造风险）')
        notification = callbackBody.resource
      }
    }

    // 提取关键信息
    const outTradeNo = notification.out_trade_no || notification.outTradeNo
    const tradeState = notification.trade_state || notification.tradeState
    const transactionId = notification.transaction_id || notification.transactionId
    const amount = notification.amount || {}

    if (!outTradeNo) {
      console.error('[api-order] 缺少订单号')
      return createResponse({ code: 400, success: false, error: '缺少订单号' })
    }

    // 查询订单
    const orderRes = await db.collection('orders')
      .where({ orderNo: outTradeNo })
      .limit(1)
      .get()

    if (!orderRes.data || orderRes.data.length === 0) {
      console.error('[api-order] 订单不存在:', outTradeNo)
      return createResponse({ code: 404, success: false, error: '订单不存在' })
    }

    const order = orderRes.data[0]

    // C4: 已退款订单不重复处理，防止伪造/重复回调重新授予课程权限导致资损
    if (order.status === 'refunded') {
      console.warn('[api-order] 订单已退款，回调跳过:', outTradeNo)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/xml', ...corsHeaders },
        body: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
      }
    }

    // 检查支付状态
    if (tradeState === 'SUCCESS' || tradeState === 'COMPLETED') {
      // 幂等：交易号一致且已是已支付 → 跳过（避免重复回调重复授权）
      if (order.status === 'paid' && order.wxTransactionId === transactionId) {
        console.log('[api-order] 订单已支付且交易号一致，跳过:', outTradeNo)
      } else if (order.status !== 'paid') {
        // 更新订单状态
        await db.collection('orders').doc(order._id).update({
          status: 'paid',
          paidAt: new Date().toISOString(),
          paymentMethod: 'wechat',
          wxTransactionId: transactionId,
          updatedAt: new Date().toISOString()
        })

        console.log('[api-order] 订单状态已更新为已支付:', outTradeNo)

        // 授予课程权限
        const phone = order.phone
        const courseIds = []

        // 从订单中提取课程ID
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (item.courseId) courseIds.push(item.courseId)
          })
        }
        if (order.courseId && !courseIds.includes(order.courseId)) {
          courseIds.push(order.courseId)
        }

        // 写入课程权限
        if (phone && courseIds.length > 0) {
          for (const courseId of courseIds) {
            try {
              const existing = await db.collection('course_permissions')
                .where({ phone, courseId })
                .limit(1)
                .get()

              if (!existing.data || existing.data.length === 0) {
                const now = new Date().toISOString()
                await db.collection('course_permissions').add({
                  phone,
                  courseId,
                  orderId: order._id,
                  source: 'purchase',
                  status: 'active',
                  grantedAt: now,
                  createdAt: now,
                  updatedAt: now
                })
                console.log('[api-order] 课程权限创建成功:', phone, courseId)
              }
            } catch (err) {
              console.error('[api-order] 创建课程权限失败:', err)
            }
          }
        }
      } else {
        console.log('[api-order] 订单已是已支付状态，跳过:', outTradeNo)
      }
    } else if (tradeState === 'CLOSED' || tradeState === 'PAYERROR') {
      // 支付失败或订单关闭
      console.log('[api-order] 支付失败/订单关闭:', outTradeNo, tradeState)
      // 可选：更新订单状态为 cancelled
      // await db.collection('orders').doc(order._id).update({ status: 'cancelled' })
    }

    // 返回成功响应（微信支付需要返回 SUCCESS）
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        ...corsHeaders
      },
      body: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
    }
  } catch (error) {
    console.error('[api-order] 处理支付回调失败:', error)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        ...corsHeaders
      },
      body: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>'
    }
  }
}

// ========== 查询支付状态 ==========
async function queryPayOrder(data) {
  const { outTradeNo } = data
  if (!WX_PAY_CONFIG.PRIVATE_KEY || !WX_PAY_CONFIG.CERT_SERIAL_NO) {
    return createResponse({ code: 500, success: false, error: '微信支付证书未配置' })
  }
  try {
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/pay/transactions/out-trade-no/${outTradeNo}?mchid=${WX_PAY_CONFIG.MCH_ID}`,
      'GET'
    )
    return createResponse({
      code: 0, success: true,
      data: { tradeState: result.trade_state, tradeStateDesc: result.trade_state_desc, paidAt: result.success_time }
    })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '查询支付状态失败' })
  }
}

// ========== 申请退款 ==========
// ========== 退款配置 + 手续费引擎 + 申请/审核（部分退款） ==========

// 默认退款配置（首次访问时写入 refundConfig 集合）
function getDefaultRefundConfig() {
  return {
    classFeeRate: 0.1,            // 培训班：固定比例手续费（默认扣 10%）
    classOverrides: {},           // 按班级覆盖：{ [classId]: rate }
    courseTiers: [                // 课程：阶梯规则（按顺序首个命中者生效，最后一条为兜底不可退）
      { maxDays: 3,    maxProgress: 0,   refundRate: 1.0, label: '未开始且3天内' },
      { maxDays: 7,    maxProgress: 50,  refundRate: 0.8, label: '进度<50%且7天内' },
      { maxDays: 30,   maxProgress: 100, refundRate: 0.5, label: '进度<100%且30天内' },
      { maxDays: 9999, maxProgress: 100, refundRate: 0.0, label: '超出时限不可退' }
    ],
    updatedAt: new Date().toISOString()
  }
}

async function readRefundConfig() {
  try {
    const res = await db.collection('refundConfig').doc('refundConfig').get()
    const cfg = getDocData(res)
    if (cfg) return cfg
  } catch (e) { /* 集合可能尚未创建，下面写入会自建 */ }
  const def = getDefaultRefundConfig()
  try { await db.collection('refundConfig').doc('refundConfig').set(def) } catch (e) {}
  return def
}

// 订单金额（兼容多字段）
function orderAmount(o) {
  return Number(o.finalAmount || o.totalAmount || o.amount || o.totalPrice || 0) || 0
}

// 课程进度（尽力而为；无进度数据时按 0 处理）
async function getCourseProgress(phone, courseId) {
  if (!phone || !courseId) return 0
  try {
    const res = await db.collection('courseProgress').where({ phone, courseId }).get()
    const list = res && res.data ? res.data : []
    const rec = Array.isArray(list) ? (list[0] && (list[0].data || list[0])) : null
    if (rec && typeof rec.progress === 'number') return rec.progress
  } catch (e) {}
  return 0
}

// 根据订单与配置计算退款（手续费 + 实际退款金额）
async function calcRefundInternal(order, cfg) {
  const total = orderAmount(order)
  const orderType = order.orderType || order.type || 'course'
  const days = Math.max(0, Math.floor((Date.now() - new Date(order.paidAt || order.createdAt || Date.now()).getTime()) / 86400000))
  let feeRate = 0
  let rule = ''
  if (orderType === 'class') {
    const rate = (cfg.classOverrides && cfg.classOverrides[order.classId]) ?? cfg.classFeeRate ?? 0.1
    feeRate = rate
    rule = `培训班固定手续费 ${(rate * 100).toFixed(0)}%`
  } else {
    const progress = await getCourseProgress(order.phone || order.buyerPhone, order.courseId)
    const tiers = (cfg.courseTiers && cfg.courseTiers.length) ? cfg.courseTiers : getDefaultRefundConfig().courseTiers
    let matched = null
    for (const t of tiers) {
      if (days <= t.maxDays && progress <= t.maxProgress) { matched = t; break }
    }
    if (!matched) matched = tiers[tiers.length - 1]  // 兜底（不可退）
    feeRate = 1 - matched.refundRate
    rule = `课程阶梯规则：${matched.label || ''}（购买${days}天，进度${progress}%）`
  }
  const fee = Math.round(total * feeRate * 100) / 100
  const actual = Math.round((total - fee) * 100) / 100
  return { totalAmount: total, fee, actualAmount: actual, refundRate: 1 - feeRate, feeRate, rule, days }
}

async function getRefundConfigAction() {
  const cfg = await readRefundConfig()
  return createResponse({ code: 0, success: true, data: cfg })
}

async function saveRefundConfigAction(data) {
  const { classFeeRate, classOverrides, courseTiers } = data || {}
  const cur = await readRefundConfig()
  const next = {
    classFeeRate: typeof classFeeRate === 'number' ? classFeeRate : cur.classFeeRate,
    classOverrides: (classOverrides && typeof classOverrides === 'object') ? classOverrides : (cur.classOverrides || {}),
    courseTiers: (Array.isArray(courseTiers) && courseTiers.length)
      ? courseTiers.map(t => ({
          maxDays: Number(t.maxDays) || 0,
          maxProgress: Number(t.maxProgress) || 0,
          refundRate: Number(t.refundRate) || 0,
          label: t.label || ''
        }))
      : cur.courseTiers,
    updatedAt: new Date().toISOString()
  }
  await db.collection('refundConfig').doc('refundConfig').set(next)
  return createResponse({ code: 0, success: true, data: next })
}

async function calcRefundAction(data) {
  const { orderId } = data
  if (!orderId) return createResponse({ code: 400, success: false, error: '缺少 orderId' })
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = getDocData(orderRes)
    if (!order) return createResponse({ code: 404, success: false, error: '订单不存在' })
    if (order.refundStatus && order.refundStatus !== 'none') {
      return createResponse({ code: 400, success: false, error: '该订单已有退款流程' })
    }
    if (!['paid', 'completed', 'paid_offline'].includes(order.status)) {
      return createResponse({ code: 400, success: false, error: '当前订单状态不可退款' })
    }
    const cfg = await readRefundConfig()
    const calc = await calcRefundInternal(order, cfg)
    return createResponse({ code: 0, success: true, data: { orderId, orderType: order.orderType || order.type, ...calc } })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '计算退款失败: ' + err.message })
  }
}

async function createRefundRequestAction(data) {
  const { orderId, reason = '' } = data
  if (!orderId) return createResponse({ code: 400, success: false, error: '缺少 orderId' })
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = getDocData(orderRes)
    if (!order) return createResponse({ code: 404, success: false, error: '订单不存在' })
    if (order.refundStatus && order.refundStatus !== 'none') {
      return createResponse({ code: 400, success: false, error: '该订单已有退款申请' })
    }
    if (!['paid', 'completed', 'paid_offline'].includes(order.status)) {
      return createResponse({ code: 400, success: false, error: '当前订单状态不可退款' })
    }
    const cfg = await readRefundConfig()
    const calc = await calcRefundInternal(order, cfg)
    const reqDoc = {
      orderId,
      orderNo: order.orderNo,
      phone: order.phone || order.buyerPhone || '',
      orderType: order.orderType || order.type || 'course',
      totalAmount: calc.totalAmount,
      requestAmount: calc.totalAmount,
      fee: calc.fee,
      actualAmount: calc.actualAmount,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const addRes = await db.collection('refundRequests').add(reqDoc)
    const reqId = (addRes && (addRes.id || addRes._id)) || null
    await db.collection('orders').doc(orderId).update({ refundStatus: 'pending', refundId: reqId, updatedAt: new Date().toISOString() })
    return createResponse({ code: 0, success: true, data: { refundId: reqId, ...calc }, message: '退款申请已提交，等待审核' })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '提交退款申请失败: ' + err.message })
  }
}

async function approveRefundAction(data) {
  const { refundId, orderId, actualAmount, fee, reviewNote = '' } = data
  const rid = refundId || orderId
  if (!rid) return createResponse({ code: 400, success: false, error: '缺少 refundId' })
  try {
    const reqRes = await db.collection('refundRequests').doc(rid).get()
    const req = getDocData(reqRes)
    if (!req) return createResponse({ code: 404, success: false, error: '退款申请不存在' })
    // 幂等：已审批的直接返回成功（避免网络重试时重复退款）
    if (req.status === 'approved') {
      return createResponse({ code: 0, success: true, data: { refundId: rid }, message: '退款已处理（重复请求）' })
    }
    if (req.status !== 'pending') return createResponse({ code: 400, success: false, error: '该申请已处理' })
    const orderRes = await db.collection('orders').doc(req.orderId).get()
    const order = getDocData(orderRes)
    if (!order) return createResponse({ code: 404, success: false, error: '订单不存在' })
    // 订单已退款则直接返回成功，避免对已退款订单重复处理
    if (order.status === 'refunded') {
      return createResponse({ code: 0, success: true, data: { refundId: rid }, message: '该订单已退款' })
    }

    const total = req.totalAmount || orderAmount(order)
    let actual = (typeof actualAmount === 'number') ? actualAmount : req.actualAmount
    let feeVal = (typeof fee === 'number') ? fee : req.fee
    if (actual == null) actual = total - (feeVal || 0)
    actual = Math.max(0, Number(actual) || 0)

    const now = new Date().toISOString()
    // 线下支付（paid_offline）或证书未配置：不存在微信交易，仅本地更新退款状态
    const isOffline = order.status === 'paid_offline'
    const canWechat = !isOffline &&
      !!WX_PAY_CONFIG.PRIVATE_KEY && !!WX_PAY_CONFIG.CERT_SERIAL_NO &&
      (order.status === 'paid' || order.status === 'completed')

    if (canWechat) {
      // 稳定单号：基于退款申请ID，重试复用同一 out_refund_no → 微信侧幂等，杜绝重复退款
      const outRefundNo = `REF${rid}`
      const result = await httpRequest(
        `${WX_PAY_BASE}/v3/refund/domestic/refunds`, 'POST',
        {
          out_trade_no: order.orderNo,
          out_refund_no: outRefundNo,
          reason: req.reason || '退款审核通过',
          amount: {
            refund: Math.round(actual * 100),
            total: Math.round(total * 100),
            currency: 'CNY'
          }
        }
      )
      if (result.refund_id) {
        await db.collection('refundRequests').doc(rid).update({
          status: 'approved', actualAmount: actual, fee: feeVal, reviewNote,
          refundNo: outRefundNo, refundedAt: now, refundMethod: 'wechat', updatedAt: now
        })
        await db.collection('orders').doc(req.orderId).update({
          status: 'refunded', refundStatus: 'refunded', refundedAmount: actual,
          refundNo: outRefundNo, refundReason: req.reason, refundedAt: now, updatedAt: now
        })
        try {
          await notifyMessage('sendMessage', {
            phone: req.phone, type: 'refund', title: '退款已处理',
            content: `您的订单 ${req.orderNo} 退款已通过，实际退款 ¥${actual}（手续费 ¥${feeVal || 0}），预计原路退回。`,
            relatedId: req.orderNo, relatedType: 'order'
          })
        } catch (e) { console.error('退款通知失败', e) }
        return createResponse({ code: 0, success: true, data: { refundId: rid }, message: '退款成功' })
      }
      return createResponse({ code: 500, success: false, error: '微信退款失败: ' + JSON.stringify(result) })
    }

    // 线下支付 / 未对接微信证书：本地标记退款完成（人工退款），单号同样基于退款ID保持幂等
    const manualNo = `MANUAL${rid}`
    await db.collection('refundRequests').doc(rid).update({
      status: 'approved', actualAmount: actual, fee: feeVal, reviewNote,
      refundNo: manualNo, refundedAt: now, refundMethod: isOffline ? 'offline' : 'manual', updatedAt: now
    })
    await db.collection('orders').doc(req.orderId).update({
      status: 'refunded', refundStatus: 'refunded', refundedAmount: actual,
      refundNo: manualNo, refundReason: req.reason, refundedAt: now, updatedAt: now
    })
    try {
      await notifyMessage('sendMessage', {
        phone: req.phone, type: 'refund', title: '退款已处理',
        content: `您的订单 ${req.orderNo} 退款已通过，实际退款 ¥${actual}（手续费 ¥${feeVal || 0}）。`,
        relatedId: req.orderNo, relatedType: 'order'
      })
    } catch (e) { console.error('退款通知失败', e) }
    const msg = isOffline ? '线下退款已处理' : '退款已记录（未对接微信退款）'
    return createResponse({ code: 0, success: true, data: { refundId: rid }, message: msg })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '审核退款失败: ' + err.message })
  }
}

async function rejectRefundAction(data) {
  const { refundId, orderId, reviewNote = '' } = data
  const rid = refundId || orderId
  if (!rid) return createResponse({ code: 400, success: false, error: '缺少 refundId' })
  try {
    const reqRes = await db.collection('refundRequests').doc(rid).get()
    const req = getDocData(reqRes)
    if (!req) return createResponse({ code: 404, success: false, error: '退款申请不存在' })
    if (req.status !== 'pending') return createResponse({ code: 400, success: false, error: '该申请已处理' })
    const now = new Date().toISOString()
    await db.collection('refundRequests').doc(rid).update({ status: 'rejected', reviewNote, updatedAt: now })
    await db.collection('orders').doc(req.orderId).update({ refundStatus: 'rejected', updatedAt: now })
    try {
      await notifyMessage('sendMessage', {
        phone: req.phone,
        type: 'refund',
        title: '退款申请未通过',
        content: `您的订单 ${req.orderNo} 退款申请未通过${reviewNote ? '：' + reviewNote : ''}`,
        relatedId: req.orderNo,
        relatedType: 'order'
      })
    } catch (e) { console.error('退款通知失败', e) }
    return createResponse({ code: 0, success: true, message: '已拒绝退款' })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '拒绝退款失败: ' + err.message })
  }
}

// ========== 创建支付订单（Native/H5）==========
async function createPayOrder(data) {
  const { orderId, payType = 'native', clientIp = '127.0.0.1' } = data
  if (!WX_PAY_CONFIG.PRIVATE_KEY || !WX_PAY_CONFIG.CERT_SERIAL_NO) {
    return createResponse({ code: 500, success: false, error: '微信支付证书未配置' })
  }
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = getDocData(orderRes)
    if (!order) return createResponse({ code: 404, success: false, error: '订单不存在' })
    if (order.status === 'paid') return createResponse({ code: 400, success: false, error: '订单已支付' })
    
    const outTradeNo = order.orderNo || `ORD${Date.now()}`
    const body = {
      appid: WX_PAY_CONFIG.APPID,
      mchid: WX_PAY_CONFIG.MCH_ID,
      description: order.courseName || `课程购买-${outTradeNo.slice(-8)}`,
      out_trade_no: outTradeNo,
      notify_url: WX_PAY_CONFIG.NOTIFY_URL,
      amount: { total: Math.round((order.finalAmount || order.amount || 0) * 100), currency: 'CNY' }
    }
    if (payType === 'h5') {
      body.scene_info = { payer_client_ip: clientIp, h5_info: { type: 'Wap' } }
    }
    
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/pay/transactions/${payType === 'h5' ? 'h5' : 'native'}`,
      'POST', body
    )
    
    if (result.code_url) {
      return createResponse({ code: 0, success: true, data: { payType: 'native', codeUrl: result.code_url, outTradeNo, orderId: order._id }, message: '支付订单创建成功' })
    } else if (result.h5_url) {
      return createResponse({ code: 0, success: true, data: { payType: 'h5', h5Url: result.h5_url, outTradeNo, orderId: order._id }, message: '支付订单创建成功' })
    }
    return createResponse({ code: 500, success: false, error: '创建支付订单失败: ' + JSON.stringify(result) })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '请求微信支付失败: ' + err.message })
  }
}

// ========== 培训合同签署 ==========

// 培训协议模板（内置默认内容）
const TRAINING_CONTRACT_TEMPLATE = `
<h2>无人机驾驶培训协议</h2>
<p><strong>甲方（培训机构）：</strong>_______________</p>
<p><strong>乙方（学员）：</strong>{userName}</p>
<p><strong>身份证号：</strong>{idCard}</p>
<p><strong>联系电话：</strong>{phone}</p>
<br/>
<p>甲乙双方本着平等自愿、诚实信用的原则，就无人机驾驶培训事宜达成如下协议：</p>
<br/>
<p><strong>一、培训内容</strong></p>
<p>1. 培训课程：{courseName}</p>
<p>2. 培训方式：理论教学 + 实操训练</p>
<p>3. 培训目标：使学员掌握无人机飞行操作技能，具备参加相关考试的能力</p>
<br/>
<p><strong>二、培训费用</strong></p>
<p>培训费用以订单实际支付金额为准，乙方已通过平台完成支付。</p>
<br/>
<p><strong>三、双方权利与义务</strong></p>
<p>1. 甲方应按教学计划提供培训服务，保证教学质量。</p>
<p>2. 乙方应按时参加培训，遵守培训纪律，服从教学安排。</p>
<p>3. 乙方应确保所提供个人信息真实有效。</p>
<br/>
<p><strong>四、安全责任</strong></p>
<p>1. 实操训练期间，乙方应严格遵守安全操作规程。</p>
<p>2. 因乙方违反操作规程造成的人身或财产损失，由乙方自行承担。</p>
<br/>
<p><strong>五、其他约定</strong></p>
<p>1. 本协议自双方签署之日起生效。</p>
<p>2. 本协议一式两份，甲乙双方各执一份，具有同等法律效力。</p>
<p>3. 未尽事宜，双方协商解决。</p>
<br/>
<p style="margin-top: 40px;"><strong>乙方（学员）签名：</strong></p>
`

// 创建合同
async function createContract(data) {
  const {
    userId, userName, phone, idCard = '',
    orderId = '', registrationId = '',
    courseId = '', courseName = '',
    contractType = 'training_agreement',
    title = '无人机驾驶培训协议',
    contractContent = '',
    openid = ''
  } = data

  if (!userId && !phone) {
    return createResponse({ code: 400, success: false, error: '缺少用户标识' })
  }

  try {
    // 检查是否已存在该订单的合同
    if (orderId) {
      const existing = await db.collection('contracts')
        .where({ orderId })
        .limit(1)
        .get()
      if (existing.data && existing.data.length > 0) {
        return createResponse({
          code: 0, success: true,
          data: existing.data[0],
          message: '合同已存在'
        })
      }
    }

    // 生成合同内容（优先使用数据库模板，否则使用内置模板）
    let content = contractContent
    if (!content) {
      // 从 system_config 读取管理员配置的模板
      let template = ''
      try {
        const configRes = await db.collection('system_config')
          .where({ key: 'contract_template' })
          .limit(1)
          .get()
        if (configRes.data && configRes.data.length > 0) {
          template = configRes.data[0].value || configRes.data[0].content || ''
        }
      } catch (e) {
        console.warn('[api-order] 读取合同模板失败，使用默认模板:', e.message)
      }
      
      if (template) {
        content = template
      } else {
        content = TRAINING_CONTRACT_TEMPLATE
      }
      
      content = content
        .replace(/{userName}/g, userName || '___________')
        .replace(/{idCard}/g, idCard || '__________________')
        .replace(/{phone}/g, phone || '________________')
        .replace(/{courseName}/g, courseName || '无人机驾驶培训')
    }

    const now = new Date().toISOString()
    const contractData = {
      userId: userId || '',
      userName: userName || '',
      phone: phone || '',
      idCard,
      orderId,
      registrationId,
      courseId,
      courseName,
      contractType,
      title,
      contractContent: content,
      signatureImage: '',
      status: 'unsigned',
      verifyMethod: 'sms',
      createdAt: now,
      updatedAt: now
    }

    if (openid) {
      contractData._openid = openid
    }

    const result = await db.collection('contracts').add(contractData)

    console.log('[api-order] 合同创建成功:', result.id)

    return createResponse({
      code: 0, success: true,
      data: { _id: result.id, ...contractData },
      message: '合同创建成功'
    })
  } catch (error) {
    console.error('[api-order] 创建合同失败:', error)
    return createResponse({ code: 500, success: false, error: '创建合同失败: ' + error.message })
  }
}

// 签署合同（学员签署）
async function signContract(data) {
  const {
    contractId,
    signatureImage,
    verifyMethod = 'sms',
    signDevice = '',
    signIP = ''
  } = data

  if (!contractId) {
    return createResponse({ code: 400, success: false, error: '缺少合同ID' })
  }
  if (!signatureImage) {
    return createResponse({ code: 400, success: false, error: '缺少签名图片' })
  }

  try {
    const contractRes = await db.collection('contracts').doc(contractId).get()
    const contract = getDocData(contractRes)

    if (!contract) {
      return createResponse({ code: 404, success: false, error: '合同不存在' })
    }
    // 向后兼容：'signed'（旧数据）和 'student_signed' 都算已签署
    if (contract.status === 'signed' || contract.status === 'student_signed' || contract.status === 'completed') {
      return createResponse({ code: 400, success: false, error: '合同已签署' })
    }

    const now = new Date().toISOString()
    await db.collection('contracts').doc(contractId).update({
      signatureImage,
      status: 'student_signed',
      verifyMethod,
      signDevice,
      signIP,
      signedAt: now,
      updatedAt: now
    })

    console.log('[api-order] 学员签署成功:', contractId)

    return createResponse({
      code: 0, success: true,
      data: {
        contractId,
        status: 'student_signed',
        signedAt: now
      },
      message: '合同签署成功，等待公司盖章'
    })
  } catch (error) {
    console.error('[api-order] 签署合同失败:', error)
    return createResponse({ code: 500, success: false, error: '签署合同失败: ' + error.message })
  }
}

// 公司盖章（管理员操作）
async function companyStamp(data) {
  const { contractId } = data

  if (!contractId) {
    return createResponse({ code: 400, success: false, error: '缺少合同ID' })
  }

  try {
    const contractRes = await db.collection('contracts').doc(contractId).get()
    const contract = getDocData(contractRes)

    if (!contract) {
      return createResponse({ code: 404, success: false, error: '合同不存在' })
    }
    // 向后兼容：'signed' 和 'student_signed' 都可以盖章
    if (contract.status !== 'student_signed' && contract.status !== 'signed') {
      return createResponse({ code: 400, success: false, error: '合同尚未被学员签署，无法盖章' })
    }

    // 读取公司印章配置
    let companySeal = ''
    try {
      const sealRes = await db.collection('system_config')
        .where({ key: 'company_seal' })
        .limit(1)
        .get()
      if (sealRes.data && sealRes.data.length > 0) {
        companySeal = sealRes.data[0].value || ''
      }
    } catch (e) {
      console.warn('[api-order] 读取公司印章失败:', e.message)
    }

    const now = new Date().toISOString()
    await db.collection('contracts').doc(contractId).update({
      status: 'completed',
      companySeal: companySeal || '',
      companySignedAt: now,
      updatedAt: now
    })

    console.log('[api-order] 公司盖章成功:', contractId)

    return createResponse({
      code: 0, success: true,
      data: {
        contractId,
        status: 'completed',
        companySignedAt: now
      },
      message: '公司盖章成功，合同生效'
    })
  } catch (error) {
    console.error('[api-order] 公司盖章失败:', error)
    return createResponse({ code: 500, success: false, error: '公司盖章失败: ' + error.message })
  }
}

// 获取合同详情
async function getContract(data) {
  const { contractId, orderId, registrationId } = data

  try {
    let contract = null

    if (contractId) {
      const res = await db.collection('contracts').doc(contractId).get()
      contract = getDocData(res)
    } else if (orderId) {
      const res = await db.collection('contracts')
        .where({ orderId })
        .limit(1)
        .get()
      contract = (res.data && res.data.length > 0) ? res.data[0] : null
    } else if (registrationId) {
      const res = await db.collection('contracts')
        .where({ registrationId })
        .limit(1)
        .get()
      contract = (res.data && res.data.length > 0) ? res.data[0] : null
    }

    if (!contract) {
      return createResponse({ code: 404, success: false, error: '合同不存在' })
    }

    // 生成签名图片临时链接
    const isSigned = contract.status === 'signed' || contract.status === 'student_signed' || contract.status === 'completed'
    if (contract.signatureImage && isSigned) {
      try {
        const fileRes = await app.getTempFileURL({
          fileList: [contract.signatureImage]
        })
        if (fileRes.fileList && fileRes.fileList[0]) {
          contract.signatureUrl = fileRes.fileList[0].tempFileURL || ''
        }
      } catch (e) {
        console.warn('[api-order] 获取签名图片链接失败:', e.message)
      }
    }
    
    // 生成公司印章临时链接
    if (contract.companySeal && contract.status === 'completed') {
      try {
        const sealRes = await app.getTempFileURL({
          fileList: [contract.companySeal]
        })
        if (sealRes.fileList && sealRes.fileList[0]) {
          contract.companySealUrl = sealRes.fileList[0].tempFileURL || ''
        }
      } catch (e) {
        console.warn('[api-order] 获取印章图片链接失败:', e.message)
      }
    }

    return createResponse({
      code: 0, success: true, data: contract
    })
  } catch (error) {
    console.error('[api-order] 获取合同失败:', error)
    return createResponse({ code: 500, success: false, error: '获取合同失败: ' + error.message })
  }
}

// 获取合同列表
async function getContractList(data) {
  const { phone, userId, status, page = 1, pageSize = 20, openid, keyword } = data

  try {
    const where = {}
    if (phone) where.phone = phone
    if (userId) where.userId = userId
    if (openid) where._openid = openid
    
    // 状态筛选
    if (status) {
      if (status === 'student_signed') {
        // 向后兼容：旧 'signed' 和新 'student_signed' 都表示学员已签署
        where.status = db.command.in(['signed', 'student_signed'])
      } else {
        where.status = status
      }
    }
    
    // 关键词搜索
    if (keyword) {
      const trimmed = keyword.trim()
      where.$or = [
        { userName: db.RegExp({ regexp: trimmed, options: 'i' }) },
        { phone: db.RegExp({ regexp: trimmed, options: 'i' }) },
        { courseName: db.RegExp({ regexp: trimmed, options: 'i' }) }
      ]
    }

    // 统计总数
    const countRes = await db.collection('contracts').where(where).count()
    const total = countRes.total || 0

    const result = await db.collection('contracts')
      .where(where)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return createResponse({
      code: 0, success: true,
      data: {
        list: result.data || [],
        total,
        page,
        pageSize
      }
    })
  } catch (error) {
    console.error('[api-order] 获取合同列表失败:', error)
    return createResponse({ code: 500, success: false, error: '获取合同列表失败: ' + error.message })
  }
}
