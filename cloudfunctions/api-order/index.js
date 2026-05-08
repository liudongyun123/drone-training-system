/**
 * api-order 云函数 - Feature: Order
 *
 * 功能：
 * - 订单管理（创建、查询、更新状态、取消、删除）
 * - 购物车管理（获取、添加、移除、清空）
 * - 优惠券管理（获取、验证、使用、领取）
 *
 * Actions:
 * 订单: create, getList, getDetail, updateStatus, cancel, delete
 * 购物车: getCart, addToCart, removeFromCart, clearCart
 * 优惠券: getCoupons, validateCoupon, useCoupon, claimCoupon
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

// ========== 集合名称 ==========

const COLLECTIONS = {
  ORDERS: 'orders',
  CART: 'cart',
  COUPONS: 'coupons',
  COURSES: 'courses',
}

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
 * 统一成功响应
 */
function success(data, message = 'success') {
  return { success: true, data, message };
}

/**
 * 统一错误响应
 */
function fail(message, error = null) {
  if (error) console.error(`[Error] ${message}:`, error);
  return { success: false, error: message };
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
 * 生成优惠券码
 */
function generateCouponCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

// ========== 购物车相关 ==========

/**
 * 获取购物车
 */
async function getCart(openid) {
  const cartResult = await db.collection(COLLECTIONS.CART)
    .where({ _openid: openid })
    .limit(1)
    .get();
  
  if (!cartResult.data || cartResult.data.length === 0) {
    return success({ items: [], totalAmount: 0 });
  }
  
  const cart = cartResult.data[0];
  
  // 获取课程详情
  const courseIds = (cart.items || []).map(item => item.courseId);
  let courses = [];
  
  if (courseIds.length > 0) {
    const coursesResult = await db.collection(COLLECTIONS.COURSES)
      .where({
        _id: _.in(courseIds),
        status: 'published',
      })
      .get();
    courses = coursesResult.data;
  }
  
  // 合并课程信息
  const items = (cart.items || []).map(item => {
    const course = courses.find(c => c._id === item.courseId) || {};
    return {
      ...item,
      title: course.title || item.title,
      cover: course.cover || item.cover,
      price: course.price || item.price,
    };
  });
  
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  return success({
    items,
    totalAmount,
    itemCount: items.length,
  });
}

/**
 * 添加到购物车
 */
async function addToCart(data, openid) {
  const { courseId, title, cover, price } = data;
  
  if (!courseId) {
    return fail('缺少课程ID');
  }
  
  // 检查课程是否存在
  const course = await db.collection(COLLECTIONS.COURSES)
    .doc(courseId)
    .get();
  
  if (!course.data || course.data.length === 0) {
    return fail('课程不存在');
  }
  
  // 检查是否已购买
  const existingOrder = await db.collection(COLLECTIONS.ORDERS)
    .where({
      _openid: openid,
      'items.itemId': courseId,
      status: 'paid',
    })
    .count();
  
  if (existingOrder > 0) {
    return fail('您已购买该课程');
  }
  
  // 获取或创建购物车
  let cartResult = await db.collection(COLLECTIONS.CART)
    .where({ _openid: openid })
    .limit(1)
    .get();
  
  let cart;
  
  if (cartResult.data && cartResult.data.length > 0) {
    cart = cartResult.data[0];
  } else {
    // 创建新购物车
    const newCart = {
      _openid: openid,
      items: [],
      createdAt: new Date().toISOString(),
    };
    const result = await db.collection(COLLECTIONS.CART).add({ data: newCart });
    cart = { ...newCart, _id: result._id };
  }
  
  // 检查购物车中是否已存在
  const existingItems = cart.items || [];
  const existsIndex = existingItems.findIndex(item => item.courseId === courseId);
  
  if (existsIndex >= 0) {
    return success({ added: false, message: '课程已在购物车中' });
  }
  
  // 添加新课程
  existingItems.push({
    courseId,
    title: course.data[0].title,
    cover: course.data[0].cover,
    price: course.data[0].price,
    quantity: 1,
    addedAt: new Date().toISOString(),
  });
  
  await db.collection(COLLECTIONS.CART)
    .doc(cart._id)
    .update({
      data: { items: existingItems },
    });
  
  return success({ added: true, itemCount: existingItems.length });
}

/**
 * 从购物车移除
 */
async function removeFromCart(data, openid) {
  const { courseId } = data;
  
  if (!courseId) {
    return fail('缺少课程ID');
  }
  
  const cartResult = await db.collection(COLLECTIONS.CART)
    .where({ _openid: openid })
    .limit(1)
    .get();
  
  if (!cartResult.data || cartResult.data.length === 0) {
    return fail('购物车为空');
  }
  
  const cart = cartResult.data[0];
  const items = (cart.items || []).filter(item => item.courseId !== courseId);
  
  await db.collection(COLLECTIONS.CART)
    .doc(cart._id)
    .update({
      data: { items },
    });
  
  return success({ removed: true, itemCount: items.length });
}

/**
 * 清空购物车
 */
async function clearCart(openid) {
  const cartResult = await db.collection(COLLECTIONS.CART)
    .where({ _openid: openid })
    .limit(1)
    .get();
  
  if (!cartResult.data || cartResult.data.length === 0) {
    return success({ cleared: true });
  }
  
  await db.collection(COLLECTIONS.CART)
    .doc(cartResult.data[0]._id)
    .update({
      data: { items: [] },
    });
  
  return success({ cleared: true });
}

// ========== 优惠券相关 ==========

/**
 * 获取优惠券列表
 */
async function getCoupons(data, openid) {
  const { page = 1, pageSize = 10, status } = data;
  
  let where = { _openid: openid };
  
  if (status === 'available') {
    where.used = false;
    where.expireAt = _.gt(new Date().toISOString());
  } else if (status === 'used') {
    where.used = true;
  } else if (status === 'expired') {
    where.used = false;
    where.expireAt = _.lt(new Date().toISOString());
  }
  
  const query = db.collection(COLLECTIONS.COUPONS)
    .where(where)
    .orderBy('createdAt', 'desc');
  
  const skip = (page - 1) * pageSize;
  const result = await query.skip(skip).limit(pageSize).get();
  const countResult = await query.count();
  
  return success({
    list: result.data,
    total: countResult.total,
    page,
    pageSize,
  });
}

/**
 * 验证优惠券
 */
async function validateCoupon(data) {
  const { code, amount } = data;
  
  if (!code) {
    return fail('缺少优惠券码');
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return fail('订单金额无效');
  }
  
  const couponResult = await db.collection(COLLECTIONS.COUPONS)
    .where({
      code: code.toUpperCase(),
      used: false,
      expireAt: _.gt(new Date().toISOString()),
    })
    .limit(1)
    .get();
  
  if (!couponResult.data || couponResult.data.length === 0) {
    return fail('优惠券无效或已过期');
  }
  
  const coupon = couponResult.data[0];
  
  // 检查最低消费
  if (coupon.minAmount && amount < coupon.minAmount) {
    return fail(`订单金额需满 ${coupon.minAmount} 元`);
  }
  
  // 计算优惠金额
  let discount = 0;
  if (coupon.type === 'fixed') {
    discount = coupon.value;
  } else if (coupon.type === 'percentage') {
    discount = Math.floor(amount * (coupon.value / 100));
  }
  
  // 优惠金额不能超过订单金额
  discount = Math.min(discount, amount);
  
  return success({
    valid: true,
    discount,
    finalAmount: amount - discount,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      name: coupon.name,
    },
  });
}

