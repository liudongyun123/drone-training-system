// ============================================================================
// 课程 API - 共用层（统一通过 adminService HTTP）
// Web端、移动端、后台都调用这一套 API
// ============================================================================

import { adminService } from '@/services/adminService'
import type { Course, CourseFilters, CourseListResponse, CourseDetail, Lesson } from '@/shared/types/course'

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractSingle(result: any): any | null {
  if (!result) return null;
  if (result.data && !Array.isArray(result.data) && typeof result.data === 'object') return result.data;
  if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
  return result.data || null;
}

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

    // 构建查询条件（MongoDB 风格操作符）
    const where: Record<string, any> = {}
    
    if (status) where.status = status
    if (category) where.category = category
    if (level) where.level = level
    
    // 价格范围筛选
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, any> = {}
      if (minPrice !== undefined) priceFilter['$gte'] = minPrice
      if (maxPrice !== undefined) priceFilter['$lte'] = maxPrice
      where.price = priceFilter
    }
    
    // 关键词搜索
    if (keyword) {
      where.title = { '$regex': keyword }
    }

    // 确定排序方式
    const orderMap: Record<string, string> = {
      salesCount: 'salesCount',
      rating: 'rating',
      price: 'price',
    }
    const orderBy = orderMap[sortBy] || 'createdAt'
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc'

    // 使用操作符查询（支持 $regex, $gte, $lte）
    const hasOperators = keyword !== undefined || minPrice !== undefined || maxPrice !== undefined
    const listResult = hasOperators
      ? await adminService.listWithOps('courses', where, { orderBy, order: orderDirection, page, pageSize })
      : await adminService.list('courses', where, { orderBy, order: orderDirection, page, pageSize })
    
    const courses = extractList(listResult) as Course[]
    const total = listResult?.data?.total || courses.length

    return {
      courses,
      total,
      page,
      pageSize,
      hasMore: ((page - 1) * pageSize + courses.length) < total
    }
  },

  /**
   * 获取课程详情
   */
  async getDetail(courseId: string): Promise<CourseDetail | null> {
    // 获取课程信息
    const courseResult = await adminService.get('courses', courseId)
    const course = extractSingle(courseResult) as Course
    if (!course) return null
    
    // 获取章节列表
    const lessonsResult = await adminService.list('lessons', { courseId }, { orderBy: 'order', order: 'asc', limit: 100 })
    const lessons = extractList(lessonsResult) as Lesson[]
    
    return {
      ...course,
      lessons
    }
  },

  /**
   * 获取热门课程
   */
  async getHotCourses(limit: number = 6): Promise<Course[]> {
    const result = await adminService.list('courses', { status: 'published' }, { orderBy: 'salesCount', order: 'desc', limit })
    return extractList(result) as Course[]
  },

  /**
   * 获取推荐课程（根据分类）
   */
  async getRecommendedCourses(category: string, limit: number = 4): Promise<Course[]> {
    const result = await adminService.list('courses', { status: 'published', category }, { orderBy: 'rating', order: 'desc', limit })
    return extractList(result) as Course[]
  },

  /**
   * 获取课程分类列表
   */
  async getCategories(): Promise<string[]> {
    const result = await adminService.list('courses', { status: 'published' }, { limit: 500 })
    const courses = extractList(result) as any[]
    const categories = [...new Set(courses.map(item => item.category))]
    return (categories as any[]).filter(Boolean)
  }
}
