// ============================================================================
// 课程列表 Hook - 共用层
// Web端和移动端都用这个 Hook 获取课程数据
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { courseApi } from '@/shared/services/courseApi'
import type { Course, CourseFilters, CourseListResponse } from '@/shared/types/course'

interface UseCourseListOptions {
  /** 初始筛选条件 */
  initialFilters?: CourseFilters
  /** 是否自动加载 */
  autoLoad?: boolean
}

interface UseCourseListReturn {
  /** 课程列表 */
  courses: Course[]
  /** 加载状态 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 总数 */
  total: number
  /** 当前页 */
  page: number
  /** 是否有更多 */
  hasMore: number
  /** 筛选条件 */
  filters: CourseFilters
  /** 更新筛选条件 */
  setFilters: (filters: Partial<CourseFilters>) => void
  /** 刷新列表 */
  refresh: () => void
  /** 加载更多（移动端无限滚动） */
  loadMore: () => void
  /** 重置筛选 */
  resetFilters: () => void
}

export function useCourseList(options: UseCourseListOptions = {}): UseCourseListReturn {
  const { initialFilters = {}, autoLoad = true } = options
  
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(0)
  const [filters, setFiltersState] = useState<CourseFilters>({
    page: 1,
    pageSize: 10,
    ...initialFilters
  })
  
  const mountedRef = useRef(true)
  
  // 清理函数
  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // 获取课程数据
  const fetchCourses = useCallback(async (newFilters: CourseFilters, append = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const response: CourseListResponse = await courseApi.getList(newFilters)
      
      if (!mountedRef.current) return
      
      if (append) {
        // 无限滚动：追加数据
        setCourses(prev => [...prev, ...response.courses])
      } else {
        // 翻页或筛选：替换数据
        setCourses(response.courses)
      }
      
      setTotal(response.total)
      setPage(response.page)
      setHasMore(response.hasMore ? 1 : 0)
    } catch (err: any) {
      if (!mountedRef.current) return
      setError(err.message || '获取课程列表失败')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      fetchCourses(filters)
    }
  }, [autoLoad, filters, fetchCourses])

  // 更新筛选条件
  const setFilters = useCallback((partial: Partial<CourseFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...partial,
      page: 1  // 筛选条件变化时重置到第1页
    }))
  }, [])

  // 刷新列表
  const refresh = useCallback(() => {
    fetchCourses({ ...filters, page: 1 })
  }, [filters, fetchCourses])

  // 加载更多（移动端无限滚动）
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    
    const nextPage = page + 1
    fetchCourses({ ...filters, page: nextPage }, true)
  }, [loading, hasMore, page, filters, fetchCourses])

  // 重置筛选
  const resetFilters = useCallback(() => {
    setFiltersState({
      page: 1,
      pageSize: 10,
      ...initialFilters
    })
  }, [initialFilters])

  return {
    courses,
    loading,
    error,
    total,
    page,
    hasMore,
    filters,
    setFilters,
    refresh,
    loadMore,
    resetFilters
  }
}