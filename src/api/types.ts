/**
 * API 类型定义
 * 统一的 API 请求和响应类型
 */

// ============ 基础类型 ============

/**
 * 统一响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  message?: string
  timestamp: number
  requestId: string
}

/**
 * 错误信息
 */
export interface ApiError {
  code: ErrorCode
  message: string
  details?: any
}

/**
 * 错误码枚举
 */
export enum ErrorCode {
  // 认证相关
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  
  // 用户相关
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_EMAIL_DUPLICATE = 'USER_EMAIL_DUPLICATE',
  USER_PASSWORD_INVALID = 'USER_PASSWORD_INVALID',
  USER_ACCOUNT_DISABLED = 'USER_ACCOUNT_DISABLED',
  USER_PHONE_DUPLICATE = 'USER_PHONE_DUPLICATE',
  
  // 参数验证
  VALIDATION_REQUIRED = 'VALIDATION_REQUIRED',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_LENGTH = 'VALIDATION_INVALID_LENGTH',
  
  // 业务逻辑
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // 系统错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // 限流
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * 排序参数
 */
export interface SortParams {
  sort?: string // 格式: "field:direction"
}

/**
 * 过滤参数
 */
export interface FilterParams {
  [key: string]: any
}

/**
 * 搜索参数
 */
export interface SearchParams {
  keyword?: string
  fields?: string[]
}

/**
 * 查询参数
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams, SearchParams {
  select?: string
  include?: string[]
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ============ 用户相关类型 ============

/**
 * 用户角色
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * 用户状态
 */
export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  PENDING = 'pending'
}

/**
 * 用户信息
 */
export interface User {
  id: string
  username?: string
  email?: string
  phoneNumber?: string
  role: UserRole
  status: UserStatus
  avatar?: string
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  username?: string
  email?: string
  phoneNumber?: string
  password?: string
  role?: UserRole
}

/**
 * 更新用户请求
 */
export interface UpdateUserRequest {
  username?: string
  email?: string
  phoneNumber?: string
  role?: UserRole
  status?: UserStatus
  avatar?: string
}

/**
 * 用户列表响应
 */
export type UserListResponse = PaginatedResponse<User>

// ============ 认证相关类型 ============

/**
 * 登录方式
 */
export enum LoginMethod {
  SMS = 'sms',
  PASSWORD = 'password',
  WECHAT = 'wechat'
}

/**
 * 发送验证码请求
 */
export interface SendVerificationCodeRequest {
  phone_number: string
  target: 'ANY' | 'SIGNIN' | 'SIGNUP'
}

/**
 * 发送验证码响应
 */
export interface SendVerificationCodeResponse {
  verification_id: string
  expires_in: number
}

/**
 * 验证验证码请求
 */
export interface VerifyCodeRequest {
  verification_id: string
  verification_code: string
}

/**
 * 验证验证码响应
 */
export interface VerifyCodeResponse {
  verification_token: string
}

/**
 * 登录请求
 */
export interface LoginRequest {
  method: LoginMethod
  verification_token?: string
  phone_number?: string
  password?: string
  email?: string
}

/**
 * 登录响应
 */
export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: User
}

/**
 * 刷新 Token 请求
 */
export interface RefreshTokenRequest {
  refresh_token: string
}

/**
 * 刷新 Token 响应
 */
export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

/**
 * 登出响应
 */
export interface LogoutResponse {
  message: string
}

// ============ 课程相关类型 ============

/**
 * 课程状态
 */
export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

/**
 * 课程信息
 */
export interface Course {
  id: string
  title: string
  description?: string
  coverImage?: string
  price: number
  originalPrice?: number
  category: string
  tags: string[]
  status: CourseStatus
  instructorId: string
  instructorName?: string
  totalLessons: number
  totalDuration: number
  enrolledCount: number
  rating: number
  reviewCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 创建课程请求
 */
export interface CreateCourseRequest {
  title: string
  description?: string
  coverImage?: string
  price: number
  originalPrice?: number
  category: string
  tags?: string[]
  instructorId: string
}

/**
 * 更新课程请求
 */
export interface UpdateCourseRequest {
  title?: string
  description?: string
  coverImage?: string
  price?: number
  originalPrice?: number
  category?: string
  tags?: string[]
  status?: CourseStatus
}

/**
 * 课程列表响应
 */
export type CourseListResponse = PaginatedResponse<Course>

// ============ 订单相关类型 ============

/**
 * 订单状态
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BALANCE = 'balance'
}

/**
 * 订单项
 */
export interface OrderItem {
  courseId: string
  courseTitle: string
  courseCoverImage?: string
  price: number
  quantity: number
  subtotal: number
}

/**
 * 订单信息
 */
export interface Order {
  id: string
  orderNo: string
  userId: string
  userName?: string
  items: OrderItem[]
  totalAmount: number
  paidAmount: number
  status: OrderStatus
  paymentMethod?: PaymentMethod
  paidAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 创建订单请求
 */
export interface CreateOrderRequest {
  items: Array<{
    courseId: string
    quantity: number
  }>
  paymentMethod?: PaymentMethod
}

/**
 * 创建订单响应
 */
export interface CreateOrderResponse {
  orderId: string
  orderNo: string
  totalAmount: number
  paymentUrl?: string
}

/**
 * 订单列表响应
 */
export type OrderListResponse = PaginatedResponse<Order>

// ============ 通用类型 ============

/**
 * 批量删除请求
 */
export interface BatchDeleteRequest {
  ids: string[]
}

/**
 * 批量删除响应
 */
export interface BatchDeleteResponse {
  successCount: number
  failedCount: number
  failedIds?: string[]
}
