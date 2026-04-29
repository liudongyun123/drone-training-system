// ============================================================================
// 报名 Hook - 共用层
// Web端、后台都可用
// ============================================================================

import { useState, useCallback } from 'react'
import { enrollmentApi } from '@/shared/services/classApi'
import type { Enrollment } from '@/shared/types/class'

interface CreateEnrollmentParams {
  classId: string
  userId: string
  phone: string
  paymentMethod: 'online' | 'offline'
  classInfo: {
    name: string
    includedCourses: string[]
    price: number
  }
}

interface ConfirmOfflinePaymentParams {
  enrollmentId: string
  confirmedBy: string
  remark?: string
}

interface UseEnrollmentResult {
  // 状态
  enrollments: Enrollment[]
  loading: boolean
  error: Error | null
  
  // 方法
  createEnrollment: (params: CreateEnrollmentParams) => Promise<Enrollment | null>
  confirmOfflinePayment: (params: ConfirmOfflinePaymentParams) => Promise<boolean>
  getUserEnrollments: (userId: string) => Promise<void>
}

export function useEnrollment(): UseEnrollmentResult {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // 创建报名
  const createEnrollment = useCallback(async (params: CreateEnrollmentParams): Promise<Enrollment | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const enrollment = await enrollmentApi.create(params)
      setEnrollments(prev => [enrollment, ...prev])
      return enrollment
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 确认线下缴费
  const confirmOfflinePayment = useCallback(async (params: ConfirmOfflinePaymentParams): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      await enrollmentApi.confirmOfflinePayment(params.enrollmentId, {
        confirmedBy: params.confirmedBy,
        remark: params.remark
      })
      
      // 更新本地状态
      setEnrollments(prev => prev.map(e => {
        if (e._id === params.enrollmentId) {
          return {
            ...e,
            paymentStatus: 'confirmed',
            status: 'confirmed'
          }
        }
        return e
      }))
      
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 获取用户报名记录
  const getUserEnrollments = useCallback(async (userId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await enrollmentApi.getByUserId(userId)
      setEnrollments(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    enrollments,
    loading,
    error,
    createEnrollment,
    confirmOfflinePayment,
    getUserEnrollments
  }
}
