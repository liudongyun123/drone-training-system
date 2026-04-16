/**
 * 安全数据工具函数测试
 */
import { describe, it, expect } from 'vitest'
import { 
  safeGet, 
  safeGetList, 
  safeGetTotal,
  parseCloudFunctionListResponse 
} from '@/utils/safeData'

describe('safeData 工具函数', () => {
  describe('safeGet', () => {
    it('应该安全获取嵌套属性', () => {
      const obj = { a: { b: { c: 'value' } } }
      expect(safeGet(obj, 'a.b.c', '')).toBe('value')
    })

    it('应该返回默认值对于不存在的属性', () => {
      const obj = { a: { b: 1 } }
      expect(safeGet(obj, 'a.x', 'default')).toBe('default')
    })

    it('应该处理 null 和 undefined', () => {
      expect(safeGet(null, 'a', 'fallback')).toBe('fallback')
      expect(safeGet(undefined, 'a', 'fallback')).toBe('fallback')
    })
  })

  describe('safeGetList', () => {
    it('应该正确解析 data 数组格式响应', () => {
      const response = { code: 0, data: [1, 2, 3] }
      expect(safeGetList(response)).toEqual([1, 2, 3])
    })

    it('应该处理 list 格式响应', () => {
      const response = { list: [1, 2, 3] }
      expect(safeGetList(response)).toEqual([1, 2, 3])
    })

    it('应该返回空数组对于无效响应', () => {
      expect(safeGetList(null)).toEqual([])
      expect(safeGetList(undefined)).toEqual([])
      expect(safeGetList({})).toEqual([])
    })
  })

  describe('safeGetTotal', () => {
    it('应该正确获取总数', () => {
      const response = { total: 100 }
      expect(safeGetTotal(response)).toBe(100)
    })

    it('应该返回数组长度对于数组输入', () => {
      const response = [1, 2, 3]
      expect(safeGetTotal(response)).toBe(3)
    })

    it('应该返回 0 对于无效响应', () => {
      expect(safeGetTotal(null)).toBe(0)
      expect(safeGetTotal({})).toBe(0)
    })
  })

  describe('parseCloudFunctionListResponse', () => {
    it('应该正确解析 data 数组格式响应', () => {
      const result = parseCloudFunctionListResponse({
        code: 0,
        data: [
          { _id: '1', name: 'Item 1' },
          { _id: '2', name: 'Item 2' }
        ]
      })
      expect(result.list).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('应该处理直接数组格式', () => {
      const result = parseCloudFunctionListResponse([
        { _id: '1' },
        { _id: '2' }
      ])
      expect(result.list).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('应该处理空响应', () => {
      const result = parseCloudFunctionListResponse(null)
      expect(result.list).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})
