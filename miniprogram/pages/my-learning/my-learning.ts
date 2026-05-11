// pages/my-learning/my-learning.ts
// 我的学习页面 - 小程序个人中心

import { checkLogin, getUserId, getPhone } from '../../utils/util'
import { courseApi, newUserApi, learningPathApi } from '../../utils/api'
import { dbGetList } from '../../utils/http'
import logger from '../../utils/logger'

Page({
  data: {
    isLoggedIn: false,
    userInfo: null as any,
    phone: '',
    // Tab 相关
    currentTab: 'learning',
    learningCount: 0,
    completedCount: 0,
    notStartedCount: 0,
    // 课程列表
    learningCourses: [] as any[],
    completedCourses: [] as any[],
    notStartedCourses: [] as any[],
    // 学习统计
    learningStats: null as any,
    loading: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '我的学习' })
    this.checkStatus()
    if (checkLogin()) {
      this.loadMyData()
      this.loadLearningStats()
    }
  },

  onShow() {
    this.checkStatus()
    if (checkLogin()) {
      this.loadMyData()
      this.loadLearningStats()
    }
  },

  checkStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      isLoggedIn: checkLogin(),
      userInfo,
      phone: getPhone() || ''
    })
  },

  // 加载学习统计（使用新 API）
  async loadLearningStats() {
    try {
      const result = await newUserApi.getLearningStats()
      if (result.success && result.data) {
        this.setData({ learningStats: result.data })
      }
    } catch (err) {
      logger.error('我的学习', '加载学习统计失败', err)
    }
  },

  async loadMyData() {
    this.setData({ loading: true })
    try {
      // ★ 统一使用 phone 作为用户标识
      const phone = getPhone() || ''

      if (!phone) {
        this.setData({
          learningCourses: [],
          completedCourses: [],
          notStartedCourses: [],
          learningCount: 0,
          completedCount: 0,
          notStartedCount: 0,
          loading: false
        })
        return
      }

      // ★ 统一使用 phone 查询（数据库已统一）
      const progressResults: any[] = []
      
      const r1 = await dbGetList('user_progress', {
        where: { phone },
        orderBy: 'updatedAt desc'
      })
      if (r1.data) progressResults.push(...r1.data)
      
      // 去重（根据 courseId + lessonId）
      const progressMap = new Map<string, any>()
      for (const p of progressResults) {
        const key = `${p.courseId}-${p.lessonId}`
        if (!progressMap.has(key)) {
          progressMap.set(key, p)
        }
      }
      const progressData = Array.from(progressMap.values())
      
      logger.debug('我的学习', '进度数据', progressData)

      // 按课程分组统计进度
      const courseProgressMap = new Map<string, any>()

      for (const p of progressData) {
        const courseId = p.courseId
        if (!courseProgressMap.has(courseId)) {
          courseProgressMap.set(courseId, {
            courseId,
            progress: 0,
            totalLessons: 0,
            learnedLessons: 0,
            lastLearnTime: '',
            lessons: []
          })
        }
        const cp = courseProgressMap.get(courseId)
        if (p.completed) {
          cp.learnedLessons++
        }
        if (p.watchedDuration > 0 && !cp.lastLearnTime) {
          cp.lastLearnTime = p.updatedAt
        }
      }

      // 获取用户已购买的课程（从 course_permissions 表 - 使用 phone 查询）
      const permResult = await dbGetList('course_permissions', {
        where: { phone },
        orderBy: 'createdAt desc'
      })
      
      const permData = permResult.data || []
      const purchasedCourseIds = new Set<string>()
      
      for (const p of permData) {
        if (p.courseId) {
          purchasedCourseIds.add(p.courseId)
        }
      }
      logger.debug('我的学习', '已购课程', Array.from(purchasedCourseIds))

      // 获取课程详情并计算进度
      const allCourses = await courseApi.getList({ pageSize: 100 })
      const publishedCourses = allCourses.filter((c: any) => c.status === 'published')

      // 获取每个课程的课时数
      const learningCourses: any[] = []
      const completedCourses: any[] = []
      const notStartedCourses: any[] = []

      for (const course of publishedCourses) {
        // 只处理已购买的课程
        if (!purchasedCourseIds.has(course._id)) {
          continue
        }

        const lessonsResult = await dbGetList('lessons', {
          where: { courseId: course._id },
          limit: 100
        })
        const lessons = lessonsResult.data || []
        const totalLessons = lessons.length

        const cp = courseProgressMap.get(course._id)

        // 未开始：没有学习记录或没有任何课时被看完
        if (!cp || (cp.learnedLessons === 0 && !cp.lastLearnTime)) {
          notStartedCourses.push({
            ...course,
            progress: 0,
            learnedLessons: 0,
            totalLessons: totalLessons,
            lastLearnTime: ''
          })
          continue
        }

        cp.totalLessons = totalLessons
        cp.progress = totalLessons > 0 ? Math.round((cp.learnedLessons / totalLessons) * 100) : 0

        const courseData = {
          ...course,
          progress: cp.progress,
          learnedLessons: cp.learnedLessons,
          totalLessons: totalLessons,
          lastLearnTime: cp.lastLearnTime
        }

        if (cp.progress >= 100) {
          completedCourses.push(courseData)
        } else {
          learningCourses.push(courseData)
        }
      }

      logger.debug('我的学习', '课程统计', { learning: learningCourses.length, completed: completedCourses.length, notStarted: notStartedCourses.length })

      this.setData({
        learningCourses,
        completedCourses,
        notStartedCourses,
        learningCount: learningCourses.length,
        completedCount: completedCourses.length,
        notStartedCount: notStartedCourses.length,
        loading: false
      })
    } catch (err) {
      logger.error('我的学习', '加载数据失败', err)
      this.setData({ loading: false })
    }
  },

  // Tab 切换
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
  },

  // 去登录
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  // 去选课
  goToCourseList() {
    wx.switchTab({ url: '/pages/course-list/course-list' })
  },

  // 进入课程
  goToCourse(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` })
  },

  // 复习课程
  reviewCourse(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}&mode=review` })
  },

  // 获取证书
  getCertificate(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/my-certificates/my-certificates?courseId=${id}` })
  },

  // 去订单页
  goToOrders() {
    wx.navigateTo({ url: '/pages/my-orders/my-orders' })
  },

  // 去班级页
  goToClasses() {
    wx.navigateTo({ url: '/pages/my-classes/my-classes' })
  },

  // 去证书页
  goToCertificates() {
    wx.navigateTo({ url: '/pages/my-certificates/my-certificates' })
  },

  // 去个人中心
  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  // 去练习
  goToPractice() {
    wx.navigateTo({ url: '/pages/practice/practice' })
  },

  onShareAppMessage() {
    return {
      title: '无人机培训',
      path: '/pages/index/index'
    }
  }
})
