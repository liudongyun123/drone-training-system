/**
 * User Types - 用户类型定义
 */

// ============================================================================
// 用户
// ============================================================================

export interface User {
  /** 用户 ID */
  _id: string;
  /** 用户名 */
  username?: string;
  /** 昵称 */
  nickname?: string;
  /** 头像 */
  avatar?: string;
  /** 手机号 */
  phone?: string;
  /** 邮箱 */
  email?: string;
  /** 真实姓名 */
  realName?: string;
  /** 性别 */
  gender?: 'male' | 'female' | 'unknown';
  /** 生日 */
  birthday?: string;
  /** 用户等级 */
  level?: number;
  /** 积分 */
  points?: number;
  /** 余额 */
  balance?: number;
  /** 用户类型 */
  type: UserType;
  /** 用户状态 */
  status: UserStatus;
  /** 注册方式 */
  registerType?: 'phone' | 'wechat' | 'mini_program' | 'web';
  /** 微信 openId */
  wxOpenId?: string;
  /** 小程序 openId */
  mpOpenId?: string;
  /** 角色列表 */
  roles?: string[];
  /** 是否管理员 */
  isAdmin?: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 最后登录时间 */
  lastLoginAt?: string;
}

export type UserType = 'student' | 'teacher' | 'admin';
export type UserStatus = 'active' | 'disabled' | 'deleted';

// ============================================================================
// 用户认证
// ============================================================================

export interface LoginParams {
  /** 登录方式 */
  type: 'phone' | 'password' | 'wechat' | 'mini_program';
  /** 手机号 */
  phone?: string;
  /** 验证码 */
  code?: string;
  /** 密码 */
  password?: string;
  /** 微信 code */
  wxCode?: string;
}

export interface LoginResult {
  /** 用户信息 */
  user: User;
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间 */
  expiresIn: number;
}

export interface RegisterParams {
  /** 手机号 */
  phone: string;
  /** 验证码 */
  code: string;
  /** 密码 */
  password?: string;
  /** 昵称 */
  nickname?: string;
}

export interface ResetPasswordParams {
  /** 手机号 */
  phone: string;
  /** 验证码 */
  code: string;
  /** 新密码 */
  newPassword: string;
}

// ============================================================================
// 用户资料
// ============================================================================

export interface UserProfile extends User {
  /** 统计信息 */
  stats: UserStats;
}

export interface UserStats {
  /** 学习课程数 */
  courseCount: number;
  /** 报名班级数 */
  classCount: number;
  /** 完成课程数 */
  completedCourseCount: number;
  /** 累计学习时长(分钟) */
  totalStudyMinutes: number;
  /** 获得证书数 */
  certificateCount: number;
  /** 累计订单数 */
  orderCount: number;
  /** 累计消费 */
  totalConsumption: number;
}

// ============================================================================
// 收货地址
// ============================================================================

export interface Address {
  /** 地址 ID */
  _id: string;
  /** 收货人 */
  receiver: string;
  /** 手机号 */
  phone: string;
  /** 省份 */
  province: string;
  /** 城市 */
  city: string;
  /** 区/县 */
  district: string;
  /** 详细地址 */
  detail: string;
  /** 邮政编码 */
  postalCode?: string;
  /** 是否默认 */
  isDefault: boolean;
  /** 标签 */
  tag?: 'home' | 'company' | 'other';
}

// ============================================================================
// 用户状态
// ============================================================================

export const USER_STATUS = {
  active: { label: '正常', color: 'green' },
  disabled: { label: '禁用', color: 'red' },
  deleted: { label: '已删除', color: 'gray' },
} as const;

// ============================================================================
// 导出
// ============================================================================

export type {
  User,
  LoginParams,
  LoginResult,
  RegisterParams,
  ResetPasswordParams,
  UserProfile,
  UserStats,
  Address,
};
