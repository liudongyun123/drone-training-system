/**
 * 验证工具函数
 * 提供常用的数据验证功能
 */

// ============ 邮箱验证 ============

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证邮箱域名
 * @param email 邮箱地址
 * @param allowedDomains 允许的域名列表
 * @returns 是否有效
 */
export function isValidEmailDomain(
  email: string,
  allowedDomains: string[]
): boolean {
  if (!isValidEmail(email)) return false
  
  const domain = email.split('@')[1].toLowerCase()
  return allowedDomains.some(d => d.toLowerCase() === domain)
}

// ============ 手机号验证 ============

/**
 * 验证中国大陆手机号
 * @param phone 手机号
 * @returns 是否有效
 */
export function isValidChinaPhone(phone: string): boolean {
  // 支持格式：13800138000, +86 13800138000, +8613800138000
  const cleanedPhone = phone.replace(/\s+/g, '')
  const phoneRegex = /^(\+86)?1[3-9]\d{9}$/
  return phoneRegex.test(cleanedPhone)
}

/**
 * 验证国际手机号
 * @param phone 手机号（带国家代码）
 * @returns 是否有效
 */
export function isValidInternationalPhone(phone: string): boolean {
  // 国际手机号：+ 国家代码 + 10-15 位数字
  const cleanedPhone = phone.replace(/\s+/g, '')
  const phoneRegex = /^\+\d{1,3}\d{10,15}$/
  return phoneRegex.test(cleanedPhone)
}

/**
 * 格式化手机号为国际格式
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function formatPhoneInternational(phone: string): string {
  const cleanedPhone = phone.replace(/\D/g, '')
  
  // 如果没有国家代码，默认 +86
  if (cleanedPhone.startsWith('86') && cleanedPhone.length === 13) {
    return `+${cleanedPhone.substring(0, 2)} ${cleanedPhone.substring(2)}`
  }
  
  if (!cleanedPhone.startsWith('+') && cleanedPhone.length === 11) {
    return `+86 ${cleanedPhone}`
  }
  
  return cleanedPhone.startsWith('+') ? cleanedPhone : `+${cleanedPhone}`
}

// ============ 密码验证 ============

/**
 * 密码强度配置
 */
export interface PasswordStrengthConfig {
  minLength?: number
  maxLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumber?: boolean
  requireSpecialChar?: boolean
}

/**
 * 默认密码强度配置
 */
const defaultPasswordConfig: PasswordStrengthConfig = {
  minLength: 8,
  maxLength: 50,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
}

/**
 * 验证密码强度
 * @param password 密码
 * @param config 配置
 * @returns { valid: boolean, errors: string[] }
 */
export function validatePassword(
  password: string,
  config: PasswordStrengthConfig = defaultPasswordConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const {
    minLength = 8,
    maxLength = 50,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecialChar = true
  } = config
  
  // 长度验证
  if (password.length < minLength) {
    errors.push(`密码长度至少 ${minLength} 位`)
  }
  
  if (password.length > maxLength) {
    errors.push(`密码长度不能超过 ${maxLength} 位`)
  }
  
  // 大写字母
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母')
  }
  
  // 小写字母
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母')
  }
  
  // 数字
  if (requireNumber && !/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字')
  }
  
  // 特殊字符
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 计算密码强度评分
 * @param password 密码
 * @returns 评分 (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0
  
  // 长度评分
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10
  
  // 字符类型评分
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/\d/.test(password)) score += 15
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15
  
  return Math.min(score, 100)
}

/**
 * 获取密码强度等级
 * @param password 密码
 * @returns 'weak' | 'medium' | 'strong' | 'very-strong'
 */
export function getPasswordStrengthLevel(
  password: string
): 'weak' | 'medium' | 'strong' | 'very-strong' {
  const score = calculatePasswordStrength(password)
  
  if (score < 40) return 'weak'
  if (score < 60) return 'medium'
  if (score < 80) return 'strong'
  return 'very-strong'
}

// ============ 用户名验证 ============

/**
 * 验证用户名
 * @param username 用户名
 * @returns 是否有效
 */
export function isValidUsername(username: string): boolean {
  // 用户名：4-20 位，只能包含字母、数字、下划线、中文
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{4,20}$/
  return usernameRegex.test(username)
}

// ============ 身份证号验证 ============

/**
 * 验证中国大陆身份证号
 * @param idCard 身份证号
 * @returns 是否有效
 */
