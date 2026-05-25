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
      case 'refund':
        return await createRefund(data)
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
    // ★ 防重复购买：课程和培训班不能重复下单
    if (orderType === 'course' && courseId) {
      const existingCourseOrder = await db.collection('orders')
        .where({
          phone,
          courseId,
          status: _.in(['pending', 'paid', 'completed'])
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
    }
    
    if (orderType === 'class' && classId) {
      const existingClassOrder = await db.collection('orders')
        .where({
          phone,
          classId,
          status: _.in(['pending', 'paid', 'completed'])
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
    }
    
    const orderData = {
      orderNo: orderNo || generateOrderNo(),
      phone,
      _openid: openid || '',  // ★ CloudBase 安全规则需要 _openid 字段
      openid: openid || '',   // 同时存一份便于查询
      userId: userId || '',
      orderType,
      status,
      totalPrice: totalPrice || 0,
      finalAmount: finalAmount || totalPrice || 0,
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
    source = 'online_enroll'
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

    // 检查是否已满员
    const memberCount = await db.collection('class_members')
      .where({
        classId: classId,
        status: db.command.in(['enrolled', 'learning'])
      })
      .count()

    const maxStudents = cls.maxStudents || 30
    if (memberCount.total >= maxStudents) {
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
      userId,
      userName,
      phone,
      idCard,
      emergencyContact,
      emergencyPhone: finalEmergencyPhone,
      notes: finalNotes,
      status,
      source,
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

    // ★ 报名成功后，自动授权关联课程
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
        for (const item of cls.includedCourses) {
          if (typeof item === 'string' && /^[a-f0-9]{24}$/i.test(item)) {
            if (!courseIds.includes(item)) courseIds.push(item)
          }
        }
      }

      if (phone && courseIds.length > 0) {
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
async function handlePayCallback(event) {
  try {
    // 从 event 中提取回调数据
    const callbackBody = event.body || event

    // 解密回调数据（API v3 使用 AEAD_AES_256_GCM 加密）
    let notification = callbackBody

    // 如果有加密的 resource 字段，需要解密
    if (callbackBody.resource) {
      // 简化处理：直接使用 resource 中的明文数据（测试环境）
      // 生产环境需要用 AES-256-GCM 解密
      notification = callbackBody.resource
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

    // 检查支付状态
    if (tradeState === 'SUCCESS' || tradeState === 'COMPLETED') {
      // 支付成功
      if (order.status !== 'paid') {
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
async function createRefund(data) {
  const { orderId, reason = '用户申请退款' } = data
  if (!WX_PAY_CONFIG.PRIVATE_KEY || !WX_PAY_CONFIG.CERT_SERIAL_NO) {
    return createResponse({ code: 500, success: false, error: '微信支付证书未配置' })
  }
  try {
    const orderRes = await db.collection('orders').doc(orderId).get()
    const order = getDocData(orderRes)
    if (!order) return createResponse({ code: 404, success: false, error: '订单不存在' })
    if (order.status !== 'paid') return createResponse({ code: 400, success: false, error: '只能退款已支付的订单' })
    
    const outRefundNo = `REF${Date.now()}`
    const result = await httpRequest(
      `${WX_PAY_BASE}/v3/refund/domestic/refunds`, 'POST',
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
    if (result.refund_id) {
      await db.collection('orders').doc(orderId).update({
        status: 'refunded', refundNo: outRefundNo, refundReason: reason,
        refundedAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      })
      return createResponse({ code: 0, success: true, data: { refundId: result.refund_id }, message: '退款申请成功' })
    }
    return createResponse({ code: 500, success: false, error: '退款失败: ' + JSON.stringify(result) })
  } catch (err) {
    return createResponse({ code: 500, success: false, error: '退款失败: ' + err.message })
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
