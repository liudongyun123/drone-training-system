/**
 * api-order 云函数
 * 处理订单创建、查询、更新、取消等操作
 */

let cloud
let db

try {
  cloud = require('wx-server-sdk')
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
  db = cloud.database()
} catch (e) {
  cloud = require('tcb-admin-node')
  cloud.init({ env: cloud.SYMBOL_CURRENT_ENV })
  db = cloud.database()
}

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
}

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

// 主函数
exports.main = async (event, context) => {
  console.log('[api-order] 收到请求:', JSON.stringify(event))
  
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
  
  console.log('[api-order] action:', action, 'data:', JSON.stringify(data))
  
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
    userId, 
    orderType = 'course',
    status = 'pending',
    totalPrice,
    finalAmount,
    remark = '',
    address = {},
    items = [],
    courseId,
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
    const orderData = {
      orderNo: orderNo || generateOrderNo(),
      phone,
      userId: userId || '',
      orderType,
      status,
      totalPrice: totalPrice || 0,
      finalAmount: finalAmount || totalPrice || 0,
      remark,
      address,
      items,
      courseId: courseId || '',
      courseInfo: courseInfo || null,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const result = await db.collection('orders').add({ data: orderData })
    
    console.log('[api-order] 订单创建成功:', result._id)
    
    return createResponse({
      code: 0,
      success: true,
      data: {
        _id: result._id,
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
    
    await db.collection('orders').doc(orderId).update({ data: updateData })
    
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
      data: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
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
  const { phone, status, page = 1, pageSize = 20 } = data
  
  try {
    const where = {}
    if (phone) where.phone = phone
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
    
    if (!result.data) {
      return createResponse({
        code: 404,
        success: false,
        error: '订单不存在'
      })
    }
    
    return createResponse({
      code: 0,
      success: true,
      data: result.data
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
  const { courseId, phone, openid, source = 'purchase', expiresAt = null } = data

  console.log('[api-order] createCoursePermission 请求:', { courseId, phone, openid, source })

  if (!courseId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少课程ID'
    })
  }
  if (!phone && !openid) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少用户标识'
    })
  }

  try {
    // 检查课程是否存在
    const courseRes = await db.collection('courses').doc(courseId).get()
    if (!courseRes.data) {
      console.error('[api-order] 课程不存在:', courseId)
      return createResponse({
        code: 404,
        success: false,
        error: '课程不存在'
      })
    }

    // 检查是否已有权限
    const existingWhere = {}
    existingWhere.courseId = courseId
    if (phone) existingWhere.phone = phone
    if (openid) existingWhere.openid = openid

    const existing = await db.collection('course_permissions')
      .where(existingWhere)
      .get()

    console.log('[api-order] 检查已有权限:', existingWhere, '结果:', existing.data?.length || 0)

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
      courseName: courseRes.data.title || '',
      phone: phone || '',
      openid: openid || '',
      source,
      status: 'active',
      expiresAt: expiresAt,
      grantedAt: now,
      createdAt: now,
      updatedAt: now
    }

    // 如果有 openid，添加 _openid 字段（CloudBase 安全规则需要）
    if (openid) {
      permissionData._openid = openid
    }

    const result = await db.collection('course_permissions').add({
      data: permissionData
    })

    console.log('[api-order] 权限创建成功:', result.id)

    return createResponse({
      code: 0,
      success: true,
      data: {
        permissionId: result.id,
        courseId,
        courseName: courseRes.data.title,
        phone: phone,
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
    notes = '',
    userId = '',
    status = 'pending',
    source = 'online_enroll'
  } = data

  console.log('[api-order] enrollClass 请求:', { classId, phone, userName, source })

  if (!classId) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少班级ID'
    })
  }
  if (!userName && !phone) {
    return createResponse({
      code: 400,
      success: false,
      error: '缺少用户信息（姓名或手机号）'
    })
  }

  try {
    // 检查班级是否存在
    const classRes = await db.collection('classes').doc(classId).get()
    if (!classRes.data) {
      return createResponse({
        code: 404,
        success: false,
        error: '班级不存在'
      })
    }

    const cls = classRes.data

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
        status: db.command.in(['enrolled', 'learning', 'pending'])
      })
      .get()

    if (existing.data && existing.data.length > 0) {
      return createResponse({
        code: 400,
        success: false,
        error: '您已报名此班级（class_members）'
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

    if (existingOrder.data && existingOrder.data.length > 0) {
      return createResponse({
        code: 400,
        success: false,
        error: '您已有该班级的订单，请到订单页面处理'
      })
    }

    // 创建报名记录
    const now = new Date().toISOString()
    const result = await db.collection('class_members').add({
      data: {
        classId,
        className: cls.name,
        courseId: cls.courseId || '',
        userId,
        userName,
        phone,
        idCard,
        emergencyContact,
        emergencyPhone,
        notes,
        status,
        source,
        enrollmentTime: now,
        createdAt: now,
        updatedAt: now
      }
    })

    console.log('[api-order] 班级报名成功:', result.id)

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
