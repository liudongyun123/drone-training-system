/**
 * useUserProfile - 用户资料 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../api/userApi';
import type { UserProfile, User } from '../types/User';
import { apiLogger } from '../../../infrastructure/logger/Logger';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseUserProfileResult {
  /** 用户资料 */
  profile: UserProfile | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 刷新 */
  refresh: () => Promise<void>;
  /** 更新资料 */
  updateProfile: (data: Partial<User>) => Promise<void>;
  /** 修改密码 */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载用户资料
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userApi.getProfile();

      if (response.code === 0) {
        setProfile(response.data);
      } else {
        throw new Error(response.message || '获取用户资料失败');
      }
    } catch (err) {
      setError(err as Error);
      apiLogger.error('[User] 获取用户资料失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 刷新
  const refresh = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // 更新资料
  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      try {
        const response = await userApi.updateProfile(data);

        if (response.code === 0) {
          setProfile(prev => prev ? { ...prev, ...response.data } : null);
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[User] 更新资料失败', { data, error: err });
        throw err;
      }
    },
    []
  );

  // 修改密码
  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      try {
        const response = await userApi.changePassword(oldPassword, newPassword);

        if (response.code !== 0) {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[User] 修改密码失败', { error: err });
        throw err;
      }
    },
    []
  );

  return {
    profile,
    loading,
    error,
    refresh,
    updateProfile,
    changePassword,
  };
}
