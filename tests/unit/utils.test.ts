import { describe, it, expect } from 'vitest'

// 测试工具函数
describe('日期格式化', () => {
  it('应正确格式化日期', () => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    expect(formatDate(new Date('2026-04-21'))).toBe('2026-04-21')
  })
})

describe('金额格式化', () => {
  it('应正确格式化金额', () => {
    const formatPrice = (price: number) => {
      return `¥${price.toFixed(2)}`
    }
    expect(formatPrice(299)).toBe('¥299.00')
    expect(formatPrice(99.9)).toBe('¥99.90')
  })
})

describe('手机号验证', () => {
  const isValidPhone = (phone: string) => {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  it('应正确验证有效手机号', () => {
    expect(isValidPhone('13800138000')).toBe(true)
    expect(isValidPhone('15912345678')).toBe(true)
  })

  it('应正确拒绝无效手机号', () => {
    expect(isValidPhone('12345678901')).toBe(false)
    expect(isValidPhone('1380013800')).toBe(false)
    expect(isValidPhone('abc12345678')).toBe(false)
  })
})

describe('深拷贝', () => {
  const deepClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj))
  }

  it('应正确深拷贝对象', () => {
    const original = { a: 1, b: { c: 2 } }
    const cloned = deepClone(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned.b).not.toBe(original.b)
  })

  it('应正确深拷贝数组', () => {
    const original = [1, [2, 3], { a: 4 }]
    const cloned = deepClone(original)
    expect(cloned).toEqual(original)
    expect(cloned[1]).not.toBe(original[1])
  })
})

describe('防抖函数', () => {
  it('应正确实现防抖', async () => {
    let count = 0
    const debounce = (fn: () => void, delay: number) => {
      let timer: NodeJS.Timeout
      return () => {
        clearTimeout(timer)
        timer = setTimeout(fn, delay)
      }
    }
    
    const increment = debounce(() => count++, 100)
    increment()
    increment()
    increment()
    
    expect(count).toBe(0)
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(count).toBe(1)
  })
})
