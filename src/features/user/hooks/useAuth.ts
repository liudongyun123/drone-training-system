/**
 * useAuth - 认证 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { userApi } from '../api/userApi';
import { storageAdapter } from '../../../platform/adapters';
import type { LoginParams, LoginResult, RegisterParams } from '../types/User';
import { apiLogger } from '../../../infrastructure/logger/Logger';

// ============================================================================
// 常量
// ============================================================================

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_info';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseAuthResult {
  /** 当前用户 */
  user: any | null;
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 加载状态 */
  loading: boolean;
  /** 登录 */
  login: (params: LoginParams) => Promise<LoginResult>;
  /** 注册 */
  register: (params: RegisterParams) => Promise<LoginResult>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 发送验证码 */
  sendCode: (phone: string, type: string) => Promise<void>;
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = storageAdapter.get<string>(TOKEN_KEY);
        if (token) {
          // 获取用户信息
          const response = await userApi.getProfile();
          if (response.code === 0) {
            setUser(response.data);
          } else {
            // token 无效，清除
            storageAdapter.remove(TOKEN_KEY);
            storageAdapter.remove(REFRESH_TOKEN_KEY);
          }
        }
      } catch (error) {
        apiLogger.error('[Auth] 检查登录状态失败', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // 登录
  const login = useCallback(async (params: LoginParams) => {
    try {
      const response = await userApi.login(params);
      
      if (response.code === 0) {
        const { user: loggedInUser, accessToken, refreshToken, expiresIn } = response.data;
        
        // 保存 token
        storageAdapter.set(TOKEN_KEY, accessToken, expiresIn * 1000);
        storageAdapter.set(REFRESH_TOKEN_KEY, refreshToken, 30 * 24 * 60 * 60 * 1000);
        storageAdapter.set(USER_KEY, loggedInUser);
        
        setUser(loggedInUser);
        
        return response.data;
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      apiLogger.error('[Auth] 登录失败', error);
      throw error;
    }
  }, []);

  // 注册
  const register = useCallback(async (params: RegisterParams) => {
    try {
      const response = await userApi.register(params);
      
      if (response.code === 0) {
        const { user: newUser, accessToken, refreshToken, expiresIn } = response.data;
        
        // 保存 token
        storageAdapter.set(TOKEN_KEY, accessToken, expiresIn * 1000);
        storageAdapter.set(REFRESH_TOKEN_KEY, refreshToken, 30 * 24 * 60 * 60 * 1000);
        storageAdapter.set(USER_KEY, newUser);
        
        setUser(newUser);
        
        return response.data;
      } else {
        throw new Error(response.message || '注册失败');
      }
    } catch (error) {
      apiLogger.error('[Auth] 注册失败', error);
      throw error;
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await userApi.logout();
    } catch (error) {
      apiLogger.error('[Auth] 登出请求失败', error);
    } finally {
      // 清除本地数据
      storageAdapter.remove(TOKEN_KEY);
      storageAdapter.remove(REFRESH_TOKEN_KEY);
      storageAdapter.remove(USER_KEY);
      setUser(null);
    }
  }, []);

  // 发送验证码
  const sendCode = useCallback(async (phone: string, type: string) => {
    try {
      const response = await userApi.sendCode(phone, type as any);
      if (response.code !== 0) {
        throw new Error(response.message || '发送验证码失败');
      }
    } catch (error) {
      apiLogger.error('[Auth] 发送验证码失败', { phone, type, error });
      throw error;
    }
  }, []);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const response = await userApi.getProfile();
      if (response.code === 0) {
        setUser(response.data);
        storageAdapter.set(USER_KEY, response.data);
      }
    } catch (error) {
      apiLogger.error('[Auth] 刷新用户信息失败', error);
    }
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    sendCode,
    refreshUser,
  };
}
