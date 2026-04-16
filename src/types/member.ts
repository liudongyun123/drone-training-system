// ============================================================================
// 学员/用户成员类型定义 - 线上线下一体化版本
// ============================================================================

// ==================== 成员来源（核心字段）====================
// 区分成员的注册/报名渠道和业务类型
export type MemberSource = 
  | 'online_purchase'    // 纯线上购买：线上购买课程，自主学习视频，无班级，无考勤
  | 'online_enroll'      // ★ 线上报名缴费：线上缴费报名后，分配到线下班级，需参加培训考勤
  | 'offline_enroll'     // 线下报名缴费：到店报名缴费，分配班级，需参加培训考勤
  | 'hybrid'             // ★ 混合用户：既有线上购课，又有线下/线上报名（需同时处理视频+考勤）
  | 'admin_import'       // 管理员导入的学员
  | 'system';           // 系统自动创建

// 用户类型：user(访客) | student(学员) | graduate(毕业)
export type MemberType = 'user' | 'student' | 'graduate'

// 角色类型：保持与权限系统兼容
export type MemberRole = 'student' | 'teacher' | 'admin'

// 用户状态
export type MemberStatus = 'active' | 'inactive' | 'banned'

// 学习等级
export type LearningLevel = 'beginner' | 'intermediate' | 'advanced'

// 学员档案（扩展信息）
export interface MemberProfile {
  idCard?: string           // 身份证
  gender?: 'male' | 'female' // 性别
  birthday?: string          // 生日
  address?: string          // 地址
  education?: string        // 学历
  occupation?: string       // 职业
  emergencyContact?: string // 紧急联系人
  emergencyPhone?: string   // 紧急联系电话
  level?: LearningLevel      // 学习等级
}

// 学习统计
export interface MemberStats {
  totalHours: number        // 总学习时长（小时）
  completedCourses: number   // 完成课程数
  examAttempts: number      // 考试次数
  avgScore?: number         // 平均分
  totalOrders: number       // 订单总数
  totalSpent: number        // 总消费金额
}

// ==================== 已报名课程项（带来源信息）====================
export interface EnrolledCourseItem {
  courseId: string          // 课程ID
  source: 'purchase' | 'enrollment' | 'grant'  // 来源：购买/报名/授权
  orderId?: string          // 关联订单ID（source=purchase时）
  enrollmentId?: string     // 关联报名ID（source=enrollment时）
  grantedAt: string         // 获得时间
  expiresAt?: string        // 过期时间（可选）
}

// ==================== 来源详情（记录注册/报名信息）====================
export interface EnrollmentInfo {
  source: MemberSource
  enrolledAt: string        // 注册/报名时间
  enrolledBy?: string       // 报名受理人（管理员/系统）
  channel?: string          // 渠道来源（如：官网、小程序、门店、地推）
  
  // ★ 班级信息（线上/线下报名用户都需要）
  classId?: string          // 所属班级ID
  className?: string        // 所属班级名称
  attendanceEnabled?: boolean // 是否需要考勤（线上/线下报名都需要）
  
  // ★ 视频权限（可选开通）
  videoEnabled?: boolean    // 是否开通视频学习
  videoValidFrom?: string   // 视频有效期开始
  videoValidUntil?: string  // 视频有效期结束
  
  // ★ 关联报名记录
  registrationId?: string   // 关联 registrations 集合（线上/线下报名）
  
  // ★ 关联订单记录
  orderId?: string         // 关联 orders 集合（线上购买）
  
  // ★ 额外学习（混合用户可能额外购买）
  extraPurchases?: string[] // 额外购买的课程ID
}

// 学员成员完整类型
export interface Member {
  _id: string               // CloudBase Auth 的 openid 或自定义 ID
  authId?: string           // Auth UID
  
  // 基本信息
  name: string
  phone?: string
  email?: string
  avatar?: string
  
  // 类型与角色
  type: MemberType          // user | student | graduate
  role: MemberRole         // student | teacher | admin
  
  // ★ 成员来源（核心字段）
  source: MemberSource
  
  // ★ 来源详情（可选，便于快速查询）
  enrollment?: EnrollmentInfo
  
  // 档案与统计
  profile: MemberProfile
  stats: MemberStats
  
  // 已购课程（购买后自动添加）- 新结构包含来源信息
  enrolledCourses: EnrolledCourseItem[] | string[]  // 支持新旧两种格式
  completedCourses: string[] // 已完成课程ID列表
  
  // 时间戳
  status: MemberStatus
  createdAt: string
  updatedAt: string
  
  // 重要时间点
  firstPurchaseAt?: string  // 首次购买时间
  graduatedAt?: string     // 毕业时间
}

// 学员创建请求
export interface CreateMemberRequest {
  name: string
  phone?: string
  email?: string
  type?: MemberType
  role?: MemberRole
  source?: MemberSource
  enrollment?: Partial<EnrollmentInfo>
  profile?: Partial<MemberProfile>
}

// 学员更新请求
export interface UpdateMemberRequest {
  name?: string
  phone?: string
  email?: string
  avatar?: string
  type?: MemberType
  role?: MemberRole
  status?: MemberStatus
  source?: MemberSource
  enrollment?: Partial<EnrollmentInfo>
  profile?: Partial<MemberProfile>
}

// 学员搜索条件（增强版）
export interface MemberQuery {
  keyword?: string
  type?: MemberType
  role?: MemberRole
  status?: MemberStatus
  source?: MemberSource      // ★ 新增：按来源筛选
  courseId?: string          // 按课程筛选
  classId?: string           // ★ 新增：按班级筛选
  videoEnabled?: boolean     // ★ 新增：筛选已开通视频
  startDate?: string        // 注册起始日期
  endDate?: string          // 注册结束日期
}

// 来源类型显示映射
export const MemberSourceLabels: Record<MemberSource, string> = {
  'online_purchase': '线上购买',
  'online_enroll': '线上报名',
  'offline_enroll': '线下报名',
  'hybrid': '混合用户',
  'admin_import': '管理员导入',
  'system': '系统创建'
}

// 来源类型颜色映射（用于UI显示）
export const MemberSourceColors: Record<MemberSource, string> = {
  'online_purchase': 'blue',    // 蓝色 - 纯线上
  'online_enroll': 'green',     // 绿色 - 线上报名
  'offline_enroll': 'orange',   // 橙色 - 线下报名
  'hybrid': 'purple',           // 紫色 - 混合用户
  'admin_import': 'gray',      // 灰色 - 导入
  'system': 'cyan'             // 青色 - 系统
}

// 来源类型描述映射
export const MemberSourceDescriptions: Record<MemberSource, string> = {
  'online_purchase': '仅线上购买课程，自主学习，无班级，无需考勤',
  'online_enroll': '线上报名缴费，分配班级，需参加培训考勤，可选开通视频',
  'offline_enroll': '线下到店报名，分配班级，需参加培训考勤，可选开通视频',
  'hybrid': '既有线上购课，又有线下/线上报名，同时拥有视频+班级考勤',
  'admin_import': '管理员后台导入的学员',
  'system': '系统自动创建的账号'
}
