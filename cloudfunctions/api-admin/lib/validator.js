/**
 * 参数校验器 - 符合生产规范的参数验证
 */

class Validator {
  /**
   * 校验必填参数
   * @param {object} data - 待校验数据
   * @param {string[]} requiredFields - 必填字段列表
   */
  static require(data, requiredFields) {
    const missing = []
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field)
      }
    }
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `缺少必填参数: ${missing.join(', ')}`
      }
    }
    
    return { valid: true }
  }

  /**
   * 校验字符串长度
   * @param {string} value - 值
   * @param {number} min - 最小长度
   * @param {number} max - 最大长度
   */
  static stringLength(value, min = 0, max = Infinity) {
    if (typeof value !== 'string') {
      return { valid: false, error: '必须是字符串类型' }
    }
    
    const len = value.trim().length
    if (len < min) {
      return { valid: false, error: `长度不能少于 ${min} 个字符` }
    }
    if (len > max) {
      return { valid: false, error: `长度不能超过 ${max} 个字符` }
    }
    
    return { valid: true }
  }

  /**
   * 校验手机号
   * @param {string} phone - 手机号
   */
  static phone(phone) {
    if (!phone) {
      return { valid: false, error: '手机号不能为空' }
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: '手机号格式不正确' }
    }
    
    return { valid: true }
  }

  /**
   * 校验邮箱
   * @param {string} email - 邮箱
   */
  static email(email) {
    if (!email) {
      return { valid: false, error: '邮箱不能为空' }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, error: '邮箱格式不正确' }
    }
    
    return { valid: true }
  }

  /**
   * 校验 ID 格式
   * @param {string} id - ID
   */
  static id(id) {
    if (!id) {
      return { valid: false, error: 'ID 不能为空' }
    }
    
    // 支持字符串和 ObjectId 格式
    if (typeof id !== 'string' && typeof id !== 'number') {
      return { valid: false, error: 'ID 格式不正确' }
    }
    
    return { valid: true }
  }

  /**
   * 校验枚举值
   * @param {any} value - 值
   * @param {array} allowedValues - 允许的值列表
   */
  static enum(value, allowedValues) {
    if (!allowedValues.includes(value)) {
      return { 
        valid: false, 
        error: `值必须是以下之一: ${allowedValues.join(', ')}` 
      }
    }
    return { valid: true }
  }

  /**
   * 校验分页参数
   * @param {object} options - 分页选项
   */
  static pagination(options = {}) {
    const { page = 1, pageSize = 20 } = options
    
    const pageNum = parseInt(page)
    const size = parseInt(pageSize)
    
    if (isNaN(pageNum) || pageNum < 1) {
      return { valid: false, error: '页码必须是正整数' }
    }
    
    if (isNaN(size) || size < 1 || size > 100) {
      return { valid: false, error: '每页大小必须在 1-100 之间' }
    }
    
    return { 
      valid: true, 
      page: pageNum, 
      pageSize: size,
      skip: (pageNum - 1) * size 
    }
  }

  /**
   * 校验日期格式
   * @param {string} dateStr - 日期字符串
   */
  static date(dateStr) {
    if (!dateStr) {
      return { valid: false, error: '日期不能为空' }
    }
    
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return { valid: false, error: '日期格式不正确' }
    }
    
    return { valid: true, date }
  }

  /**
   * 校验日期范围
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   */
  static dateRange(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime())) {
      return { valid: false, error: '开始日期格式不正确' }
    }
    
    if (isNaN(end.getTime())) {
      return { valid: false, error: '结束日期格式不正确' }
    }
    
    if (start > end) {
      return { valid: false, error: '开始日期不能晚于结束日期' }
    }
    
    return { valid: true, startDate: start, endDate: end }
  }

  /**
   * 综合校验函数
   * @param {object} data - 待校验数据
   * @param {object} rules - 校验规则
   */
  static validate(data, rules) {
    const errors = []
    
    for (const [field, ruleSet] of Object.entries(rules)) {
      const value = data[field]
      
      // 必填检查
      if (ruleSet.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} 是必填项`)
        continue
      }
      
      // 跳过空值的其他校验
      if (value === undefined || value === null || value === '') {
        continue
      }
      
      // 类型校验
      if (ruleSet.type) {
        const typeValid = this.checkType(value, ruleSet.type)
        if (!typeValid) {
          errors.push(`${field} 类型错误，期望 ${ruleSet.type}`)
        }
      }
      
      // 字符串长度
      if (ruleSet.min !== undefined || ruleSet.max !== undefined) {
        const lenResult = this.stringLength(value, ruleSet.min, ruleSet.max)
        if (!lenResult.valid) {
          errors.push(`${field}: ${lenResult.error}`)
        }
      }
      
      // 枚举值
      if (ruleSet.enum) {
        const enumResult = this.enum(value, ruleSet.enum)
        if (!enumResult.valid) {
          errors.push(`${field}: ${enumResult.error}`)
        }
      }
      
      // 自定义校验函数
      if (ruleSet.custom) {
        const customResult = ruleSet.custom(value, data)
        if (!customResult.valid) {
          errors.push(`${field}: ${customResult.error}`)
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 类型检查
   */
  static checkType(value, type) {
    switch (type) {
      case 'string': return typeof value === 'string'
      case 'number': return typeof value === 'number'
      case 'boolean': return typeof value === 'boolean'
      case 'array': return Array.isArray(value)
      case 'object': return typeof value === 'object' && !Array.isArray(value)
      default: return true
    }
  }

  /**
   * 清理数据 - 移除不允许的字段
   * @param {object} data - 原始数据
   * @param {string[]} allowedFields - 允许的字段列表
   */
  static sanitize(data, allowedFields) {
    const sanitized = {}
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        sanitized[field] = data[field]
      }
    }
    
    return sanitized
  }
}

module.exports = Validator
