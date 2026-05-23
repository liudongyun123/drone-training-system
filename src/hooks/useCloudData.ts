/**
 * 统一数据加载 Hook
 * 自动处理登录和数据加载
 */

import { useState, useEffect, useCallback } from 'react'
import { checkLogin } from '@/utils/cloudbase'
import { adminService } from '@/services/adminService'

interface UseCloudDataOptions {
  collection: string
  limit?: number
  where?: Record<string, any>
}

export function useCloudData<T>(options: UseCloudDataOptions) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 确保已登录（使用 checkLogin 防止并发请求）
      await checkLogin()

      const result = await adminService.list(options.collection, options.where || {}, {
        limit: options.limit || 100
      })
      
      console.log(`[useCloudData] ${options.collection} 查询结果:`, result)
      
      setData((result?.data?.list || []) as T[])
    } catch (err: any) {
      console.error(`[useCloudData] ${options.collection} 加载失败:`, err)
      setError(err.message || '加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [options.collection, options.limit, options.where])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refresh: fetchData, setData }
}
