/**
 * 云函数鉴权中间件 v1.0
 * 
 * 安全策略：
 * 1. 管理员操作：验证 user_roles 表中的角色
 * 2. 用户操作：验证 openid 或 phone 匹配
 * 3. 公开操作：无需验证
 */

const ADMIN_ACTIONS = [
  // 管理后台操作 - 需要管理员权限
  'add', 'update', 'delete', 'batchDelete', 'batchAdd', 'upsert',
  'createCollection', 'generateTestData', 'fixCourseRelations',
  'migrateMemberRelations', 'batchDeleteByQuery',
  // 排课管理
  'listSchedules', 'getScheduleWithDetails',
  // 调课管理
  'createRequest', 'cancelRequest',
]

const PUBLIC_ACTIONS = [
  // 公开操作 - 无需鉴权
  'getUserOrders',  // 用户查自己的订单
]

const USER_DATA_COLLECTIONS = [
  // 用户私有数据集合 - 用户只能操作自己的数据
  'orders', 'registrations', 'course_permissions', 
  'user_progress', 'learning_progress', 'transfer_requests'
]

/**
 * 验证管理员权限
 */
async function verifyAdmin(app, openid, phone) {
  const db = app.database()
  
  // 方式1: 通过 openid 查询
  if (openid) {
    const roleRes = await db.collection('user_roles')
      .where({
        $or: [
          { openid },
          { _openid: openid },
          { userId: openid }
        ],
        role: db.command.in(['admin', 'super_admin']),
        status: 'active'
      })
      .limit(1)
      .get()
    
    if (roleRes.data && roleRes.data.length > 0) {
      return { isAdmin: true, role: roleRes.data[0] }
    }
  }
  
  // 方式2: 通过 phone 查询
  if (phone) {
    const roleRes = await db.collection('user_roles')
      .where({
        phone,
        role: db.command.in(['admin', 'super_admin']),
        status: 'active'
      })
      .limit(1)
      .get()
    
    if (roleRes.data && roleRes.data.length > 0) {
      return { isAdmin: true, role: roleRes.data[0] }
    }
  }
  
  return { isAdmin: false }
}

/**
 * 验证用户对数据的访问权限
 */
async function verifyUserDataAccess(app, openid, phone, collection, query) {
  const db = app.database()
  
  // 如果是查询单条记录（docId），检查所有权
  if (query && query._id) {
    const docRes = await db.collection(collection).doc(query._id).get()
    if (!docRes.data) return { hasAccess: false, reason: '记录不存在' }
    
    const doc = docRes.data
    const isOwner = 
      (openid && (doc._openid === openid || doc.userId === openid || doc.openid === openid)) ||
      (phone && (doc.phone === phone || doc.userPhone === phone || doc.buyerPhone === phone))
    
    if (!isOwner) {
      return { hasAccess: false, reason: '无权访问此记录' }
    }
  }
  
  // 对于列表查询，会在 handleList 中自动注入用户过滤条件
  return { hasAccess: true }
}

/**
 * 鉴权中间件主函数
 * 
 * @param {object} app - CloudBase app 实例
 * @param {object} event - 云函数事件参数
 * @returns {object} { authorized: boolean, user?: object, error?: string }
 */
async function authMiddleware(app, event) {
  const { action, collection, query, docId } = event
  
  // 从事件中提取用户标识
  // CloudBase SDK 会自动注入 userInfo
  const userInfo = event.userInfo || {}
  const openid = userInfo.openId || userInfo._openid || event._openid
  const phone = event.phone || userInfo.phone
  
  console.log('[Auth] 鉴权检查:', { 
    action, 
    collection, 
    openid: openid ? `${openid.slice(0, 8)}...` : 'none',
    phone: phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : 'none'
  })
  
  // 1. 公开操作 - 直接放行
  if (PUBLIC_ACTIONS.includes(action)) {
    // 但仍需注入用户标识用于查询
    return { 
      authorized: true, 
      user: { openid, phone },
      scope: 'public'
    }
  }
  
  // 2. 管理操作 - 需要管理员权限
  if (ADMIN_ACTIONS.includes(action)) {
    const { isAdmin, role } = await verifyAdmin(app, openid, phone)
    
    if (!isAdmin) {
      console.warn('[Auth] 管理员权限验证失败:', { action, openid, phone })
      return { 
        authorized: false, 
        error: '需要管理员权限',
        code: 403
      }
    }
    
    console.log('[Auth] 管理员验证通过:', role.roleName || role.role)
    return { 
      authorized: true, 
      user: { openid, phone, role },
      scope: 'admin'
    }
  }
  
  // 3. 用户数据操作 - 需要验证数据所有权
  if (USER_DATA_COLLECTIONS.includes(collection)) {
    // 查询操作：注入用户过滤条件
    if (action === 'list' || action === 'count') {
      return {
        authorized: true,
        user: { openid, phone },
        scope: 'user',
        injectFilter: true  // 标记需要在查询时注入用户条件
      }
    }
    
    // 写入/删除操作：验证所有权
    if (action === 'get' || action === 'update' || action === 'delete') {
      const { hasAccess, reason } = await verifyUserDataAccess(app, openid, phone, collection, { _id: docId })
      
      if (!hasAccess) {
        return { 
          authorized: false, 
          error: reason || '无权访问此数据',
          code: 403
        }
      }
      
      return { 
        authorized: true, 
        user: { openid, phone },
        scope: 'user'
      }
    }
  }
  
  // 4. 其他操作 - 默认需要管理员权限
  const { isAdmin, role } = await verifyAdmin(app, openid, phone)
  if (!isAdmin) {
    return { 
      authorized: false, 
      error: '操作需要管理员权限',
      code: 403
    }
  }
  
  return { 
    authorized: true, 
    user: { openid, phone, role },
    scope: 'admin'
  }
}

/**
 * 注入用户过滤条件（用于用户数据查询）
 */
function injectUserFilter(query, user) {
  const { openid, phone } = user
  
  const userConditions = []
  if (openid) userConditions.push({ _openid: openid }, { userId: openid }, { openid })
  if (phone) userConditions.push({ phone }, { userPhone: phone }, { buyerPhone: phone })
  
  if (userConditions.length === 0) return query
  
  // 合并原有查询条件
  const existingQuery = query || {}
  
  // 如果已有 $or 条件，需要用 $and 组合
  if (existingQuery.$or) {
    return {
      $and: [
        existingQuery,
        { $or: userConditions }
      ]
    }
  }
  
  // 如果有其他条件，也需要组合
  const otherKeys = Object.keys(existingQuery).filter(k => k !== '$or')
  if (otherKeys.length > 0) {
    return {
      ...existingQuery,
      $or: userConditions
    }
  }
  
  // 简单情况：直接添加用户条件
  return { $or: userConditions }
}

module.exports = {
  authMiddleware,
  injectUserFilter,
  verifyAdmin,
  verifyUserDataAccess,
  ADMIN_ACTIONS,
  PUBLIC_ACTIONS,
  USER_DATA_COLLECTIONS
}
