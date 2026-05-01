/**
 * api-shop 云函数 - 商城服务
 * 
 * 合并来源：
 * - mobile-order（订单相关）
 * - wechat-pay（微信支付）
 * - api（订单部分）
 * 
 * 功能：
 * - 商品列表
 * - 购物车
 * - 订单创建/查询/取消
 * - 微信支付（Native/H5）
 * - 支付回调处理
 */

// 动态选择 SDK
let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 配置
const CONFIG = {
  APPID: process.env.WX_APPID || 'wx25aaf895ab86181a',
  MCH_ID: process.env.WX_MCH_ID || '',
  API_KEY: process.env.WX_API_KEY || '',
  NOTIFY_URL: process.env.WX_NOTIFY_URL || ''
}

// ========== 工具函数 ==========

function getCorsHeaders(origin = '') {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com'
  ]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  }
}

/**
 * 生成订单号
 */
function generateOrderNo() {
  const now = new Date()
  const date = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
  const random = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `ORD${date}${random}`
}

/**
 * 获取 openid
 */
function getOpenId(event) {
  if (isWxEnv) {
    return cloud.getWXContext().OPENID
  }
  return event.userId || event._openid || ''
}

// ========== 商品相关 ==========

/**
 * 获取商品列表（课程作为商品）
 */
