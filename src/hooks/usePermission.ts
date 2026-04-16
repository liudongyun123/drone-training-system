/**
 * 权限相关自定义 Hooks
 */

import { useCallback } from 'react';
import { useAuthStore, Permission, UserRole } from '../store/authStore';

/**
 * 权限检查 Hook
 * 提供便捷的权限检查方法
 */
export const usePermission = () => {
  const { user, hasPermission, hasAnyPermission, hasRole } = useAuthStore();

  /**
   * 检查是否有指定权限
   */
  const can = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(permission);
    },
    [hasPermission]
  );

  /**
   * 检查是否有任一权限
   */
  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      return hasAnyPermission(permissions);
    },
    [hasAnyPermission]
  );

  /**
   * 检查是否有所有权限
   */
  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  /**
   * 检查是否是管理员
   */
  const isAdmin = user?.role === 'admin';

  /**
   * 检查是否是教师
   */
  const isTeacher = user?.role === 'teacher' || isAdmin;

  /**
   * 检查是否是学员
   */
  const isStudent = user?.role === 'student' || isTeacher;

  /**
   * 检查是否是游客
   */
  const isAnonymous = user?.isAnonymous ?? true;

  /**
   * 检查是否已登录
   */
  const isAuthenticated = !!user && !user.isAnonymous;

  /**
   * 检查角色
   */
  const hasRoleCheck = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      return hasRole(role);
    },
    [hasRole]
  );

  /**
   * 检查课程访问权限
   */
  const canAccessCourse = useCallback(
    (courseId: string): boolean => {
      if (isAdmin || user?.role === 'teacher') return true;
      if (user?.role === 'student') {
        return user.enrolledCourses?.includes(courseId) ?? false;
      }
      return false;
    },
    [user, isAdmin]
  );

  /**
   * 检查考试权限
   */
  const canTakeExam = useCallback((): boolean => {
    return hasPermission('exam:take');
  }, [hasPermission]);

  /**
   * 检查题库练习权限
   */
  const canPractice = useCallback((): boolean => {
    return hasPermission('practice:do');
  }, [hasPermission]);

  /**
   * 检查后台访问权限
   */
  const canAccessAdmin = useCallback((): boolean => {
    return hasPermission('admin:dashboard') || isAdmin;
  }, [hasPermission, isAdmin]);

  return {
    // 权限检查
    can,
    canAny,
    canAll,

    // 角色检查
    isRole: hasRoleCheck,
    isAdmin,
    isTeacher,
    isStudent,
    isAnonymous,
    isAuthenticated,

    // 特定功能权限
    canAccessCourse,
    canTakeExam,
    canPractice,
    canAccessAdmin,

    // 原始数据
    user,
    role: user?.role,
    permissions: user?.permissions,
  };
};

/**
 * 简化版权限 Hook
 * 仅返回基本的权限状态
 */
export const useAuth = () => {
  const { user, isAuthenticated, loginWithAnonymous, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isAnonymous: user?.isAnonymous ?? true,
    role: user?.role,
    loginWithAnonymous,
    logout,
  };
};

export default usePermission;
