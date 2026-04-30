// pages/my-learning/my-learning.ts
// 我的学习页面 - 小程序个人中心

import { checkLogin, getUserId, getPhone } from '../../utils/util'
import { courseApi, orderApi } from '../../utils/api'

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
      
      // 模拟学习数据（实际应该从服务器获取用户的学习进度）
      // 这里用课程列表模拟
      const allCourses = await courseApi.getList({ pageSize: 20 })
      
      // 筛选发布状态的课程
      const publishedCourses = allCourses.filter((c: any) => c.status === 'published')
      
      // 模拟数据：前3个是学习中，后3个是已完成
      const learningCourses = publishedCourses.slice(0, 3).map((course: any, index: number) => ({
        ...course,
        progress: 30 + index * 20,
        learnedLessons: Math.floor(course.lessons?.length || 0 * (30 + index * 20) / 100),
        totalLessons: course.lessons?.length || 10,
        lastLearnTime: '2024-01-15'
      }))
      
      const completedCourses = publishedCourses.slice(3, 6).map((course: any) => ({
        ...course,
        progress: 100,
        learnedLessons: course.lessons?.length || 10,
        totalLessons: course.lessons?.length || 10,
        completeTime: '2024-01-10'
      }))
      
      this.setData({
        learningCourses,
        completedCourses,
        learningCount: learningCourses.length,
        completedCount: completedCourses.length,
        loading: false
      })
    } catch (err) {
      console.error('加载我的数据失败:', err)
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
