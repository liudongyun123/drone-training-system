/**
 * 安全服务层
 * 
 * 特性：
 * - 敏感数据加密/解密
 * - XSS/CSRF防护
 * - 输入验证与清理
 * - 安全日志记录
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// 安全工具函数
// ============================================================================

/**
 * HTML转义（防止XSS）
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }
  return str.replace(/[&<>"'`=/]/g, char => escapeMap[char])
}

/**
 * 移除危险标签和属性
 */
export function sanitizeHtml(html: string): string {
  // 移除script标签
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // 移除onclick等事件属性
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  // 移除javascript:协议
  html = html.replace(/javascript:/gi, '')
  // 移除data:协议（除安全的外）
  html = html.replace(/data:(?!image\/(png|jpg|jpeg|gif|webp))/gi, '')
  
  return html
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证手机号格式（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 密码强度验证
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  strength: 'weak' | 'medium' | 'strong'
  message: string
} {
  if (password.length < 8) {
    return { valid: false, strength: 'weak', message: '密码长度至少8位' }
  }
  
  let strength = 0
  const checks = [
    /[a-z]/.test(password),      // 小写字母
    /[A-Z]/.test(password),      // 大写字母
    /[0-9]/.test(password),      // 数字
    /[^a-zA-Z0-9]/.test(password) // 特殊字符
  ]
  
  strength = checks.filter(Boolean).length
  
  if (strength < 3) {
    return { valid: true, strength: 'weak', message: '建议包含大小写字母、数字和特殊字符' }
  } else if (strength === 3) {
    return { valid: true, strength: 'medium', message: '密码强度中等' }
  } else {
    return { valid: true, strength: 'strong', message: '密码强度良好' }
  }
}

/**
 * 简单的数据加密（Base64编码，仅用于非敏感数据）
 * 注意：生产环境应使用AES等真正加密算法
 */
export function simpleEncrypt(data: string): string {
  return btoa(encodeURIComponent(data))
}

/**
 * 简单的数据解密
 */
export function simpleDecrypt(encrypted: string): string {
  try {
    return decodeURIComponent(atob(encrypted))
  } catch {
    return ''
  }
}

