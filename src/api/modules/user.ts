/**
 * 用户管理 API 模块
 * 处理用户的 CRUD 操作
 */

import apiClient from '../client'
import type {
  ApiResponse,
  QueryParams,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserListResponse,
  BatchDeleteRequest,
  BatchDeleteResponse,
  UserRole,
  UserStatus
} from '../types'

// ============ 用户列表 ============

/**
 * 获取用户列表
 */
export async function getUserList(
  params?: QueryParams
): Promise<ApiResponse<UserListResponse>> {
  return apiClient.get('/api/v1/users', { params })
}

/**
 * 搜索用户
 */
export async function searchUsers(
  keyword: string,
  params?: Omit<QueryParams, 'keyword'>
): Promise<ApiResponse<UserListResponse>> {
  return apiClient.get('/api/v1/users/search', {
    params: { ...params, keyword }
  })
}

// ============ 用户详情 ============

/**
 * 获取用户详情
 */
export async function getUserById(
  userId: string
): Promise<ApiResponse<User>> {
  return apiClient.get(`/api/v1/users/${userId}`)
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return apiClient.get('/api/v1/users/me')
}

// ============ 用户创建 ============

/**
 * 创建用户
 */
export async function createUser(
  request: CreateUserRequest
): Promise<ApiResponse<User>> {
  return apiClient.post('/api/v1/users', request)
}

/**
 * 批量创建用户
 */
export async function batchCreateUsers(
  users: CreateUserRequest[]
): Promise<ApiResponse<{ users: User[], failed: Array<{ index: number, error: string }> }>> {
  return apiClient.post('/api/v1/users/batch', { users })
}

// ============ 用户更新 ============

/**
 * 更新用户
 */
export async function updateUser(
  userId: string,
  request: UpdateUserRequest
): Promise<ApiResponse<User>> {
  return apiClient.patch(`/api/v1/users/${userId}`, request)
}

/**
 * 更新用户状态
 */
export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<ApiResponse<User>> {
  return apiClient.patch(`/api/v1/users/${userId}/status`, { status })
}

/**
 * 更新用户角色
 */
export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<ApiResponse<User>> {
  return apiClient.patch(`/api/v1/users/${userId}/role`, { role })
}

/**
 * 更新用户头像
 */
export async function updateUserAvatar(
  userId: string,
  avatarUrl: string
): Promise<ApiResponse<{ avatar: string }>> {
  return apiClient.patch(`/api/v1/users/${userId}/avatar`, { avatar: avatarUrl })
}

// ============ 用户删除 ============

/**
 * 删除用户
 */
export async function deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
  return apiClient.delete(`/api/v1/users/${userId}`)
}

/**
 * 批量删除用户
 */
export async function batchDeleteUsers(
  request: BatchDeleteRequest
): Promise<ApiResponse<BatchDeleteResponse>> {
  return apiClient.post('/api/v1/users/batch-delete', request)
}

// ============ 用户统计 ============

/**
 * 获取用户统计信息
 */
export async function getUserStats(): Promise<ApiResponse<{
  total: number
  active: number
  disabled: number
  pending: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
}>> {
  return apiClient.get('/api/v1/users/stats')
}

// ============ 导出 ============

const userApi = {
  // 用户列表
  getUserList,
  searchUsers,
  
  // 用户详情
  getUserById,
  getCurrentUser,
  
  // 用户创建
  createUser,
  batchCreateUsers,
  
  // 用户更新
  updateUser,
  updateUserStatus,
  updateUserRole,
  updateUserAvatar,
  
  // 用户删除
  deleteUser,
  batchDeleteUsers,
  
  // 用户统计
  getUserStats
}

export default userApi
