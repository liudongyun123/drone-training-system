/**
 * 管理服务测试
 */
import { describe, it, expect } from 'vitest'
import { adminService } from '@/services/adminService'

describe('adminService', () => {
  describe('list', () => {
    it('应该有 list 方法', () => {
      expect(typeof adminService.list).toBe('function')
    })
  })

  describe('count', () => {
    it('应该有 count 方法', () => {
      expect(typeof adminService.count).toBe('function')
    })
  })

  describe('CRUD 操作', () => {
    it('应该有 add 方法', () => {
      expect(typeof adminService.add).toBe('function')
    })

    it('应该有 update 方法', () => {
      expect(typeof adminService.update).toBe('function')
    })

    it('应该有 delete 方法', () => {
      expect(typeof adminService.delete).toBe('function')
    })

    it('应该有 get 方法', () => {
      expect(typeof adminService.get).toBe('function')
    })

    it('应该有 batchDelete 方法', () => {
      expect(typeof adminService.batchDelete).toBe('function')
    })

    it('应该有 aggregate 方法', () => {
      expect(typeof adminService.aggregate).toBe('function')
    })
  })
})
