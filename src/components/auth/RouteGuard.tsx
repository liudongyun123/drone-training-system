/**
 * 路由守卫组件
 * 用于保护路由，检查用户权限
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Loader2, Lock } from 'lucide-react';
import { useAuthStore, Permission, UserRole } from '../../store/authStore';

interface RouteGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  role?: UserRole | UserRole[];
  requireAuth?: boolean; // 是否需要登录
  redirectTo?: string; // 无权限时重定向路径
  allowAnonymous?: boolean; // 是否允许游客访问
}

/**
 * 路由守卫组件
 * 检查用户权限，无权限时重定向
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  permission,
  permissions,
  role,
  requireAuth = false,
  redirectTo = '/login',
  allowAnonymous = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, hasPermission, hasAnyPermission, hasRole } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      // 需要登录但未登录
      if (requireAuth && !isAuthenticated) {
        setHasAccess(false);
        navigate(redirectTo, { state: { from: location.pathname } });
        return;
      }

      // 不允许游客但当前是游客
      if (!allowAnonymous && user?.isAnonymous) {
        setHasAccess(false);
        navigate(redirectTo, { state: { from: location.pathname, message: '请先登录' } });
        return;
      }

      // 检查角色
      if (role) {
        if (!hasRole(role)) {
          setHasAccess(false);
          navigate('/403');
          return;
        }
      }

      // 检查权限
      if (permission && !hasPermission(permission)) {
        setHasAccess(false);
        navigate('/403');
        return;
      }

      // 检查多个权限
      if (permissions && permissions.length > 0) {
        if (!hasAnyPermission(permissions)) {
          setHasAccess(false);
          navigate('/403');
          return;
        }
      }

      setHasAccess(true);
    };

    checkAccess();
    setIsChecking(false);
  }, [isAuthenticated, user, permission, permissions, role, requireAuth, allowAnonymous, redirectTo, navigate, location, hasPermission, hasAnyPermission, hasRole]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-[#0F3460] animate-spin" />
          <p className="text-gray-500">检查权限中...</p>
        </motion.div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">访问被拒绝</h2>
          <p className="text-gray-500 mb-6">您没有权限访问此页面</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-[#0F3460] text-white rounded-lg hover:bg-[#1A1A2E] transition-colors"
          >
            返回首页
          </button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * 管理员路由守卫
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RouteGuard role="admin" requireAuth allowAnonymous={false}>
      {children}
    </RouteGuard>
  );
};

/**
 * 教师路由守卫
 */
export const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RouteGuard role={['teacher', 'admin']} requireAuth allowAnonymous={false}>
      {children}
    </RouteGuard>
  );
};

/**
 * 学员路由守卫
 */
export const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RouteGuard role={['student', 'teacher', 'admin']} requireAuth allowAnonymous={false}>
      {children}
    </RouteGuard>
  );
};

/**
 * 需要登录的路由守卫
 */
export const AuthRoute: React.FC<{ children: React.ReactNode; allowAnonymous?: boolean }> = ({
  children,
  allowAnonymous = true,
}) => {
  return (
    <RouteGuard requireAuth allowAnonymous={allowAnonymous}>
      {children}
    </RouteGuard>
  );
};

export default RouteGuard;
