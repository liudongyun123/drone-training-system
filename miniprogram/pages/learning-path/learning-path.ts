// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示课程和培训班

import { SourceService } from '../../utils/SourceService'
import { loadLevels, getLevelName } from '../../utils/api'
import { dbGetList } from '../../utils/http'
import logger from '../../utils/logger'

// 等级 fallback（数据库加载失败时使用）
const DEFAULT_RENSHE_LEVELS = ['初级工', '中级工', '高级工', '技师', '高级技师']
const DEFAULT_CAAC_LEVELS = ['视距内驾驶员', '超视距驾驶员', '教员']

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
    const { id, name, source } = options || {}
    
    logger.info('[学习路径] onLoad', { id, name, source })
    
    // 获取用户手机号用于查询进度
    const phone = wx.getStorageSync('phone') || ''
    this.setData({ phone })
    
    if (id || name) {
      // id 格式是 "SOURCE:CODE"（如 "RENSHE:PLANT_PROTECTION"）
      // name 是分类中文名称（如 "植保无人机"）
      const sourceFromId = id ? id.split(':')[0] : source || 'RENSHE'
      const decodedName = name ? decodeURIComponent(name) : (id.includes(':') ? this.codeToName(id.split(':')[1]) : id)
      
      wx.setNavigationBarTitle({ title: decodedName + '学习路径' })
      
      this.setData({ 
        categoryId: id || '',
        categoryName: decodedName,
        source: sourceFromId
      }, () => {
        this.loadData()
      })
    } else {
      // 没有参数时，显示默认等级进度（人社体系）
      const levelOrder = DEFAULT_RENSHE_LEVELS
      const stages = levelOrder.map((level, index) => ({ level, levelIndex: index, courses: [], classes: [] }))
      this.setData({ loading: false, isAllEmpty: true, stages, categoryName: '未选择分类' })
    }
  },

  // 将分类代码转换为中文名称
  codeToName(code: string): string {
    return codeToNameMap(code) || code || ''
  },

  async loadData() {
    const { categoryId, categoryName, source } = this.data
    if (!categoryId && !categoryName) {
      this.setData({ loading: false, isAllEmpty: true })
      return
    }

    this.setData({ loading: true })

    try {
      // 从 categoryId 中提取 source（如 "RENSHE:PLANT_PROTECTION" -> "RENSHE"）
      const sourceFromId = categoryId.includes(':') ? categoryId.split(':')[0] : source
      
      // 使用 categoryId 过滤课程和培训班
      // categoryId 格式: "RENSHE:PLANT_PROTECTION"
      const [courses, classes] = await Promise.all([
        SourceService.getCourses(sourceFromId, { 
          categoryId,  // 使用 categoryId 过滤
          forceRefresh: true 
        }),
        SourceService.getClasses(sourceFromId, { 
          categoryId,  // 使用 categoryId 过滤
          forceRefresh: true 
        })
      ])

      // 加载等级数据
      await loadLevels()

      // 根据体系确定等级顺序
      const levelOrder = source === 'CAAC' 
        ? DEFAULT_CAAC_LEVELS
        : DEFAULT_RENSHE_LEVELS

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
      const levelOrder = source === 'CAAC' 
        ? DEFAULT_CAAC_LEVELS
        : DEFAULT_RENSHE_LEVELS
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

})
