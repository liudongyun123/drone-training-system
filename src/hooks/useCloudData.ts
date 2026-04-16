/**
 * 统一数据加载 Hook
 * 自动处理登录和数据加载
 */

import { useState, useEffect, useCallback } from 'react'
import app from '../config/tcb'
import { checkLogin } from '@/utils/cloudbase'

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

      const db = app.database()
      let query = db.collection(options.collection)
      
      // 如果有查询条件
      if (options.where) {
        query = query.where(options.where)
      }
      
      const result = await query.limit(options.limit || 100).get()
      
      console.log(`[useCloudData] ${options.collection} 查询结果:`, result)
      
      if (result.code && result.code !== 0) {
        throw new Error(result.message || '查询失败')
      }
      
      setData(result.data || [])
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
