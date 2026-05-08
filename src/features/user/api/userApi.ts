/**
 * User API - 用户接口
 */

import { platform } from '../../../platform/adapters';
import { BaseResponse } from '../../../platform/adapters/IRequestAdapter';
import { apiCache } from '../../../infrastructure/cache/CacheManager';
import { apiMonitor } from '../../../infrastructure/monitor/APIMonitor';
import { apiLogger, authLogger } from '../../../infrastructure/logger/Logger';
import type {
  User,
  LoginParams,
  LoginResult,
  RegisterParams,
  ResetPasswordParams,
  UserProfile,
} from '../types/User';

// ============================================================================
// API 端点
// ============================================================================

const endpoints = {
  // 认证
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  refreshToken: '/auth/refresh',
  
  // 用户
  profile: '/user/profile',
  updateProfile: '/user/profile',
  changePassword: '/user/password',
  resetPassword: '/user/reset-password',
  
  // 验证码
  sendCode: '/auth/code/send',
  verifyCode: '/auth/code/verify',
};

// ============================================================================
// 认证 API 函数
// ============================================================================

/**
 * 用户登录
 */
export async function login(
  params: LoginParams
): Promise<BaseResponse<LoginResult>> {
  authLogger.info('[Auth] 用户登录', { type: params.type, phone: params.phone });
  
  return apiMonitor.track('POST', endpoints.login, () =>
    platform.request.post<BaseResponse<LoginResult>>(endpoints.login, params)
  );
}

/**
 * 用户注册
 */
export async function register(
  params: RegisterParams
): Promise<BaseResponse<LoginResult>> {
  authLogger.info('[Auth] 用户注册', { phone: params.phone });
  
  return apiMonitor.track('POST', endpoints.register, () =>
    platform.request.post<BaseResponse<LoginResult>>(endpoints.register, params)
  );
}

/**
 * 用户登出
 */
export async function logout(): Promise<BaseResponse<void>> {
  authLogger.info('[Auth] 用户登出');
  
  // 清除用户缓存
  apiCache.invalidate(endpoints.profile);
  
  return apiMonitor.track('POST', endpoints.logout, () =>
    platform.request.post(endpoints.logout)
  );
}

/**
 * 刷新令牌
 */
export async function refreshToken(
  refreshToken: string
): Promise<BaseResponse<LoginResult>> {
  return apiMonitor.track('POST', endpoints.refreshToken, () =>
    platform.request.post<BaseResponse<LoginResult>>(endpoints.refreshToken, {
      refreshToken,
    })
  );
}

// ============================================================================
// 用户 API 函数
// ============================================================================

/**
 * 获取用户资料
 */
export async function getProfile(): Promise<BaseResponse<UserProfile>> {
  return apiMonitor.track('GET', endpoints.profile, () =>
    apiCache.get<UserProfile>(endpoints.profile, undefined, {
      ttl: 5 * 60 * 1000, // 5分钟缓存
      key: 'user_profile',
    })
  );
}

/**
 * 更新用户资料
 */
export async function updateProfile(
  data: Partial<User>
): Promise<BaseResponse<User>> {
  authLogger.info('[User] 更新资料', data);
  
  // 清除用户缓存
  apiCache.invalidate(endpoints.profile);
  
  return apiMonitor.track('PUT', endpoints.updateProfile, () =>
    platform.request.put<BaseResponse<User>>(endpoints.updateProfile, data)
  );
}

/**
 * 修改密码
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<BaseResponse<void>> {
  authLogger.info('[User] 修改密码');
  
  return apiMonitor.track('POST', endpoints.changePassword, () =>
    platform.request.post<BaseResponse<void>>(endpoints.changePassword, {
      oldPassword,
      newPassword,
    })
  );
}

/**
 * 重置密码
 */
export async function resetPassword(
  params: ResetPasswordParams
): Promise<BaseResponse<void>> {
  authLogger.info('[User] 重置密码', { phone: params.phone });
  
  return apiMonitor.track('POST', endpoints.resetPassword, () =>
    platform.request.post<BaseResponse<void>>(endpoints.resetPassword, params)
  );
}

// ============================================================================
// 验证码 API 函数
// ============================================================================

/**
 * 发送验证码
 */
export async function sendCode(
  phone: string,
  type: 'login' | 'register' | 'reset_password' | 'bind_phone'
): Promise<BaseResponse<void>> {
  authLogger.info('[Auth] 发送验证码', { phone, type });
  
  return apiMonitor.track('POST', endpoints.sendCode, () =>
    platform.request.post<BaseResponse<void>>(endpoints.sendCode, {
      phone,
      type,
    })
  );
}

/**
 * 验证验证码
 */
export async function verifyCode(
  phone: string,
  code: string,
  type: string
): Promise<BaseResponse<{ valid: boolean }>> {
  return apiMonitor.track('POST', endpoints.verifyCode, () =>
    platform.request.post<BaseResponse<{ valid: boolean }>>(endpoints.verifyCode, {
      phone,
      code,
      type,
    })
  );
}

// ============================================================================
// 导出
// ============================================================================

export const userApi = {
  // 认证
  login,
  register,
  logout,
  refreshToken,
  
  // 用户
  getProfile,
  updateProfile,
  changePassword,
  resetPassword,
  
  // 验证码
  sendCode,
  verifyCode,
};

export default userApi;
