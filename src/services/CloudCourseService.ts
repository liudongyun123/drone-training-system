/**
 * @deprecated 此服务已废弃，建议迁移到 courseApi (from '@/shared/services/courseApi')
 * 
 * 注意：courseApi 提供更强大的功能：
 * - getList(filters): 支持分页、筛选、排序
 * - getDetail(courseId): 获取课程详情（含章节）
 * - getHotCourses(limit): 热门课程
 * - getRecommendedCourses(category): 推荐课程
 * - getCategories(): 分类列表
 * 
 * ★ Stage 3 迁移：数据库操作统一走 HTTP → adminService → db-init 云函数
 * 此服务保留用于向后兼容，将在后续版本中删除
 */

import { adminService } from './adminService'
import type { Course } from '../types'

const extractList = <T>(result: any): T[] => result?.data?.list || result?.data || []

// 课程数据映射函数
const mapCourse = (c: any): Course => ({
  _id: c._id,
  id: c._id,
  title: c.title || '未命名课程',
  description: c.description || '',
  thumbnail: c.thumbnail || '',
  coverImage: c.coverImage,
  level: c.level || 'beginner',
  duration: c.duration || 0,
  lessons: c.lessons || 0,
  instructor: c.instructor || '未知讲师',
  teacherName: c.teacherName,
  category: c.category,
  categoryId: c.categoryId,
  rating: c.rating || 0,
  students: c.students || 0,
  studentsCount: c.studentsCount || c.enrolledCount || 0,
  tags: c.tags || [],
  price: c.price || 0,
  originalPrice: c.originalPrice || 0,
  isPurchased: false,
})

// 课程数据服务（云开发版本）
export const CloudCourseService = {
  // 获取所有课程
  async getAll(): Promise<Course[]> {
    try {
      const result = await adminService.list('courses', {}, { limit: 200 })
      return extractList(result).map(mapCourse)
    } catch (error) {
      console.error('获取课程列表失败:', error)
      return []
    }
  },

  // 根据ID获取课程
  async getById(id: string): Promise<Course | null> {
    try {
      if (!id) {
        console.warn('课程ID为空')
        return null
      }

      console.log('CloudCourseService.getById 查询ID:', id)
      const res = await adminService.get('courses', id)
      const c = res?.data
      if (!c || Object.keys(c).length === 0) {
        console.warn('未找到课程:', id)
        return null
      }

      console.log('找到的课程:', c)
      return mapCourse(c)
    } catch (error) {
      console.error('获取课程详情失败:', error)
      return null
    }
  },

  // 根据分类ID获取课程列表
  async getByCategory(categoryId: string): Promise<Course[]> {
    try {
      if (!categoryId) {
        console.log('[CloudCourseService.getByCategory] categoryId 为空')
        return []
      }

      console.log('[CloudCourseService.getByCategory] 查询分类ID:', categoryId)
      const result = await adminService.list('courses', {
        status: 'published',
        categoryId,
      }, { limit: 100 })
      
      console.log('[CloudCourseService.getByCategory] 查询结果数量:', result?.data?.list?.length)
      return extractList(result).map(mapCourse)
    } catch (error) {
      console.error('获取分类课程失败:', error)
      return []
    }
  },

  // 搜索课程 - 使用 MongoDB 风格 $regex 操作符
  async search(keyword: string): Promise<Course[]> {
    try {
      const result = await adminService.listWithOps('courses', {
        title: { '$regex': keyword },
      }, { limit: 50 })
      return extractList(result).map(mapCourse)
    } catch (error) {
      console.error('搜索课程失败:', error)
      return []
    }
  },

  // 按级别筛选
  async filterByLevel(level: string): Promise<Course[]> {
    try {
      if (level === 'all') {
        return this.getAll()
      }
      const result = await adminService.list('courses', { level }, { limit: 100 })
      return extractList(result).map(mapCourse)
    } catch (error) {
      console.error('筛选课程失败:', error)
      return []
    }
  },
}

export default CloudCourseService
