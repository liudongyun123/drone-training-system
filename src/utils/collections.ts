/**
 * 数据库集合常量
 * 
 * 统一管理集合名称，避免硬编码
 */

// 新集合名称（重构后）
export const COLLECTIONS = {
  // 用户模块
  USERS: 'users',
  USER_ROLES: 'user_roles',

  // 课程模块
  COURSES: 'courses',
  LESSONS: 'lessons',
  CATEGORIES: 'categories',
  PROGRESS: 'progress',

  // 培训模块
  CLASSES: 'classes',
  SCHEDULES: 'schedules',
  REGISTRATIONS: 'registrations',
  ATTENDANCE: 'attendance',

  // 考试模块
  EXAMS: 'exams',
  EXAM_ATTEMPTS: 'exam_attempts',
  QUESTION_BANKS: 'question_banks',
  QUESTIONS: 'questions',
  PRACTICE_RECORDS: 'practice_records',

  // 商城模块
  PRODUCTS: 'products',
  ORDERS: 'orders',

  // 系统模块
  NOTICES: 'notices',
  MESSAGES: 'messages',
  CERTIFICATES: 'certificates'
} as const

// 旧集合名称（兼容用，逐步废弃）
export const LEGACY_COLLECTIONS = {
  MEMBERS: 'members',
  STUDENTS: 'students',
  USER_PROFILES: 'user_profiles',
  ADMINS: 'admins',
  COURSE_CATEGORIES: 'course_categories',
  LEARNING_PROGRESS: 'learning_progress',
  COURSE_PERMISSIONS: 'course_permissions',
  COURSE_SCHEDULES: 'course_schedules',
  EXAM_ATTEMPTS_OLD: 'examAttempts',
  QUESTION_BANKS_OLD: 'questionBanks',
  PRACTICE_RECORDS_OLD: 'practiceRecords',
  ATTENDANCE_RECORDS: 'attendance_records',
  ENROLLMENTS: 'enrollments'
} as const

/**
 * 集合名称映射（旧 → 新）
 * 用于数据迁移期间的兼容
 */
export const COLLECTION_MAP: Record<string, string> = {
  // 用户
  [LEGACY_COLLECTIONS.MEMBERS]: COLLECTIONS.USERS,
  [LEGACY_COLLECTIONS.STUDENTS]: COLLECTIONS.USERS,
  [LEGACY_COLLECTIONS.USER_PROFILES]: COLLECTIONS.USERS,
  [LEGACY_COLLECTIONS.ADMINS]: COLLECTIONS.USER_ROLES,

  // 课程
  [LEGACY_COLLECTIONS.COURSE_CATEGORIES]: COLLECTIONS.CATEGORIES,
  [LEGACY_COLLECTIONS.LEARNING_PROGRESS]: COLLECTIONS.PROGRESS,
  [LEGACY_COLLECTIONS.COURSE_PERMISSIONS]: COLLECTIONS.PROGRESS,

  // 培训
  [LEGACY_COLLECTIONS.COURSE_SCHEDULES]: COLLECTIONS.SCHEDULES,
  [LEGACY_COLLECTIONS.ATTENDANCE_RECORDS]: COLLECTIONS.ATTENDANCE,
  [LEGACY_COLLECTIONS.ENROLLMENTS]: COLLECTIONS.REGISTRATIONS,

  // 考试
  [LEGACY_COLLECTIONS.EXAM_ATTEMPTS_OLD]: COLLECTIONS.EXAM_ATTEMPTS,
  [LEGACY_COLLECTIONS.QUESTION_BANKS_OLD]: COLLECTIONS.QUESTION_BANKS,
  [LEGACY_COLLECTIONS.PRACTICE_RECORDS_OLD]: COLLECTIONS.PRACTICE_RECORDS
}

/**
 * 获取规范化后的集合名称
 * 如果是旧名称，返回新名称；否则返回原名
 */
export function normalizeCollection(name: string): string {
  return COLLECTION_MAP[name] || name
}

/**
 * 订单类型
 */
export type OrderType = 'course' | 'class' | 'product'

/**
 * 订单状态
 */
export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'

/**
 * 用户角色
 */
export type UserRole = 'student' | 'teacher' | 'admin' | 'super_admin'

/**
 * 用户状态
 */
export type UserStatus = 'active' | 'inactive' | 'banned'

/**
 * 课程状态
 */
export type CourseStatus = 'draft' | 'published' | 'archived'

/**
 * 班级状态
 */
export type ClassStatus = 'planning' | 'enrolling' | 'full' | 'in_progress' | 'completed' | 'cancelled'

/**
 * 报名状态
 */
export type RegistrationStatus = 'pending' | 'confirmed' | 'learning' | 'completed' | 'dropped'

/**
 * 支付方式
 */
export type PaymentMethod = 'wechat' | 'alipay' | 'balance' | 'offline' | 'cash'

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]