/**
 * 生成安全随机字符串
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  return Array.from(randomValues)
    .map(v => chars[v % chars.length])
    .join('')
}

// ============================================================================
// 安全日志
// ============================================================================

interface SecurityLog {
  id: string
  type: 'login' | 'logout' | 'error' | 'warning' | 'info'
  message: string
  details?: any
  timestamp: number
  ip?: string
  userAgent?: string
}

interface SecurityLogState {
  logs: SecurityLog[]
  addLog: (log: Omit<SecurityLog, 'id' | 'timestamp'>) => void
  getLogs: (type?: SecurityLog['type'], limit?: number) => SecurityLog[]
  clearLogs: () => void
}

export const useSecurityLog = create<SecurityLogState>()(
  persist(
    (set, get) => ({
      logs: [],

      addLog: (log) => {
        const newLog: SecurityLog = {
          ...log,
          id: generateSecureToken(16),
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
        
        set(state => ({
          logs: [newLog, ...state.logs].slice(0, 1000) // 最多保留1000条
        }))

        // 生产环境应发送到服务器
        console.warn('[Security]', newLog.type, newLog.message, newLog.details)
      },

      getLogs: (type, limit = 100) => {
        const { logs } = get()
        let filtered = logs
        if (type) {
          filtered = filtered.filter(log => log.type === type)
        }
        return filtered.slice(0, limit)
      },

      clearLogs: () => set({ logs: [] })
    }),
    {
      name: 'security-log-storage'
    }
  )
)

// ============================================================================
// 安全的表单验证Hook
// ============================================================================

import { useState, useCallback } from 'react'

interface ValidationRule {
  validate: (value: any) => boolean
  message: string
}

interface ValidationState {
  errors: Record<string, string>
  touched: Record<string, boolean>
  validateAll: (values: Record<string, any>, rules: Record<string, ValidationRule[]>) => boolean
  validateField: (field: string, value: any, rules: ValidationRule[]) => string | null
  reset: () => void
  setTouched: (field: string) => void
}

export function useValidation(): ValidationState {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouchedState] = useState<Record<string, boolean>>({})

  const validateField = useCallback((
    field: string, 
    value: any, 
    rules: ValidationRule[]
  ): string | null => {
    for (const rule of rules) {
      if (!rule.validate(value)) {
        return rule.message
      }
    }
    return null
  }, [])

  const validateAll = useCallback((
    values: Record<string, any>, 
    rules: Record<string, ValidationRule[]>
  ): boolean => {
    const newErrors: Record<string, string> = {}
    const newTouched: Record<string, boolean> = {}
    
    let isValid = true

    for (const [field, fieldRules] of Object.entries(rules)) {
      newTouched[field] = true
      const error = validateField(field, values[field], fieldRules)
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    }

    setErrors(newErrors)
    setTouchedState(newTouched)
    
    return isValid
  }, [validateField])

  const reset = useCallback(() => {
    setErrors({})
    setTouchedState({})
  }, [])

  const setTouched = useCallback((field: string) => {
    setTouchedState(prev => ({ ...prev, [field]: true }))
  }, [])

  return { errors, touched, validateAll, validateField, reset, setTouched }
}

// ============================================================================
// 常用验证规则
// ============================================================================

export const VALIDATION_RULES = {
  required: (message = '此字段为必填项'): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length >= length,
    message: message || `长度不能少于${length}个字符`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length <= length,
    message: message || `长度不能超过${length}个字符`
  }),

  email: (message = '请输入有效的邮箱地址'): ValidationRule => ({
    validate: (value) => !value || isValidEmail(value),
    message
  }),

  phone: (message = '请输入有效的手机号码'): ValidationRule => ({
    validate: (value) => !value || isValidPhone(value),
    message
  }),

  url: (message = '请输入有效的网址'): ValidationRule => ({
    validate: (value) => !value || isValidUrl(value),
    message
  }),

  pattern: (regex: RegExp, message = '格式不正确'): ValidationRule => ({
    validate: (value) => !value || regex.test(value),
    message
  }),

  number: (message = '请输入数字'): ValidationRule => ({
    validate: (value) => !value || !isNaN(Number(value)),
    message
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      const num = Number(value)
      return !isNaN(num) && num >= min && num <= max
    },
    message: message || `数值必须在${min}到${max}之间`
  }),

  password: (message?: string): ValidationRule => ({
    validate: (value) => validatePasswordStrength(value || '').valid,
    message: message || validatePasswordStrength(value || '').message
  })
}

// ============================================================================
// CSRF防护
// ============================================================================

const CSRF_TOKEN_KEY = 'csrf_token'

/**
 * 生成CSRF Token
 */
export function generateCsrfToken(): string {
  const token = generateSecureToken(32)
  sessionStorage.setItem(CSRF_TOKEN_KEY, token)
  return token
}

/**
 * 获取CSRF Token
 */
export function getCsrfToken(): string | null {
  return sessionStorage.getItem(CSRF_TOKEN_KEY)
}

/**
 * 验证CSRF Token
 */
export function verifyCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken()
  if (!storedToken) return false
  
  // 使用时间常量比较，防止时序攻击
  if (token.length !== storedToken.length) return false
  
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i)
  }
  
  sessionStorage.removeItem(CSRF_TOKEN_KEY)
  return result === 0
}

/**
 * 请求时自动附加CSRF Token
 */
export function withCsrfToken(headers: Record<string, string>): Record<string, string> {
  const token = getCsrfToken()
  if (token) {
    return { ...headers, 'X-CSRF-Token': token }
  }
  return headers
}

export default {
  escapeHtml,
  sanitizeHtml,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validatePasswordStrength,
  generateSecureToken,
  VALIDATION_RULES,
  useValidation,
  generateCsrfToken,
  getCsrfToken,
  verifyCsrfToken,
  withCsrfToken
}
