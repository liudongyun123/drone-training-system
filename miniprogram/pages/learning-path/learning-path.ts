// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示5个等级的课程和培训班

import { courseApi, classApi, systemConfigApi } from '../../utils/api'
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
    this.loadLevels()
  },

  // 加载等级配置 - 从 learningPathCategories 获取
  async loadLevels() {
    try {
      const dictionaries = await systemConfigApi.getDictionaries()
      let courseLevels: string[] = []
      
      console.log('=== 学习路径等级加载 ===')
      console.log('source:', this.data.source)
      console.log('categoryName:', this.data.categoryName)
      
      if (dictionaries) {
        // 优先从 learningPathCategories 获取该分类的等级
        const learningPathCategories = dictionaries.learningPathCategories || {}
        const sourceCategories = learningPathCategories[this.data.source] || {}
        
        console.log('sourceCategories:', sourceCategories)
        console.log('配置中包含的分类:', Object.keys(sourceCategories))
        
        // 尝试精确匹配
        if (sourceCategories[this.data.categoryName]) {
          courseLevels = sourceCategories[this.data.categoryName]
          console.log('精确匹配到等级:', courseLevels)
        } else {
          // 尝试模糊匹配（忽略空格差异）
          const categoryName = this.data.categoryName
          for (const key of Object.keys(sourceCategories)) {
            if (key.trim() === categoryName.trim() || key.includes(categoryName) || categoryName.includes(key)) {
              courseLevels = sourceCategories[key]
              console.log('模糊匹配到等级:', key, courseLevels)
              break
            }
          }
        }
        
        // 兜底：从 courseLevels 按体系获取
        if (courseLevels.length === 0) {
          const allCourseLevels = (dictionaries.courseLevels || [])
            .filter((l: any) => l.source === this.data.source)
            .map((l: any) => l.value)
          console.log('使用 courseLevels 兜底:', allCourseLevels)
          courseLevels = allCourseLevels
        }
        
        // 兜底：使用默认值
        if (courseLevels.length === 0) {
          courseLevels = this.data.source === 'CAAC' 
            ? ['视距内驾驶员', '超视距驾驶员', '教员']
            : ['初级工', '中级工', '高级工', '技师', '高级技师']
          console.log('使用默认值:', courseLevels)
        }
        
        // 获取培训班等级（统一使用课程等级）
        const classLevels = courseLevels
        
        this.setData({ courseLevels, classLevels })
        console.log('最终等级:', courseLevels)
      }
    } catch (err) {
      logger.error('学习路径', '加载等级配置失败', err)
    }
    this.loadData()
  },

  async loadData() {
    if (!this.data.categoryId) {
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })

    try {
      // 获取等级顺序
      const levelOrder = this.data.courseLevels.length > 0 
        ? this.data.courseLevels 
        : (this.data.source === 'CAAC' 
          ? ['视距内驾驶员', '超视距驾驶员', '教员'] 
          : ['初级工', '中级工', '高级工', '技师', '高级技师'])

      // 并行加载该分类的课程和培训班（用 category 名称查询更可靠）
      const [courses, classes] = await Promise.all([
        courseApi.getList({ category: this.data.categoryName, pageSize: 100 }),
        classApi.getList({ category: this.data.categoryName, pageSize: 100 })
      ])

      // 构建等级的阶段数据
      const stages = levelOrder.map((level, index) => {
        // 筛选该等级的课程
        const levelCourses = (courses || []).filter((course: any) => {
          const courseLevel = course.levelText || course.level || ''
          return courseLevel === level
        })

        // 筛选该等级的培训班
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

      // 调试：打印课程levelText分布
      console.log('=== 学习路径调试 ===')
      console.log('categoryId:', this.data.categoryId)
      console.log('source:', this.data.source)
      console.log('课程总数:', courses?.length)
      courses?.forEach((c: any) => {
        console.log(`课程: ${c.title}, level: ${c.level}, levelText: ${c.levelText}`)
      })

      // 计算是否全部为空
      const isAllEmpty = stages.every((s: LearningPathStage) => s.courses.length === 0 && s.classes.length === 0)

      this.setData({ stages, isAllEmpty, loading: false })
    } catch (err) {
      logger.error('学习路径', '加载学习路径数据失败', err)
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
  }
})