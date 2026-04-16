import { dbService } from './cloudBaseService'
import { authService } from './cloudBaseService'

// 学习进度接口
export interface UserProgress {
  id?: string
  userId: string
  courseId: string
  currentLessonId: string
  completedLessons: string[]
  progress: number // 0-100
  isCompleted: boolean
  lastStudyTime: string
  createdAt: string
  updatedAt: string
}

// 学习进度数据服务（云开发版本）
export const CloudProgressService = {
  // 获取用户在指定课程的学习进度
  async getCourseProgress(courseId: string): Promise<UserProgress | null> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        console.warn('用户未登录,无法获取学习进度')
        return null
      }

      // 查询该课程的学习进度
      const data = await dbService.getAll('user_progress')
      const progress = data.find((p: any) => p.courseId === courseId)

      if (!progress) {
        return null
      }

      return {
        id: progress._id,
        userId: progress.userId,
        courseId: progress.courseId,
        currentLessonId: progress.currentLessonId,
        completedLessons: progress.completedLessons || [],
        progress: progress.progress || 0,
        isCompleted: progress.isCompleted || false,
        lastStudyTime: progress.lastStudyTime,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt,
      }
    } catch (error) {
      console.error('获取学习进度失败:', error)
      return null
    }
  },

  // 获取用户所有课程的学习进度
  async getAllProgress(): Promise<UserProgress[]> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        return []
      }

      const data = await dbService.getAll('user_progress')

      return data.map((d: any) => ({
        id: d._id,
        userId: d.userId,
        courseId: d.courseId,
        currentLessonId: d.currentLessonId,
        completedLessons: d.completedLessons || [],
        progress: d.progress || 0,
        isCompleted: d.isCompleted || false,
        lastStudyTime: d.lastStudyTime,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
    } catch (error) {
      console.error('获取所有学习进度失败:', error)
      return []
    }
  },

  // 获取用户所有进度记录（别名方法，兼容性支持）
  async getUserProgress(): Promise<UserProgress[]> {
    return await this.getAllProgress()
  },

  // 创建或更新学习进度
  async saveProgress(progressData: Partial<UserProgress>): Promise<UserProgress | null> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('用户未登录')
      }

      const now = new Date().toISOString()

      // 先检查是否已存在该课程的进度记录
      const existing = await this.getCourseProgress(progressData.courseId!)

      let result

      if (existing) {
        // 更新现有记录
        const updateData = {
          currentLessonId: progressData.currentLessonId,
          completedLessons: progressData.completedLessons,
          progress: progressData.progress,
          isCompleted: progressData.isCompleted,
          lastStudyTime: now,
          updatedAt: now,
        }

        const updateSuccess = await dbService.update('user_progress', existing.id!, updateData)
        if (!updateSuccess) {
          throw new Error('更新学习进度失败')
        }

        result = {
          id: existing.id,
          ...existing,
          ...updateData,
        }
      } else {
        // 创建新记录
        const newProgress = {
          userId: user.uid,
          courseId: progressData.courseId!,
          currentLessonId: progressData.currentLessonId || '',
          completedLessons: progressData.completedLessons || [],
          progress: progressData.progress || 0,
          isCompleted: progressData.isCompleted || false,
          lastStudyTime: now,
          createdAt: now,
          updatedAt: now,
        }

        const addResult = await dbService.add('user_progress', newProgress)
        if (!addResult) {
          throw new Error('创建学习进度失败')
        }

        result = {
          id: addResult.id,
          ...newProgress,
        }
      }

      console.log('保存学习进度成功:', result)
      return result as UserProgress
    } catch (error) {
      console.error('保存学习进度失败:', error)
      return null
    }
  },

  // 标记课时完成
  async markLessonComplete(courseId: string, lessonId: string, totalLessons: number): Promise<UserProgress | null> {
    try {
      if (!courseId || !lessonId) {
        throw new Error('课程ID和课时ID不能为空')
      }

      if (totalLessons <= 0) {
        throw new Error('总课时数必须大于0')
      }

      const existing = await this.getCourseProgress(courseId)

      let completedLessons: string[] = []
      if (existing && existing.completedLessons) {
        completedLessons = [...existing.completedLessons]
      }

      // 如果该课时未完成,则添加到已完成列表
      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId)
      }

      // 计算进度百分比
      const progress = Math.min(Math.round((completedLessons.length / totalLessons) * 100), 100)
      const isCompleted = progress >= 100

      return await this.saveProgress({
        courseId,
        currentLessonId: lessonId,
        completedLessons,
        progress,
        isCompleted,
      })
    } catch (error) {
      console.error('标记课时完成失败:', error)
      return null
    }
  },

  // 更新当前课时
  async updateCurrentLesson(courseId: string, lessonId: string): Promise<UserProgress | null> {
    try {
      const existing = await this.getCourseProgress(courseId)

      return await this.saveProgress({
        courseId,
        currentLessonId: lessonId,
        completedLessons: existing?.completedLessons || [],
        progress: existing?.progress || 0,
        isCompleted: existing?.isCompleted || false,
      })
    } catch (error) {
      console.error('更新当前课时失败:', error)
      return null
    }
  },

  // 删除学习进度
  async deleteProgress(courseId: string): Promise<boolean> {
    try {
      const progress = await this.getCourseProgress(courseId)
      if (!progress) {
        return false
      }

      return await dbService.delete('user_progress', progress.id!)
    } catch (error) {
      console.error('删除学习进度失败:', error)
      return false
    }
  },
}

export default CloudProgressService
