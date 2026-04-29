// ============================================================================
// 培训班类型定义 - 共用层
// ============================================================================

/**
 * 培训班
 */
export interface TrainingClass {
  _id: string
  name: string              // 培训班名称
  description: string       // 描述
  coverImage?: string
  
  // 关联课程（核心：报名即获得）
  includedCourses: string[] // 报名自动授权的课程ID列表
  
  // 培训信息
  teacherId: string         // 授课教师ID
  teacherName?: string      // 教师名称
  maxStudents: number       // 最大学员数
  currentStudents: number   // 当前报名人数
  
  // 时间地点
  startDate: string         // 开始日期
  endDate: string           // 结束日期
  location: string          // 培训地点
  
  // 费用
  price: number             // 培训费用
  originalPrice?: number    // 原价
  
  // 状态
  status: 'draft' | 'enrolling' | 'ongoing' | 'finished' | 'cancelled'
  
  createdAt: string
  updatedAt: string
}

/**
 * 排课记录
 */
export interface ClassSchedule {
  _id: string
  classId: string           // 培训班ID
  title: string             // 课程标题
  description?: string
  
  // 时间
  date: string              // 日期
  startTime: string         // 开始时间
  endTime: string           // 结束时间
  
  // 地点
  location: string
  
  // 教师
  teacherId: string
  teacherName?: string
  
  // 学员签到
  attendance?: {
    userId: string
    signedAt?: string
    status: 'pending' | 'signed' | 'absent'
  }[]
  
  createdAt: string
}

/**
 * 报名记录
 */
export interface Enrollment {
  _id: string
  classId: string           // 培训班ID
  className?: string        // 培训班名称
  
  userId: string            // 用户ID
  userName?: string
  phone: string
  
  // 支付方式（核心）
  paymentMethod: 'online' | 'offline'  // 线上缴费 / 线下缴费
  paymentStatus: 'pending' | 'paid' | 'confirmed'
  
  // 线下缴费信息
  offlinePayment?: {
    amount: number
    paidAt: string          // 缴费时间
    confirmedBy: string     // 确认人（管理员）
    confirmedAt: string     // 确认时间
    remark?: string         // 备注
  }
  
  // 自动授权的课程
  grantedCourses: string[]  // 已授权的课程ID列表
  
  // 状态
  status: 'pending' | 'confirmed' | 'cancelled'
  
  createdAt: string
  updatedAt: string
}

/**
 * 教师
 */
export interface Teacher {
  _id: string
  name: string
  avatar?: string
  intro: string             // 简介
  specialty: string[]       // 专长领域
  phone?: string
  status: 'active' | 'inactive'
  createdAt: string
}

// ========== 工具函数 ==========

/**
 * 获取培训班状态显示文本
 */
export function getClassStatusText(status: TrainingClass['status']): string {
  const map: Record<TrainingClass['status'], string> = {
    draft: '草稿',
    enrolling: '报名中',
    ongoing: '进行中',
    finished: '已结束',
    cancelled: '已取消'
  }
  return map[status] || status
}

/**
 * 获取报名状态显示文本
 */
export function getEnrollmentStatusText(status: Enrollment['status']): string {
  const map: Record<Enrollment['status'], string> = {
    pending: '待确认',
    confirmed: '已确认',
    cancelled: '已取消'
  }
  return map[status] || status
}

/**
 * 判断培训班是否可报名
 */
export function canEnroll(classItem: TrainingClass): boolean {
  return classItem.status === 'enrolling' 
    && classItem.currentStudents < classItem.maxStudents
}