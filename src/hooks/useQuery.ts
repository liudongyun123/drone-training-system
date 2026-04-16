/**
 * 通用数据库查询 Hook
 * 统一处理加载状态、错误、分页等
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import app from '../config/tcb'
import { AppError, convertTcbError, getErrorMessage } from '../utils/errors'

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
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const {
    limit = 20,
    orderBy = 'createdAt',
    order = 'desc',
    where
  } = options

  const fetchData = useCallback(async (offset = 0) => {
    // 对于公开集合（如 courses），不需要登录
    // 对于私有集合（如 orders, user_progress），需要登录
    const publicCollections = ['courses', 'announcements', 'banners', 'coupons']
    const requireAuth = !publicCollections.includes(collectionName)
    
    // 如果需要登录但用户未登录，跳过查询
    if (requireAuth && !isLoggedIn) {
      console.log(`[useQuery] ${collectionName} 需要登录，当前未登录，跳过查询`);
      return;
    }

    setLoading(true)
    setError(null)

    try {
      // 确保 app 已初始化
      if (!app) {
        console.error(`[useQuery] CloudBase SDK 未初始化`);
        setError('SDK 未初始化');
        return;
      }

      const db = app.database()
      if (!db) {
        console.error(`[useQuery] database() 返回 null`);
        setError('数据库初始化失败');
        return;
      }

      let query = db.collection(collectionName)

      // 添加查询条件
      if (where && Object.keys(where).length > 0) {
        query = query.where(where)
      }

      // 执行查询
      const result = await query
        .orderBy(orderBy, order)
        .skip(offset)
        .limit(limit)
        .get()

      if (result.code) {
        const appError = convertTcbError(result)
        setError(getErrorMessage(appError))
        console.error(`[useQuery] 查询 ${collectionName} 失败:`, appError)
        return
      }

      const newData = result.data || []
      if (offset === 0) {
        setData(newData)
      } else {
        setData(prev => [...prev, ...newData])
      }

      setTotal(result.pager?.Total || newData.length)
      setCurrentOffset(offset + newData.length)
      setInitialLoadDone(true)
      console.log(`[useQuery] ${collectionName} 加载成功:`, newData.length, '条');
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useQuery] 查询 ${collectionName} 异常:`, err)
    } finally {
      setLoading(false)
    }
  }, [collectionName, isLoggedIn, limit, orderBy, order, where])

  // 初始加载 - 公开集合总是加载，私有集合需要登录
  useEffect(() => {
    const publicCollections = ['courses', 'announcements', 'banners', 'coupons']
    const requireAuth = !publicCollections.includes(collectionName)
    
    // 公开集合总是加载，私有集合需要登录
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
 * 支持公开集合（无需登录）
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
    // 如果需要登录且用户未登录，跳过查询
    if (requireAuth && !isLoggedIn) return

    setLoading(true)
    setError(null)

    try {
      const db = app.database()
      const result = await db.collection(collectionName).doc(documentId).get()

      if (result.code) {
        const appError = convertTcbError(result)
        setError(getErrorMessage(appError))
        console.error(`[useDocument] 查询 ${collectionName}/${documentId} 失败:`, appError)
        return
      }

      setData(result.data[0] || null)
    } catch (err: any) {
      const appError = convertTcbError(err)
      setError(getErrorMessage(appError))
      console.error(`[useDocument] 查询 ${collectionName}/${documentId} 异常:`, err)
    } finally {
      setLoading(false)
    }
  }, [collectionName, documentId, isLoggedIn, requireAuth])

  useEffect(() => {
    // 公开集合：直接查询；私有集合：需要登录
    const shouldFetch = requireAuth ? isLoggedIn : true
    if (shouldFetch && documentId) {
      fetchData()
    }
  }, [isLoggedIn, documentId, fetchData, requireAuth])

  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh
  }
}
