/**
 * 数据库类型定义 v3.0
 * 
 * 兼容策略：新字段必填，旧字段用 @deprecated 标记
 */

import { UserRole, UserStatus, OrderType, OrderStatus, CourseStatus, ClassStatus, RegistrationStatus, PaymentMethod } from '@/utils/collections'

// ========================================
// 用户模块
// ========================================

export interface User {
  _id: string

  // 基本信息
  phone: string
  name: string
  avatar?: string
  gender?: 'male' | 'female' | 'unknown'
  idCard?: string

  // 微信
  openid?: string
  unionid?: string

  // 角色
  role: UserRole
  status: UserStatus

  // 统计
  stats: {
    courseCount: number
    classCount: number
    studyHours: number
    examCount: number
  }

  // 时间
  createdAt: Date | string
  updatedAt: Date | string
  lastLoginAt?: Date | string

  // === 旧字段兼容 ===
  /** @deprecated 用 role 代替 */
  level?: string
  /** @deprecated 用 name 代替 */
  username?: string
  /** @deprecated 用 avatar 代替 */
  avatarUrl?: string
  /** @deprecated 用 openid 代替 */
  _openid?: string
}

// ========================================
// 课程模块
// ========================================

export interface Course {
  _id: string

  title: string
  description: string
  cover: string
  videoUrl?: string

  price: number
  originalPrice?: number
  isFree: boolean

  categoryId: string
  tags: string[]
  level: 'beginner' | 'intermediate' | 'advanced'
  teacherId: string

  type: 'online' | 'offline' | 'hybrid'
  duration: number
  lessonCount: number

  stats: {
    studentCount: number
    rating: number
    reviewCount: number
  }

  status: CourseStatus
  publishedAt?: Date | string
  sortOrder?: number

  createdAt: Date | string
  updatedAt: Date | string

  // === 旧字段兼容 ===
  /** @deprecated 用 title 代替 */
  name?: string
  /** @deprecated 用 cover 代替 */
  coverImage?: string
}

