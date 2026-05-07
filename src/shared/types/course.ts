// ============================================================================
// 课程类型定义 - 共用层
// 所有端（Web、移动端、后台）都用同一个类型定义
// ============================================================================

/**
 * 课程基础信息
 */
export interface Course {
  _id: string
  title: string
  description: string
  coverImage: string
  category: string
  price: number
  originalPrice?: number
  
  // 教师信息
  teacherId: string
  teacherName?: string
  instructor?: string  // 兼容字段
  
  // 课程属性
  maxStudents?: number
  duration: number     // 课程时长（小时）
  lessons: number      // 课时数
  level: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  
  // 状态
  status: 'draft' | 'published' | 'archived'
  
  // 统计数据
  salesCount: number
  rating: number
  reviewCount: number
  
  // 时间
  createdAt: string
  updatedAt: string
}

/**
 * 课程章节
 */
export interface Lesson {
  _id: string
  courseId: string
  title: string
  description?: string
  videoUrl?: string
  videoDuration?: number  // 视频时长（秒）
  order: number
  isFree: boolean
  createdAt: string
}

/**
 * 课程筛选条件
 */
export interface CourseFilters {
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  status?: 'draft' | 'published' | 'archived'
  keyword?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'salesCount' | 'rating' | 'createdAt' | 'price'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/**
 * 课程列表响应
 */
export interface CourseListResponse {
  courses: Course[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * 课程详情（含章节）
 */
// @ts-ignore
export interface CourseDetail extends Course {
  lessons: Lesson[]
  teacherInfo?: {
    _id: string
    name: string
    avatar?: string
    intro?: string
  }
}

/**
 * 课程学习进度
 */
export interface CourseProgress {
  courseId: string
  totalLessons: number
  completedLessons: number
  progress: number  // 0-100
  lastStudyAt?: string
}

// ========== 工具函数 ==========

/**
 * 获取课程等级显示文本
 */
export function getLevelText(level: Course['level']): string {
  const map = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级'
  }
  return map[level] || level
}

/**
 * 计算课程价格（考虑折扣）
 */
export function getCoursePrice(course: Course): {
  current: number
  original: number
  discount: number
  hasDiscount: boolean
} {
  const current = course.price
  const original = course.originalPrice || course.price
  const hasDiscount = original > current
  const discount = hasDiscount ? Math.round((1 - current / original) * 100) : 0
  
  return { current, original, discount, hasDiscount }
}

/**
 * 判断课程是否可购买
 */
export function canPurchase(course: Course): boolean {
  return course.status === 'published' && course.price > 0
}