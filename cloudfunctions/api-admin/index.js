/**
 * 管理后台 API 云函数
 * 服务端运行，不受安全规则限制
 * 所有管理后台的 CRUD 操作通过此云函数代理
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 解析请求参数
 * 支持云调用和 HTTP 调用
 */
function parseParams(event) {
  // 云调用格式 (通过 callFunction)
  if (event.data) {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      return { ...event, ...data }
    } catch (e) {
      return event
    }
  }
  return event
}

/**
 * 获取来源信息
 */
function getSourceInfo(event) {
  const params = parseParams(event)
  return {
    origin: params.headers?.origin || params.headers?.Origin || '',
    referer: params.headers?.referer || params.headers?.Referer || '',
    source: params._source || '',
    isDev: params._dev === true || params._dev === 'true',
    userId: params.userId,
    _openid: params._openid
  }
}

/**
 * 验证管理员权限
 * 支持云调用和 HTTP 调用
 */
async function verifyAdmin(event) {
  const source = getSourceInfo(event)
  
  // 方式1: 开发/调试模式 - 允许通过
  if (source.isDev || source.source === 'dev') {
    console.log('[api-admin] 调试模式，跳过权限验证')
    return { isAdmin: true, userId: 'dev-admin' }
  }
  
  // 方式2: 允许特定来源直接访问（Web端、H5、同环境调用）
  const allowedOrigins = [
    'localhost',
    'tcloudbaseapp.com',
    'tcloudbaseapp',
    'envId=rcwljy'
  ]
  
  const isAllowedOrigin = 
    source.origin.includes('localhost') ||
    source.origin.includes('tcloudbaseapp.com') ||
    source.origin.includes('tcloudbaseapp') ||
    source.referer.includes('localhost') ||
    source.referer.includes('tcloudbaseapp.com') ||
    source.referer.includes('tcloudbaseapp')
  
  // 如果来自允许的来源，跳过权限验证（生产环境建议删除此逻辑）
  if (isAllowedOrigin) {
    console.log('[api-admin] 来自允许的来源，跳过权限验证')
    return { isAdmin: true, userId: 'web-admin' }
  }
  
  // 方式3: 通过 wx context (微信云调用)
  try {
    const wxContext = cloud.getWXContext ? cloud.getWXContext() : {}
    
    // 如果有 OPENID，检查权限
    if (wxContext.OPENID) {
      console.log('[api-admin] 云调用，openid:', wxContext.OPENID)
      
      // 允许特定 openid 直接访问（开发用）
      if (wxContext.OPENID === 'admin' || wxContext.OPENID === '{admin}') {
        return { isAdmin: true, userId: 'admin' }
      }
      
      // 检查 user_roles 集合
      try {
        const userRole = await db.collection('user_roles').where({
          _id: wxContext.OPENID
        }).get()
        
        if (userRole.data && userRole.data.length > 0 && userRole.data[0].role === 'admin') {
          return { isAdmin: true, userId: wxContext.OPENID }
        }
      } catch (e) {
        console.log('[api-admin] 查询 user_roles 失败')
      }
      
      // 检查 admins 集合
      try {
        const admin = await db.collection('admins').where({
          uid: wxContext.OPENID
        }).get()
        
        if (admin.data && admin.data.length > 0) {
          return { isAdmin: true, userId: wxContext.OPENID }
        }
      } catch (e) {
        console.log('[api-admin] 查询 admins 失败')
      }
    }
    
    // 云调用但没有 OPENID（可能是同一环境内的调用）
    // 这种情况允许访问
    if (!wxContext.OPENID || wxContext.OPENID === '') {
      console.log('[api-admin] 同环境云调用，跳过权限验证')
      return { isAdmin: true, userId: 'cloud-admin' }
    }
  } catch (e) {
    console.log('[api-admin] 获取微信上下文失败')
  }
  
  // 方式4: 通过 session token (Web端)
  const token = source.params?.token || parseParams(event).token
  if (token) {
    console.log('[api-admin] 使用 token 鉴权')
    try {
      const session = await db.collection('sessions').where({
        token: token,
        expireAt: _.gt(Date.now())
      }).get()
      
      if (session.data && session.data.length > 0) {
        const userId = session.data[0].userId
        return { isAdmin: true, userId }
      }
    } catch (e) {
      console.log('[api-admin] 查询 session 失败')
    }
  }
  
  // 方式5: 直接传 userId 作为管理员
  if (source.userId === 'admin') {
    return { isAdmin: true, userId: 'admin' }
  }
  
  // 方式6: _openid 为 admin
  if (source._openid === 'admin' || source._openid === '{admin}') {
    return { isAdmin: true, userId: 'admin' }
  }
  
  // 默认拒绝
  console.log('[api-admin] 鉴权失败，无管理员权限')
  console.log('[api-admin] 来源信息:', JSON.stringify(source))
  return { isAdmin: false }
}