export function isValidChinaIdCard(idCard: string): boolean {
  // 15位或18位
  const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  if (!idCardRegex.test(idCard)) return false
  
  // 18位身份证校验码验证
  if (idCard.length === 18) {
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    
    let sum = 0
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard[i]) * weights[i]
    }
    
    const checkCode = checkCodes[sum % 11]
    return checkCode === idCard[17].toUpperCase()
  }
  
  return true
}

// ============ URL 验证 ============

/**
 * 验证 URL 格式
 * @param url URL 地址
 * @returns 是否有效
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证 HTTPS URL
 * @param url URL 地址
 * @returns 是否有效
 */
export function isValidHttpsURL(url: string): boolean {
  if (!isValidURL(url)) return false
  return url.startsWith('https://')
}

// ============ 通用验证 ============

/**
 * 验证是否为空
 * @param value 值
 * @returns 是否为空
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 验证数字范围
 * @param value 数字
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * 验证字符串长度
 * @param value 字符串
 * @param min 最小长度
 * @param max 最大长度
 * @returns 是否在范围内
 */
export function isLengthValid(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max
}

// ============ 表单验证器 ============

/**
 * 表单验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

/**
 * 表单验证规则
 */
export interface ValidationRule {
  required?: boolean
  message?: string
  validator?: (value: any) => boolean | string
  rules?: Array<(value: any) => boolean | string>
}

/**
 * 表单验证规则集合
 */
export type ValidationRules = Record<string, ValidationRule>

/**
 * 验证表单数据
 * @param data 表单数据
 * @param rules 验证规则
 * @returns 验证结果
 */
export function validateForm(
  data: Record<string, any>,
  rules: ValidationRules
): ValidationResult {
  const errors: Record<string, string> = {}
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    
    // 必填验证
    if (rule.required && isEmpty(value)) {
      errors[field] = rule.message || `${field} 不能为空`
      continue
    }
    
    // 跳过空值的其他验证
    if (isEmpty(value) && !rule.required) {
      continue
    }
    
    // 自定义验证器
    if (rule.validator) {
      const result = rule.validator(value)
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : (rule.message || `${field} 格式不正确`)
      }
    }
    
    // 规则数组
    if (rule.rules) {
      for (const validator of rule.rules) {
        const result = validator(value)
        if (result !== true) {
          errors[field] = typeof result === 'string' ? result : `${field} 格式不正确`
          break
        }
      }
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * 常用验证规则工厂
 */
export const ValidationRules = {
  // 必填
  required(message?: string): ValidationRule {
    return {
      required: true,
      message
    }
  },
  
  // 邮箱
  email(message?: string): ValidationRule {
    return {
      validator: (value) => isValidEmail(value) || message || '邮箱格式不正确'
    }
  },
  
  // 手机号
  phone(message?: string): ValidationRule {
    return {
      validator: (value) => isValidChinaPhone(value) || message || '手机号格式不正确'
    }
  },
  
  // 用户名
  username(message?: string): ValidationRule {
    return {
      validator: (value) => isValidUsername(value) || message || '用户名格式不正确'
    }
  },
  
  // 密码
  password(config?: PasswordStrengthConfig, message?: string): ValidationRule {
    return {
      validator: (value) => {
        const result = validatePassword(value, config)
        return result.valid || message || result.errors[0]
      }
    }
  },
  
  // 最小长度
  minLength(min: number, message?: string): ValidationRule {
    return {
      validator: (value) => value.length >= min || message || `长度至少 ${min} 位`
    }
  },
  
  // 最大长度
  maxLength(max: number, message?: string): ValidationRule {
    return {
      validator: (value) => value.length <= max || message || `长度不能超过 ${max} 位`
    }
  },
  
  // 自定义
  custom(validator: (value: any) => boolean | string, message?: string): ValidationRule {
    return {
      validator: (value) => validator(value) !== false || message || '格式不正确'
    }
  }
}

// ============ 导出 ============

export default {
  // 邮箱
  isValidEmail,
  isValidEmailDomain,
  
  // 手机号
  isValidChinaPhone,
  isValidInternationalPhone,
  formatPhoneInternational,
  
  // 密码
  validatePassword,
  calculatePasswordStrength,
  getPasswordStrengthLevel,
  
  // 用户名
  isValidUsername,
  
  // 身份证
  isValidChinaIdCard,
  
  // URL
  isValidURL,
  isValidHttpsURL,
  
  // 通用
  isEmpty,
  isInRange,
  isLengthValid,
  
  // 表单验证
  validateForm,
  ValidationRules
}
