/**
 * 操作审计日志 - 符合生产规范的安全审计
 */

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com'
]

class AuditLogger {
  constructor(app, db) {
    this.app = app
    this.db = db
  }

  /**
   * 记录操作日志
   * @param {object} params - 日志参数
   */
  async log(params) {
    const {
      action,
      collection,
      userId,
      role,
      docId,
      requestData,
      response,
      ip,
      userAgent
    } = params

    const logData = {
      // 操作信息
      action,
      collection,
      docId,
      
      // 用户信息
      userId: userId || 'anonymous',
      role: role || 'guest',
      
      // 请求信息
      requestData: this.sanitizeData(requestData),
      ip: ip || 'unknown',
      userAgent: userAgent || 'unknown',
      
      // 响应信息
      success: response && response.code === 0,
      responseCode: response?.code,
      responseMessage: response?.message,
      
      // 时间戳
      timestamp: new Date().toISOString()
    }

    // 生产环境异步记录，不阻塞主流程
    if (process.env.NODE_ENV === 'production') {
      this.logAsync(logData).catch(err => {
        console.error('[Audit] 异步记录日志失败:', err.message)
      })
    } else {
      // 开发环境直接打印
      console.log('[Audit]', JSON.stringify(logData, null, 2))
    }

    return logData
  }

  /**
   * 异步记录日志到数据库
   */
  async logAsync(logData) {
    try {
      await this.db.collection('audit_logs').add(logData)
    } catch (error) {
      console.error('[Audit] 写入数据库失败:', error.message)
    }
  }

  /**
   * 清理敏感数据
   */
  sanitizeData(data) {
    if (!data) return {}
    
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessKey']
    const sanitized = { ...data }
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***'
      }
    }
    
    // 限制数据大小
    const str = JSON.stringify(sanitized)
    if (str.length > 2000) {
      return { _truncated: true, preview: str.substring(0, 200) }
    }
    
    return sanitized
  }

  /**
   * 查询操作日志（仅超级管理员可用）
   */
  async queryLogs(params = {}) {
    const { userId, action, collection, startDate, endDate, page = 1, pageSize = 50 } = params
    
    let query = {}
    
    if (userId) query.userId = userId
    if (action) query.action = action
    if (collection) query.collection = collection
    
    if (startDate || endDate) {
      query.timestamp = {}
      if (startDate) query.timestamp.$gte = startDate
      if (endDate) query.timestamp.$lte = endDate
    }
    
    const result = await this.db.collection('audit_logs')
      .where(query)
      .orderBy('timestamp', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    const countResult = await this.db.collection('audit_logs')
      .where(query)
      .count()
    
    return {
      data: result.data,
      total: countResult.total,
      page,
      pageSize
    }
  }

  /**
   * 获取 CORS 头
   */
  static getCorsHeaders(event) {
    const origin = event.request?.headers?.origin || event.request?.headers?.Origin
    
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    }
    
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  }
}

module.exports = AuditLogger