/**
 * 使用优惠券
 */
async function useCoupon(data, openid) {
  const { code, orderId } = data;
  
  if (!code) {
    return fail('缺少优惠券码');
  }
  
  // 获取优惠券
  const couponResult = await db.collection(COLLECTIONS.COUPONS)
    .where({
      code: code.toUpperCase(),
      _openid: openid,
      used: false,
    })
    .limit(1)
    .get();
  
  if (!couponResult.data || couponResult.data.length === 0) {
    return fail('优惠券不存在或已使用');
  }
  
  const coupon = couponResult.data[0];
  
  // 标记为已使用
  await db.collection(COLLECTIONS.COUPONS)
    .doc(coupon._id)
    .update({
      data: {
        used: true,
        usedAt: new Date().toISOString(),
        usedOrderId: orderId || '',
      },
    });
  
  return success({ used: true, couponId: coupon._id });
}

/**
 * 领取优惠券
 */
async function claimCoupon(data, openid) {
  const { couponId } = data;
  
  if (!couponId) {
    return fail('缺少优惠券ID');
  }
  
  // 检查是否已领取
  const existing = await db.collection(COLLECTIONS.COUPONS)
    .where({
      _openid: openid,
      sourceCouponId: couponId,
    })
    .count();
  
  if (existing > 0) {
    return fail('您已领取过该优惠券');
  }
  
  // 获取优惠券模板
  // 这里假设有优惠券模板集合，或者直接创建新优惠券
  // 简化处理：创建新优惠券
  const code = generateCouponCode();
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 30); // 30天后过期
  
  const result = await db.collection(COLLECTIONS.COUPONS).add({
    data: {
      _openid: openid,
      code,
      name: data.name || '优惠券',
      type: data.type || 'fixed',
      value: data.value || 10,
      minAmount: data.minAmount || 0,
      used: false,
      sourceCouponId: couponId,
      expireAt: expireAt.toISOString(),
      createdAt: new Date().toISOString(),
    },
  });
  
  return success({
    claimed: true,
    coupon: {
      _id: result._id,
      code,
      name: data.name || '优惠券',
      expireAt: expireAt.toISOString(),
    },
  });
}

