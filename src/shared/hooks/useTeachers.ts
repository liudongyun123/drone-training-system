// ============================================================================
// 教师列表 Hook - 共用层
// Web端、后台都可用
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { teacherApi } from '@/shared/services/classApi'
import type { Teacher } from '@/shared/types/class'

interface UseTeachersOptions {
  autoLoad?: boolean
}

interface UseTeachersResult {
  teachers: Teacher[]
  currentTeacher: Teacher | null
  loading: boolean
  error: Error | null
  
  // 方法
  refresh: () => Promise<void>
  getDetail: (teacherId: string) => Promise<Teacher | null>
}

export function useTeachers(options: UseTeachersOptions = {}): UseTeachersResult {
  const { autoLoad = true } = options
  
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // 加载教师列表
  const loadTeachers = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await teacherApi.getList()
      setTeachers(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 初始加载
  useEffect(() => {
    if (autoLoad) {
      loadTeachers()
    }
  }, [autoLoad, loadTeachers])
  
  // 刷新
  const refresh = useCallback(async () => {
    await loadTeachers()
  }, [loadTeachers])
  
  // 获取教师详情
  const getDetail = useCallback(async (teacherId: string): Promise<Teacher | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const teacher = await teacherApi.getDetail(teacherId)
      setCurrentTeacher(teacher)
      return teacher
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    teachers,
    currentTeacher,
    loading,
    error,
    refresh,
    getDetail
  }
}
