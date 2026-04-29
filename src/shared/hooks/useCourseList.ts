// ============================================================================
// 课程列表 Hook - 共用层
// Web端、后台都可用，移动端用小程序适配版
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { courseApi } from '@/shared/services/courseApi'
import type { Course, CourseFilters, CourseListResponse } from '@/shared/types/course'

interface UseCourseListOptions {
  filters?: CourseFilters
  autoLoad?: boolean
}

interface UseCourseListResult {
  courses: Course[]
  total: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  page: number
  
  // 方法
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  setFilters: (filters: CourseFilters) => void
}

export function useCourseList(options: UseCourseListOptions = {}): UseCourseListResult {
  const { filters = {}, autoLoad = true } = options
  
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<CourseFilters>(filters)
  
  // 加载课程列表
  const loadCourses = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const result: CourseListResponse = await courseApi.getList({
        ...currentFilters,
        page: pageNum,
        pageSize: currentFilters.pageSize || 10
      })
      
      if (append) {
        setCourses(prev => [...prev, ...result.courses])
      } else {
        setCourses(result.courses)
      }
      
      setTotal(result.total)
      setHasMore(result.hasMore)
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
      loadCourses(1)
    }
  }, [autoLoad, loadCourses])
  
  // 加载更多（无限滚动场景）
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await loadCourses(page + 1, true)
  }, [hasMore, loading, page, loadCourses])
  
  // 刷新
  const refresh = useCallback(async () => {
    setPage(1)
    await loadCourses(1)
  }, [loadCourses])
  
  // 设置筛选条件
  const setFilters = useCallback((newFilters: CourseFilters) => {
    setCurrentFilters(newFilters)
    setPage(1)
  }, [])
  
  return {
    courses,
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