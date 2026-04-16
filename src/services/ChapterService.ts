import { dbService } from './cloudBaseService'
import type { CourseChapter } from '../types/class'

// 课程章节数据服务
export const ChapterService = {
  // ========== 章节管理 ==========

  // 获取课程的所有章节
  async getChaptersByCourse(courseId: string): Promise<CourseChapter[]> {
    try {
      const data = await dbService.getAll('chapters')
      const chapters = data
        .filter((c: any) => c.courseId === courseId)
        .sort((a: any, b: any) => a.order - b.order)

      return chapters.map((c: any) => ({
        id: c._id,
        courseId: c.courseId,
        title: c.title,
        description: c.description,
        content: c.content || '',
        videoUrl: c.videoUrl,
        videoDuration: c.videoDuration,
        order: c.order,
        isPreview: c.isPreview || false,
        questionBankId: c.questionBankId,
        createdAt: c.createdAt,
      }))
    } catch (error) {
      console.error('获取课程章节失败:', error)
      return []
    }
  },

  // 获取单个章节
  async getChapterById(id: string): Promise<CourseChapter | null> {
    try {
      const data = await dbService.getById('chapters', id)
      if (!data) return null

      return {
        id: data._id,
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        content: data.content || '',
        videoUrl: data.videoUrl,
        videoDuration: data.videoDuration,
        order: data.order,
        isPreview: data.isPreview || false,
        questionBankId: data.questionBankId,
        createdAt: data.createdAt,
      }
    } catch (error) {
      console.error('获取章节详情失败:', error)
      return null
    }
  },

  // 添加章节
  async addChapter(chapterData: Partial<CourseChapter>): Promise<CourseChapter | null> {
    try {
      const data = {
        ...chapterData,
        createdAt: new Date().toISOString(),
      }
      const result = await dbService.add('chapters', data)
      if (!result) return null

      return {
        id: result.id,
        ...data,
      } as CourseChapter
    } catch (error) {
      console.error('添加章节失败:', error)
      return null
    }
  },

  // 更新章节
  async updateChapter(id: string, chapterData: Partial<CourseChapter>): Promise<CourseChapter | null> {
    try {
      const result = await dbService.update('chapters', id, chapterData)
      if (!result) return null

      const existing = await this.getChapterById(id)
      return {
        id,
        ...existing,
        ...chapterData,
      } as CourseChapter
    } catch (error) {
      console.error('更新章节失败:', error)
      return null
    }
  },

  // 删除章节
  async deleteChapter(id: string): Promise<boolean> {
    try {
      return await dbService.delete('chapters', id)
    } catch (error) {
      console.error('删除章节失败:', error)
      return false
    }
  },

  // 调整章节顺序
  async updateChapterOrder(updates: Array<{ id: string; order: number }>): Promise<boolean> {
    try {
      for (const update of updates) {
        await this.updateChapter(update.id, { order: update.order })
      }
      return true
    } catch (error) {
      console.error('更新章节顺序失败:', error)
      return false
    }
  },

  // ========== 学习进度管理 ==========

  // 获取用户的学习进度
  async getUserProgress(userId: string, courseId?: string): Promise<ChapterProgress[]> {
    try {
      const data = await dbService.getAll('chapter_progress')
      let progress = data.filter((p: any) => p.userId === userId)

      if (courseId) {
        progress = progress.filter((p: any) => p.courseId === courseId)
      }

      return progress.map((p: any) => ({
        id: p._id,
        userId: p.userId,
        chapterId: p.chapterId,
        courseId: p.courseId,
        isCompleted: p.isCompleted,
        videoProgress: p.videoProgress,
        completedAt: p.completedAt,
      }))
    } catch (error) {
      console.error('获取学习进度失败:', error)
      return []
    }
  },

  // 更新学习进度
  async updateProgress(progressData: Partial<ChapterProgress>): Promise<ChapterProgress | null> {
    try {
      // 查找是否已有进度记录
      const allProgress = await dbService.getAll('chapter_progress')
      const existing = allProgress.find(
        (p: any) => p.userId === progressData.userId && p.chapterId === progressData.chapterId
      )

      let result
      if (existing) {
        // 更新现有记录
        result = await dbService.update('chapter_progress', existing._id, {
          ...progressData,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // 创建新记录
        result = await dbService.add('chapter_progress', {
          ...progressData,
          createdAt: new Date().toISOString(),
        })
      }

      if (!result) return null

      return {
        id: result.id || existing?._id,
        ...progressData,
      } as ChapterProgress
    } catch (error) {
      console.error('更新学习进度失败:', error)
      return null
    }
  },

  // 标记章节完成
  async markChapterComplete(userId: string, chapterId: string, courseId: string): Promise<boolean> {
    try {
      await this.updateProgress({
        userId,
        chapterId,
        courseId,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      })
      return true
    } catch (error) {
      console.error('标记章节完成失败:', error)
      return false
    }
  },
}
