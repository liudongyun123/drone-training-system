// ============================================================================
// 课程 API - 共用层
// Web端、移动端、后台都调用这一套 API
// ============================================================================

import { app } from '@/utils/cloudbase'
import type { Course, CourseFilters, CourseListResponse, CourseDetail, Lesson } from '@/shared/types/course'

const db = app.database()
const _ = db.command

/**
 * 课程 API 服务
 */
export const courseApi = {
  /**
   * 获取课程列表
   */
  async getList(filters: CourseFilters = {}): Promise<CourseListResponse> {
    const {
      category,
      level,
      status = 'published',
      keyword,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      pageSize = 10
    } = filters

    // 构建查询条件
    const where: any = {}
    
    if (status) where.status = status
    if (category) where.category = category
    if (level) where.level = level
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined) where.price = _.gte(minPrice)
      if (maxPrice !== undefined) where.price = maxPrice !== undefined 
        ? (minPrice !== undefined ? _.gte(minPrice).and(_.lte(maxPrice)) : _.lte(maxPrice))
        : where.price
    }
    if (keyword) {
      where.title = db.RegExp({
        regexp: keyword,
        options: 'i'
      })
    }

    // 查询总数
    const countResult = await db.collection('courses').where(where).count()
    const total = countResult.total

    // 查询数据
    const skip = (page - 1) * pageSize
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc'
    
    let query = db.collection('courses').where(where)
    
    // 排序
    if (sortBy === 'salesCount') query = query.orderBy('salesCount', orderDirection)
    else if (sortBy === 'rating') query = query.orderBy('rating', orderDirection)
    else if (sortBy === 'price') query = query.orderBy('price', orderDirection)
    else query = query.orderBy('createdAt', orderDirection)
    
    const result = await query.skip(skip).limit(pageSize).get()
    
    return {
      courses: result.data as Course[],
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total
    }
  },

  /**
   * 获取课程详情
   */
  async getDetail(courseId: string): Promise<CourseDetail | null> {
    // 获取课程信息
    const courseResult = await db.collection('courses').doc(courseId).get()
    if (!courseResult.data) return null
    
    const course = courseResult.data as Course
    
    // 获取章节列表
    const lessonsResult = await db.collection('lessons')
      .where({ courseId })
      .orderBy('order', 'asc')
      .get()
    
    return {
      ...course,
      lessons: lessonsResult.data as Lesson[]
    }
  },

  /**
   * 获取热门课程
   */
  async getHotCourses(limit: number = 6): Promise<Course[]> {
    const result = await db.collection('courses')
      .where({ status: 'published' })
      .orderBy('salesCount', 'desc')
      .limit(limit)
      .get()
    
    return result.data as Course[]
  },

  /**
   * 获取推荐课程（根据分类）
   */
  async getRecommendedCourses(category: string, limit: number = 4): Promise<Course[]> {
    const result = await db.collection('courses')
      .where({ 
        status: 'published',
        category 
      })
      .orderBy('rating', 'desc')
      .limit(limit)
      .get()
    
    return result.data as Course[]
  },

  /**
   * 获取课程分类列表
   */
  async getCategories(): Promise<string[]> {
    const result = await db.collection('courses')
      .where({ status: 'published' })
      .field({ category: true })
      .get()
    
    // 去重
    const categories = [...new Set(result.data.map((item: any) => item.category))]
    return categories.filter(Boolean)
  }
}