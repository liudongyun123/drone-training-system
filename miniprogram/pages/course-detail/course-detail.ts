// pages/course-detail/course-detail.ts
// 课程详情页

import { courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { dbGetList } from '../../utils/http'
import logger from '../../utils/logger'

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
      wx.setNavigationBarTitle({ title: '课程详情' })
      this.loadCourse(options.id)
    }
  },

  async loadCourse(courseId: string) {
    this.setData({ loading: true })
    try {
      console.log('[课程详情] 加载课程, courseId:', courseId)
      
      const [course, lessons] = await Promise.all([
        courseApi.getDetail(courseId),
        courseApi.getLessons(courseId)
      ])
      
      console.log('[课程详情] 课程数据:', course)
      console.log('[课程详情] 课时数据:', lessons)
      
      // 检查是否已购买 - 使用 phone 查询（购买时用手机号绑定）
      let hasPermission = false
      const phone = wx.getStorageSync('phone') || ''
      
      if (phone) {
        const permResult = await dbGetList('course_permissions', {
          where: { phone, courseId }
        })
        hasPermission = (permResult.data || []).length > 0
      }
      
      this.setData({ course, lessons, hasPermission, loading: false })
    } catch (err) {
      logger.error('课程', '加载课程失败', err)
      this.setData({ loading: false })
      showToast('加载课程失败')
    }
  },

  startLearning(e: any) {
    console.log('[课程详情] startLearning 被调用', e.currentTarget.dataset)
    
    const lessonId = e.currentTarget.dataset.id
    
    if (!this.data.hasPermission) {
      showToast('请先购买课程')
      return
    }
    
    // 如果没有传入 lessonId，使用第一个课时
    const targetLessonId = lessonId || (this.data.lessons[0]?._id)
    
    console.log('[课程详情] targetLessonId:', targetLessonId, 'lessons:', this.data.lessons)
    
    if (!targetLessonId) {
      showToast('课时信息加载中，请重试')
      return
    }
    
    wx.navigateTo({
      url: `/pages/lesson-player/lesson-player?courseId=${this.data.courseId}&lessonId=${targetLessonId}`
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
  },

  // 封面图片加载失败处理
  onCoverError() {
    const course = this.data.course
    if (course) {
      // 使用默认封面图
      course.coverImage = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicgXicicicicicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      this.setData({ course })
    }
  }
})
