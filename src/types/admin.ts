/**
 * 管理后台共享类型定义
 * 
 * 统一 adminService、CloudAdminService 等模块的类型，逐步替代 any 类型。
 */

// ==================== 数据库查询类型 ====================

/** MongoDB 风格查询条件 */
export interface DbQuery {
  [key: string]: unknown
}

/** 查询选项 */
export interface QueryOptions {
  limit?: number
  skip?: number
  offset?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/** 排序配置 */
export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

// ==================== 通用响应类型 ====================

/** 服务层统一响应 */
export interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  total?: number
  message?: string
  error?: string
}

/** 云函数响应 */
export interface CloudFunctionResponse<T = unknown> {
  code: number
  data?: T
  total?: number
  skip?: number
  limit?: number
  success?: boolean
  message?: string
  error?: string
}

/** 列表响应 */
export interface ListData<T = unknown> {
  list: T[]
  total: number
  skip: number
  limit: number
}

// ==================== 业务实体基础类型 ====================

/** 时间戳字段 */
export interface Timestamps {
  createdAt?: string
  updatedAt?: string
}

/** 基础实体（含 _id） */
export interface BaseEntity extends Timestamps {
  _id: string
  id?: string
}

/** 状态枚举 */
export type EntityStatus = 'active' | 'inactive' | 'draft' | 'published' | 'deleted'

/** 分页参数 */
export interface PaginationParams {
  offset?: number
  limit?: number
  search?: string
  page?: number
  pageSize?: number
}

/** 用户角色 */
export type UserRole = 'admin' | 'teacher' | 'student' | 'user'

/** 用户基础信息 */
export interface UserInfo extends BaseEntity {
  username?: string
  email?: string
  phone?: string
  role: UserRole
  status: EntityStatus
  lastLogin?: string
  avatar?: string
}

/** 课程基础信息 */
export interface CourseInfo extends BaseEntity {
  title: string
  description?: string
  cover?: string
  coverImage?: string
  price: number
  originalPrice?: number
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  duration?: number
  lessonCount?: number
  studentCount?: number
  rating?: number
  tags?: string[]
  isFree?: boolean
  status: EntityStatus
  instructor?: string
}

/** 订单基础信息 */
export interface OrderInfo extends BaseEntity {
  orderNo: string
  phone?: string
  userId?: string
  orderType: 'course' | 'class' | 'other'
  status: 'pending' | 'paid' | 'cancelled' | 'completed' | 'refunded'
  totalPrice: number
  finalAmount?: number
  remark?: string
  courseId?: string
  courseName?: string
  items?: OrderItem[]
  paidAt?: string
  paymentMethod?: string
}

/** 订单项 */
export interface OrderItem {
  courseId?: string
  title?: string
  price?: number
  quantity?: number
}

/** 报名信息 */
export interface EnrollmentInfo extends BaseEntity {
  classId: string
  className?: string
  userName: string
  phone: string
  status: 'pending' | 'enrolled' | 'learning' | 'completed' | 'cancelled'
  source: 'online_purchase' | 'online_enroll' | 'offline_enroll' | 'hybrid'
  enrollmentTime?: string
}

/** 考试信息 */
export interface ExamInfo extends BaseEntity {
  title: string
  description?: string
  duration?: number
  totalScore?: number
  passScore?: number
  status: EntityStatus
  questions?: string[]
}

/** 统计数据 */
export interface StatsData {
  totalUsers?: number
  totalCourses?: number
  totalOrders?: number
  totalRevenue?: number
  activeStudents?: number
  completionRate?: number
}
