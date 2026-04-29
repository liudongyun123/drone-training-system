// ============================================================================
// 培训班详情 Hook - 共用层
// Web端、后台都可用
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { classApi } from '@/shared/services/classApi'
import type { TrainingClass, Teacher } from '@/shared/types/class'
import type { Course } from '@/shared/types/course'

interface ClassDetail {
  class: TrainingClass
  includedCourses: Course[]
  teacher: Teacher | null
}

interface UseClassDetailOptions {
  classId: string
  autoLoad?: boolean
}

interface UseClassDetailResult {
  detail: ClassDetail | null
  loading: boolean
  error: Error | null
  
  // 方法
  refresh: () => Promise<void>
}

export function useClassDetail(options: UseClassDetailOptions): UseClassDetailResult {
  const { classId, autoLoad = true } = options
  
  const [detail, setDetail] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // 加载培训班详情
  const loadDetail = useCallback(async () => {
    if (!classId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await classApi.getDetail(classId)
      setDetail(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [classId])
  
  // 初始加载
  useEffect(() => {
    if (autoLoad && classId) {
      loadDetail()
    }
  }, [autoLoad, classId, loadDetail])
  
  // 刷新
  const refresh = useCallback(async () => {
    await loadDetail()
  }, [loadDetail])
  
  return {
    detail,
    loading,
    error,
    refresh
  }
}
