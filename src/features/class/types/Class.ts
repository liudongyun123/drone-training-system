/**
 * Class Types - 班级类型定义
 */

// ============================================================================
// 班级
// ============================================================================

export interface ClassInfo {
  /** 班级 ID */
  _id: string;
  /** 班级名称 */
  name: string;
  /** 关联课程名称 */
  courseName?: string;
  /** 关联课程 ID */
  courseId?: string;
  /** 班级等级 */
  level: string;
  /** 等级名称 */
  levelName?: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 上课地点 */
  location: string;
  /** 开始时间 */
  startTime?: string;
  /** 结束时间 */
  endTime?: string;
  /** 授课教师名称 */
  teacherName?: string;
  /** 授课教师 ID */
  teacherId?: string;
  /** 班级价格 */
  price: number;
  /** 原价 */
  originalPrice?: number;
  /** 容量（总人数） */
  capacity: number;
  /** 已报名人数 */
  enrolled: number;
  /** 剩余名额 */
  remaining: number;
  /** 班级状态 */
  status: ClassStatus;
  /** 班级描述 */
  description?: string;
  /** 班级封面图 */
  coverImage?: string;
  /** 体系 ID */
  sourceId: string;
  /** 体系名称 */
  sourceName?: string;
  /** 课程内容 */
  content?: string;
  /** 注意事项 */
  attention?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

export type ClassStatus = 'enrolling' | 'in_progress' | 'completed' | 'cancelled';

export interface ClassSchedule {
  /** 排课 ID */
  _id: string;
  /** 班级 ID */
  classId: string;
  /** 班级名称 */
  className: string;
  /** 课程日期 */
  date: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 上课地点 */
  location: string;
  /** 教师 ID */
  teacherId: string;
  /** 教师名称 */
  teacherName: string;
  /** 课程内容 */
  content?: string;
  /** 考勤状态 */
  attendanceStatus?: 'pending' | 'present' | 'absent' | 'leave';
  /** 备注 */
  remark?: string;
}

// ============================================================================
// 班级查询参数
// ============================================================================

export interface ClassListParams {
  /** 状态筛选 */
  status?: ClassStatus;
  /** 体系 ID */
  sourceId?: string;
  /** 等级 */
  level?: string;
  /** 搜索关键词 */
  keyword?: string;
  /** 排序字段 */
  orderBy?: 'createdAt' | 'startDate' | 'price' | 'enrolled';
  /** 排序方向 */
  orderDir?: 'asc' | 'desc';
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

export interface ClassDetailParams {
  /** 班级 ID */
  classId: string;
  /** 是否包含排课信息 */
  includeSchedules?: boolean;
}

// ============================================================================
// 班级操作
// ============================================================================

export interface EnrollClassParams {
  /** 班级 ID */
  classId: string;
  /** 学员姓名 */
  studentName: string;
  /** 学员手机号 */
  studentPhone: string;
  /** 学员身份证 */
  studentIdCard?: string;
  /** 备注 */
  remark?: string;
  /** 支付方式 */
  paymentMethod?: 'wechat' | 'offline';
}

export interface AttendanceParams {
  /** 班级 ID */
  classId: string;
  /** 排课 ID */
  scheduleId: string;
  /** 考勤记录 */
  records: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'leave';
    remark?: string;
  }>;
}

// ============================================================================
// 学员班级关系
// ============================================================================

export interface StudentClass {
  /** 报名 ID */
  _id: string;
  /** 班级 ID */
  classId: string;
  /** 班级名称 */
  className: string;
  /** 学员 ID */
  studentId: string;
  /** 学员姓名 */
  studentName: string;
  /** 学员手机号 */
  studentPhone: string;
  /** 报名时间 */
  enrolledAt: string;
  /** 订单 ID */
  orderId?: string;
  /** 支付状态 */
  paymentStatus: 'paid' | 'unpaid' | 'refunded';
  /** 考勤记录 */
  attendance?: Array<{
    scheduleId: string;
    date: string;
    status: 'present' | 'absent' | 'leave';
  }>;
  /** 出勤率 */
  attendanceRate?: number;
  /** 班级状态 */
  classStatus: ClassStatus;
}

// ============================================================================
// 班级等级
// ============================================================================

export const CLASS_LEVELS = [
  { value: '入门班', label: '入门班' },
  { value: '基础班', label: '基础班' },
  { value: '进阶班', label: '进阶班' },
  { value: '高级班', label: '高级班' },
  { value: '考证班', label: '考证班' },
] as const;

export type ClassLevel = typeof CLASS_LEVELS[number]['value'];

// ============================================================================
// 班级状态
// ============================================================================

export const CLASS_STATUS = {
  enrolling: { label: '报名中', color: 'green' },
  in_progress: { label: '进行中', color: 'blue' },
  completed: { label: '已结束', color: 'gray' },
  cancelled: { label: '已取消', color: 'red' },
} as const;

// ============================================================================
// 导出
// ============================================================================

export type {
  ClassInfo,
  ClassSchedule,
  ClassListParams,
  ClassDetailParams,
  EnrollClassParams,
  AttendanceParams,
  StudentClass,
};
