/**
 * 前台学习路径服务
 * 为前台页面提供学习路径的读取和进度跟踪服务
 */
import { dbService } from './cloudBaseService'
import { authService } from './cloudBaseService'

// 学习路径接口
export interface LearningPath {
  id: string
  name: string
  description: string
  categoryId?: string  // 关联分类ID
  cover?: string        // 封面图
  status: 'active' | 'draft'
  stages: PathStage[]   // 学习阶段列表
  createdAt: string
  updatedAt?: string
}

// 学习阶段接口
export interface PathStage {
  order: number         // 阶段顺序
  level: string         // 等级名称（入门班/基础班/进阶班/高级班/考证班）
  courseId?: string     // 关联课程ID
  courseTitle?: string // 课程名称
  classId?: string      // 关联培训班ID
  className?: string    // 培训班名称
}

// 学习路径进度接口
export interface PathProgress {
  id: string
  pathId: string
  userId: string
  completedCourses: string[]
  currentCourse?: string
  progress: number
  startedAt: string
  completedAt?: string
}

// 前台学习路径服务
export const CloudLearningPathService = {
  collection: 'learning_paths',
  progressCollection: 'learning_progress',

  // 获取所有学习路径
  async getAllPaths(params?: {
    limit?: number
    category?: string
    difficulty?: string
  }): Promise<{ success: boolean; data: LearningPath[] }> {
    try {
      const { limit = 20, category, difficulty } = params || {}

      // 临时：移除 status 过滤，显示所有学习路径用于调试
      const query: any = {}
      if (category) query.category = category
      if (difficulty) query.difficulty = difficulty

      // 使用 dbService.where 进行条件查询
      const data = await dbService.where(this.collection, query)
      console.log('[CloudLearningPathService.getAllPaths] 数据库返回数据:', {
        count: data?.length,
        firstItem: data?.[0] ? {
          _id: data[0]._id,
          name: data[0].name,
          categoryId: data[0].categoryId,
          categoryIds: data[0].categoryIds
        } : null
      });

      // 应用 limit
      const limitedData = Array.isArray(data) ? data.slice(0, limit) : []

      const paths = (limitedData || []).map((item: any) => {
        console.log('[CloudLearningPathService.getAllPaths] 处理单条数据:', {
          _id: item._id,
          categoryId: item.categoryId,
          categoryIds: item.categoryIds
        });
        return {
        id: item._id,
        _id: item._id,
        name: item.name,
        description: item.description,
        category: item.category,
        // 兼容新旧格式：单选 → 多选
        categoryId: item.categoryId || '',  // 兼容旧数据
        categoryIds: item.categoryIds || (item.categoryId ? [item.categoryId] : []),  // 多分类ID列表
        classIds: item.classIds || [],  // 多班级ID列表
        difficulty: item.difficulty || 'beginner',
        estimatedHours: item.estimatedHours || 0,
        status: item.status,
        // 兼容 courses 和 items 两种字段名
        items: ((item.items || item.courses) || []).map((it: any, index: number) => ({
          courseId: it.courseId || it.course?.courseId || it.id || '',
          courseTitle: it.courseTitle || it.courseTitle || it.title || '',
          order: it.order || index + 1,
        })),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
      });

      return { success: true, data: paths }
    } catch (error) {
      console.error('获取学习路径列表失败:', error)
      return { success: false, data: [] }
    }
  },

  // 获取学习路径详情
  async getPathById(id: string): Promise<LearningPath | null> {
    try {
      const data = await dbService.getById(this.collection, id)
      if (!data) return null

      return {
        id: data._id,
        name: data.name,
        description: data.description,
        category: data.category,
        // 兼容新旧格式：单选 → 多选
        categoryId: data.categoryId || '',  // 兼容旧数据
        categoryIds: data.categoryIds || (data.categoryId ? [data.categoryId] : []),  // 多分类ID列表
        classIds: data.classIds || [],  // 多班级ID列表
        difficulty: data.difficulty || 'beginner',
        estimatedHours: data.estimatedHours || 0,
        status: data.status,
        // 兼容 items 和 courses 两种字段名
        items: ((data.items || data.courses) || []).map((it: any, index: number) => ({
          courseId: it.courseId || it.course?.courseId || it.id || '',
          courseTitle: it.courseTitle || it.course?.title || it.title || '',
          order: it.order || index + 1,
        })),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    } catch (error) {
      console.error('获取学习路径详情失败:', error)
      return null
    }
  },

  // 根据分类ID获取该分类下的所有课程
  async getCoursesByCategoryId(categoryId: string): Promise<{ success: boolean; data: any[] }> {
    try {
      if (!categoryId) {
        return { success: true, data: [] }
      }

      // @ts-ignore
      const data = await dbService.getAll('courses', {
        categoryId: categoryId,
        status: 'published'  // 只获取已发布的课程
      }, { limit: 100 })

      const courses = (data || []).map((item: any) => ({
        courseId: item._id,
        courseTitle: item.title || '',
        order: 0,
      }))

      return { success: true, data: courses }
    } catch (error) {
      console.error('获取分类课程失败:', error)
      return { success: false, data: [] }
    }
  },

  // 获取用户的学习路径进度
  async getUserPathProgress(pathId: string): Promise<PathProgress | null> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return null

      // @ts-ignore
      const data = await dbService.getAll(this.progressCollection, {
        pathId: pathId,
        userId: user.uid
      }, { limit: 1 })

      if (!data || data.length === 0) return null

      const item = data[0]
      return {
        id: item._id,
        pathId: item.pathId,
        userId: item.userId,
        completedCourses: item.completedCourses || [],
        currentCourse: item.currentCourse,
        progress: item.progress || 0,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
      }
    } catch (error) {
      console.error('获取学习路径进度失败:', error)
      return null
    }
  },

  // 开始学习路径
  async startPath(pathId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        return { success: false, error: '请先登录' }
      }

      // 获取路径信息
      const path = await this.getPathById(pathId)
      if (!path) {
        return { success: false, error: '学习路径不存在' }
      }

      // 检查是否已有进度
      const existing = await this.getUserPathProgress(pathId)
      if (existing) {
        return { success: false, error: '您已开始此学习路径' }
      }

      // 创建进度记录
      const progress = {
        pathId: pathId,
        userId: user.uid,
        completedCourses: [],
        currentCourse: path.items[0]?.courseId,
        progress: 0,
        startedAt: new Date().toISOString(),
      }

      await dbService.add(this.progressCollection, progress)
      return { success: true }
    } catch (error) {
      console.error('开始学习路径失败:', error)
      return { success: false, error: '开始学习路径失败' }
    }
  },

  // 更新学习进度
  async updateProgress(
    pathId: string,
    courseId: string,
    completed: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        return { success: false, error: '请先登录' }
      }

      // 获取当前进度
      const progress = await this.getUserPathProgress(pathId)
      if (!progress) {
        return { success: false, error: '请先开始学习此路径' }
      }

      // 获取路径信息
      const path = await this.getPathById(pathId)
      if (!path) {
        return { success: false, error: '学习路径不存在' }
      }

      // 更新完成的课程
      let completedCourses = [...progress.completedCourses]
      if (completed && !completedCourses.includes(courseId)) {
        completedCourses.push(courseId)
      } else if (!completed) {
        completedCourses = completedCourses.filter(id => id !== courseId)
      }

      // 计算进度
      const totalCourses = path.items.length
      const progressValue = totalCourses > 0
        ? Math.round((completedCourses.length / totalCourses) * 100)
        : 0

      // 找到下一个未完成的课程
      const nextCourse = path.items.find(item =>
        !completedCourses.includes(item.courseId)
      )

      // 更新进度
      await dbService.update(this.progressCollection, progress.id, {
        completedCourses,
        currentCourse: nextCourse?.courseId || progress.currentCourse,
        progress: progressValue,
        completedAt: progressValue === 100 ? new Date().toISOString() : undefined,
      })

      return { success: true }
    } catch (error) {
      console.error('更新学习进度失败:', error)
      return { success: false, error: '更新学习进度失败' }
    }
  },

  // 获取用户的所有学习路径进度
  async getUserAllProgress(): Promise<PathProgress[]> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return []

      // @ts-ignore
      const data = await dbService.getAll(this.progressCollection, {
        userId: user.uid
      })

      return (data || []).map((item: any) => ({
        id: item._id,
        pathId: item.pathId,
        userId: item.userId,
        completedCourses: item.completedCourses || [],
        currentCourse: item.currentCourse,
        progress: item.progress || 0,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
      }))
    } catch (error) {
      console.error('获取用户所有进度失败:', error)
      return []
    }
  }
}
