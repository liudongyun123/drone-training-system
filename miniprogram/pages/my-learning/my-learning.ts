// pages/my-learning/my-learning.ts
// 我的学习页面

import { checkLogin, getUserId, getPhone } from '../../utils/util'
import { courseApi, newUserApi } from '../../utils/api'
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
    totalStats: {
      totalCourses: 0,
      totalHours: 0,
      completedCourses: 0,
      certificates: 0
    },
    loading: false,
    refreshing: false
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

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    Promise.all([
      this.loadMyData(),
      this.loadLearningStats()
    ]).then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  onRefresh() {
    this.onPullDownRefresh()
  },

  checkStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      isLoggedIn: checkLogin(),
      userInfo,
      phone: getPhone() || ''
    })
  },

  // 加载学习统计
  async loadLearningStats() {
    try {
      const result = await newUserApi.getLearningStats()
      if (result.success && result.data) {
        const stats = result.data
        this.setData({
          totalStats: {
            totalCourses: (stats.courseCount || 0) + (stats.learningCount || 0),
            totalHours: stats.learningHours || 0,
            completedCourses: stats.completedCount || 0,
            certificates: stats.certificateCount || 0
          }
        })
      }
    } catch (err) {
      logger.error('我的学习', '加载学习统计失败', err)
    }
  },

  async loadMyData() {
    this.setData({ loading: true })
    try {
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

      // 获取进度数据
      const progressResults: any[] = []
      const r1 = await dbGetList('user_progress', {
        where: { phone },
        orderBy: 'updatedAt desc'
      })
      if (r1.data) progressResults.push(...r1.data)

      // 按课程分组
      const courseProgressMap = new Map<string, any>()
      for (const p of progressResults) {
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

      // 获取已购课程 - 双重查询：course_permissions + orders
      const purchasedCourseIds = new Set<string>()
      
      // 1. 从 course_permissions 表获取
      const permResult = await dbGetList('course_permissions', {
        where: { phone },
        orderBy: 'createdAt desc'
      })
      const permData = permResult.data || []
      for (const p of permData) {
        if (p.courseId) {
          purchasedCourseIds.add(p.courseId)
        }
      }
      
      // 2. 从 orders 表获取已支付的课程订单（兼容历史订单）
      try {
        const orderResult = await dbGetList('orders', {
          where: {
            phone,
            orderType: 'course',
            status: 'paid'
          },
          orderBy: 'createdAt desc',
          limit: 100
        })
        const orderData = orderResult.data || []
        for (const o of orderData) {
          if (o.courseId) {
            purchasedCourseIds.add(o.courseId)
          }
          // 兼容 items 中存储的课程ID
          if (o.items && Array.isArray(o.items)) {
            for (const item of o.items) {
              if (item.courseId) purchasedCourseIds.add(item.courseId)
              if (item.productId) purchasedCourseIds.add(item.productId)
            }
          }
        }
        console.log('[我的学习] 从订单表补充课程:', orderData.length, '个订单')
      } catch (err) {
        console.error('[我的学习] 查询订单失败:', err)
      }
      
      console.log('[我的学习] 已购课程总数:', purchasedCourseIds.size)

      // 获取课程列表
      const allCourses = await courseApi.getList({ pageSize: 100 })
      const publishedCourses = allCourses.filter((c: any) => c.status === 'published')

      const learningCourses: any[] = []
      const completedCourses: any[] = []
      const notStartedCourses: any[] = []

      for (const course of publishedCourses) {
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

        // 未开始
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
          lastLearnTime: cp.lastLearnTime,
          lastLearnTimeStr: this.formatTime(cp.lastLearnTime)
        }

        if (cp.progress >= 100) {
          completedCourses.push({
            ...courseData,
            completeTime: cp.lastLearnTime,
            completeTimeStr: this.formatTime(cp.lastLearnTime)
          })
        } else {
          learningCourses.push(courseData)
        }
      }

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

  // 格式化时间
  formatTime(timeStr: string): string {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
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

  onShareAppMessage() {
    return {
      title: '无人机培训',
      path: '/pages/index/index'
    }
  }
})
