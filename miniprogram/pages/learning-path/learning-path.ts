// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示5个等级的课程和培训班

import { courseApi, classApi } from '../../utils/api'
import logger from '../../utils/logger'

// 等级顺序（职业技能等级体系 - 课程主线）
const LEVEL_ORDER = ['初级工', '中级工', '高级工', '技师', '高级技师']

interface LearningPathStage {
  level: string
  levelIndex: number
  courses: any[]
  classes: any[]
}

interface PageData {
  categoryId: string
  categoryName: string
  stages: LearningPathStage[]
  isAllEmpty: boolean
  loading: boolean
}

Page<PageData>({
  data: {
    categoryId: '',
    categoryName: '',
    stages: [],
    isAllEmpty: true,
    loading: true
  },

  onLoad(options: any) {
    const { id, name } = options || {}
    if (id) {
      this.setData({ categoryId: id })
    }
    if (name) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(name) })
      this.setData({ categoryName: decodeURIComponent(name) })
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
      // 并行加载该分类的课程和培训班
      // 课程按分类ID过滤，培训班获取所有状态（用于展示5个等级体系）
      const [courses, classes] = await Promise.all([
        courseApi.getList({ categoryId: this.data.categoryId, pageSize: 100 }),
        classApi.getList({ pageSize: 100 })  // 不传status，获取所有班级
      ])

      // 构建5个等级的阶段数据
      // 课程按自己的 level 分组（主线），培训班作为辅线对应到课程等级
      const stages = LEVEL_ORDER.map((level, index) => {
        // 筛选该等级的课程（使用API返回的levelText）
        const levelCourses = (courses || []).filter((course: any) => {
          const courseLevel = course.levelText || course.level || ''
          return courseLevel === level
        })

        // 筛选该等级的培训班（使用API返回的levelText）
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