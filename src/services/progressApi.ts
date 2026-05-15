/**
 * 学习进度管理 API v2.0
 * 版本: v20260515-unified
 * 统一使用 CloudDBService (HTTP → db-init)
 * 
 * 操作 user_progress 集合，管理学员学习进度
 */

import { CloudDBService } from './CloudDBService'

const COLLECTION = 'user_progress'

// 接口响应格式
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
    try {
      const where: Record<string, any> = {}

      if (params.userId) {
        where.userId = params.userId
      }
      if (params.courseId) {
        where.courseId = params.courseId
      }
      if (params.status) {
        where.status = params.status
      }
      if (params.keyword) {
        where.$or = [
          { userName: { $regex: params.keyword, $options: 'i' } },
          { userPhone: { $regex: params.keyword, $options: 'i' } },
          { courseTitle: { $regex: params.keyword, $options: 'i' } },
        ]
      }

      const page = params.page || 1
      const pageSize = params.pageSize || 20

      const result = await CloudDBService.query<UserProgress>(COLLECTION, {
        where,
        orderBy: 'updatedAt',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })

      return {
        success: true,
        data: {
          list: result.data,
          total: result.total,
          page,
          pageSize,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取进度列表失败',
      }
    }
  },

  /**
   * 获取学员进度详情
   */
  async getUserProgress(userId: string): Promise<ProgressApiResponse<UserProgress[]>> {
    try {
      const result = await CloudDBService.query<UserProgress>(COLLECTION, {
        where: { userId },
        orderBy: 'updatedAt',
        order: 'desc',
        limit: 100,
      })

      return {
        success: true,
        data: result.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取学员进度失败',
      }
    }
  },

  /**
   * 获取课程进度详情
   */
  async getCourseProgress(courseId: string): Promise<ProgressApiResponse<UserProgress[]>> {
    try {
      const result = await CloudDBService.query<UserProgress>(COLLECTION, {
        where: { courseId },
        orderBy: 'updatedAt',
        order: 'desc',
        limit: 100,
      })

      return {
        success: true,
        data: result.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取课程进度失败',
      }
    }
  },

  /**
   * 获取单条进度详情
   */
  async getProgress(progressId: string): Promise<ProgressApiResponse<UserProgress>> {
    try {
      const progress = await CloudDBService.get<UserProgress>(COLLECTION, progressId)

      if (!progress) {
        return {
          success: false,
          error: '进度记录不存在',
        }
      }

      return {
        success: true,
        data: progress,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取进度详情失败',
      }
    }
  },

  /**
   * 更新进度
   */
  async updateProgress(progressId: string, data: {
    progress?: number
    status?: 'not_started' | 'in_progress' | 'completed'
    videoProgress?: number
  }): Promise<ProgressApiResponse<void>> {
    try {
      const updateData: Record<string, any> = {
        updatedAt: Date.now(),
        lastStudyTime: Date.now(),
      }

      if (data.progress !== undefined) {
        updateData.progress = data.progress
      }
      if (data.status) {
        updateData.status = data.status
        if (data.status === 'completed') {
          updateData.completedAt = Date.now()
        }
      }
      if (data.videoProgress !== undefined) {
        updateData.videoProgress = data.videoProgress
      }

      await CloudDBService.update(COLLECTION, progressId, updateData)

      return {
        success: true,
        message: '进度更新成功',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '更新进度失败',
      }
    }
  },

  /**
   * 完成课时
   */
  async completeLesson(progressId: string): Promise<ProgressApiResponse<void>> {
    try {
      await CloudDBService.update(COLLECTION, progressId, {
        status: 'completed',
        progress: 100,
        videoProgress: 100,
        completedAt: Date.now(),
        updatedAt: Date.now(),
        lastStudyTime: Date.now(),
      })

      return {
        success: true,
        message: '课时已完成',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '完成课时失败',
      }
    }
  },

  /**
   * 重置学员课程进度
   */
  async resetProgress(userId: string, courseId: string): Promise<ProgressApiResponse<void>> {
    try {
      // 查找该学员在该课程下的所有进度记录
      const result = await CloudDBService.query<UserProgress>(COLLECTION, {
        where: { userId, courseId },
        limit: 100,
      })

      // 重置每条记录
      for (const progress of result.data) {
        await CloudDBService.update(COLLECTION, progress._id, {
          status: 'not_started',
          progress: 0,
          videoProgress: 0,
          completedAt: undefined,
          updatedAt: Date.now(),
        })
      }

      return {
        success: true,
        message: '进度已重置',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '重置进度失败',
      }
    }
  },

  /**
   * 批量更新进度
   */
  async batchUpdate(progressIds: string[], data: {
    status?: 'not_started' | 'in_progress' | 'completed'
    progress?: number
  }): Promise<ProgressApiResponse<void>> {
    try {
      const updateData: Record<string, any> = {
        updatedAt: Date.now(),
      }

      if (data.status) {
        updateData.status = data.status
        if (data.status === 'completed') {
          updateData.completedAt = Date.now()
          updateData.progress = 100
        }
      }
      if (data.progress !== undefined) {
        updateData.progress = data.progress
      }

      for (const progressId of progressIds) {
        await CloudDBService.update(COLLECTION, progressId, updateData)
      }

      return {
        success: true,
        message: `已更新 ${progressIds.length} 条记录`,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '批量更新失败',
      }
    }
  },

  /**
   * 获取进度统计
   */
  async getStats(): Promise<ProgressApiResponse<ProgressStats>> {
    try {
      const [total, notStarted, inProgress, completed] = await Promise.all([
        CloudDBService.count(COLLECTION, {}),
        CloudDBService.count(COLLECTION, { status: 'not_started' }),
        CloudDBService.count(COLLECTION, { status: 'in_progress' }),
        CloudDBService.count(COLLECTION, { status: 'completed' }),
      ])

      // 本周新增
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
      const weekResult = await CloudDBService.query(COLLECTION, {
        where: { createdAt: { $gte: weekAgo } },
        limit: 1000,
      })
      const thisWeek = weekResult.total

      // 平均进度
      const avgResult = await CloudDBService.query(COLLECTION, {
        field: { progress: true },
        limit: 1000,
      })
      const avgProgress = avgResult.data.length > 0
        ? Math.round(avgResult.data.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / avgResult.data.length)
        : 0

      return {
        success: true,
        data: {
          total,
          notStarted,
          inProgress,
          completed,
          thisWeek,
          avgProgress,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取统计失败',
      }
    }
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
    try {
      const result = await CloudDBService.query<UserProgress>(COLLECTION, {
        where: { userId },
        orderBy: 'lastStudyTime',
        order: 'desc',
        limit: 100,
      })

      const courses = new Set<string>()
      const completedCourses = new Set<string>()
      let totalLessons = 0
      let completedLessons = 0
      let totalProgress = 0
      let lastStudyTime: number | undefined

      result.data.forEach(p => {
        courses.add(p.courseId)
        totalLessons++
        totalProgress += p.progress || 0

        if (p.status === 'completed') {
          completedCourses.add(p.courseId)
          completedLessons++
        }

        if (p.lastStudyTime && (!lastStudyTime || p.lastStudyTime > lastStudyTime)) {
          lastStudyTime = p.lastStudyTime
        }
      })

      return {
        success: true,
        data: {
          totalCourses: courses.size,
          completedCourses: completedCourses.size,
          totalLessons,
          completedLessons,
          totalProgress: totalLessons > 0 ? Math.round(totalProgress / totalLessons) : 0,
          lastStudyTime,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '获取学习统计失败',
      }
    }
  },

  /**
   * 创建或更新进度记录
   */
  async upsertProgress(data: {
    userId: string
    courseId: string
    lessonId: string
    userName?: string
    userPhone?: string
    courseTitle?: string
    lessonTitle?: string
    progress?: number
    status?: 'not_started' | 'in_progress' | 'completed'
    videoProgress?: number
  }): Promise<ProgressApiResponse<{ _id: string }>> {
    try {
      // 查找是否存在
      const existing = await CloudDBService.query(COLLECTION, {
        where: {
          userId: data.userId,
          courseId: data.courseId,
          lessonId: data.lessonId,
        },
        limit: 1,
      })

      const now = Date.now()
      const updateData: Record<string, any> = {
        ...data,
        updatedAt: now,
        lastStudyTime: now,
      }

      if (existing.data.length > 0) {
        // 更新
        const id = existing.data[0]._id
        await CloudDBService.update(COLLECTION, id, updateData)
        return {
          success: true,
          data: { _id: id },
          message: '进度已更新',
        }
      } else {
        // 新增
        updateData.createdAt = now
        const result = await CloudDBService.add(COLLECTION, updateData)
        return {
          success: true,
          data: { _id: result.id! },
          message: '进度已创建',
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '保存进度失败',
      }
    }
  },
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  UserProgress,
  ProgressStats,
  ProgressQuery,
  ProgressApiResponse,
}

export default progressApi
