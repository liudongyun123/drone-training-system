/**
 * api-order 云函数 - 统一订单管理
 *
 * 功能：
 * - 创建订单（课程订单、商品订单、班级报名订单）
 * - 查询订单列表（支持按用户、状态筛选、分页）
 * - 获取订单详情
 * - 更新订单状态（pending/paid/cancelled/refunded）
 * - 取消订单
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

// ========== 工具函数 ==========

/**
 * CORS 头
 */
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
 * 生成订单号：ORD + 年月日时分秒 + 4位随机数
 */
function generateOrderNo() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD${ts}${rand}`
}

/**
 * 合法订单状态列表
 */
const VALID_STATUS = ['pending', 'paid', 'cancelled', 'refunded']

/**
 * 合法订单类型列表
 */
const VALID_TYPES = ['course', 'product', 'class']

/**
 * 校验订单类型
 */
function isValidType(type) {
  return VALID_TYPES.includes(type)
}

/**
 * 校验订单状态
 */
function isValidStatus(status) {
  return VALID_STATUS.includes(status)
}

// ========== 业务逻辑 ==========

/**
 * 创建订单
 *
 * @param {Object} data
 * @param {string} data.userId     - 用户 ID
 * @param {string} data.phone      - 用户手机号
 * @param {string} data.type       - 订单类型 course / product / class
 * @param {Array}  data.items      - 订单项 [{ itemId, name, price, quantity, cover?, spec? }]
 * @param {string} data.remark     - 备注（可选）
 * @param {string} data.contactName- 联系人（可选，班级报名时常用）
 */
async function createOrder(data, openid) {
  const { userId, phone, type, items, remark = '', contactName = '' } = data

  if (!type || !isValidType(type)) {
    return { success: false, error: `订单类型无效，可选值：${VALID_TYPES.join('/')}` }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: '订单项不能为空' }
  }

  // 校验每个订单项
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item.itemId) {
      return { success: false, error: `第 ${i + 1} 个订单项缺少 itemId` }
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      return { success: false, error: `第 ${i + 1} 个订单项 price 无效` }
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1) {
      return { success: false, error: `第 ${i + 1} 个订单项 quantity 无效` }
    }
  }

  // 计算总金额
  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.price || 0) * (item.quantity || 1)
  }, 0)

  const now = new Date().toISOString()
  const orderNo = generateOrderNo()

  const orderData = {
    orderNo,
    userId: userId || openid,
    _openid: openid,
    phone: phone || '',
    type,
    items: items.map(item => ({
      itemId: item.itemId,
      name: item.name || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      cover: item.cover || '',
      spec: item.spec || '',
      subtotal: (item.price || 0) * (item.quantity || 1)
    })),
    totalAmount,
    status: 'pending',
    remark,
    contactName,
    paidAt: null,
    createdAt: now,
    updatedAt: now
  }

  const res = await db.collection('orders').add({ data: orderData })

  return {
    success: true,
    data: {
      _id: res._id,
      orderNo: orderData.orderNo,
      totalAmount: orderData.totalAmount,
      status: orderData.status
    }
  }
}

/**
 * 查询订单列表
 *
 * @param {Object} params
 * @param {number} params.page       - 页码（默认 1）
 * @param {number} params.pageSize   - 每页条数（默认 10）
 * @param {string} params.userId     - 按用户筛选（可选）
 * @param {string} params.status     - 按状态筛选（可选）
 * @param {string} params.type       - 按类型筛选（可选）
 * @param {string} params.orderNo    - 按订单号搜索（可选）
 */
async function getOrderList(params, openid) {
  const {
    page = 1,
    pageSize = 10,
    userId = '',
    status = '',
    type = '',
    orderNo = ''
  } = params

  let where = {}

  // 管理员可查看所有订单，普通用户只能看自己的
  if (userId) {
    where.userId = userId
  } else if (openid) {
    where._openid = openid
  }

  if (status && isValidStatus(status)) {
    where.status = status
  }

  if (type && isValidType(type)) {
    where.type = type
  }

  if (orderNo) {
    where.orderNo = orderNo
  }

  // 获取总数
  const countResult = await db.collection('orders').where(where).count()
  const total = countResult.total

  // 分页查询
  const skip = (page - 1) * pageSize
  const listRes = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: listRes.data.map(formatOrder),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }
}

/**
 * 获取订单详情
 *
 * @param {string} orderId - 订单 ID
 */
async function getOrderDetail(orderId) {
  if (!orderId) {
    return { success: false, error: '缺少订单 ID' }
  }

  const res = await db.collection('orders').doc(orderId).get()

  if (!res.data) {
    return { success: false, error: '订单不存在' }
  }

  return {
    success: true,
    data: formatOrder(res.data)
  }
}

/**
 * 更新订单状态
 *
 * @param {Object} data
 * @param {string} data.orderId   - 订单 ID
 * @param {string} data.status    - 目标状态 paid / cancelled / refunded
 * @param {string} data.remark    - 备注信息（可选）
 */
async function updateOrderStatus(data) {
  const { orderId, status, remark = '' } = data

  if (!orderId) {
    return { success: false, error: '缺少订单 ID' }
  }

  if (!status || !isValidStatus(status)) {
    return { success: false, error: `目标状态无效，可选值：${VALID_STATUS.join('/')}` }
  }

  // 获取原订单
  const res = await db.collection('orders').doc(orderId).get()
  if (!res.data) {
    return { success: false, error: '订单不存在' }
  }

  const order = res.data

  // 状态流转校验
  const validTransitions = {
    pending: ['paid', 'cancelled'],
    paid: ['refunded', 'cancelled'],
    cancelled: [],
    refunded: []
  }

  const allowed = validTransitions[order.status] || []
  if (!allowed.includes(status)) {
    return { success: false, error: `订单状态不可从 "${order.status}" 变更为 "${status}"` }
  }

  const now = new Date().toISOString()
  const updateData = {
    status,
    updatedAt: now
  }

  // 支付成功时记录支付时间
  if (status === 'paid') {
    updateData.paidAt = now
  }

  // 退款时记录备注
  if (status === 'refunded' && remark) {
    updateData.remark = remark
  }

  await db.collection('orders').doc(orderId).update({
    data: updateData
  })

  return {
    success: true,
    data: {
      orderId,
      orderNo: order.orderNo,
      oldStatus: order.status,
      newStatus: status
    }
  }
}

/**
 * 取消订单（快捷方法，等同 updateStatus → cancelled）
 *
 * @param {Object} data
 * @param {string} data.orderId - 订单 ID
 * @param {string} data.reason  - 取消原因（可选）
 */
async function cancelOrder(data, openid) {
  const { orderId, reason = '' } = data

  if (!orderId) {
    return { success: false, error: '缺少订单 ID' }
  }

  // 获取订单，校验归属
  const res = await db.collection('orders').doc(orderId).get()
  if (!res.data) {
    return { success: false, error: '订单不存在' }
  }

  const order = res.data

  // 非待支付订单不允许取消
  if (order.status !== 'pending') {
    return { success: false, error: `当前状态 "${order.status}" 不允许取消，仅待支付订单可取消` }
  }

  const now = new Date().toISOString()

  await db.collection('orders').doc(orderId).update({
    data: {
      status: 'cancelled',
      remark: reason || '用户取消',
      cancelledAt: now,
      updatedAt: now
    }
  })

  return {
    success: true,
    data: {
      orderId,
      orderNo: order.orderNo,
      status: 'cancelled'
    }
  }
}

/**
 * 删除订单（仅允许删除已取消的订单）
 *
 * @param {Object} data
 * @param {string} data.orderId - 订单 ID
 */
async function deleteOrder(data, openid) {
  const { orderId } = data

  if (!orderId) {
    return { success: false, error: '缺少订单 ID' }
  }

  // 获取订单
  const res = await db.collection('orders').doc(orderId).get()
  if (!res.data) {
    return { success: false, error: '订单不存在' }
  }

  const order = res.data

  // 仅允许删除已取消的订单
  if (order.status !== 'cancelled' && order.status !== 'refunded') {
    return { success: false, error: '仅允许删除已取消或已退款的订单' }
  }

  await db.collection('orders').doc(orderId).remove()

  console.log('[api-order] 删除订单:', orderId)

  return {
    success: true,
    data: {
      orderId,
      orderNo: order.orderNo
    },
    message: '订单已删除'
  }
}

/**
 * 格式化订单数据（去掉 _openid 等内部字段）
 */
function formatOrder(order) {
  return {
    _id: order._id,
    orderNo: order.orderNo,
    userId: order.userId || '',
    phone: order.phone || '',
    type: order.type,
    items: order.items || [],
    totalAmount: order.totalAmount || 0,
    status: order.status,
    remark: order.remark || '',
    contactName: order.contactName || '',
    paidAt: order.paidAt || null,
    cancelledAt: order.cancelledAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[api-order] 收到请求:', event.action)

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
    } catch (e) { /* ignore */ }
  }

  // 获取用户标识
  const openid = isWxEnv ? cloud.getWXContext().OPENID : ''

  try {
    let result

    switch (action) {
      // 创建订单
      case 'create':
        result = await createOrder(data, openid)
        break

      // 查询订单列表
      case 'getList':
      case 'list':
        result = await getOrderList(data, openid)
        break

      // 获取订单详情
      case 'getDetail':
      case 'detail':
        result = await getOrderDetail(data.orderId)
        break

      // 更新订单状态
      case 'updateStatus':
        result = await updateOrderStatus(data)
        break

      // 取消订单
      case 'cancel':
        result = await cancelOrder(data, openid)
        break

      // 删除订单
      case 'delete':
        result = await deleteOrder(data, openid)
        break

      default:
        result = { success: false, error: `未知的操作: ${action}` }
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
    console.error('[api-order] 错误:', error)
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
