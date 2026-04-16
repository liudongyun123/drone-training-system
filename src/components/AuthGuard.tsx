/**
 * 权限守卫组件
 * 保护需要登录的路由
 * 根据路径自动选择正确的登录页面
 */

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin } = useAuthStore()

  useEffect(() => {
    // 检查本地存储的登录状态
    const adminAuth = localStorage.getItem('admin_auth')
    const isLoggedIn = isAuthenticated || !!adminAuth

    // 判断当前路径是否为管理后台路径
    const isAdminPath = location.pathname.startsWith('/admin')

    if (!isLoggedIn) {
      // 未登录，根据路径重定向到相应的登录页
      if (isAdminPath) {
        // 管理后台路径 → 重定向到管理员登录页
        navigate('/admin/login', {
          replace: true,
          state: { from: location.pathname }
        })
      } else {
        // 普通用户路径 → 重定向到用户登录页
        navigate('/login', {
          replace: true,
          state: { from: location.pathname }
        })
      }
      return
    }

    // 已登录但需要管理员权限
    if (requireAdmin && !isAdmin && !adminAuth) {
      // 非管理员访问管理后台 → 返回首页
      navigate('/', { replace: true })
      return
    }
  }, [isAuthenticated, isAdmin, navigate, location, requireAdmin])

  // 未登录时不渲染子组件
  const adminAuth = localStorage.getItem('admin_auth')
  const isLoggedIn = isAuthenticated || !!adminAuth

  if (!isLoggedIn) {
    return null
  }

  // 如果需要管理员权限但当前用户不是管理员
  if (requireAdmin && !isAdmin && !adminAuth) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
