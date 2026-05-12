/**
 * 认证 API 模块
 * 处理用户登录、注册、Token 管理等
 */

import apiClient from '../client'
import type {
  ApiResponse,
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
  User
} from '../types'

// ============ 短信验证码 ============

/**
 * 发送短信验证码
 */
export async function sendVerificationCode(
  request: SendVerificationCodeRequest
): Promise<ApiResponse<SendVerificationCodeResponse>> {
  return apiClient.post('/auth/v1/verification', request)
}

/**
 * 验证验证码
 */
export async function verifyCode(
  request: VerifyCodeRequest
): Promise<ApiResponse<VerifyCodeResponse>> {
  return apiClient.post('/auth/v1/verification/verify', request)
}

// ============ 登录 ============

/**
 * 用户登录
 */
export async function login(
  request: LoginRequest
): Promise<ApiResponse<LoginResponse>> {
  return apiClient.post('/auth/v1/signin', request)
}

/**
 * 登出
 */
export async function logout(): Promise<ApiResponse<LogoutResponse>> {
  return apiClient.post('/auth/v1/signout')
}

// ============ Token 管理 ============

/**
 * 刷新 Access Token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<ApiResponse<RefreshTokenResponse>> {
  return apiClient.post('/auth/v1/refresh', { refresh_token: refreshToken })
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return apiClient.get('/auth/v1/me')
}

// ============ 密码管理 ============

/**
 * 修改密码
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  return apiClient.post('/auth/v1/change-password', {
    old_password: oldPassword,
    new_password: newPassword
  })
}

/**
 * 重置密码（通过验证码）
 */
export async function resetPassword(
  verificationId: string,
  verificationCode: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  return apiClient.post('/auth/v1/reset-password', {
    verification_id: verificationId,
    verification_code: verificationCode,
    new_password: newPassword
  })
}

// ============ 第三方登录 ============

/**
 * 微信登录
 */
export async function wechatLogin(
  code: string
): Promise<ApiResponse<LoginResponse>> {
  return apiClient.post('/auth/v1/wechat/signin', { code })
}

// ============ 导出 ============

const authApi = {
  // 短信验证码
  sendVerificationCode,
  verifyCode,
  
  // 登录
  login,
  logout,
  
  // Token 管理
  refreshAccessToken,
  getCurrentUser,
  
  // 密码管理
  changePassword,
  resetPassword,
  
  // 第三方登录
  wechatLogin
}

export default authApi
