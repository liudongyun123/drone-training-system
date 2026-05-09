/**
 * 学习进度管理 API - 管理后台
 * 
 * 操作 user_progress 集合，管理学员学习进度
 */

import { app } from '@/utils/cloudbase'
import type { ApiResponse } from '@/types'

const ENV_ID = 'rcwljy-5ghmq2ex26764978'
const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || ''

interface ProgressApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface UserProgress {
  _id: string
  userId: string
  userName?: string
  userPhone?: string
  courseId: string
  courseTitle?: string
  lessonId: string
  lessonTitle?: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress: number
  videoProgress: number
  lastStudyTime?: number
  completedAt?: number
  createdAt: number
  updatedAt: number
}

interface ProgressStats {
  total: number
  notStarted: number
  inProgress: number
  completed: number
  thisWeek: number
  avgProgress: number
}

interface ProgressQuery {
  page?: number
  pageSize?: number
  userId?: string
  courseId?: string
  status?: string
  keyword?: string
}

/**
 * 调用云函数（HTTP 方式）
 */
async function callFunction<T = any>(
  functionName: string,
  data: {
    action: string
    data?: any
  }
): Promise<ProgressApiResponse<T>> {
  const url = `https://${ENV_ID}.ap-shanghai.tcb-api.tencentcloudapi.com/${functionName}`

  console.log(`[ProgressAPI] 调用 ${functionName}.${data.action}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CloudBase-Environment': ENV_ID,
        'X-CloudBase-PublishableKey': PUBLISHABLE_KEY,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        data: result.data,
        message: result.message
      }
    } else {
      return {
        success: false,
        error: result.error || result.message || '操作失败',
        message: result.message
      }
    }
  } catch (error: any) {
    console.error(`[ProgressAPI] ${functionName}.${data.action} 失败:`, error)
    return {
      success: false,
      error: error.message || '网络请求失败'
    }
  }
}

// ============================================================================
// 学习进度 API
// ============================================================================

export const progressApi = {
  /**
   * 获取进度列表
   */
  async getList(params: ProgressQuery = {}): Promise<ProgressApiResponse<{
    list: UserProgress[]
    total: number
    page: number
    pageSize: number
  }>> {
    return callFunction('mobile-learning', {
      action: 'getProgressList',
      data: params
    })
  },

  /**
   * 获取学员进度详情
   */
  async getUserProgress(userId: string): Promise<ProgressApiResponse<UserProgress[]>> {
    return callFunction('mobile-learning', {
      action: 'getUserProgress',
      data: { userId }
    })
  },

  /**
   * 获取课程进度详情
   */
  async getCourseProgress(courseId: string): Promise<ProgressApiResponse<UserProgress[]>> {
    return callFunction('mobile-learning', {
      action: 'getCourseProgress',
      data: { courseId }
    })
  },

  /**
   * 获取单条进度详情
   */
  async getProgress(progressId: string): Promise<ProgressApiResponse<UserProgress>> {
    return callFunction('mobile-learning', {
      action: 'getProgress',
      data: { progressId }
    })
  },

  /**
   * 更新进度
   */
  async updateProgress(progressId: string, data: {
    progress?: number
    status?: 'not_started' | 'in_progress' | 'completed'
    videoProgress?: number
  }): Promise<ProgressApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'updateProgress',
      data: { progressId, ...data }
    })
  },

  /**
   * 完成课时
   */
  async completeLesson(progressId: string): Promise<ProgressApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'completeLesson',
      data: { progressId }
    })
  },

  /**
   * 重置学员课程进度
   */
  async resetProgress(userId: string, courseId: string): Promise<ProgressApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'resetProgress',
      data: { userId, courseId }
    })
  },

  /**
   * 批量更新进度
   */
  async batchUpdate(progressIds: string[], data: {
    status?: 'not_started' | 'in_progress' | 'completed'
    progress?: number
  }): Promise<ProgressApiResponse<void>> {
    return callFunction('mobile-learning', {
      action: 'batchUpdateProgress',
      data: { progressIds, ...data }
    })
  },

  /**
   * 获取进度统计
   */
  async getStats(): Promise<ProgressApiResponse<ProgressStats>> {
    return callFunction('mobile-learning', {
      action: 'getProgressStats',
      data: {}
    })
  },

  /**
   * 获取学员学习统计
   */
  async getUserLearningStats(userId: string): Promise<ProgressApiResponse<{
    totalCourses: number
    completedCourses: number
    totalLessons: number
    completedLessons: number
    totalProgress: number
    lastStudyTime?: number
  }>> {
    return callFunction('mobile-learning', {
      action: 'getUserLearningStats',
      data: { userId }
    })
  }
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  UserProgress,
  ProgressStats,
  ProgressQuery
}

export default progressApi
