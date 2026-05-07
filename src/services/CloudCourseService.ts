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
 * 此服务保留用于向后兼容，将在后续版本中删除
 */

import { ensureInit } from '@/utils/cloudbase'
import type { Course } from '../types'

// 课程数据服务（云开发版本）
export const CloudCourseService = {
  // 获取所有课程
  async getAll(): Promise<Course[]> {
    try {
      await ensureInit()
      const { getCloudbaseApp } = await import('@/utils/cloudbase')
      const app = getCloudbaseApp()
      const data = await app.database().collection('courses').get()
      return data.data.map((c: any) => ({
        _id: c._id,
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail,
        coverImage: c.coverImage,
        level: c.level,
        duration: c.duration,
        lessons: c.lessons,
        instructor: c.instructor,
        rating: c.rating,
        students: c.students,
        tags: c.tags || [],
        price: c.price,
        originalPrice: c.originalPrice,
        isPurchased: false,
      }))
    } catch (error) {
      console.error('获取课程列表失败:', error)
      return []
    }
  },

  // 根据ID获取课程 - 修复：直接查询指定ID，不获取全量数据
  async getById(id: string): Promise<Course | null> {
    try {
      if (!id) {
        console.warn('课程ID为空')
        return null
      }

      console.log('CloudCourseService.getById 查询ID:', id)
      await ensureInit()
      const { getCloudbaseApp } = await import('@/utils/cloudbase')
      const app = getCloudbaseApp()
      const result = await app.database().collection('courses').doc(id).get()
      console.log('查询结果:', result)

      if (!result.data || result.data.length === 0) {
        console.warn('未找到课程:', id)
        return null
      }

      const c = result.data[0]
      console.log('找到的课程:', c)

      return {
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
        rating: c.rating || 0,
        students: c.students || 0,
        tags: c.tags || [],
        price: c.price || 0,
        originalPrice: c.originalPrice || 0,
        isPurchased: false,
      }
    } catch (error) {
      console.error('获取课程详情失败:', error)
      return null
    }
  },

  // 根据分类ID获取课程列表（推荐方式：一次查询，更快）
  async getByCategory(categoryId: string): Promise<Course[]> {
    try {
      if (!categoryId) {
        console.log('[CloudCourseService.getByCategory] categoryId 为空')
        return []
      }

      console.log('[CloudCourseService.getByCategory] 查询分类ID:', categoryId)
      await ensureInit()
      const { getCloudbaseApp } = await import('@/utils/cloudbase')
      const app = getCloudbaseApp()
      const db = app.database()
      
      // 直接用 categoryId 查询（课程表现在会同时存储 categoryId）
      const result = await db.collection('courses')
        .where({ 
          status: 'published', 
          categoryId: categoryId 
        })
        .limit(100)
        .get()
      
      console.log('[CloudCourseService.getByCategory] 查询结果数量:', result.data.length)
      
      return result.data.map((c: any) => ({
        _id: c._id,
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail,
        coverImage: c.coverImage,
        level: c.level,
        duration: c.duration,
        lessons: c.lessons,
        instructor: c.instructor,
        teacherName: c.teacherName,
        category: c.category,
        categoryId: c.categoryId,
        rating: c.rating || 0,
        students: c.students || 0,
        studentsCount: c.studentsCount || c.enrolledCount || 0,
        tags: c.tags || [],
        price: c.price,
        originalPrice: c.originalPrice,
        isPurchased: false,
      }))
    } catch (error) {
      console.error('获取分类课程失败:', error)
      return []
    }
  },

  // 搜索课程 - 优化：服务端筛选
  async search(keyword: string): Promise<Course[]> {
    try {
      await ensureInit()
      const { getCloudbaseApp } = await import('@/utils/cloudbase')
      const app = getCloudbaseApp()
      const db = app.database()
      const { data } = await db.collection('courses')
        .where({
          title: db.RegExp({
            regexp: keyword,
            options: 'i',
          }),
        })
        .get()
      return data.map((c: any) => ({
        _id: c._id,
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail,
        coverImage: c.coverImage,
        level: c.level,
        price: c.price,
        rating: c.rating,
        students: c.students,
        tags: c.tags || [],
        originalPrice: c.originalPrice,
        isPurchased: false,
      }))
    } catch (error) {
      console.error('搜索课程失败:', error)
      return []
    }
  },

  // 按级别筛选 - 优化：服务端筛选
  async filterByLevel(level: string): Promise<Course[]> {
    try {
      if (level === 'all') {
        return this.getAll()
      }
      await ensureInit()
      const { getCloudbaseApp } = await import('@/utils/cloudbase')
      const app = getCloudbaseApp()
      const db = app.database()
      const { data } = await db.collection('courses')
        .where({ level })
        .get()
      return data.map((c: any) => ({
        _id: c._id,
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail,
        coverImage: c.coverImage,
        level: c.level,
        price: c.price,
        rating: c.rating,
        students: c.students,
        tags: c.tags || [],
        originalPrice: c.originalPrice,
        isPurchased: false,
      }))
    } catch (error) {
      console.error('筛选课程失败:', error)
      return []
    }
  },
}

export default CloudCourseService