/**
 * 通用 CRUD 操作
 */
exports.main = async (event, context) => {
  const params = parseParams(event)
  const { action, collection, data, id, query, options } = params
  
  console.log(`[api-admin] action=${action}, collection=${collection}`)
  
  // 验证权限
  const auth = await verifyAdmin(event)
  if (!auth.isAdmin) {
    return { code: 403, message: '无管理员权限' }
  }
  
  try {
    switch (action) {
      case 'list': {
        let coll = db.collection(collection)
        const limit = options?.limit || options?.pageSize || 100
        const skip = options?.offset || options?.skip || 0
        
        if (query && Object.keys(query).length > 0) {
          coll = coll.where(query)
        }
        
        if (options?.orderBy) {
          coll = coll.orderBy(options.orderBy, options.order || 'desc')
        }
        
        const result = await coll.skip(skip).limit(limit).get()
        return { code: 0, data: result.data || [], total: result.data?.length || 0 }
      }
      
      case 'get': {
        if (!id) return { code: 400, message: '缺少 id 参数' }
        const result = await db.collection(collection).doc(id).get()
        return { code: 0, data: result.data?.[0] || result.data || null }
      }
      
      case 'add': {
        if (!data) return { code: 400, message: '缺少 data 参数' }
        const now = new Date().toISOString()
        const result = await db.collection(collection).add({
          data: {
            ...data,
            createdAt: data.createdAt || now,
            updatedAt: now,
            createdBy: auth.userId
          }
        })
        return { code: 0, data: { id: result._id }, message: '创建成功' }
      }
      
      case 'update': {
        if (!id || !data) return { code: 400, message: '缺少 id 或 data 参数' }
        const updateData = { ...data, updatedAt: new Date().toISOString() }
        delete updateData._id
        delete updateData._openid
        
        await db.collection(collection).doc(id).update({
          data: updateData
        })
        return { code: 0, message: '更新成功' }
      }
      
      case 'delete': {
        if (!id) return { code: 400, message: '缺少 id 参数' }
        await db.collection(collection).doc(id).remove()
        return { code: 0, message: '删除成功' }
      }
      
      case 'count': {
        let coll = db.collection(collection)
        if (query && Object.keys(query).length > 0) {
          coll = coll.where(query)
        }
        const result = await coll.count()
        return { code: 0, data: result.total || 0 }
      }
      
      case 'batchDelete': {
        if (!query) return { code: 400, message: '缺少 query 参数' }
        const result = await db.collection(collection).where(query).remove()
        return { code: 0, data: { deleted: result.deleted || 0 }, message: '批量删除成功' }
      }
      
      default:
        return { code: 400, message: `未知操作: ${action}` }
    }
  } catch (error) {
    console.error(`[api-admin] ${action} 失败:`, error)
    return { code: -1, message: error.message || '操作失败' }
  }
}
