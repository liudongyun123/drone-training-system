// ============================================================================
// 课程详情 Hook - 共用层
// ============================================================================

import { useState, useEffect } from 'react'
import { courseApi } from '@/shared/services/courseApi'
import type { CourseDetail } from '@/shared/types/course'

interface UseCourseDetailResult {
  course: CourseDetail | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCourseDetail(courseId: string | null): UseCourseDetailResult {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchCourse = async () => {
    if (!courseId) {
      setCourse(null)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await courseApi.getDetail(courseId)
      setCourse(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchCourse()
  }, [courseId])
  
  return {
    course,
    loading,
    error,
    refetch: fetchCourse
  }
}