// utils/validation.ts
// 表单验证工具

/**
 * 验证规则接口
 */
export interface ValidationRule {
  required?: boolean
  message?: string
  pattern?: RegExp
  minLength?: number
  maxLength?: number
  validator?: (value: any) => boolean
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * 手机号验证
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: false, message: '请输入手机号' }
  }
  if (!/^1\d{10}$/.test(phone.trim())) {
    return { valid: false, message: '请输入正确的手机号' }
  }
  return { valid: true }
}

/**
 * 姓名验证（2-20个字符）
 */
export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, message: '请输入姓名' }
  }
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { valid: false, message: '姓名长度为2-20个字符' }
  }
  if (!/^[\u4e00-\u9fa5a-zA-Z\s·]+$/.test(trimmed)) {
    return { valid: false, message: '姓名包含非法字符' }
  }
  return { valid: true }
}

/**
 * 验证码验证（4-6位数字）
 */
export function validateCode(code: string): ValidationResult {
  if (!code || !code.trim()) {
    return { valid: false, message: '请输入验证码' }
  }
  if (!/^\d{4,6}$/.test(code.trim())) {
    return { valid: false, message: '验证码为4-6位数字' }
  }
  return { valid: true }
}

/**
 * 身份证号验证
 */
export function validateIdCard(idCard: string): ValidationResult {
  if (!idCard || !idCard.trim()) {
    return { valid: false, message: '请输入身份证号' }
  }
  // 18位身份证号验证
  const pattern = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
  if (!pattern.test(idCard.trim())) {
    return { valid: false, message: '身份证号格式不正确' }
  }
  return { valid: true }
}

/**
 * 邮箱验证
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { valid: false, message: '请输入邮箱' }
  }
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!pattern.test(email.trim())) {
    return { valid: false, message: '邮箱格式不正确' }
  }
  return { valid: true }
}

/**
 * 地址验证
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || !address.trim()) {
    return { valid: false, message: '请输入详细地址' }
  }
  if (address.trim().length < 5) {
    return { valid: false, message: '地址不能少于5个字符' }
  }
  if (address.trim().length > 200) {
    return { valid: false, message: '地址不能超过200个字符' }
  }
  return { valid: true }
}

/**
 * 密码验证（8-20位，包含字母和数字）
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: '请输入密码' }
  }
  if (password.length < 8 || password.length > 20) {
    return { valid: false, message: '密码长度为8-20位' }
  }
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: '密码需包含字母和数字' }
  }
  return { valid: true }
}

/**
 * 通用验证函数
 */
export function validate(value: any, rules: ValidationRule): ValidationResult {
  // 必填验证
  if (rules.required && (value === undefined || value === null || value === '')) {
    return { valid: false, message: rules.message || '此项为必填项' }
  }

  // 最小长度
  if (rules.minLength && String(value).length < rules.minLength) {
    return { valid: false, message: rules.message || `长度不能少于${rules.minLength}个字符` }
  }

  // 最大长度
  if (rules.maxLength && String(value).length > rules.maxLength) {
    return { valid: false, message: rules.message || `长度不能超过${rules.maxLength}个字符` }
  }

  // 正则验证
  if (rules.pattern && value && !rules.pattern.test(String(value))) {
    return { valid: false, message: rules.message || '格式不正确' }
  }

  // 自定义验证
  if (rules.validator && !rules.validator(value)) {
    return { valid: false, message: rules.message || '验证失败' }
  }

  return { valid: true }
}

/**
 * 批量验证表单
 */
export function validateForm(data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult {
  for (const key in rules) {
    const result = validate(data[key], rules[key])
    if (!result.valid) {
      return result
    }
  }
  return { valid: true }
}
