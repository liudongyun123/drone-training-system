/**
 * 统一的表单验证工具
 * 提供常用的验证规则和错误提示
 */

// 验证规则类型
export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
};

// 验证结果类型
export type ValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * 验证必填字段
 */
export function validateRequired(value: any, fieldName: string = '此字段'): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      error: `请输入${fieldName}`
    };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return {
      valid: false,
      error: `请输入${fieldName}`
    };
  }
  return { valid: true };
}

/**
 * 验证字符串长度
 */
export function validateLength(value: string, min?: number, max?: number, fieldName: string = '此字段'): ValidationResult {
  if (min !== undefined && value.length < min) {
    return {
      valid: false,
      error: `${fieldName}至少需要${min}个字符`
    };
  }
  if (max !== undefined && value.length > max) {
    return {
      valid: false,
      error: `${fieldName}不能超过${max}个字符`
    };
  }
  return { valid: true };
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: '请输入有效的邮箱地址'
    };
  }
  return { valid: true };
}

/**
 * 验证手机号格式（中国大陆）
 */
export function validatePhone(phone: string): ValidationResult {
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return {
      valid: false,
      error: '请输入有效的手机号'
    };
  }
  return { valid: true };
}

/**
 * 验证URL格式
 */
export function validateURL(url: string): ValidationResult {
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: '请输入有效的URL地址'
    };
  }
}

/**
 * 验证数字范围
 */
export function validateNumber(value: number, min?: number, max?: number, fieldName: string = '此字段'): ValidationResult {
  if (isNaN(value)) {
    return {
      valid: false,
      error: `${fieldName}必须是数字`
    };
  }
  if (min !== undefined && value < min) {
    return {
      valid: false,
      error: `${fieldName}不能小于${min}`
    };
  }
  if (max !== undefined && value > max) {
    return {
      valid: false,
      error: `${fieldName}不能大于${max}`
    };
  }
  return { valid: true };
}

/**
 * 验证密码强度
 */
export function validatePassword(password: string): ValidationResult {
  if (password.length < 6) {
    return {
      valid: false,
      error: '密码长度至少6个字符'
    };
  }
  // 检查是否包含字母和数字
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: '密码必须包含字母和数字'
    };
  }
  return { valid: true };
}

/**
 * 统一验证函数
 */
export function validateField(
  value: any,
  rules: ValidationRule[],
  fieldName: string = '此字段'
): ValidationResult {
  for (const rule of rules) {
    // 必填验证
    if (rule.required) {
      const result = validateRequired(value, fieldName);
      if (!result.valid) return result;
    }

    // 如果值为空且非必填，跳过其他验证
    if (value === null || value === undefined || value === '') {
      continue;
    }

    // 长度验证
    if (rule.minLength || rule.maxLength) {
      const result = validateLength(value, rule.minLength, rule.maxLength, fieldName);
      if (!result.valid) return result;
    }

    // 正则验证
    if (rule.pattern) {
      if (!rule.pattern.test(value)) {
        return {
          valid: false,
          error: rule.message || `${fieldName}格式不正确`
        };
      }
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value);
      if (result) {
        return {
          valid: false,
          error: result
        };
      }
    }
  }

  return { valid: true };
}

/**
 * 批量验证表单字段
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, ValidationRule[]>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let valid = true;

  for (const [field, fieldRules] of Object.entries(rules)) {
    const result = validateField(data[field], fieldRules, field);
    if (!result.valid) {
      valid = false;
      errors[field] = result.error!;
    }
  }

  return { valid, errors };
}

/**
 * 常用验证规则集合
 */
export const commonRules = {
  required: (fieldName: string = '此字段'): ValidationRule[] => [
    { required: true }
  ],

  email: (): ValidationRule[] => [
    {
      custom: (value) => {
        const result = validateEmail(value);
        return result.valid ? null : result.error;
      }
    }
  ],

  phone: (): ValidationRule[] => [
    {
      custom: (value) => {
        const result = validatePhone(value);
        return result.valid ? null : result.error;
      }
    }
  ],

  url: (): ValidationRule[] => [
    {
      custom: (value) => {
        const result = validateURL(value);
        return result.valid ? null : result.error;
      }
    }
  ],

  username: (): ValidationRule[] => [
    { required: true },
    { minLength: 2, maxLength: 20 },
    {
      custom: (value) => {
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          return '用户名只能包含字母、数字和下划线';
        }
        return null;
      }
    }
  ],

  password: (): ValidationRule[] => [
    { required: true },
    { minLength: 6 },
    {
      custom: (value) => {
        const result = validatePassword(value);
        return result.valid ? null : result.error;
      }
    }
  ],

  name: (maxLength: number = 50): ValidationRule[] => [
    { required: true },
    { maxLength }
  ],

  number: (min?: number, max?: number): ValidationRule[] => [
    {
      custom: (value) => {
        const result = validateNumber(Number(value), min, max);
        return result.valid ? null : result.error;
      }
    }
  ],

  age: (): ValidationRule[] => [
    {
      custom: (value) => {
        const result = validateNumber(Number(value), 18, 120, '年龄');
        return result.valid ? null : result.error;
      }
    }
  ]
};
