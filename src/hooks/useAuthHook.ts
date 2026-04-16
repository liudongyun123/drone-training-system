/**
 * 认证相关 Hooks
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, User, UserRole } from '@/store/authStore';

/**
 * 认证状态 Hook
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    loginError,
    logout,
    updateUserInfo,
    updateUserRole
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    loginError,
    logout,
    updateUserInfo,
    updateUserRole,
    isLoggedIn: isAuthenticated && !!user
  };
}

/**
 * 权限检查 Hook
 */
export function usePermission() {
  const { user, hasPermission, hasAnyPermission, hasRole } = useAuthStore();

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    isAnonymous: user?.isAnonymous ?? true,
    
    // 常用权限快捷检查
    canManageCourses: hasRole(['admin', 'teacher']),
    canViewExams: hasRole(['admin', 'teacher', 'student']),
    canTakeExams: hasPermission('exam:take'),
    canManageFinance: hasRole('admin'),
    canManageUsers: hasRole('admin'),
  };
}

/**
 * 用户信息 Hook
 */
export function useUser() {
  const { user, updateUserInfo } = useAuthStore();

  const getDisplayName = useCallback((): string => {
    if (!user) return '未登录';
    return user.nickname || user.name || user.email || user.phone || '用户';
  }, [user]);

  const getAvatar = useCallback((): string => {
    return user?.avatar || '';
  }, [user]);

  const hasCompletedProfile = useCallback((): boolean => {
    if (!user) return false;
    // 检查是否已设置基本资料
    return !!(user.nickname || user.name || user.email || user.phone);
  }, [user]);

  return {
    user,
    getDisplayName,
    getAvatar,
    hasCompletedProfile
  };
}

/**
 * 登录状态监听 Hook
 */
export function useAuthStateListener(callback: (user: User | null) => void) {
  const { user } = useAuthStore();

  useEffect(() => {
    callback(user);
  }, [user, callback]);
}

/**
 * 角色切换 Hook（用于测试/开发）
 */
export function useRoleSwitcher() {
  const { user, updateUserRole } = useAuthStore();
  const [isDevMode, setIsDevMode] = useState(false);

  const roles: { value: UserRole; label: string }[] = [
    { value: 'anonymous', label: '匿名用户' },
    { value: 'visitor', label: '访客' },
    { value: 'student', label: '学员' },
    { value: 'teacher', label: '教师' },
    { value: 'admin', label: '管理员' }
  ];

  const switchTo = useCallback((role: UserRole) => {
    if (import.meta.env.DEV) {
      updateUserRole(role);
    }
  }, [updateUserRole]);

  const toggleDevMode = useCallback(() => {
    if (import.meta.env.DEV) {
      setIsDevMode(prev => !prev);
    }
  }, []);

  return {
    isDevMode,
    toggleDevMode,
    roles,
    currentRole: user?.role || 'anonymous',
    switchTo,
    isEnabled: import.meta.env.DEV
  };
}

/**
 * 登录表单 Hook
 */
export function useLoginForm() {
  const {
    loginWithPassword,
    loginWithPhone,
    loginWithWechat,
    loginWithAnonymous,
    isLoading,
    loginError
  } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone: '',
    code: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username && !formData.phone) {
      newErrors.username = '请输入用户名或手机号';
    }

    if (!formData.password && !formData.code) {
      newErrors.password = '请输入密码或验证码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handlePasswordLogin = useCallback(async () => {
    if (!validate()) return;
    return loginWithPassword(formData.username, formData.password);
  }, [formData, validate, loginWithPassword]);

  const handlePhoneLogin = useCallback(async () => {
    if (!formData.phone || !formData.code) {
      setErrors({
        phone: !formData.phone ? '请输入手机号' : '',
        code: !formData.code ? '请输入验证码' : ''
      });
      return;
    }
    return loginWithPhone(formData.phone, formData.code);
  }, [formData, loginWithPhone]);

  const handleWechatLogin = useCallback(async () => {
    return loginWithWechat();
  }, [loginWithWechat]);

  const handleAnonymousLogin = useCallback(async () => {
    return loginWithAnonymous();
  }, [loginWithAnonymous]);

  const reset = useCallback(() => {
    setFormData({
      username: '',
      password: '',
      phone: '',
      code: ''
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    isLoading,
    loginError,
    handleChange,
    handlePasswordLogin,
    handlePhoneLogin,
    handleWechatLogin,
    handleAnonymousLogin,
    reset,
    setFormData
  };
}

/**
 * 管理员登录 Hook
 */
export function useAdminLogin() {
  const { adminLogin, isLoading, loginError } = useAuthStore();

  const login = useCallback(async (username: string, password: string) => {
    return adminLogin(username, password);
  }, [adminLogin]);

  return {
    login,
    isLoading,
    loginError,
    isLoggedIn: useAuthStore.getState().isAdmin
  };
}

export default {
  useAuth,
  usePermission,
  useUser,
  useAuthStateListener,
  useRoleSwitcher,
  useLoginForm,
  useAdminLogin
};
