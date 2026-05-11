// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示课程和培训班

import { SourceService } from '../../utils/SourceService'
import logger from '../../utils/logger'

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
    classLevels: []
  },

  onLoad(options: any) {
    const { id, name, source, sourceId } = options || {}
    if (id) {
      this.setData({ categoryId: id })
    }
    if (name) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(name) })
      this.setData({ categoryName: decodeURIComponent(name) })
    }
    if (source) {
      this.setData({ source })
    }
    if (sourceId) {
      this.setData({ sourceId })
    }
    this.loadData()
  },

  async loadData() {
    if (!this.data.categoryId && !this.data.categoryName) {
      logger.warn('[学习路径] categoryId 和 categoryName 都为空，跳过数据加载')
      this.setData({ loading: false, isAllEmpty: true })
      return
    }

    this.setData({ loading: true })

    try {
      const { categoryId, categoryName, sourceId, source } = this.data
      
      logger.info('[学习路径] loadData', { categoryId, categoryName, sourceId, source })

      // 只使用 categoryId 精确查询，确保数据隔离
      // 不再使用 categoryName 回退查询，避免不同分类的数据混淆
      const [courses, classes] = await Promise.all([
        SourceService.getCourses(sourceId, { 
          categoryId: categoryId,
          limit: 100 
        }),
        SourceService.getClasses(sourceId, { 
          categoryId: categoryId,
          limit: 100 
        })
      ])

      logger.info('[学习路径] 数据加载结果', {
        categoryId,
        courses: courses?.length || 0,
        classes: classes?.length || 0,
        sampleCourses: courses?.slice(0, 2).map(c => ({ 
          _id: c._id, 
          title: c.title, 
          categoryId: c.categoryId,
          category: c.category,
          level: c.level
        }))
      })

      // 根据体系确定等级顺序
      const levelOrder = source === 'CAAC' 
        ? ['视距内驾驶员', '超视距驾驶员', '教员']
        : source === 'NATIONAL_DEFENSE'
        ? ['一级', '二级', '三级']
        : ['初级工', '中级工', '高级工', '技师', '高级技师']

      logger.info('[学习路径] 等级顺序', { levelOrder, source })

      // 构建等级的阶段数据
      const stages = levelOrder.map((level, index) => {
        const levelCourses = (courses || []).filter((course: any) => {
          const courseLevel = course.levelText || course.level || course.levelName || ''
          return courseLevel === level
        })

        const levelClasses = (classes || []).filter((cls: any) => {
          const classLevel = cls.levelText || cls.level || ''
          return classLevel === level
        })

        return {
          level,
          levelIndex: index,
          courses: levelCourses,
          classes: levelClasses
        }
      })

      const isAllEmpty = stages.every((s: LearningPathStage) => 
        s.courses.length === 0 && s.classes.length === 0
      )

      logger.info('[学习路径] 阶段数据', { 
        stagesCount: stages.length,
        nonEmptyStages: stages.filter(s => s.courses.length > 0 || s.classes.length > 0).length,
        isAllEmpty 
      })

      this.setData({ stages, isAllEmpty, loading: false })
    } catch (err) {
      logger.error('[学习路径] 加载数据失败', err)
      this.setData({ loading: false })
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

  // 合并两个数组，根据 _id 去重
  mergeById(arr1: any[], arr2: any[]): any[] {
    const map = new Map()
    ;[...arr1, ...arr2].forEach(item => {
      if (item?._id && !map.has(item._id)) {
        map.set(item._id, item)
      }
    })
    return Array.from(map.values())
  }
})
