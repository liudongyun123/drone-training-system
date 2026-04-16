/**
 * 权限管理类型定义
 * 
 * 支持线上购课、线上报班、线下报名三种场景
 */

// ==================== 会员类型 ====================

// 会员来源类型
export type MemberType = 'online_buyer' | 'online_registrant' | 'offline_registrant' | 'hybrid' | 'teacher' | 'admin';

// 会员等级
export type MemberLevel = 'free' | 'basic' | 'vip' | 'svip';

// 会员状态
export type MemberStatus = 'active' | 'inactive' | 'banned';

// ==================== 课程权限 ====================

// 权限来源
export type PermissionSource = 'purchase' | 'registration' | 'gift' | 'trial' | 'admin_grant';

// 权限状态
export type PermissionStatus = 'active' | 'expired' | 'revoked';

// 视频访问配置
export interface VideoAccess {
  enabled: boolean;
  validFrom: string;
  validUntil: string;
}

// 课程权限
export interface CoursePermission {
  _id: string;
  userId: string;
  userName?: string;
  courseId: string;
  courseName?: string;
  source: PermissionSource;
  
  // 关联信息
  registrationId?: string;
  classId?: string;
  className?: string;
  
  // 视频权限
  videoAccess: VideoAccess;
  
  // 状态
  status: PermissionStatus;
  
  createdAt: string;
  updatedAt: string;
}

// ==================== 班级成员 ====================

// 班级成员来源
export type ClassMemberSource = 'online' | 'offline';

// 班级成员状态
export type ClassMemberStatus = 'enrolled' | 'learning' | 'completed' | 'dropped';

// 出勤统计
export interface AttendanceStats {
  total: number;      // 应出勤次数
  present: number;     // 实到次数
  absent: number;      // 缺勤次数
  late: number;        // 迟到次数
}

// 班级成员
export interface ClassMember {
  _id: string;
  classId: string;
  className?: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  
  // 来源
  source: ClassMemberSource;
  registrationId?: string;
  
  // 状态
  status: ClassMemberStatus;
  
  // 出勤统计
  attendance: AttendanceStats;
  
  // 视频权限
  videoEnabled: boolean;
  videoValidUntil?: string;
  
  // 时间
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== API 类型 ====================

// 视频权限检查响应
export interface VideoAccessCheckResponse {
  allowed: boolean;
  source?: PermissionSource | 'registration';
  validUntil?: string;
  message?: string;
}

// 班级权限检查响应
export interface ClassAccessCheckResponse {
  allowed: boolean;
  source?: ClassMemberSource;
  memberId?: string;
  message?: string;
}

// 创建课程权限请求
export interface CreateCoursePermissionRequest {
  userId: string;
  courseId: string;
  source: PermissionSource;
  registrationId?: string;
  classId?: string;
  videoAccess: VideoAccess;
}

// 创建班级成员请求
export interface CreateClassMemberRequest {
  classId: string;
  userId: string;
  userName?: string;        // 用户姓名
  userPhone?: string;       // 用户手机
  className?: string;       // 班级名称
  courseId?: string;        // 关联课程ID
  source: ClassMemberSource;
  registrationId?: string;
  videoEnabled?: boolean;
  videoValidUntil?: string;
}

// 批量添加班级成员
export interface BatchAddClassMembersRequest {
  classId: string;
  members: {
    userId: string;
    source: ClassMemberSource;
    videoEnabled?: boolean;
  }[];
}

// 权限统计
export interface PermissionStats {
  totalPermissions: number;
  activePermissions: number;
  expiredPermissions: number;
  bySource: Record<PermissionSource, number>;
}

// 班级成员统计
export interface ClassMemberStats {
  totalMembers: number;
  enrolled: number;
  learning: number;
  completed: number;
  dropped: number;
  averageAttendance: number;
}
