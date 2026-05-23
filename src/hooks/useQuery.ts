/**
 * 通用数据库查询 Hook（统一通过 adminService HTTP）
 * 统一处理加载状态、错误、分页等
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { adminService } from '@/services/adminService'
import { convertTcbError, getErrorMessage } from '../utils/errors'

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  order?: 'asc' | 'desc'
  where?: Record<string, any>
}

export interface QueryResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  total: number
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

function extractList(result: any): any[] {
  if (!result) return [];
  if (result.data?.list) return result.data.list;
  if (Array.isArray(result.data)) return result.data;
  return [];
}

function extractTotal(result: any): number {
  if (result?.data?.total !== undefined) return result.data.total;
  if (result?.total !== undefined) return result.total;
  return 0;
}

/**
 * 通用数据查询 Hook
 */
export function useQuery<T>(
  collectionName: string,
  options: QueryOptions = {}
): QueryResult<T> {
  const { isLoggedIn } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentOffset, setCurrentOffset] = useState(0)

  const {
    limit = 20,
    orderBy = 'createdAt',
    order = 'desc',
    where
  } = options

  const fetchData = useCallback(async (offset = 0) => {
    // 对于公开集合，不需要登录
    const publicCollections = ['courses', 'announcements', 'banners', 'coupons']
    const requireAuth = !publicCollections.includes(collectionName)
    
    if (requireAuth && !isLoggedIn) {
      console.log(`[useQuery] ${collectionName} 需要登录，当前未登录，跳过查询`);
      return;
    }

    setLoading(true)
    setError(null)

    try {
      const result = await adminService.list(collectionName, where || {}, {
        orderBy,
        order,
        skip: offset,
        limit,
      })

      const newData = extractList(result)
      const totalCount = extractTotal(result)

      if (offset === 0) {
        setData(newData)
      } else {
        setData(prev => [...prev, ...newData])
      }

      setTotal(totalCount)
      setCurrentOffset(offset + newData.length)
      console.log(`[useQuery] ${collectionName} 加载成功:`, newData.length, '条');
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useQuery] 查询 ${collectionName} 异常:`, err)
    } finally {
      setLoading(false)
    }
  }, [collectionName, isLoggedIn, limit, orderBy, order, where])

  // 初始加载
  useEffect(() => {
    const publicCollections = ['courses', 'announcements', 'banners', 'coupons']
    const requireAuth = !publicCollections.includes(collectionName)
    
    if (!requireAuth || isLoggedIn) {
      fetchData(0)
    }
  }, [isLoggedIn, fetchData])

  const refresh = useCallback(async () => {
    await fetchData(0)
  }, [fetchData])

  const loadMore = useCallback(async () => {
    if (!loading && currentOffset < total) {
      await fetchData(currentOffset)
    }
  }, [loading, currentOffset, total, fetchData])

  return {
    data,
    loading,
    error,
    total,
    hasMore: currentOffset < total,
    refresh,
    loadMore
  }
}

/**
 * 单条数据查询 Hook
 */
export function useDocument<T>(
  collectionName: string,
  documentId: string,
  options: { requireAuth?: boolean } = {}
): {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const { isLoggedIn } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { requireAuth = false } = options

  const fetchData = useCallback(async () => {
    if (!documentId) return
    if (requireAuth && !isLoggedIn) return

    setLoading(true)
    setError(null)

    try {
      const result = await adminService.get(collectionName, documentId)

      if (result?.code && result.code !== 0) {
        const appError = convertTcbError(result)
        setError(getErrorMessage(appError))
        console.error(`[useDocument] 查询 ${collectionName}/${documentId} 失败:`, appError)
        return
      }

      if (result?.data && !Array.isArray(result.data)) {
        setData(result.data as T)
      } else if (Array.isArray(result?.data) && result.data.length > 0) {
        setData(result.data[0] as T)
      } else {
        setData(null)
      }
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useDocument] 查询 ${collectionName}/${documentId} 异常:`, err)
    } finally {
      setLoading(false)
    }
  }, [collectionName, documentId, isLoggedIn, requireAuth])

  useEffect(() => {
    const shouldFetch = requireAuth ? isLoggedIn : true
    if (shouldFetch && documentId) {
      fetchData()
    }
  }, [isLoggedIn, documentId, fetchData, requireAuth])

  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return { data, loading, error, refresh }
}
