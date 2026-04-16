// 管理后台云函数 - 精简版
// 直接复制到腾讯云控制台在线编辑器

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV })
const db = app.database()

exports.main = async (event, context) => {
  const { action, collection, data, query, docId, options } = event
  
  try {
    switch (action) {
      case 'list':
        const { limit = 100, offset = 0, orderBy, order = 'asc' } = options || {}
        let dbQuery = db.collection(collection)
        if (query && Object.keys(query).length > 0) {
          dbQuery = dbQuery.where(query)
        }
        if (orderBy) dbQuery = dbQuery.orderBy(orderBy, order)
        const listResult = await dbQuery.skip(offset).limit(limit).get()
        return { code: 0, message: '查询成功', data: listResult.data }
        
      case 'get':
        const getResult = await db.collection(collection).doc(docId).get()
        return { code: 0, message: '查询成功', data: getResult.data[0] }
        
      case 'add':
        const addData = { ...data, createdAt: new Date().toISOString() }
        const addResult = await db.collection(collection).add(addData)
        return { code: 0, message: '添加成功', data: { id: addResult.id, ...addData } }
        
      case 'update':
        await db.collection(collection).doc(docId).update({ ...data, updatedAt: new Date().toISOString() })
        return { code: 0, message: '更新成功' }
        
      case 'delete':
        await db.collection(collection).doc(docId).remove()
        return { code: 0, message: '删除成功' }
        
      case 'batchDelete':
        await db.collection(collection).where(query).remove()
        return { code: 0, message: '批量删除成功' }
        
      case 'count':
        let countQuery = db.collection(collection)
        if (query && Object.keys(query).length > 0) {
          countQuery = countQuery.where(query)
        }
        const countResult = await countQuery.count()
        return { code: 0, message: '查询成功', data: countResult.total }
        
      case 'aggregate':
        let agg = db.collection(collection)
        if (Array.isArray(options?.pipeline)) {
          options.pipeline.forEach(step => {
            const key = Object.keys(step)[0]
            agg = agg[key](step[key])
          })
        }
        const aggResult = await agg.end()
        return { code: 0, message: '聚合成功', data: aggResult.list || [] }
        
      default:
        return { code: 400, message: `未知操作: ${action}` }
    }
  } catch (error) {
    console.error('云函数错误:', error)
    return { code: 500, message: error.message }
  }
}
