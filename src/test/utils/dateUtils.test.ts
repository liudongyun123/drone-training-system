/**
 * 日期工具函数测试
 */
import { describe, it, expect } from 'vitest'
import { parseDate, formatTime, formatDateStr, getRelativeTime } from '@/utils/dateUtils'

describe('日期工具函数', () => {
  describe('parseDate', () => {
    it('应该正确解析 ISO 格式日期字符串', () => {
      const result = parseDate('2024-01-15T10:30:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result?.toISOString()).toContain('2024-01-15')
    })

    it('应该正确解析中文日期格式', () => {
      const result = parseDate('2024-01-15')
      expect(result).toBeInstanceOf(Date)
    })

    it('应该返回 null 对于无效日期', () => {
      expect(parseDate('invalid')).toBeNull()
      expect(parseDate('')).toBeNull()
    })

    it('应该处理时间戳数字', () => {
      const timestamp = 1705315800000
      // @ts-ignore
      const result = parseDate(timestamp)
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('formatDateStr', () => {
    it('应该格式化日期字符串', () => {
      const result = formatDateStr('2024-01-15')
      expect(result).toContain('2024')
      expect(result).toContain('01')
      expect(result).toContain('15')
    })

    it('应该返回"-"对于无效日期', () => {
      expect(formatDateStr('invalid')).toBe('-')
      expect(formatDateStr('')).toBe('-')
    })
  })

  describe('formatTime', () => {
    it('应该格式化时间', () => {
      const result = formatTime('2024-01-15T10:30:00.000Z')
      // 返回格式是 "HH:mm" 如 "18:30"
      expect(result).toMatch(/^\d{2}:\d{2}$/)
    })

    it('应该返回"-"对于无效输入', () => {
      expect(formatTime('')).toBe('-')
      expect(formatTime('invalid')).toBe('-')
    })
  })

  describe('getRelativeTime', () => {
    it('应该返回"刚刚"对于刚过去的时间', () => {
      const now = new Date()
      const result = getRelativeTime(now.toISOString())
      expect(result).toBe('刚刚')
    })

    it('应该返回分钟前', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
      const result = getRelativeTime(fiveMinsAgo.toISOString())
      expect(result).toContain('分钟前')
    })

    it('应该处理无效输入', () => {
      expect(getRelativeTime('invalid')).toBe('-')
      expect(getRelativeTime('')).toBe('-')
    })
  })
})
