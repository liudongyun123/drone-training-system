const tcb = require('tcb-admin-node')

// 云函数环境：不需要传入 secretId/secretKey，自动使用环境内置凭证
const app = tcb.init({
  envName: process.env.TCB_ENV || process.env.SCF_NAMESPACE
})

// 判断是否为 HTTP 触发
const isHttpTrigger = (event) => {
  return event.httpMethod || event.requestContext?.service?.serviceName
}

// 获取客户端 IP
const getClientIp = (event) => {
  return event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers?.['x-real-ip'] ||
         event.clientIp ||
         'unknown'
}

// 设置 CORS 响应头
const setCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
})

// 返回 HTTP 响应
const httpResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...setCorsHeaders()
  },
  body: JSON.stringify(body)
})

// 返回错误响应
const errorResponse = (statusCode, code, message) => {
  return httpResponse(statusCode, { code, message, success: false })
}

// 所有核心集合列表
const CORE_COLLECTIONS = [
  'teachers', 'courses', 'students', 'schedules', 'attendance',
  'course_permissions', 'class_members', 'exams', 'questions',
  'question_banks', 'orders', 'banners', 'pages', 'classes'
]

exports.main = async (event, context) => {
  console.log('诊断函数调用, event:', JSON.stringify(event))
  
  const db = app.database()
  const isHttp = isHttpTrigger(event)
  
  // 统一参数获取（兼容事件触发和 HTTP 触发）
  let params = {}
  if (isHttp) {
    // HTTP 触发：从 pathParameters, queryStringParameters 或 body 获取参数
    const pathParams = event.pathParameters || {}
    const queryParams = event.queryStringParameters || {}
    const bodyParams = event.body ? JSON.parse(event.body || '{}') : {}
    params = { ...pathParams, ...queryParams, ...bodyParams }
  } else {
    // 事件触发：直接从 event 获取参数
    params = event
  }
  
  const action = params.action || 'stats'
  
  // 帮助信息
  if (action === 'help') {
    const actions = {
      'stats': '获取所有核心集合统计',
      'collections': '获取所有核心集合列表',
      'list': '列出集合数据 (collection, limit, where)',
      'insert': '插入数据 (collection, data)',
      'update': '更新数据 (collection, id, data)',
      'delete': '删除数据 (collection, id)',
      'count': '统计集合数量 (collection)',
      'clear': '清空集合数据 (collection)',
      'health': '系统健康检查',
      'env': '获取环境信息',
      'seed': '生成种子数据',
      'permissions:list': '列出权限',
      'permissions:create': '创建权限 (type, targetId, userId, level)',
      'permissions:delete': '删除权限 (id)',
      'members:list': '列出班级成员',
      'members:add': '添加班级成员 (classId, studentId)',
      'members:remove': '移除班级成员 (id)'
    }
    return isHttp 
      ? httpResponse(200, { code: 0, message: 'diagnose 云函数 API', actions })
      : { code: 0, message: '帮助', actions: Object.keys(actions) }
  }
  
  try {
    switch (action) {
      // ============ 核心功能 ============
      
      case 'stats':
        // 获取所有核心集合统计
        const stats = {}
        for (const col of CORE_COLLECTIONS) {
          try {
            const countResult = await db.collection(col).count()
            stats[col] = countResult.total || countResult.pager?.Total || 0
          } catch (e) {
            stats[col] = 0
          }
        }
        // 添加总计
        stats._total = Object.values(stats).reduce((a, b) => typeof b === 'number' ? a + b : a, 0)
        return isHttp ? httpResponse(200, { code: 0, data: stats }) : { code: 0, data: stats }
        
      case 'collections':
        // 返回核心集合列表及描述
        const collections = CORE_COLLECTIONS.map(name => ({
          name,
          description: getCollectionDescription(name)
        }))
        return isHttp ? httpResponse(200, { code: 0, data: collections }) : { code: 0, data: collections }
        
      case 'list':
        // 列出集合数据
        const { collection, limit = 10, skip = 0, where } = params
        if (!collection) {
          return errorResponse(400, 400, '缺少参数: collection')
        }
        
        let query = db.collection(collection).skip(parseInt(skip)).limit(parseInt(limit))
        if (where) {
          try {
            const whereObj = typeof where === 'string' ? JSON.parse(where) : where
            query = query.where(whereObj)
          } catch (e) {
            return errorResponse(400, 400, 'where 参数解析失败: ' + e.message)
          }
        }
        
        const listResult = await query.get()
        return isHttp 
          ? httpResponse(200, { 
              code: 0, 
              collection, 
              data: listResult.data, 
              total: listResult.pager?.Total || listResult.data?.length || 0,
              skip: parseInt(skip),
              limit: parseInt(limit)
            }) 
          : { code: 0, data: listResult.data }
          
      case 'insert':
        // 插入数据
        const { collection: insCol, data: insData } = params
        if (!insCol || !insData) {
          return errorResponse(400, 400, '缺少参数: collection, data')
        }
        
        try {
          const dataObj = typeof insData === 'string' ? JSON.parse(insData) : insData
          dataObj.createdAt = new Date().toISOString()
          const addResult = await db.collection(insCol).add(dataObj)
          return isHttp 
            ? httpResponse(200, { code: 0, message: '插入成功', id: addResult.id })
            : { code: 0, message: '插入成功', id: addResult.id }
        } catch (e) {
          return errorResponse(400, 400, '插入失败: ' + e.message)
        }
        
      case 'update':
        // 更新数据
        const { collection: updCol, id: updId, data: updData } = params
        if (!updCol || !updId || !updData) {
          return errorResponse(400, 400, '缺少参数: collection, id, data')
        }
        
        try {
          const dataObj = typeof updData === 'string' ? JSON.parse(updData) : updData
          dataObj.updatedAt = new Date().toISOString()
          await db.collection(updCol).doc(updId).update(dataObj)
          return isHttp 
            ? httpResponse(200, { code: 0, message: '更新成功' })
            : { code: 0, message: '更新成功' }
        } catch (e) {
          return errorResponse(400, 400, '更新失败: ' + e.message)
        }
        
      case 'delete':
        // 删除数据
        const { collection: delCol, id: delId } = params
        if (!delCol || !delId) {
          return errorResponse(400, 400, '缺少参数: collection, id')
        }
        
        try {
          await db.collection(delCol).doc(delId).remove()
          return isHttp 
            ? httpResponse(200, { code: 0, message: '删除成功' })
            : { code: 0, message: '删除成功' }
        } catch (e) {
          return errorResponse(400, 400, '删除失败: ' + e.message)
        }
        
      case 'count':
        // 统计集合数量
        const { collection: cntCol } = params
        if (!cntCol) {
          return errorResponse(400, 400, '缺少参数: collection')
        }
        
        try {
          const cntResult = await db.collection(cntCol).count()
          const total = cntResult.total || cntResult.pager?.Total || 0
          return isHttp 
            ? httpResponse(200, { code: 0, collection: cntCol, total })
            : { code: 0, collection: cntCol, total }
        } catch (e) {
          return errorResponse(400, 400, '统计失败: ' + e.message)
        }
        
      case 'clear':
        // 清空集合数据（危险操作，需要确认）
        const { collection: clrCol, confirm } = params
        if (!clrCol) {
          return errorResponse(400, 400, '缺少参数: collection')
        }
        if (confirm !== 'true' && confirm !== '1') {
          return errorResponse(400, 400, '需要确认操作，请添加 confirm=true')
        }
        
        try {
          // 分批删除
          let deleted = 0
          let hasMore = true
          while (hasMore) {
            const batch = await db.collection(clrCol).limit(100).get()
            if (batch.data.length === 0) {
              hasMore = false
            } else {
              for (const doc of batch.data) {
                await db.collection(clrCol).doc(doc._id).remove()
                deleted++
              }
            }
          }
          return isHttp 
            ? httpResponse(200, { code: 0, message: `清空成功，共删除 ${deleted} 条记录`, deleted })
            : { code: 0, message: '清空成功', deleted }
        } catch (e) {
          return errorResponse(400, 400, '清空失败: ' + e.message)
        }
        
      // ============ 系统功能 ============
        
      case 'health':
        // 系统健康检查
        const health = {
          timestamp: new Date().toISOString(),
          environment: {
            envId: process.env.TCB_ENV || process.env.SCF_NAMESPACE,
            region: process.env.SCF_REGION || 'ap-shanghai'
          },
          database: { status: 'unknown' },
          collections: {}
        }
        
        // 测试数据库连接
        try {
          await db.collection('teachers').limit(1).get()
          health.database.status = 'connected'
        } catch (e) {
          health.database.status = 'error: ' + e.message
        }
        
        // 检查关键集合
        for (const col of ['teachers', 'courses', 'course_permissions']) {
          try {
            const cnt = await db.collection(col).count()
            health.collections[col] = { status: 'ok', count: cnt.total || 0 }
          } catch (e) {
            health.collections[col] = { status: 'error', message: e.message }
          }
        }
        
        return isHttp ? httpResponse(200, { code: 0, data: health }) : { code: 0, data: health }
        
      case 'env':
        // 获取环境信息
        const envInfo = {
          envId: process.env.TCB_ENV,
          namespace: process.env.SCF_NAMESPACE,
          region: process.env.SCF_REGION,
          memory: process.env.SCF_MEMORY_SIZE,
          timeout: process.env.SCF_TIMEOUT,
          requestId: event.requestId || context?.request_id,
          clientIp: getClientIp(event),
          httpMethod: event.httpMethod,
          path: event.path,
          source: isHttp ? 'http' : 'event'
        }
        return isHttp ? httpResponse(200, { code: 0, data: envInfo }) : { code: 0, data: envInfo }
        
      case 'seed':
        // 生成种子数据
        const seedCount = parseInt(params.count) || 5
        const seedResults = {}
        
        // 课程
        seedResults.courses = []
        for (let i = 1; i <= seedCount; i++) {
          try {
            const id = await db.collection('courses').add({
              name: `课程 ${Date.now()}-${i}`,
              description: `自动生成的测试课程 ${i}`,
              category: ['理论', '实操', '考试'][i % 3],
              status: 'active',
              createdAt: new Date().toISOString()
            })
            seedResults.courses.push(id.id)
          } catch (e) {}
        }
        
        // 教师
        seedResults.teachers = []
        for (let i = 1; i <= seedCount; i++) {
          try {
            const id = await db.collection('teachers').add({
              name: `教师 ${Date.now()}-${i}`,
              phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
              specialty: '无人机培训',
              status: 'active',
              createdAt: new Date().toISOString()
            })
            seedResults.teachers.push(id.id)
          } catch (e) {}
        }
        
        // 权限
        seedResults.permissions = []
        const permTypes = ['course', 'class']
        for (let i = 1; i <= seedCount * 2; i++) {
          try {
            const id = await db.collection('course_permissions').add({
              type: permTypes[i % 2],
              targetId: `target_${i}`,
              userId: `user_${i}`,
              level: i % 3,
              grantedBy: 'seed',
              grantedAt: new Date().toISOString()
            })
            seedResults.permissions.push(id.id)
          } catch (e) {}
        }
        
        return isHttp 
          ? httpResponse(200, { code: 0, message: '种子数据生成完成', results: seedResults })
          : { code: 0, results: seedResults }
          
      // ============ 权限管理 ============
        
      case 'permissions:list':
        const perms = await db.collection('course_permissions').limit(100).get()
        return isHttp
          ? httpResponse(200, { code: 0, data: perms.data, total: perms.pager?.Total || perms.data?.length || 0 })
          : { code: 0, data: perms.data, total: perms.pager?.Total || perms.data?.length || 0 }
          
      case 'permissions:create':
        const { type, targetId, userId, level = 1, data: extraData } = params
        if (!type || !targetId || !userId) {
          return errorResponse(400, 400, '缺少必需参数: type, targetId, userId')
        }
        
        const newPerm = {
          type,
          targetId,
          userId,
          level: parseInt(level) || 1,
          grantedAt: new Date().toISOString(),
          grantedBy: 'api',
          ...(extraData || {})
        }
        
        const addResult = await db.collection('course_permissions').add(newPerm)
        return isHttp
          ? httpResponse(200, { code: 0, message: '权限创建成功', id: addResult.id })
          : { code: 0, message: '权限创建成功', id: addResult.id }
          
      case 'permissions:delete':
        const { id } = params
        if (!id) {
          return errorResponse(400, 400, '缺少参数: id')
        }
        
        await db.collection('course_permissions').doc(id).remove()
        return isHttp
          ? httpResponse(200, { code: 0, message: '权限删除成功' })
          : { code: 0, message: '权限删除成功' }
          
      case 'permissions:check':
        // 检查用户是否有权限访问指定资源
        const { userId: checkUserId, targetId: checkTargetId, type: checkType } = params
        if (!checkUserId || !checkTargetId || !checkType) {
          return errorResponse(400, 400, '缺少参数: userId, targetId, type')
        }
        
        const permCheck = await db.collection('course_permissions')
          .where({ userId: checkUserId, targetId: checkTargetId, type: checkType })
          .limit(1)
          .get()
        
        const hasPermission = permCheck.data.length > 0
        const permission = hasPermission ? permCheck.data[0] : null
        
        return isHttp
          ? httpResponse(200, { code: 0, hasPermission, permission })
          : { code: 0, hasPermission, permission }
          
      // ============ 班级成员管理 ============
        
      case 'members:list':
        const { classId: listClassId } = params
        let memberQuery = db.collection('class_members').limit(100)
        if (listClassId) {
          memberQuery = memberQuery.where({ classId: listClassId })
        }
        const members = await memberQuery.get()
        return isHttp
          ? httpResponse(200, { code: 0, data: members.data, total: members.pager?.Total || members.data?.length || 0 })
          : { code: 0, data: members.data }
          
      case 'members:add':
        const { classId: addClassId, studentId } = params
        if (!addClassId || !studentId) {
          return errorResponse(400, 400, '缺少参数: classId, studentId')
        }
        
        // 检查是否已存在
        const existCheck = await db.collection('class_members')
          .where({ classId: addClassId, studentId })
          .limit(1)
          .get()
        
        if (existCheck.data.length > 0) {
          return errorResponse(400, 400, '成员已存在')
        }
        
        const memberAddResult = await db.collection('class_members').add({
          classId: addClassId,
          studentId,
          joinedAt: new Date().toISOString(),
          status: 'active'
        })
        
        return isHttp
          ? httpResponse(200, { code: 0, message: '成员添加成功', id: memberAddResult.id })
          : { code: 0, message: '成员添加成功', id: memberAddResult.id }
          
      case 'members:remove':
        const { id: memberId } = params
        if (!memberId) {
          return errorResponse(400, 400, '缺少参数: id')
        }
        
        await db.collection('class_members').doc(memberId).remove()
        return isHttp
          ? httpResponse(200, { code: 0, message: '成员移除成功' })
          : { code: 0, message: '成员移除成功' }
          
      // ============ 默认处理 ============
        
      default:
        return errorResponse(400, 400, `未知操作: ${action}`)
    }
  } catch (e) {
    console.error('错误:', e.message, e.stack)
    return isHttp
      ? httpResponse(500, { code: 500, message: '服务器错误', error: e.message })
      : { code: 500, message: '错误: ' + e.message }
  }
}

// 获取集合描述
function getCollectionDescription(name) {
  const descriptions = {
    teachers: '教师信息',
    courses: '课程信息',
    students: '学员信息',
    schedules: '排课计划',
    attendance: '出勤记录',
    course_permissions: '课程权限',
    class_members: '班级成员',
    exams: '考试记录',
    questions: '题目',
    question_banks: '题库',
    orders: '订单',
    banners: '轮播图',
    pages: '页面配置',
    classes: '班级'
  }
  return descriptions[name] || ''
}
