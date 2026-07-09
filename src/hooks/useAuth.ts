/**
 * 统一认证 Hook
 * 处理 CloudBase 登录（通过 HTTP API）
 */

import { useState, useEffect } from 'react'
import { adminService } from '@/services/adminService'

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const doAuth = async () => {
      try {
        setIsLoading(true)
        
        // 通过 api-auth 云函数验证 Token
        const result = await adminService.callFunction('api-auth', {
          action: 'verifyToken',
          data: {}
        })
        
        if (result?.success || result?.data) {
          setIsLoggedIn(true)
        }
      } catch (err: any) {
        console.error('[useAuth] 登录验证失败:', err)
        setError(err.message || '登录失败')
      } finally {
        setIsLoading(false)
      }
    }

    doAuth()
  }, [])

  return { isLoggedIn, isLoading, error }
}
