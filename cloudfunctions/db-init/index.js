/**
 * 数据库操作云函数 - 通用版
 * 同时支持小程序端和 Web 端 HTTP 调用
 */

// 检测运行环境
const isHttpTrigger = typeof process !== 'undefined' && process.env && process.env.FUNCTION_TYPE === 'http';
const isWxEnvironment = typeof wx !== 'undefined' && typeof wx.cloud !== 'undefined';

let db, _, $;

if (isHttpTrigger) {
  // HTTP 触发器环境：使用 tcb-admin-node
  const tcb = require('tcb-admin-node');
  tcb.init({
    env: process.env.TCB_ENV || tcb.DYNAMIC_CURRENT_ENV
  });
  db = tcb.database();
  _ = db.command;
  $ = db.command.aggregate;
} else {
  // 云调用环境：使用 wx-server-sdk
  const cloud = require('wx-server-sdk');
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  });
  db = cloud.database();
  _ = db.command;
  $ = db.command.aggregate;
}

/**
 * 解析请求参数
 * 支持 HTTP 触发器和云调用
 */
function parseParams(event) {
  // HTTP 触发器格式
  if (event.httpMethod) {
    try {
      const body = event.body || '{}'
      const data = typeof body === 'string' ? JSON.parse(body) : body
      
      // 合并 pathParameters, queryStringParameters 和 body
      return {
        ...event.pathParameters,
        ...event.queryStringParameters,
        ...data
      }
    } catch (e) {
      console.error('[db-init] 解析请求体失败:', e)
      return {}
    }
  }
  
  // 云调用格式
  return event
}

/**
 * 通用查询
 */
async function queryList(collection, options = {}) {
  const { query: whereConditions, orderBy, order, skip, limit, offset } = options
  
  let coll = db.collection(collection)
  
  // 处理排序
  const sortField = orderBy || 'createdAt'
  const sortOrder = order || 'desc'
  
  // 处理分页
  const skipCount = skip || offset || 0
  const pageSize = Math.min(limit || options.pageSize || 20, 100)
  
  // 应用条件
  if (whereConditions && Object.keys(whereConditions).length > 0) {
    coll = coll.where(whereConditions)
  }
  
  const result = await coll
    .orderBy(sortField, sortOrder)
    .skip(skipCount)
    .limit(pageSize)
    .get()
  
  const countResult = await coll.count()
  
  return {
    code: 0,
    data: result.data || [],
    total: countResult.total || 0,
    skip: skipCount,
    limit: pageSize
  }
}

/**
 * 获取单条记录
 */
async function getById(collection, id) {
  try {
    const result = await db.collection(collection).doc(id).get()
    if (result.data && result.data.length > 0) {
      return { code: 0, data: result.data[0] }
    }
    return { code: 404, message: '记录不存在' }
  } catch (error) {
    return { code: -1, message: error.message || '获取失败' }
  }
}

/**
 * 添加记录
 */
async function add(collection, data) {
  try {
    const now = new Date().toISOString()
    const insertData = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: now
    }
    
    // 移除可能导致问题的字段
    delete insertData._id
    delete insertData._openid
    
    const result = await db.collection(collection).add({
      data: insertData
    })
    
    return { code: 0, data: { id: result._id }, message: '添加成功' }
  } catch (error) {
    console.error('[db-init] add 失败:', error)
    return { code: -1, message: error.message || '添加失败' }
  }
}

/**
 * 更新记录
 */
async function update(collection, id, data) {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }
    
    // 移除可能导致问题的字段
    delete updateData._id
    delete updateData._openid
    delete updateData.createdAt
    
    await db.collection(collection).doc(id).update({
      data: updateData
    })
    
    return { code: 0, message: '更新成功' }
  } catch (error) {
    console.error('[db-init] update 失败:', error)
    return { code: -1, message: error.message || '更新失败' }
  }
}

/**
 * 删除记录
 */
async function remove(collection, id) {
  try {
    const result = await db.collection(collection).doc(id).remove()
    return { code: 0, deleted: result.deleted || 0, message: '删除成功' }
  } catch (error) {
    console.error('[db-init] remove 失败:', error)
    return { code: -1, message: error.message || '删除失败' }
  }
}

/**
 * 统计数量
 */
async function count(collection, options = {}) {
  try {
    let coll = db.collection(collection)
    const { query: whereConditions } = options
    
    if (whereConditions && Object.keys(whereConditions).length > 0) {
      coll = coll.where(whereConditions)
    }
    
    const result = await coll.count()
    return { code: 0, total: result.total }
  } catch (error) {
    console.error('[db-init] count 失败:', error)
    return { code: -1, message: error.message || '统计失败' }
  }
}

exports.main = async (event, context) => {
  // HTTP 触发器需要返回特定格式
  const isHttpTrigger = !!event.httpMethod
  
  // 解析参数
  const params = parseParams(event)
  const { action, collection, id, data, query, skip, limit, orderBy, order, offset } = params
  
  console.log(`[db-init] action=${action}, collection=${collection}, isHttp=${isHttpTrigger}`)
  
  let result
  
  // 处理 ping 请求
  if (action === 'ping') {
    result = { code: 0, message: 'pong', timestamp: new Date().toISOString() }
  }
  // 处理 query/getList 请求
  else if (action === 'query' || action === 'getList') {
    result = await queryList(collection, { query, orderBy, order, skip, limit, offset })
  }
  // 处理 get 请求
  else if (action === 'get') {
    result = await getById(collection, id)
  }
  // 处理 add 请求
  else if (action === 'add' || action === 'create') {
    result = await add(collection, data)
  }
  // 处理 update 请求
  else if (action === 'update') {
    result = await update(collection, id, data)
  }
  // 处理 delete 请求
  else if (action === 'delete' || action === 'remove') {
    result = await remove(collection, id)
  }
  // 处理 count 请求
  else if (action === 'count') {
    result = await count(collection, { query })
  }
  // 默认
  else {
    result = { code: 400, message: `未知的操作: ${action}` }
  }
  
  // HTTP 触发器需要返回特定格式
  if (isHttpTrigger) {
    return {
      statusCode: result.code === 0 ? 200 : (result.code >= 400 ? result.code : 500),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    }
  }
  
  return result
}
