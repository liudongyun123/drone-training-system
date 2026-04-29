/**
 * 班级管理类型定义
 * 版本: v20260410-refactor
 * 
 * 业务逻辑变更:
 * - 课程(Course)不再直接关联排课
 * - 新增班级(Class)概念，作为线下培训的最小单元
 * - 排课(Schedule)从属于班级
 * - 线下报名关联班级，线上购买关联课程
 */

// ============ 班级状态 ============
export type ClassStatus = 'draft' | 'enrolling' | 'full' | 'in_progress' | 'completed' | 'cancelled'

// ============ 排课状态 ============
export type ScheduleStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled'

// ============ 班级数据模型 ============
export interface Class {
  _id?: string
  id?: string
  
  // 基本信息
  name: string                    // 班级名称，如"无人机驾驶第3期"
  description?: string
  
  // 关联课程
  courseId: string               // 关联的线上课程ID
  courseName?: string            // 课程名称（冗余存储）
  
  // 班级配置
  maxStudents: number            // 最大学员数
  enrolledCount: number          // 已报名数
  
  // 时间
  startDate: string              // 开始日期
  endDate: string                // 结束日期
  startTime?: string             // 默认开始时间
  endTime?: string               // 默认结束时间
  
  // 地点
  location: string               // 上课地点
  
  // 教师
  teacherId: string              // 主讲教师ID
  teacherName?: string           // 教师名称（冗余存储）
  assistantIds?: string[]        // 助教ID列表
  
  // 价格（兼容字段）
  price?: number                 // 报名价格（与 enrollmentConfig.price 同值）
  
  // 状态
  status: ClassStatus

  // 班级介绍（视频/文档/文字）
  intro?: {
    videoUrl?: string;
    videoCover?: string;
    documentUrl?: string;
    documentName?: string;
    content?: string;
  }

  // 排课列表（子文档或关联）
  schedules?: ClassSchedule[]
  scheduleCount?: number
  
  // 报名配置
  enrollmentConfig: {
    price: number                // 线下报名价格
    originalPrice?: number       // 原价
    enableVideoAccess: boolean   // 是否开通视频观看权限
    videoAccessDays: number      // 视频观看有效期（天）
    materials?: string[]         // 包含的教材/资料
  }
  
  // 统计
  stats?: {
    totalHours: number           // 总课时
    completedHours: number       // 已完成课时
    attendanceRate: number       // 出勤率
  }
  
  createdAt?: string
  updatedAt?: string
}

// ============ 班级排课数据模型 ============
export interface ClassSchedule {
  _id?: string
  id?: string
  classId: string                // 所属班级ID
  
  // 时间
  date: string                   // 日期 YYYY-MM-DD
  startTime: string              // 开始时间 HH:MM
  endTime: string                // 结束时间 HH:MM
  
  // 内容
  title?: string                 // 课时标题
  content?: string               // 课程内容
  
  // 地点
  location?: string              // 上课地点（可覆盖班级默认地点）
  
  // 教师（可覆盖班级默认教师）
  teacherId?: string
  teacherName?: string
  
  // 状态
  status: ScheduleStatus
  
  // 出勤
  attendance?: {
    total: number
    present: number
    absent: number
    late: number
    leave: number
  }
  
  // 备注
  remark?: string
  
  createdAt?: string
  updatedAt?: string
}

// ============ 创建班级请求 ============
export interface CreateClassRequest {
  name: string
  description?: string
  courseId: string
  maxStudents: number
  startDate: string
  endDate: string
  location: string
  teacherId: string
  assistantIds?: string[]
  enrollmentConfig: {
    price: number
    originalPrice?: number
    enableVideoAccess: boolean
    videoAccessDays: number
    materials?: string[]
  }
}

// ============ 更新班级请求 ============
export interface UpdateClassRequest {
  name?: string
  description?: string
  maxStudents?: number
  startDate?: string
  endDate?: string
  location?: string
  teacherId?: string
  assistantIds?: string[]
  status?: ClassStatus
  enrollmentConfig?: Partial<CreateClassRequest['enrollmentConfig']>
}

// ============ 创建排课请求 ============
export interface CreateScheduleRequest {
  classId: string
  date: string
  startTime: string
  endTime: string
  title?: string
  content?: string
  location?: string
  teacherId?: string
  remark?: string
}

// ============ 批量创建排课请求 ============
export interface BatchCreateScheduleRequest {
  classId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  repeatType: 'daily' | 'weekly' | 'custom'
  repeatDays?: number[]          // 每周哪几天，0=周日
  excludeDates?: string[]        // 排除的日期
  title?: string
  content?: string
  location?: string
  teacherId?: string
}

// ============ 班级查询参数 ============
export interface ClassQueryParams {
  courseId?: string
  teacherId?: string
  status?: ClassStatus
  startDateFrom?: string
  startDateTo?: string
  keyword?: string
  page?: number
  pageSize?: number
}

// ============ 排课查询参数 ============
export interface ScheduleQueryParams {
  classId?: string
  teacherId?: string
  status?: ScheduleStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

// ============ 班级统计 ============
export interface ClassStatistics {
  totalClasses: number
  enrollingCount: number
  inProgressCount: number
  completedCount: number
  cancelledCount: number
  totalStudents: number
  totalRevenue: number
}

// ============ 学员的班级信息（用于前端展示） ============
export interface MyClassInfo {
  classId: string
  className: string
  courseId: string
  courseName: string
  teacherName: string
  location: string
  startDate: string
  endDate: string
  status: ClassStatus
  
  // 进度
  progress: {
    totalSchedules: number
    completedSchedules: number
    attendanceRate: number
  }
  
  // 权限
  access: {
    videoEnabled: boolean
    validUntil: string
  }
  
  // 下一个课时
  nextSchedule?: {
    date: string
    startTime: string
    endTime: string
    title: string
    location: string
  }
}
