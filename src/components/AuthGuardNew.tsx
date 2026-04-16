/**
 * 新版认证守卫组件
 * 支持RBAC权限控制
 */

import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';
import { Loading } from './index';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: UserRole | UserRole[];
  requirePermission?: string | string[];
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * 通用认证守卫
 * 支持多种权限检查方式
 */
export function AuthGuard({
  children,
  requireAuth = false,
  requireRole,
  requirePermission,
  fallback,
  redirectTo,
}: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const { hasPermission } = usePermission();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return;

    // 检查是否需要登录
    if (requireAuth && !isAuthenticated) {
      const loginPath = redirectTo || '/login';
      navigate(loginPath, { state: { from: location.pathname } });
      return;
    }

    // 检查角色权限
    if (requireRole && user) {
      const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
      if (!roles.includes(user.role)) {
        navigate('/', { state: { error: '权限不足' } });
        return;
      }
    }

    // 检查功能权限
    if (requirePermission && user) {
      const permissions = Array.isArray(requirePermission) ? requirePermission : [requirePermission];
      if (!hasPermission(permissions as any)) {
        navigate('/', { state: { error: '权限不足' } });
        return;
      }
    }
  }, [isReady, isLoading, isAuthenticated, user, requireAuth, requireRole, requirePermission, navigate, location, redirectTo, hasPermission]);

  if (!isReady || isLoading) {
    return fallback || <Loading fullScreen />;
  }

  if (requireAuth && !isAuthenticated) {
    return fallback || null;
  }

  if (requireRole && user) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!roles.includes(user.role)) {
      return fallback || null;
    }
  }

  return <>{children}</>;
}

/**
 * 管理员守卫
 */
export function AdminGuard({ children, fallback }: Omit<AuthGuardProps, 'requireRole'>) {
  return (
    <AuthGuard requireRole="admin" fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

/**
 * 教师守卫
 */
export function TeacherGuard({ children, fallback }: Omit<AuthGuardProps, 'requireRole'>) {
  return (
    <AuthGuard requireRole={['teacher', 'admin']} fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

/**
 * 学员守卫
 */
export function StudentGuard({ children, fallback }: Omit<AuthGuardProps, 'requireRole'>) {
  return (
    <AuthGuard requireRole={['student', 'teacher', 'admin']} fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

/**
 * 已登录用户守卫
 */
export function UserGuard({ children, fallback }: Omit<AuthGuardProps, 'requireAuth'>) {
  return (
    <AuthGuard requireAuth fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

export default AuthGuard;
