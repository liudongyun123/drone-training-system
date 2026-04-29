// ============================================================================
// 通用类型定义 - 共用层
// CloudBase 响应、分页、筛选等基础类型
// ============================================================================

/**
 * CloudBase 数据库查询结果
 */
export interface CloudBaseQueryResult<T> {
  data: T[]
  requestId?: string
  total?: number
  limit?: number
  skip?: number
}

/**
 * CloudBase 数据库命令操作符
 * 用于构建 where 条件的类型
 */
export interface CloudBaseCommandOperators {
  eq?: unknown
  neq?: unknown
  gt?: unknown
  gte?: unknown
  lt?: unknown
  lte?: unknown
  in?: unknown[]
  nin?: unknown[]
  and?: CloudBaseCommandOperators[]
  or?: CloudBaseCommandOperators[]
  nor?: CloudBaseCommandOperators[]
  not?: CloudBaseCommandOperators
  exists?: boolean
  mod?: [number, number]
  regex?: string
  options?: string
  elemMatch?: CloudBaseCommandOperators
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * API 响应
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: number
}

/**
 * 排序参数
 */
export interface SortParams {
  field: string
  order: 'asc' | 'desc'
}

/**
 * 通用筛选参数
 */
export interface FilterParams {
  keyword?: string
  status?: string
  startDate?: string
  endDate?: string
}

/**
 * 学习进度
 */
export interface LearningProgress {
  _id?: string
  userId: string
  courseId: string
  lessonId: string
  progress: number  // 0-100
  duration: number  // 学习时长(秒)
  lastPosition?: number  // 视频播放位置
  completed: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 评论
 */
export interface Comment {
  _id?: string
  userId: string
  courseId: string
  userName: string
  userAvatar?: string
  content: string
  parentId?: string
  likes: number
  createdAt: string
}

/**
 * 分类
 */
export interface Category {
  _id?: string
  name: string
  icon?: string
  sort: number
  count?: number
  createdAt?: string
}

/**
 * 公告
 */
export interface Notice {
  _id?: string
  title: string
  content: string
  type: 'system' | 'course' | 'promotion'
  priority: number
  published: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 营销活动
 */
export interface MarketingActivity {
  _id?: string
  name: string
  type: 'coupon' | 'group_buy' | 'flash_sale' | 'bundle'
  startTime: string
  endTime: string
  status: 'active' | 'inactive' | 'expired'
  rules: Record<string, unknown>
  createdAt: string
}

/**
 * 考试
 */
export interface Exam {
  _id?: string
  title: string
  description?: string
  courseId?: string
  questionCount: number
  passScore: number
  duration: number  // 考试时长(分钟)
  totalScore: number
  type: 'mock' | 'practice'  // 模拟考试/练习
  status: 'published' | 'draft'
  createdAt: string
}

/**
 * 考试题目
 */
export interface Question {
  _id?: string
  examId: string
  type: 'single' | 'multiple' | 'judge'
  content: string
  options?: string[]
  answer: string | string[]
  explanation?: string
  score: number
  order: number
}

/**
 * 考试记录
 */
export interface ExamRecord {
  _id?: string
  userId: string
  examId: string
  score: number
  totalScore: number
  duration: number  // 实际用时(秒)
  answers: Record<string, string | string[]>
  passed: boolean
  createdAt: string
}

/**
 * 证书记录（外部获得的证书）
 */
export interface CertificateRecord {
  _id?: string
  userId: string
  type: 'external' | 'completion'  // 外部证书 / 结业证明
  name: string
  issuer?: string  // 颁发机构
  certNo?: string  // 证书编号
  issueDate?: string
  expireDate?: string
  image?: string
  verified: boolean
  createdAt: string
}

/**
 * 课程权限记录
 */
export interface CoursePermission {
  _id?: string
  userId: string
  courseId: string
  source: 'purchase' | 'class_enrollment' | 'admin_grant'
  sourceId?: string  // 订单ID或报名ID
  createdAt: string
  expiresAt?: string  // 过期时间（可选）
}

/**
 * 通用 ID 类型
 */
export interface WithId {
  _id: string
}

/**
 * 通用时间戳类型
 */
export interface WithTimestamps {
  createdAt: string
  updatedAt: string
}

/**
 * 基础实体类型
 */
export interface BaseEntity extends WithId, WithTimestamps {}