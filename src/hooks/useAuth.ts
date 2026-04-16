/**
 * 统一认证 Hook
 * 处理 CloudBase 匿名登录
 */

import { useState, useEffect } from 'react'
import { checkLogin } from '@/utils/cloudbase'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const doAuth = async () => {
      try {
        setIsLoading(true)
        
        // 使用 checkLogin 防止并发请求
        const session = await checkLogin()
        console.log('[useAuth] 登录状态:', session)
        
        setIsLoggedIn(true)
      } catch (err: any) {
        console.error('[useAuth] 登录失败:', err)
        setError(err.message || '登录失败')
      } finally {
        setIsLoading(false)
      }
    }

    doAuth()
  }, [])

  return { isLoggedIn, isLoading, error }
}
