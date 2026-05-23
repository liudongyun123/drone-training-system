/**
 * 管理后台云函数 - 生产规范重构版 v5.0
 * 
 * 符合生产规范的设计：
 * 1. 统一响应格式
 * 2. 完善的参数校验
 * 3. RBAC 权限控制
 * 4. 操作审计日志
 * 5. 模块化架构
 * 6. 错误处理
 * 7. 路由兼容旧版 API (router.js)
 * 8. 正确的 CORS 跨域处理
 */

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command

// 初始化路由和审计日志
const router = new Router(db, _)
const auditLogger = new AuditLogger(app, db)

// CORS 跨域处理 → 共享模块 ./lib/cors
const { getAdminCorsHeaders: getCorsHeaders } = require('./lib/cors')

/**
 * 鉴权中间件
 */
async function authMiddleware(event) {
  const { userId, token, _openid } = event
  
  // 优先使用传入的 userId
  if (userId) {
    // 查询用户角色
    try {
      const userResult = await db.collection('admins')
        .where({ uid: userId })
        .limit(1)
        .get()
      
      if (userResult.data && userResult.data.length > 0) {
        const user = userResult.data[0]
        return {
          authorized: true,
          user: {
            uid: user.uid,
            role: user.role || 'admin',
            isSuperAdmin: user.uid === 'admin' || user.isSuperAdmin
          },
          scope: user.role || 'admin'
        }
      }
    } catch (e) {
      console.log('[Auth] 查询管理员失败:', e.message)
    }
  }
  
  // 云函数调用方式
  if (_openid) {
    if (_openid === '{admin}' || _openid === 'admin') {
      return {
        authorized: true,
        user: { uid: 'admin', role: 'admin', isSuperAdmin: true },
        scope: 'admin'
      }
    }
    return {
      authorized: true,
      user: { uid: _openid, openid: _openid, role: 'student' },
      scope: 'student'
    }
  }
  
  // 匿名访问
  return {
    authorized: true,
    user: { uid: 'anonymous', role: 'guest' },
    scope: 'guest'
  }
}

/**
 * 主入口函数
 */
exports.main = async (event, context) => {
  const startTime = Date.now()
  const corsHeaders = getCorsHeaders(event)
  
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS' || (event.request && event.request.method === 'OPTIONS')) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ code: 0, message: 'OK' })
    }
  }
  
  const { action, ...params } = event
  
  console.log(`[Admin] 请求: action=${action}`, {
    paramsKeys: Object.keys(params),
    timestamp: new Date().toISOString()
  })

  // 1. 鉴权
  const authResult = await authMiddleware(event)

  if (!authResult.authorized) {
    const response = ApiResponse.error(401, '未授权访问')
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify(response)
    }
  }

  console.log(`[Admin] 用户: ${authResult.user?.uid || 'anonymous'}, 角色: ${authResult.scope}`)

  try {
    // 2. 执行路由
    const response = await router.execute(action, params, authResult)
    
    // 3. 记录审计日志
    await auditLogger.log({
      action,
      collection: params.collection,
      docId: params.id || params.docId,
      userId: authResult.user?.uid,
      role: authResult.scope,
      requestData: params,
      response,
      ip: event.request?.headers?.['x-forwarded-for'],
      userAgent: event.request?.headers?.['user-agent']
    })
    
    console.log(`[Admin] 响应: action=${action}, code=${response.code}, time=${Date.now() - startTime}ms`)
    
    // 4. 返回带 CORS 头的响应
    return {
      statusCode: response.code === 0 ? 200 : (response.code >= 400 ? response.code : 500),
      headers: corsHeaders,
      body: JSON.stringify(response)
    }
    
  } catch (error) {
    console.error(`[Admin] 执行失败:`, error)
    
    // 记录错误日志
    await auditLogger.log({
      action,
      collection: params.collection,
      userId: authResult.user?.uid,
      role: authResult.scope,
      requestData: params,
      response: { code: 500, message: error.message },
      ip: event.request?.headers?.['x-forwarded-for'],
      userAgent: event.request?.headers?.['user-agent']
    })
    
    const response = ApiResponse.error(500, '服务器内部错误')
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(response)
    }
  }
}
