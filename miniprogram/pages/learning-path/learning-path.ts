// pages/learning-path/learning-path.ts
// 学习路径详情页 - 按无人机类型展示课程和培训班

import { SourceService } from '../../utils/SourceService'
import { loadLevels, getLevelName } from '../../utils/api'
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
    const { id, name, source } = options || {}
    
    logger.info('[学习路径] onLoad', { id, name, source })
    
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
      const levelOrder = ['初级工', '中级工', '高级工', '技师', '高级技师']
      const stages = levelOrder.map((level, index) => ({ level, levelIndex: index, courses: [], classes: [] }))
      this.setData({ loading: false, isAllEmpty: true, stages, categoryName: '未选择分类' })
    }
  },

  // 将分类代码转换为中文名称
  codeToName(code: string): string {
    const CATEGORY_CODE_MAP: Record<string, string> = {
      'PLANT_PROTECTION': '植保无人机',
      'AERIAL_PHOTOGRAPHY': '航拍',
      'INSPECTION': '巡检',
      'MULTI_ROTOR': '多旋翼',
      'FIXED_WING': '固定翼',
      'HELICOPTER': '直升机',
      'DRONE_RACING': '竞速无人机',
      'OTHER': '其他'
    }
    return CATEGORY_CODE_MAP[code?.toUpperCase()] || code || ''
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
        ? ['视距内驾驶员', '超视距驾驶员', '教员']
        : ['初级工', '中级工', '高级工', '技师', '高级技师']  // RENSHE 完整等级名称

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
    } catch (err) {
      logger.error('[学习路径] 加载失败', err)
      // 确保即使加载失败也显示页面内容和分类名称
      const levelOrder = source === 'CAAC' 
        ? ['视距内驾驶员', '超视距驾驶员', '教员']
        : ['初级工', '中级工', '高级工', '技师', '高级技师']
      const stages = levelOrder.map((level, index) => ({ level, levelIndex: index, courses: [], classes: [] }))
      this.setData({ stages, isAllEmpty: true, loading: false })
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