async function getProducts(params = {}) {
  const { page = 1, pageSize = 20, category = '', keyword = '' } = params

  let where = { status: 'published' }
  if (category && category !== '全部') where.category = category
  if (keyword) {
    where.title = db.RegExp({ regexp: keyword, options: 'i' })
  }

  const countResult = await db.collection('courses').where(where).count()

  const courses = await db.collection('courses')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: courses.data.map(c => ({
        _id: c._id,
        title: c.title,
        cover: c.cover || c.coverImage,
        price: c.price || 0,
        originalPrice: c.originalPrice || c.price || 0,
        description: c.description?.slice(0, 100) || '',
        category: c.category,
        level: c.level,
        isFree: c.isFree || false
      })),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

// ========== 购物车 ==========

/**
 * 获取购物车
 */
async function getCart(userId) {
  const openid = userId || getOpenId({})
  if (!openid) return { success: true, data: [] }

  const cart = await db.collection('cart')
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .get()

  if (!cart.data || cart.data.length === 0) {
    return { success: true, data: [] }
  }

  // 获取商品详情
  const productIds = cart.data.map(c => c.productId).filter(Boolean)
  const products = await db.collection('courses')
    .where({ _id: _.in(productIds) })
    .get()

  const productsMap = {}
  products.data.forEach(p => { productsMap[p._id] = p })

  return {
    success: true,
    data: cart.data.map(item => ({
      _id: item._id,
      productId: item.productId,
      quantity: item.quantity || 1,
      product: productsMap[item.productId] ? {
        _id: productsMap[item.productId]._id,
        title: productsMap[item.productId].title,
        cover: productsMap[item.productId].cover,
        price: productsMap[item.productId].price || 0
      } : null
    })).filter(item => item.product)
  }
}

/**
 * 添加到购物车
 */
async function addToCart(productId, quantity = 1, userId) {
  const openid = userId || getOpenId({})
  if (!openid) return { success: false, error: '请先登录' }

  // 检查商品是否存在
  const product = await db.collection('courses').doc(productId).get()
  if (!product.data) return { success: false, error: '商品不存在' }

  // 检查购物车是否已有
  const existing = await db.collection('cart')
    .where({ _openid: openid, productId })
    .limit(1)
    .get()

  if (existing.data && existing.data.length > 0) {
    // 更新数量
    await db.collection('cart').doc(existing.data[0]._id).update({
      quantity: _.inc(quantity)
    })
  } else {
    // 添加新项
    await db.collection('cart').add({
      data: {
        _openid: openid,
        productId,
        quantity,
        createdAt: new Date().toISOString()
      }
    })
  }

  return { success: true }
}

/**
 * 从购物车移除
 */
async function removeFromCart(itemId, userId) {
  const openid = userId || getOpenId({})
  await db.collection('cart')
    .where({ _openid: openid, _id: itemId })
    .remove()
  return { success: true }
}

// ========== 订单相关 ==========

/**
 * 创建订单
 */
async function createOrder(data, userId) {
  const openid = userId || getOpenId({})
  const { productId, couponId, quantity = 1 } = data

  // 如果从购物车创建，productId 可以是数组
  const productIds = Array.isArray(productId) ? productId : [productId]

  if (productIds.length === 0) {
    return { success: false, error: '请选择商品' }
  }

  // 获取商品信息
  const products = await db.collection('courses')
    .where({ _id: _.in(productIds) })
    .get()

  if (!products.data || products.data.length === 0) {
    return { success: false, error: '商品不存在' }
  }

  // 过滤已购买的商品
  const existingOrders = await db.collection('orders')
    .where({
      _openid: openid,
      status: 'paid'
    })
    .get()

  const purchasedIds = new Set(
    existingOrders.data.flatMap(o => 
      (o.items || []).map(i => i.courseId || i.productId)
    )
  )

  const validProducts = products.data.filter(p => !purchasedIds.has(p._id))
  if (validProducts.length === 0) {
    return { success: false, error: '商品已购买' }
  }

  // 计算金额
  let totalAmount = 0
  const items = validProducts.map(p => {
    totalAmount += p.price || 0
    return {
      courseId: p._id,
      productId: p._id,
      title: p.title,
      price: p.price || 0,
      quantity: 1
    }
  })

  // 创建订单
  const orderNo = generateOrderNo()
  const now = new Date().toISOString()
  const expiredAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const order = {
    orderNo,
    _openid: openid,
    userId: openid,
    items,
    totalAmount,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiredAt
  }

  const result = await db.collection('orders').add({ data: order })

  // 清空购物车
  if (data.clearCart) {
    await db.collection('cart').where({ _openid: openid }).remove()
  }

  return {
    success: true,
    data: {
      orderId: result.id,
      orderNo,
      totalAmount,
      items,
      expiredAt
    }
  }
}

/**
 * 获取订单列表
 */
async function getOrders(params, userId) {
  const openid = userId || getOpenId({})
  const { page = 1, pageSize = 10, status = '' } = params

  let where = { _openid: openid }
  if (status) where.status = status

  const countResult = await db.collection('orders').where(where).count()

  const orders = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: orders.data.map(o => ({
        _id: o._id,
        orderNo: o.orderNo,
        items: o.items,
        totalAmount: o.totalAmount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paidAt: o.paidAt,
        createdAt: o.createdAt,
        expiredAt: o.expiredAt
      })),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 获取订单详情
 */
async function getOrderDetail(orderId, userId) {
  const openid = userId || getOpenId({})

  const order = await db.collection('orders').doc(orderId).get()

  if (!order.data) {
    return { success: false, error: '订单不存在' }
  }

  if (order.data._openid !== openid) {
    return { success: false, error: '无权查看此订单' }
  }

  return {
    success: true,
    data: {
      _id: order.data._id,
      orderNo: order.data.orderNo,
      items: order.data.items,
      totalAmount: order.data.totalAmount,
      status: order.data.status,
      paymentMethod: order.data.paymentMethod,
      paidAt: order.data.paidAt,
      createdAt: order.data.createdAt,
      expiredAt: order.data.expiredAt
    }
  }
}

/**
 * 取消订单
 */
async function cancelOrder(orderId, userId) {
  const openid = userId || getOpenId({})

  const order = await db.collection('orders').doc(orderId).get()

  if (!order.data) {
    return { success: false, error: '订单不存在' }
  }

  if (order.data._openid !== openid) {
    return { success: false, error: '无权操作此订单' }
  }

  if (order.data.status !== 'pending') {
    return { success: false, error: '订单状态不允许取消' }
  }

  await db.collection('orders').doc(orderId).update({
    status: 'cancelled',
    updatedAt: new Date().toISOString()
  })

  return { success: true }
}

/**
 * 支付订单（模拟）
 */
async function payOrder(data, userId) {
  const openid = userId || getOpenId({})
  const { orderId, paymentMethod = 'mock' } = data

  const order = await db.collection('orders').doc(orderId).get()

  if (!order.data) {
    return { success: false, error: '订单不存在' }
  }

  if (order.data._openid !== openid) {
    return { success: false, error: '无权操作此订单' }
  }

  if (order.data.status !== 'pending') {
    return { success: false, error: '订单状态不允许支付' }
  }

  if (new Date(order.data.expiredAt) < new Date()) {
    await db.collection('orders').doc(orderId).update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    })
    return { success: false, error: '订单已过期' }
  }

  const now = new Date().toISOString()

  // 更新订单状态
  await db.collection('orders').doc(orderId).update({
    status: 'paid',
    paymentMethod,
    paidAt: now,
    updatedAt: now
  })

  // 授予课程权限
  for (const item of order.data.items || []) {
    const courseId = item.courseId || item.productId
    if (courseId) {
      // 检查是否已有权限
      const existing = await db.collection('course_permissions')
        .where({ _openid: openid, courseId })
        .limit(1)
        .get()

      if (!existing.data || existing.data.length === 0) {
        await db.collection('course_permissions').add({
          data: {
            _openid: openid,
            userId: openid,
            courseId,
            orderId,
            source: 'purchase',
            status: 'active',
            grantedAt: now,
            createdAt: now
          }
        })
      }

      // 更新课程学员数
      await db.collection('courses').doc(courseId).update({
        studentCount: _.inc(1)
      })
    }
  }

  return {
    success: true,
    data: {
      orderId,
      orderNo: order.data.orderNo,
      paidAt: now
    }
  }
}

