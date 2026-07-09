// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示课程和培训班

import { SourceService } from '../../utils/SourceService'
import { loadLevels, getLevelName, systemConfigApi } from '../../utils/api'
import { dbGetList } from '../../utils/http'
import { DEFAULT_COVER } from '../../utils/constants'
import logger from '../../utils/logger'

// 等级 fallback（仅在数据库加载失败时使用）
const FALLBACK_LEVELS: Record<string, string[]> = {
  'RENSHE': ['初级工', '中级工', '高级工'],
  'CAAC': ['视距内驾驶员', '超视距驾驶员', '教员']
}

// 从 SourceService 获取 codeToName
const codeToNameMap = SourceService.codeToName

interface LearningPathStage {
  level: string
  levelIndex: number
  courses: any[]
  classes: any[]
}

interface PageData {
  categoryId: string
  categoryName: string
  source: string
  sourceId: string
  categoryIcon: string
  stages: LearningPathStage[]
  isAllEmpty: boolean
  loading: boolean
  courseLevels: string[]
  classLevels: string[]
  // 用户进度相关
  phone: string
  progressMap: Record<string, { learnedLessons: number; totalLessons: number; progress: number; lastLearnTime: string }>
}

Page<PageData>({
  data: {
    categoryId: '',
    categoryName: '',
    categoryIcon: '',
    source: 'RENSHE',
    sourceId: '',
    stages: [],
    isAllEmpty: true,
    loading: true,
    courseLevels: [],
    classLevels: [],
    phone: '',
    progressMap: {}
  },

  onLoad(options: any) {
    const { id, name, source, icon } = options || {}
    
    logger.info('[学习路径] onLoad', { id, name, source, icon })
    
    // 获取用户手机号用于查询进度
    const phone = wx.getStorageSync('phone') || ''
    this.setData({ phone })
    
    if (id || name) {
      // name 是分类中文名称（如 "植保无人机"）
      // id 可能是 "SOURCE:CODE" 格式或纯 UUID
      const decodedName = name ? decodeURIComponent(name) : (id.includes(':') ? this.codeToName(id.split(':')[1]) : id)
      const decodedIcon = icon ? decodeURIComponent(icon) : ''
      
      wx.setNavigationBarTitle({ title: decodedName + '学习路径' })
      
      this.setData({ 
        categoryId: id || '',
        categoryName: decodedName,
        categoryIcon: decodedIcon
      }, () => {
        this.loadData()
      })
    } else {
      // 没有参数时，尝试从数据库加载当前体系的等级
      this.getLevelOrder('RENSHE').then(levelOrder => {
        const stages = levelOrder.map((level, index) => ({ level, levelIndex: index, courses: [], classes: [] }))
        this.setData({ loading: false, isAllEmpty: true, stages, categoryName: '未选择分类' })
      }).catch(() => {
        const stages = FALLBACK_LEVELS['RENSHE'].map((level, index) => ({ level, levelIndex: index, courses: [], classes: [] }))
        this.setData({ loading: false, isAllEmpty: true, stages, categoryName: '未选择分类' })
      })
    }
  },

  // 将分类代码转换为中文名称
  codeToName(code: string): string {
    return codeToNameMap(code) || code || ''
  },

  // 根据 categoryId 解析实际的体系代码（优先从 _id 前缀提取，否则查数据库）
  async resolveSourceCode(categoryId: string, fallbackSource: string): Promise<string> {
    if (categoryId.includes(':')) {
      return categoryId.split(':')[0]
    }
    try {
      const result = await dbGetList('categories', { where: { _id: categoryId }, limit: 1 })
      const cat = result.data?.[0]
      if (cat?.sourceId) {
        // sourceId 已统一为体系 code（如 "RENSHE"/"CAAC"），直接返回
        return cat.sourceId
      }
    } catch (err) {
      logger.warn('[学习路径] 查询分类 sourceId 失败', err)
    }
    return fallbackSource || 'RENSHE'
  },

  // 根据体系代码动态获取等级顺序（从数据库 levels 集合读取）
  async getLevelOrder(sourceCode: string): Promise<string[]> {
    try {
      await loadLevels()
      const levels = await systemConfigApi.getLevels(sourceCode)
      if (levels && levels.length > 0) {
        return levels.map((l: any) => l.name)
      }
    } catch (err) {
      logger.warn('[学习路径] 从数据库获取等级失败，使用 fallback', err)
    }
    // fallback
    return FALLBACK_LEVELS[sourceCode] || FALLBACK_LEVELS['RENSHE']
  },

  async loadData() {
    const { categoryId, categoryName, source } = this.data
    if (!categoryId && !categoryName) {
      this.setData({ loading: false, isAllEmpty: true })
      return
    }

    this.setData({ loading: true })

    try {
      // 解析实际的体系代码（优先从 _id 前缀提取，否则查数据库获取 sourceId）
      const sourceFromId = await this.resolveSourceCode(categoryId, source)
      
      // 更新 data.source 以便后续使用
      this.setData({ source: sourceFromId })

      // 使用 categoryId 过滤课程和培训班
      const [courses, classes] = await Promise.all([
        SourceService.getCourses(sourceFromId, { 
          categoryId,
          forceRefresh: true 
        }),
        SourceService.getClasses(sourceFromId, { 
          categoryId,
          forceRefresh: true 
        })
      ])

      // 从数据库动态获取该体系的等级顺序
      const levelOrder = await this.getLevelOrder(sourceFromId)

      // 处理课程和培训班，添加 levelText
      const processedCourses = (courses || []).map((course: any) => ({
        ...course,
        levelText: getLevelName(course.level) || course.level || ''
      }))
      const processedClasses = (classes || []).map((cls: any) => ({
        ...cls,
        levelText: getLevelName(cls.level) || cls.level || ''
      }))

      // 按等级分组
      const stages = levelOrder.map((level, index) => {
        const levelCourses = processedCourses.filter((course: any) => {
          return course.levelText === level
        })
        const levelClasses = processedClasses.filter((cls: any) => {
          return cls.levelText === level
        })
        return { level, levelIndex: index, courses: levelCourses, classes: levelClasses }
      })

      const isAllEmpty = stages.every((s: LearningPathStage) => 
        s.courses.length === 0 && s.classes.length === 0
      )

      this.setData({ stages, isAllEmpty, loading: false })
      
      // 加载用户学习进度（非阻塞）
      this.loadLearningProgress(processedCourses)
    } catch (err) {
      logger.error('[学习路径] 加载失败', err)
      // 确保即使加载失败也显示页面内容和分类名称
      const sourceCode = categoryId.includes(':') ? categoryId.split(':')[0] : source
      const levelOrder = FALLBACK_LEVELS[sourceCode] || FALLBACK_LEVELS['RENSHE']
      const stages = levelOrder.map((level, index) => ({ level, levelIndex: index, courses: [], classes: [] }))
      this.setData({ stages, isAllEmpty: true, loading: false })
    }
  },

  // 加载用户学习进度
  async loadLearningProgress(courses: any[]) {
    const { phone, stages } = this.data
    if (!phone || courses.length === 0) return

    try {
      // 查询用户的所有学习进度记录
      const courseIds = courses.map(c => c._id).filter(Boolean)
      if (courseIds.length === 0) return

      const progressResult = await dbGetList('user_progress', {
        where: { phone, courseId: { $in: courseIds } },
        limit: 500
      })
      const progressRecords = progressResult.data || []

      // 查询所有课程的课时数
      const lessonsResult = await dbGetList('lessons', {
        where: { courseId: { $in: courseIds } },
        limit: 500
      })
      const allLessons = lessonsResult.data || []

      // 计算每个课程的进度
      const progressMap: Record<string, any> = {}
      courseIds.forEach(courseId => {
        const courseLessons = allLessons.filter((l: any) => l.courseId === courseId)
        const totalLessons = courseLessons.length
        const courseProgress = progressRecords.filter((p: any) => 
          p.courseId === courseId && p.completed
        )
        const learnedLessons = courseProgress.length
        const lastLearn = progressRecords
          .filter((p: any) => p.courseId === courseId)
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

        progressMap[courseId] = {
          learnedLessons,
          totalLessons,
          progress: totalLessons > 0 ? Math.round((learnedLessons / totalLessons) * 100) : 0,
          lastLearnTime: lastLearn?.updatedAt || ''
        }
      })

      // 更新 stages 中的课程进度
      const updatedStages = stages.map(stage => ({
        ...stage,
        courses: stage.courses.map((course: any) => ({
          ...course,
          progressData: progressMap[course._id] || { learnedLessons: 0, totalLessons: 0, progress: 0, lastLearnTime: '' }
        }))
      }))

      this.setData({ stages: updatedStages, progressMap })
    } catch (err) {
      logger.error('[学习路径] 加载进度失败', err)
    }
  },

  // 跳转课程详情
  goToCourse(e: any) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/course-detail/course-detail?id=${courseId}`
    })
  },

  // 跳转培训班详情
  goToClass(e: any) {
    const classId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/class-detail/class-detail?id=${classId}`
    })
  },

  // 图片加载失败处理（嵌套 stages[].courses[] 结构）
  onImageError(e: any) {
    const { stageIndex, courseIndex } = e.currentTarget.dataset
    const stages = this.data.stages
    if (stages && stages[stageIndex] && stages[stageIndex].courses) {
      stages[stageIndex].courses[courseIndex].coverImage = DEFAULT_COVER
      this.setData({ stages })
    }
  },

})
