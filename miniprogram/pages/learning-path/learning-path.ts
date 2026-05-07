// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示5个等级的课程和培训班

import { courseApi, classApi } from '../../utils/api'
import logger from '../../utils/logger'

// 等级顺序 - 人社培训体系
const RENSHE_LEVELS = ['初级工', '中级工', '高级工', '技师', '高级技师']
// 等级顺序 - CAAC培训体系
const CAAC_LEVELS = ['视距内驾驶员', '超视距驾驶员', '教员']

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
}

Page<PageData>({
  data: {
    categoryId: '',
    categoryName: '',
    source: 'RENSHE',
    sourceId: '',
    stages: [],
    isAllEmpty: true,
    loading: true
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
    if (!this.data.categoryId) {
      this.setData({ loading: false })
      return
    }

    this.setData({ loading: true })

    try {
      // 根据体系选择等级顺序
      const levelOrder = this.data.source === 'CAAC' ? CAAC_LEVELS : RENSHE_LEVELS

      // 并行加载该分类的课程和培训班
      const [courses, classes] = await Promise.all([
        courseApi.getList({ categoryId: this.data.categoryId, sourceId: this.data.sourceId, pageSize: 100 }),
        classApi.getList({ sourceId: this.data.sourceId, pageSize: 100 })
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