// ========== 业务逻辑 ==========

/**
 * 创建订单
 *
 * @param {Object} data
 * @param {string} data.phone      - 用户手机号（优先使用）
 * @param {string} data.userId     - 用户 ID（兼容）
 * @param {string} data.type       - 订单类型 course / product / class
 * @param {Array}  data.items      - 订单项 [{ itemId, name, price, quantity, cover?, spec? }]
 * @param {string} data.remark     - 备注（可选）
 * @param {string} data.contactName- 联系人（可选，班级报名时常用）
 */
async function createOrder(data, openid) {
  const { phone, userId, type, items, remark = '', contactName = '' } = data

  if (!type || !isValidType(type)) {
    return { success: false, error: `订单类型无效，可选值：${VALID_TYPES.join('/')}` }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: '订单项不能为空' }
  }

  // 校验每个订单项
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    // 兼容 itemId 和 productId
    if (!item.itemId && !item.productId) {
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
    phone: phone || '',  // 使用 phone 作为主要标识
    userId: userId || openid || null,  // 保留 userId 兼容
    _openid: openid,
    type,
    items: items.map(item => ({
      itemId: item.itemId || item.productId,  // 兼容 itemId 和 productId
      productId: item.productId || item.itemId,  // 兼容
      name: item.title || item.name || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      cover: item.cover || item.coverImage || '',
      spec: item.spec || item.specs || '',
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

  const res = await db.collection(COLLECTIONS.ORDERS).add({ data: orderData })

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
 * 优先使用 phone 作为用户标识，同时兼容 userId 和 openid
 *
 * @param {Object} params
 * @param {number} params.page       - 页码（默认 1）
 * @param {number} params.pageSize   - 每页条数（默认 10）
 * @param {string} params.phone      - 用户手机号（优先使用）
 * @param {string} params.userId     - 用户 ID（兼容）
 * @param {string} params.status     - 按状态筛选（可选）
 * @param {string} params.type       - 按类型筛选（可选）
 * @param {string} params.orderNo    - 按订单号搜索（可选）
 */
async function getOrderList(params, openid) {
  const {
    page = 1,
    pageSize = 10,
    phone = '',
    userId = '',
    status = '',
    type = '',
    orderNo = ''
  } = params

  // 优先使用 phone，兼容 userId 和 openid
  const identity = phone || userId || openid || ''

  let where = {}

  // 使用 phone 作为主要标识
  if (phone) {
    where.phone = phone
  } else if (userId) {
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
  const countResult = await db.collection(COLLECTIONS.ORDERS).where(where).count()
  const total = countResult.total

  // 分页查询
  const skip = (page - 1) * pageSize
  const listRes = await db.collection(COLLECTIONS.ORDERS)
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

  const res = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get()

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
  const res = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get()
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

  await db.collection(COLLECTIONS.ORDERS).doc(orderId).update({
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
  const res = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get()
  if (!res.data) {
    return { success: false, error: '订单不存在' }
  }

  const order = res.data

  // 非待支付订单不允许取消
  if (order.status !== 'pending') {
    return { success: false, error: `当前状态 "${order.status}" 不允许取消，仅待支付订单可取消` }
  }

  const now = new Date().toISOString()

  await db.collection(COLLECTIONS.ORDERS).doc(orderId).update({
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
  const res = await db.collection(COLLECTIONS.ORDERS).doc(orderId).get()
  if (!res.data) {
    return { success: false, error: '订单不存在' }
  }

  const order = res.data

  // 仅允许删除已取消的订单
  if (order.status !== 'cancelled' && order.status !== 'refunded') {
    return { success: false, error: '仅允许删除已取消或已退款的订单' }
  }

  await db.collection(COLLECTIONS.ORDERS).doc(orderId).remove()

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

      // ===== 购物车 =====
      case 'getCart':
        result = await getCart(openid)
        break

      case 'addToCart':
        result = await addToCart(data, openid)
        break

      case 'removeFromCart':
        result = await removeFromCart(data, openid)
        break

      case 'clearCart':
        result = await clearCart(openid)
        break

      // ===== 优惠券 =====
      case 'getCoupons':
        result = await getCoupons(data, openid)
        break

      case 'validateCoupon':
        result = await validateCoupon(data)
        break

      case 'useCoupon':
        result = await useCoupon(data, openid)
        break

      case 'claimCoupon':
        result = await claimCoupon(data, openid)
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
