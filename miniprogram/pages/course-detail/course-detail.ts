// pages/course-detail/course-detail.ts
// 课程详情页

import { courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { dbGetList } from '../../utils/http'

Page({
  data: {
    courseId: '',
    course: null as any,
    lessons: [] as any[],
    hasPermission: false,
    loading: true
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ courseId: options.id })
      this.loadCourse(options.id)
    }
  },

  async loadCourse(courseId: string) {
    this.setData({ loading: true })
    try {
      const [course, lessons] = await Promise.all([
        courseApi.getDetail(courseId),
        courseApi.getLessons(courseId)
      ])
      
      // 检查是否已购买
      let hasPermission = false
      if (checkLogin()) {
        const userId = getUserId()
        const result = await dbGetList('course_permissions', {
          where: { userId, courseId }
        })
        hasPermission = (result.data || []).length > 0
      }
      
      this.setData({ course, lessons, hasPermission, loading: false })
    } catch (err) {
      console.error('加载课程失败:', err)
      this.setData({ loading: false })
      showToast('加载课程失败')
    }
  },

  startLearning(e: any) {
    if (!this.data.hasPermission) {
      showToast('请先购买课程')
      return
    }
    
    const lessonId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/lesson-player/lesson-player?courseId=${this.data.courseId}&lessonId=${lessonId}`
    })
  },

  buyCourse() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    wx.navigateTo({
      url: `/pages/checkout/checkout?type=course&id=${this.data.courseId}`
    })
  },

  shareCourse() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '如有疑问，请拨打客服电话：400-888-8888',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4008888888'
          })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.course?.title || '无人机培训课程',
      path: `/pages/course-detail/course-detail?id=${this.data.courseId}`
    }
  }
})