// ========== 优惠券 ==========

async function getCoupons(userId) {
  const openid = userId || getOpenId({})
  if (!openid) return { success: true, data: [] }

  const coupons = await db.collection('coupons')
    .where({
      _openid: openid,
      status: 'unused',
      expiredAt: _.gt(new Date().toISOString())
    })
    .orderBy('createdAt', 'desc')
    .get()

  return {
    success: true,
    data: coupons.data.map(c => ({
      _id: c._id,
      name: c.name,
      type: c.type,
      value: c.value,
      minAmount: c.minAmount,
      expiredAt: c.expiredAt
    }))
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[api-shop] 收到请求:', event.action)

  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: 0, message: 'OK' })
    }
  }

  // 解析参数
  let action = event.action || ''
  let data = event.data || event

  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || action
      data = body.data || body
    } catch (e) {}
  }

  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : '')

  try {
    let result

    switch (action) {
      // 商品
      case 'products':
      case 'getProducts':
        result = await getProducts(data)
        break

      // 购物车
      case 'cart':
      case 'getCart':
        result = await getCart(userId)
        break
      case 'addToCart':
        result = await addToCart(data.productId, data.quantity, userId)
        break
      case 'removeFromCart':
        result = await removeFromCart(data.itemId, userId)
        break

      // 订单
      case 'createOrder':
        result = await createOrder(data, userId)
        break
      case 'orders':
      case 'getOrders':
        result = await getOrders(data, userId)
        break
      case 'orderDetail':
      case 'getOrderDetail':
        result = await getOrderDetail(data.orderId, userId)
        break
      case 'cancelOrder':
        result = await cancelOrder(data.orderId, userId)
        break
      case 'payOrder':
        result = await payOrder(data, userId)
        break

      // 优惠券
      case 'coupons':
      case 'getCoupons':
        result = await getCoupons(userId)
        break

      default:
        result = { success: false, error: '未知的操作: ' + action }
    }

    // HTTP 返回格式
    if (event.httpMethod || event.headers) {
      return {
        statusCode: result.success ? 200 : 400,
        headers: getCorsHeaders(event.headers?.origin),
        body: JSON.stringify(result)
      }
    }

    return result

  } catch (error) {
    console.error('[api-shop] 错误:', error)
    const errorResult = { success: false, error: error.message }

    if (event.httpMethod || event.headers) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(),
        body: JSON.stringify(errorResult)
      }
    }

    return errorResult
  }
}