/**
 * 报名与班级管理类型定义
 * 
 * 支持两条并行业务流：
 * 1. 线下培训报名（班级、排课、调课）
 * 2. 线上课程购买（视频、考试）
 * 
 * 核心关联：报名记录通过 access.videoEnabled 控制视频观看权限
 */

// ==================== 班级相关 ====================

export type ClassStatus = 'planning' | 'enrolling' | 'full' | 'in_progress' | 'completed' | 'cancelled'
export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled' | 'adjusted'

export interface ClassSchedule {
  date: string           // YYYY-MM-DD
  startTime: string      // HH:mm
  endTime: string
  location: string
  teacherId: string
  teacherName?: string
  content: string
  status: ScheduleStatus
  originalDate?: string  // 调课前的原日期
  adjustReason?: string
}

export interface Class {
  _id: string
  courseId: string
  courseName?: string
  name: string           // 班级名称（如：无人机驾驶第3期）
  
  schedule: ClassSchedule[]
  
  capacity: {
    max: number
    enrolled: number     // 已报名人数
    confirmed: number    // 已确认人数
  }
  
  startDate: string      // 开班日期
  endDate: string        // 结班日期
  enrollmentDeadline: string  // 报名截止
  
  status: ClassStatus
  createdAt: string
  updatedAt: string
}

// ==================== 报名相关 ====================

export type RegistrationSource = 'offline' | 'online'
export type RegistrationStatus = 'pending' | 'confirmed' | 'learning' | 'completed' | 'dropped' | 'refunded'
export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'card' | 'transfer'

export interface RegistrationAccess {
  videoEnabled: boolean      // 是否开通视频观看
  videoValidFrom?: string    // 视频有效期开始
  videoValidUntil?: string   // 视频有效期结束
  offlineMaterials: boolean  // 是否领取线下教材
}

export interface RegistrationPayment {
  amount: number
  originalAmount: number
  discountAmount: number
  status: 'pending' | 'paid' | 'refunded' | 'partial_refunded'
  method?: PaymentMethod
  paidAt?: string
  transactionId?: string
}

export interface RegistrationReview {
  reviewerId: string
  reviewerName?: string
  reviewedAt: string
  comment: string
}

/**
 * 报名记录 - 核心业务流关联表
 * 
 * 关联关系：
 * - studentId -> users (学员)
 * - courseId -> courses (课程)
 * - classId -> classes (线下班级，可选)
 */
export interface Registration {
  _id: string
  
  // 学员信息
  studentId: string
  studentName: string
  phone: string
  idCard?: string
  
  // 报名来源：区分线下/线上
  source: RegistrationSource
  
  // 关联课程
  courseId: string
  courseName: string
  
  // 线下班级信息（source=offline 时有效）
  classId?: string
  className?: string
  
  // 权限配置（关键字段）
  access: RegistrationAccess
  
  // 支付信息
  payment: RegistrationPayment
  
  // 状态
  status: RegistrationStatus
  
  // 审核信息
  review?: RegistrationReview
  
  // 备注
  remarks?: string
  
  createdAt: string
  updatedAt: string
}

// ==================== 学习进度（扩展） ====================

export interface VideoProgress {
  videoId: string
  completed: boolean
  currentTime: number      // 当前观看位置(秒)
  duration: number
  lastWatchedAt: string
  watchCount: number
}

export interface LearningProgress {
  _id: string
  registrationId: string   // 关联报名记录（关键）
  studentId: string
  courseId: string
  
  videoProgress: VideoProgress[]
  overallProgress: number  // 总进度百分比
  completedVideos: number
  totalVideos: number
  
  totalStudyTime: number   // 累计学习时长(分钟)
  lastStudyAt?: string
  
  updatedAt: string
}

// ==================== API 请求/响应 ====================

export interface CreateRegistrationRequest {
  studentId: string
  studentName: string
  phone: string
  idCard?: string
  courseId: string
  courseName?: string  // 课程名称
  classId?: string     // 班级ID（可选，创建时直接分配班级）
  className?: string   // 班级名称
  source?: RegistrationSource
  remarks?: string
  status?: 'pending' | 'confirmed'  // 状态（可选，默认pending）
}

export interface ReviewRegistrationRequest {
  id: string
  status: 'confirmed' | 'dropped'
  reviewerId: string
  comment?: string
}

export interface UpdateAccessRequest {
  id: string
  videoEnabled: boolean
  videoValidFrom?: string
  videoValidUntil?: string
  offlineMaterials?: boolean
}

export interface CheckVideoAccessResponse {
  allowed: boolean
  validUntil?: string
  message?: string
}
