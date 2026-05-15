/**
 * 教师管理服务 v2.0
 * 版本: v20260515-unified
 * 
 * 统一使用 CloudDBService (HTTP → db-init)
 */

import { CloudDBService } from './CloudDBService'
import type { Teacher, PaginationParams } from '../types/service'

export const teacherService = {
  /**
   * 获取教师列表
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await CloudDBService.query<Teacher>('teacher_profiles', {
        where: query,
        orderBy: 'createdAt',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: {
          list: result.data,
          total: result.total
        }
      }
    } catch (error: any) {
      console.error('获取教师列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取教师列表失败',
        data: { list: [], total: 0 }
      }
    }
  },

  /**
   * 获取教师详情
   */
  async getDetail(teacherId: string) {
    try {
      const data = await CloudDBService.get<Teacher>('teacher_profiles', teacherId)
      return { code: 0, data }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 创建教师档案
   */
  async create(data: Partial<Teacher>) {
    const teacherData = {
      ...data,
      rating: data.rating || 0,
      totalHours: data.totalHours || 0,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      const result = await CloudDBService.add('teacher_profiles', teacherData)
      return { code: 0, data: { _id: result?.id } }
    } catch (error: any) {
      console.error('创建教师失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 更新教师档案
   */
  async update(teacherId: string, data: Partial<Teacher>) {
    try {
      await CloudDBService.update('teacher_profiles', teacherId, {
        ...data,
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      console.error('更新教师失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 删除教师档案
   */
  async delete(teacherId: string) {
    try {
      await CloudDBService.delete('teacher_profiles', teacherId)
      return { code: 0 }
    } catch (error: any) {
      console.error('删除教师失败:', error)
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取教师统计数据
   */
  async getStatistics(teacherId: string, year: number, month: number) {
    try {
      const result = await CloudDBService.query('statistics_teacher', {
        where: { teacherId, year, month },
        limit: 1
      })
      return { code: 0, data: result.data?.[0] || null }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取教师的所有课程
   */
  async getCourses(teacherId: string) {
    try {
      const result = await CloudDBService.query('courses', {
        where: { teacherId },
        orderBy: 'createdAt',
        order: 'desc',
        limit: 100
      })
      return { code: 0, data: result.data }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  }
}

export default teacherService
