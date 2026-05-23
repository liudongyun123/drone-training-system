/**
 * 服务层类型定义
 * 统一项目中的数据类型，避免 any[] 滥用
 */

// ============ 基础类型 ============

/** 服务操作结果 */
export interface ServiceResult<T = unknown> {
  code: number
  message?: string
  data?: T
  success?: boolean
}

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  offset?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

/** 查询参数 */
export interface QueryParams {
  keyword?: string
  status?: string
  [key: string]: unknown
}

// ============ 用户相关 ============

export interface User {
  id: string
  username?: string
  name?: string
  email?: string
  phone?: string
  avatar?: string
  role?: string
  status?: 'active' | 'inactive' | 'banned'
  createdAt?: string
  updatedAt?: string
  lastLogin?: string
}

// ============ 课程相关 ============

export interface Course {
  _id?: string
  id?: string
  title: string
  description?: string
  coverImage?: string
  price?: number
  originalPrice?: number
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  duration?: number
  teacherId?: string
  teacherName?: string
  studentCount?: number
  rating?: number
  status?: 'draft' | 'published' | 'archived'
  chapters?: Chapter[]
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface Chapter {
  id: string
  title: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  videoUrl?: string
  duration?: number
  type: 'video' | 'text' | 'quiz'
}

// ============ 订单相关 ============
// 统一从 database.ts 导入，避免类型冲突
// import { Order, OrderItem } from './database'

// 服务层兼容类型 - 使用 database.ts 的类型
// 保留此处的简化版本用于不需要完整字段的场景
export interface ServiceOrder {
  _id?: string
  id?: string
  orderNo?: string
  userId?: string
  userName?: string
  items?: Array<{
    courseId: string
    courseTitle: string
    teacherId?: string
    teacherName?: string
    price: number
    quantity?: number
  }>
  totalAmount: number
  finalAmount: number
  discountAmount?: number
  couponId?: string
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
  paymentMethod?: string
  paymentTime?: string
  createdAt?: string
  updatedAt?: string
}

// ============ 报名相关 ============

export interface Enrollment {
  _id?: string
  id?: string
  enrollmentId?: string
  userId: string
  userName?: string
  courseId: string
  courseTitle?: string
  status: 'active' | 'cancelled' | 'completed'
  paymentStatus: 'paid' | 'unpaid' | 'refunded'
  enrollmentTime?: string
  createdAt?: string
  updatedAt?: string
}

// ============ 出勤相关 ============

export interface AttendanceRecord {
  _id?: string
  id?: string
  scheduleId: string
  userId: string
  userName?: string
  courseId: string
  courseTitle?: string
  teacherId?: string
  enrollmentId?: string
  attendanceStatus: 'present' | 'absent' | 'late' | 'leave'
  checkInTime?: string
  checkOutTime?: string
  duration?: number
  remark?: string
  createdAt?: string
  updatedAt?: string
}

// ============ 排课相关 ============

export interface Schedule {
  _id?: string
  id?: string
  scheduleId?: string
  courseId: string
  courseTitle?: string
  teacherId: string
  teacherName?: string
  date: string
  startTime: string
  endTime: string
  location?: string
  maxStudents?: number
  enrolledCount?: number
  attendanceCount?: number
  actualCount?: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  remark?: string
  createdAt?: string
  updatedAt?: string
}

// ============ 教师相关 ============

export interface Teacher {
  _id?: string
  id?: string
  userId?: string
  name: string
  phone?: string
  email?: string
  gender?: 'male' | 'female' | 'unknown'
  avatar?: string
  bio?: string
  introduction?: string
  specialties?: string[]
  specialty?: string[]
  certifications?: string[]
  certification?: string[]
  rating?: number
  totalHours?: number
  totalTeachingHours?: number
  teachingExperience?: number
  experience?: number
  status?: 'active' | 'inactive' | 'suspended'
  createdAt?: string
  updatedAt?: string
}

// ============ 轮播图相关 ============

export interface Banner {
  _id?: string
  id?: string
  title: string
  image: string
  link?: string
  order?: number
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

// ============ 页面配置相关 ============

export interface PageConfig {
  _id?: string
  id?: string
  key: string
  name: string
  config: Record<string, unknown>
  status: 'enabled' | 'disabled'
  createdAt?: string
  updatedAt?: string
}

// ============ 购物车相关 ============

export interface CartItem {
  _id?: string
  id?: string
  userId: string
  courseId: string
  courseTitle?: string
  courseCover?: string
  price: number
  quantity?: number
  addedAt?: string
  createdAt?: string
  updatedAt?: string
}

// ============ 学习进度相关 ============

export interface LearningProgress {
  _id?: string
  id?: string
  userId: string
  courseId: string
  chapterId?: string
  lessonId?: string
  progress: number
  lastPosition?: number
  completedAt?: string
  lastAccessAt?: string
  createdAt?: string
  updatedAt?: string
}

// ============ 题库相关 ============

export interface Question {
  _id?: string
  id?: string
  questionBankId?: string
  questionBankName?: string
  type: 'single' | 'multiple' | 'truefalse' | 'fill' | 'essay'
  content: string
  options?: QuestionOption[]
  answer: string | string[]
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  score?: number
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface QuestionOption {
  key: string
  content: string
  isCorrect?: boolean
}

// ============ 题库 ============

export interface QuestionBank {
  _id?: string
  id?: string
  name: string
  description?: string
  courseId?: string
  courseName?: string
  category?: string
  questionCount?: number
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

// ============ 考试相关 ============

export interface Exam {
  _id?: string
  id?: string
  title: string
  description?: string
  courseId?: string
  courseName?: string
  duration: number
  totalScore: number
  passingScore: number
  questionCount?: number
  status: 'draft' | 'published' | 'archived'
  startTime?: string
  endTime?: string
  attemptCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface ExamAttempt {
  _id?: string
  examId: string
  userId: string
  answers: Record<string, string | string[]>
  score?: number
  status: 'in_progress' | 'completed' | ' graded'
  startTime: string
  submitTime?: string
  gradedAt?: string
}

// ============ 优惠券相关 ============

export interface Coupon {
  _id?: string
  id?: string
  code: string
  name: string
  type: 'fixed' | 'percentage'
  value: number
  minAmount?: number
  maxDiscount?: number
  totalCount: number
  usedCount?: number
  validFrom: string
  validUntil: string
  status: 'active' | 'inactive' | 'expired'
  applicableCourses?: string[]
  createdAt?: string
  updatedAt?: string
}

// ============ 统计相关 ============

export interface DashboardStats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  totalCourses: number
  activeEnrollments: number
  recentOrders: Order[]
  popularCourses: Course[]
}

export interface RevenueStats {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  dailyStats: DailyStat[]
}

export interface DailyStat {
  date: string
  revenue: number
  orders: number
}

// ============ 服务错误类型 ============

export class ServiceError extends Error {
  code: number
  details?: unknown

  constructor(message: string, code: number = -1, details?: unknown) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.details = details
  }
}