export interface Lesson {
  _id: string
  courseId: string
  title: string
  description?: string
  videoUrl?: string
  duration: number
  order: number
  isFree: boolean
  status: 'published' | 'draft'
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Category {
  _id: string
  name: string
  icon?: string
  cover?: string
  sortOrder: number
  status: 'active' | 'inactive'
  parentId?: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Progress {
  _id: string
  userId: string
  courseId: string

  completedLessons: string[]
  currentLessonId?: string
  percentage: number

  totalDuration: number
  lastLearnAt?: Date | string

  accessFrom?: Date | string
  accessUntil?: Date | string

  createdAt: Date | string
  updatedAt: Date | string
}

// ========================================
// 培训模块
// ========================================

export interface Class {
  _id: string
  courseId: string
  className: string
  cover?: string

  maxStudents: number
  enrolledCount: number

  startDate: Date | string
  endDate: Date | string
  location?: string
  teacherId?: string

  hasVideoGrant: boolean
  videoGrantCourseId?: string
  videoGrantCourseName?: string

  status: ClassStatus
  description?: string

  createdAt: Date | string
  updatedAt: Date | string

  // === 旧字段兼容 ===
  name?: string
}

export interface Schedule {
  _id: string
  classId: string
  courseId: string

  date: Date | string
  startTime: string
  endTime: string

  topic?: string
  teacherId?: string
  location?: string
  content?: string

  status: 'scheduled' | 'completed' | 'cancelled' | 'adjusted'

  originalDate?: Date | string
  adjustReason?: string

  createdAt: Date | string
  updatedAt: Date | string
}

export interface Registration {
  _id: string

  studentId: string
  studentName: string
  phone: string

  source: 'offline' | 'online'

  courseId: string
  courseName: string
  classId?: string
  className?: string

  access: {
    videoEnabled: boolean
    videoValidFrom?: Date | string
    videoValidUntil?: Date | string
  }

  payment: {
    amount: number
    status: 'pending' | 'paid' | 'refunded'
    method: PaymentMethod
    paidAt?: Date | string
  }

  status: RegistrationStatus

  review?: {
    reviewerId: string
    reviewedAt: Date | string
    comment: string
  }

  createdAt: Date | string
  updatedAt: Date | string
}

export interface Attendance {
  _id: string
  scheduleId: string
  classId: string
  studentId: string
  studentName: string
  status: 'present' | 'absent' | 'late' | 'leave'
  remark?: string
  recordedBy?: string
  createdAt: Date | string
}

// ========================================
// 考试模块
// ========================================

export interface Exam {
  _id: string
  title: string
  description?: string
  courseId?: string
  questionBankId?: string

  duration: number
  totalScore: number
  passScore: number

  questionCount: number
  questionIds: string[]

  status: 'draft' | 'published' | 'archived'
  createdAt: Date | string
  updatedAt: Date | string
}

export interface ExamAttempt {
  _id: string
  examId: string
  userId: string

  score: number
  totalScore: number
  isPassed: boolean

  answers: Record<string, string | string[]>

  duration: number
  status: 'in_progress' | 'completed' | 'timeout'

  startedAt: Date | string
  completedAt?: Date | string
}

export interface QuestionBank {
  _id: string
  name: string
  description?: string
  courseId?: string
  questionCount: number

  types: {
    single: number
    multiple: number
    judge: number
  }

  status: 'active' | 'inactive'
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Question {
  _id: string
  bankId: string
  type: 'single' | 'multiple' | 'judge'
  content: string
  options?: string[]
  answer: string | string[]
  explanation?: string
  difficulty: 1 | 2 | 3 | 4 | 5
  tags: string[]
  sortOrder: number
  status: 'active' | 'inactive'
  createdAt: Date | string
  updatedAt: Date | string
}

export interface PracticeRecord {
  _id: string
  userId: string
  bankId: string
  questionId: string
  userAnswer: string | string[]
  isCorrect: boolean
  createdAt: Date | string
}

// ========================================
// 商城模块
// ========================================

export interface Product {
  _id: string

  title: string
  description: string
  cover: string
  images: string[]

  price: number
  originalPrice?: number
  stock: number
  sales: number

  category: string
  specs: Array<{ name: string; value: string }>
  compatibleModels?: string[]

  status: 'active' | 'inactive'
  sortOrder?: number

  createdAt: Date | string
  updatedAt: Date | string
}

export interface OrderItem {
  id: string
  title: string
  cover?: string
  price: number
  quantity: number
}

export interface Order {
  _id: string
  orderNo: string

  userId: string

  type: OrderType

  items?: OrderItem[]

  amount: number
  discountAmount?: number
  finalAmount: number

  status: OrderStatus
  paymentMethod?: PaymentMethod
  paidAt?: Date | string

  couponId?: string
  registrationId?: string

  remark?: string

  createdAt: Date | string
  updatedAt: Date | string

  // === 旧字段兼容 ===
  /** @deprecated 用 type + items 代替 */
  courseId?: string
  /** @deprecated 用 items[].title 代替 */
  courseName?: string
  /** @deprecated 用 items[].cover 代替 */
  courseCover?: string
  /** @deprecated 用 finalAmount 代替 */
  totalAmount?: number
  /** @deprecated 用 userId 代替 */
  _openid?: string
}

// ========================================
// 系统模块
// ========================================

export interface Notice {
  _id: string
  title: string
  content: string
  type: 'system' | 'course' | 'activity' | 'urgent'
  isPinned: boolean
  status: 'published' | 'draft' | 'archived'
  viewCount: number
  publishedAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Message {
  _id: string
  userId: string
  type: 'system' | 'course' | 'exam' | 'order' | 'class'
  title: string
  content: string
  relatedId?: string
  relatedType?: string
  isRead: boolean
  readAt?: Date | string
  createdAt: Date | string
}

export interface Certificate {
  _id: string
  userId: string
  courseId?: string
  classId?: string
  type: 'course' | 'exam' | 'training'
  title: string
  certificateNo: string
  issueDate: Date | string
  expireDate?: Date | string
  status: 'active' | 'expired' | 'revoked'
  createdAt: Date | string
}
