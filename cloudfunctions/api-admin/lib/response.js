/**
 * 统一响应格式 - 符合生产规范的 API 响应
 */

class ApiResponse {
  /**
   * 成功响应
   * @param {any} data - 返回数据
   * @param {string} message - 成功消息
   * @param {object} extra - 额外信息
   */
  static success(data = null, message = '操作成功', extra = {}) {
    return {
      code: 0,
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...extra
    }
  }

  /**
   * 分页响应
   * @param {array} list - 数据列表
   * @param {number} total - 总数
   * @param {number} page - 当前页
   * @param {number} pageSize - 每页大小
   * @param {string} message - 消息
   */
  static paginated(list = [], total = 0, page = 1, pageSize = 20, message = '查询成功') {
    return {
      code: 0,
      success: true,
      message,
      data: list,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 错误响应
   * @param {number} code - 错误码
   * @param {string} message - 错误消息
   * @param {any} details - 错误详情（仅内部使用）
   */
  static error(code = 500, message = '操作失败', details = null) {
    const response = {
      code,
      success: false,
      message,
      timestamp: new Date().toISOString()
    }
    
    // 生产环境不暴露内部错误详情
    if (process.env.NODE_ENV === 'development' && details) {
      response._debug = details
    }
    
    return response
  }

  /**
   * 业务错误码定义
   */
  static codes = {
    // 通用错误 1000-1999
    SUCCESS: 0,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
    
    // 业务错误 2000-2999
    COLLECTION_NOT_ALLOWED: 2001,
    ACTION_NOT_ALLOWED: 2002,
    VALIDATION_FAILED: 2003,
    DUPLICATE_ENTRY: 2004,
    INSUFFICIENT_PERMISSION: 2005,
    
    // 数据操作错误 3000-3999
    CREATE_FAILED: 3001,
    UPDATE_FAILED: 3002,
    DELETE_FAILED: 3003,
    QUERY_FAILED: 3004,
    NOT_EXIST: 3005
  }
}

module.exports = ApiResponse
