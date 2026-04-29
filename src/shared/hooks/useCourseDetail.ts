// ============================================================================
// 课程详情 Hook - 共用层
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { courseApi } from '@/shared/services/courseApi'
import type { CourseDetail } from '@/shared/types/course'

interface UseCourseDetailReturn {
  course: CourseDetail | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCourseDetail(courseId: string): UseCourseDetailReturn {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  
  const fetchCourse = async () => {
    if (!courseId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await courseApi.getDetail(courseId)
      if (mountedRef.current) setCourse(data)
    } catch (err: any) {
      if (mountedRef.current) setError(err.message || '获取课程详情失败')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchCourse()
    return () => { mountedRef.current = false }
  }, [courseId])
  
  return {
    course,
    loading,
    error,
    refresh: fetchCourse
  }
}