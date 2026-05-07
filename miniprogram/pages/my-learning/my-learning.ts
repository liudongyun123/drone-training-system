// pages/my-learning/my-learning.ts
// 我的学习页面 - 小程序个人中心

import { checkLogin, getUserId, getPhone } from '../../utils/util'
import { courseApi, orderApi } from '../../utils/api'
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
    // 课程列表
    learningCourses: [] as any[],
    completedCourses: [] as any[],
    loading: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '我的学习' })
    this.checkStatus()
    if (checkLogin()) {
      this.loadMyData()
    }
  },

  onShow() {
    this.checkStatus()
    if (checkLogin()) {
      this.loadMyData()
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

  async loadMyData() {
    this.setData({ loading: true })
    try {
      const userId = getUserId() || ''
      const openid = wx.getStorageSync('openid') || ''

      if (!userId && !openid) {
        this.setData({
          learningCourses: [],
          completedCourses: [],
          learningCount: 0,
          completedCount: 0,
          loading: false
        })
        return
      }

      // 从 user_progress 表获取用户真实学习进度
      const progressWhere: any = {}
      if (userId) progressWhere.userId = userId
      else if (openid) progressWhere.openid = openid

      const progressResult = await dbGetList('user_progress', {
        where: progressWhere,
        orderBy: 'updatedAt desc'
      })

      const progressData = progressResult.data || []
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

      // 获取课程详情并计算进度
      const courseIds = Array.from(courseProgressMap.keys())
      const allCourses = await courseApi.getList({ pageSize: 100 })
      const publishedCourses = allCourses.filter((c: any) => c.status === 'published')

      // 获取每个课程的课时数
      const learningCourses: any[] = []
      const completedCourses: any[] = []

      for (const course of publishedCourses) {
        const lessonsResult = await dbGetList('lessons', {
          where: { courseId: course._id },
          limit: 100
        })
        const lessons = lessonsResult.data || []
        const totalLessons = lessons.length

        const cp = courseProgressMap.get(course._id)
        if (!cp) {
          // 该课程没有学习记录，跳过
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

      logger.debug('我的学习', '课程统计', { learning: learningCourses.length, completed: completedCourses.length })

      this.setData({
        learningCourses,
        completedCourses,
        learningCount: learningCourses.length,
        completedCount: completedCourses.length,
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
