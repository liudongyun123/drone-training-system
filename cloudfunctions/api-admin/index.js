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
 * 验证管理员权限
 * 通过 session token 或 auth 检查
 */
async function verifyAdmin(event) {
  // 方式1: 通过 wx context (微信云调用)
  if (cloud.getWXContext && cloud.getWXContext().OPENID) {
    const openid = cloud.getWXContext().OPENID
    const userRole = await db.collection('user_roles').doc(openid).get()
    if (userRole.data && userRole.data.role === 'admin') {
      return { isAdmin: true, userId: openid }
    }
  }
  
  // 方式2: 通过 session token (Web端)
  const token = event.token || event.headers?.token
  if (token) {
    const session = await db.collection('sessions').where({
      token: token,
      expireAt: _.gt(Date.now())
    }).get()
    
    if (session.data && session.data.length > 0) {
      const userId = session.data[0].userId
      const userRole = await db.collection('user_roles').doc(userId).get()
      if (userRole.data && userRole.data.role === 'admin') {
        return { isAdmin: true, userId }
      }
    }
  }
  
  // 方式3: 开发模式 - 允许通过 (生产环境应删除此分支)
  // 检查是否是本地开发或测试环境
  if (process.env.NODE_ENV === 'development' || event._dev === true) {
    console.log('[api-admin] 开发模式，跳过权限验证')
    return { isAdmin: true, userId: 'dev-admin' }
  }
  
  return { isAdmin: false }
}

/**
 * 通用 CRUD 操作
 */
exports.main = async (event, context) => {
  const { action, collection, data, id, query, options } = event
  
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
        const limit = options?.limit || 100
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
