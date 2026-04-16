/**
 * 权限守卫组件
 * 用于控制组件/功能的显示与隐藏
 */

import React from 'react';
import { useAuthStore, Permission, UserRole } from '../../store/authStore';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // 是否需要满足所有权限，默认为false（满足任一即可）
  role?: UserRole | UserRole[];
  fallback?: React.ReactNode; // 无权限时的显示内容
}

/**
 * 权限守卫组件
 * 根据用户权限决定是否渲染子组件
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasRole } = useAuthStore();

  // 检查权限
  const checkPermission = (): boolean => {
    // 如果有指定角色，先检查角色
    if (role) {
      if (!hasRole(role)) {
        return false;
      }
    }

    // 检查单一权限
    if (permission) {
      if (!hasPermission(permission)) {
        return false;
      }
    }

    // 检查多个权限
    if (permissions && permissions.length > 0) {
      if (requireAll) {
        // 需要满足所有权限
        return permissions.every((p) => hasPermission(p));
      } else {
        // 满足任一即可
        return hasAnyPermission(permissions);
      }
    }

    return true;
  };

  if (!checkPermission()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * 管理员专用守卫
 */
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  return (
    <PermissionGuard role="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

/**
 * 教师及以上守卫
 */
export const TeacherAndAbove: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  return (
    <PermissionGuard role={['teacher', 'admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

/**
 * 学员及以上守卫
 */
export const StudentAndAbove: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  return (
    <PermissionGuard role={['student', 'teacher', 'admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
};

/**
 * 已登录用户守卫（排除游客）
 */
export const AuthenticatedOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || user?.isAnonymous) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * 禁用状态包装器
 * 无权限时显示禁用状态而非隐藏
 */
export const PermissionDisabled: React.FC<{
  children: React.ReactNode;
  permission?: Permission;
  disabledClassName?: string;
  tooltip?: string;
}> = ({ children, permission, disabledClassName = 'opacity-50 pointer-events-none', tooltip }) => {
  const { hasPermission } = useAuthStore();

  if (permission && !hasPermission(permission)) {
    return (
      <div className={disabledClassName} title={tooltip || '无权限操作'}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
