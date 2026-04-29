// ============================================================================
// 培训班列表 Hook - 共用层
// Web端、后台都可用
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { classApi } from '@/shared/services/classApi'
import type { TrainingClass } from '@/shared/types/class'

interface ClassListFilters {
  status?: TrainingClass['status']
  teacherId?: string
  keyword?: string
  page?: number
  pageSize?: number
}

interface UseClassListOptions {
  filters?: ClassListFilters
  autoLoad?: boolean
}

interface UseClassListResult {
  classes: TrainingClass[]
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  page: number
  
  // 方法
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: ClassListFilters) => void
}

export function useClassList(options: UseClassListOptions = {}): UseClassListResult {
  const { filters = {}, autoLoad = true } = options
  
  const [classes, setClasses] = useState<TrainingClass[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<ClassListFilters>(filters)
  
  // 加载培训班列表
  const loadClasses = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await classApi.getList({
        ...currentFilters,
        page: pageNum,
        pageSize: currentFilters.pageSize || 10
      })
      
      if (append) {
        setClasses(prev => [...prev, ...result.classes])
      } else {
        setClasses(result.classes)
      }
      
      setTotal(result.total)
      setHasMore((pageNum * (currentFilters.pageSize || 10)) < result.total)
      setPage(pageNum)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [currentFilters])
  
  // 初始加载
  useEffect(() => {
    if (autoLoad) {
      loadClasses(1)
    }
  }, [autoLoad, loadClasses])
  
  // 加载更多
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await loadClasses(page + 1, true)
  }, [hasMore, loading, page, loadClasses])
  
  // 刷新
  const refresh = useCallback(async () => {
    setPage(1)
    await loadClasses(1)
  }, [loadClasses])
  
  // 设置筛选条件
  const setFilters = useCallback((newFilters: ClassListFilters) => {
    setCurrentFilters(newFilters)
    setPage(1)
  }, [])
  
  return {
    classes,
    total,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refresh,
    setFilters
  }
}
