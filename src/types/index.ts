// ============================================================================
// 核心数据类型定义
// ============================================================================

// 用户相关
export interface User {
  _id: string;
  openid: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// 课程相关
export interface Course {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  price: number;
  originalPrice?: number;
  teacherId: string;
  teacherName?: string;
  instructor?: string; // 授课教师名称（兼容字段）
  maxStudents?: number; // 最大学员数
  duration: number; // 课程时长（小时）
  lessons: number; // 课时数
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  salesCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// 课程章节
export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  videoDuration?: number;
  order: number;
  isFree: boolean;
  createdAt: string;
}

// 学习进度
export interface StudyProgress {
  _id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  watchDuration: number; // 观看时长（秒）
  completedAt?: string;
  updatedAt: string;
}

// 购买记录/报名记录
export interface Purchase {
  _id: string;
  userId: string;
  userName?: string; // 用户名（数据库字段）
  courseId?: string; // 课程ID（部分数据可能没有）
  courseName?: string; // 课程名称（数据库字段）
  orderId?: string;
  scheduleId?: string; // 排课ID（数据库字段）
  amount?: number; // 金额（数据库字段）
  purchaseAt?: string;
  enrollmentDate?: string; // 报名日期（数据库字段）
  expiresAt?: string; // 过期时间（如有）
  paymentStatus?: 'pending' | 'paid' | 'failed'; // 支付状态（数据库字段）
  status?: 'active' | 'inactive' | 'completed'; // 状态（数据库字段）
  createdAt?: string;
  updatedAt?: string;
}

// 购物车项
export interface CartItem {
  courseId: string;
  courseTitle: string;
  coverImage: string;
  price: number;
  teacherName?: string;
}

// ============== 统一从 database.ts 导入 ==============
// 订单类型和辅助函数
export { 
  Order, 
  OrderItem,
  OrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  getOrderCourseIds, 
  getOrderCourseNames, 
  getOrderAmount, 
  isOrderPaid,
  isOrderPending,
  normalizeOrder 
} from './database'

// 教师类型
// @ts-ignore
export { TeacherProfile as Teacher } from './database'

// 排课相关
export interface Schedule {
  _id: string;
  courseId: string;
  courseName?: string; // 课程名称（数据库字段）
  teacherId: string;
  teacherName: string;
  title: string;
  startTime: string; // ISO 8601 格式
  endTime: string;
  location: string;
  maxStudents: number;
  enrolledCount?: number; // 前端用
  enrolledStudents?: number; // 已报名学生数（数据库实际字段）
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  type?: 'theory' | 'practice'; // 课程类型（数据库字段）
  date?: string; // 日期（数据库字段）
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 出勤记录
export interface Attendance {
  _id: string;
  scheduleId: string;
  courseId: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late';
  checkInTime?: string;
  notes?: string;
  createdAt: string;
}

// 调课记录
export interface RescheduleRequest {
  _id: string;
  scheduleId: string;
  courseId: string;
  teacherId: string;
  studentId: string;
  originalStartTime: string;
  originalEndTime: string;
  newStartTime: string;
  newEndTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  approverName?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

// 财务统计
export interface FinancialStats {
  period: string;
  totalRevenue: number;
  orderCount: number;
  courseSales: {
    courseId: string;
    courseTitle: string;
    salesCount: number;
    revenue: number;
  }[];
  teacherStats: {
    teacherId: string;
    teacherName: string;
    totalHours: number;
    totalRevenue: number;
    studentCount: number;
  }[];
}

// 在线考试相关
export interface Question {
  _id: string;
  examId: string;
  type: 'single' | 'multiple' | 'judge' | 'essay';
  question: string;
  options?: string[]; // 单选、多选时的选项
  answer: string | string[]; // 正确答案
  score: number;
  order: number;
}

export interface Exam {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  duration: number; // 考试时长（分钟）
  passScore: number; // 及格分数
  totalScore: number;
  questionCount: number;
  attempts: number; // 允许考试次数
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ExamAttempt {
  _id: string;
  examId: string;
  userId: string;
  courseId: string;
  score: number;
  passStatus: boolean;
  answers: {
    questionId: string;
    userAnswer: string | string[];
    isCorrect: boolean;
    score: number;
  }[];
  startTime: string;
  submitTime: string;
  duration: number; // 实际用时（分钟）
}

// ============================================================================
// 题库系统（新增）
// ============================================================================

// 题库
export interface QuestionBank {
  _id: string;
  name: string;
  description?: string;
  category: string; // 题库分类：无人机法规、飞行原理、安全操作等
  level?: string; // 难度等级：初级、中级、高级（数据库字段）
  courseIds?: string[]; // 关联的课程ID列表（部分数据可能没有）
  questionCount: number;
  passingScore?: number; // 及格分数（数据库字段）
  timeLimit?: number; // 时间限制（分钟）（数据库字段）
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// 题库题目
export interface BankQuestion {
  _id: string;
  bankId: string;
  type: 'single' | 'multiple' | 'judge' | 'fill' | 'essay';
  question?: string; // 问题内容（前端用）
  content: string; // 问题内容（数据库实际字段）
  options?: string[]; // 选项（单选、多选、判断）
  answer: string | string[]; // 正确答案
  explanation?: string; // 答案解析（前端用）
  analysis?: string; // 答案解析（数据库实际字段）
  difficulty: 'easy' | 'medium' | 'hard'; // 难度
  knowledgePoint?: string; // 知识点标签（可选）
  points?: number; // 分值（数据库字段）
  score?: number; // 默认分值（前端用）
  usageCount?: number; // 使用次数
  correctRate?: number; // 正确率统计
  status?: 'active' | 'inactive'; // 状态（数据库字段）
  createdAt: string;
  updatedAt: string;
}

// 练习记录
export interface PracticeRecord {
  _id: string;
  userId: string;
  bankId: string;
  bankName: string;
  courseId?: string; // 如果是课程关联的练习
  mode: 'sequential' | 'random' | 'wrong' | 'favorites'; // 练习模式
  questionCount: number; // 本次练习题目数
  correctCount: number; // 答对数量
  score: number; // 得分
  duration: number; // 用时（分钟）
  answers: {
    questionId: string;
    question: string;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    isCorrect: boolean;
    isFavorite: boolean; // 是否收藏
  }[];
  startTime: string;
  endTime: string;
  createdAt: string;
}

// 收藏的题目
export interface FavoriteQuestion {
  _id: string;
  userId: string;
  questionId: string;
  bankId: string;
  question: string;
  answer: string | string[];
  explanation?: string;
  createdAt: string;
}

// 错题本
export interface WrongQuestion {
  _id: string;
  userId: string;
  questionId: string;
  bankId: string;
  question: string;
  options?: string[];
  type: string;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  explanation?: string;
  wrongCount: number; // 错误次数
  lastWrongTime: string;
  createdAt: string;
  updatedAt: string;
}

// 证书相关
export interface Certificate {
  _id: string;
  userId?: string;
  userName?: string;
  courseId?: string;
  courseTitle?: string;
  courseName?: string; // 课程名称（数据库字段）
  examId?: string;
  certificateNo?: string; // 证书编号
  issueDate?: string;
  status: 'pending' | 'issued' | 'revoked' | 'active' | 'inactive'; // 数据库有active状态
  fileUrl?: string;
  templateUrl?: string; // 模板URL（数据库字段）
  type?: string; // 证书类型（数据库字段）
  description?: string; // 描述（数据库字段）
  title?: string; // 标题（数据库字段）
  createdAt: string;
  updatedAt: string;
}

// 营销工具相关
export interface Coupon {
  _id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minAmount: number; // 最低消费金额
  maxDiscount?: number; // 最大优惠金额
  totalCount: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  courseIds?: string[]; // 适用课程，空则全部适用
  status: 'active' | 'expired' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  _id: string;
  couponId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: string;
}

export interface GroupBuy {
  _id: string;
  courseId: string;
  title: string;
  requiredCount: number; // 需要拼团人数
  currentCount: number;
  price: number; // 拼团价
  originalPrice: number;
  validFrom: string;
  validTo: string;
  status: 'active' | 'expired' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface GroupBuyParticipant {
  _id: string;
  groupBuyId: string;
  userId: string;
  orderId: string;
  joinedAt: string;
}

// 直播相关
export interface LiveStream {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  streamUrl: string;
  pushUrl?: string;
  coverImage?: string;
  teacherId: string;
  teacherName: string;
  startTime: string;
  endTime?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewerCount: number;
  maxViewers: number;
  createdAt: string;
  updatedAt: string;
}

export interface LiveChat {
  _id: string;
  streamId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

// 分页参数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 过滤参数
export interface FilterParams {
  keyword?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

// ============ 学员/成员（新版）===========
// 从 member.ts 导出完整类型
export {
  Member,
  // @ts-ignore
  MemberType,
  MemberRole,
  // @ts-ignore
  MemberStatus,
  MemberProfile,
  MemberStats,
  MemberQuery,
  CreateMemberRequest,
  UpdateMemberRequest,
  // @ts-ignore
  User,
  // @ts-ignore
  Student
} from './member'

// ============ 报名与班级管理（新增）===========
export type {
  Registration,
  Class,
  ClassSchedule,
  RegistrationAccess,
  RegistrationPayment,
  RegistrationReview,
  VideoProgress,
  LearningProgress,
  CreateRegistrationRequest,
  ReviewRegistrationRequest,
  UpdateAccessRequest,
  CheckVideoAccessResponse,
  RegistrationSource,
  RegistrationStatus,
  // @ts-ignore
  ClassStatus,
  // @ts-ignore
  ScheduleStatus
} from './registration'

// ============ 班级管理 v2.0（重构）===========
export type {
  Class as ClassV2,
  ClassSchedule as ClassScheduleV2,
  // @ts-ignore
  ClassStatus,
  // @ts-ignore
  ScheduleStatus,
  CreateClassRequest,
  UpdateClassRequest,
  CreateScheduleRequest,
  BatchCreateScheduleRequest,
  ClassQueryParams,
  ScheduleQueryParams,
  ClassStatistics,
  MyClassInfo
} from './class'

// ============ 权限管理 ============
export type {
  // @ts-ignore
  MemberType,
  MemberLevel,
  // @ts-ignore
  MemberStatus,
  PermissionSource,
  PermissionStatus,
  VideoAccess,
  CoursePermission,
  ClassMember,
  ClassMemberSource,
  ClassMemberStatus,
  AttendanceStats,
  VideoAccessCheckResponse,
  ClassAccessCheckResponse,
  CreateCoursePermissionRequest,
  CreateClassMemberRequest,
  BatchAddClassMembersRequest,
  PermissionStats,
  ClassMemberStats
} from './permission'
