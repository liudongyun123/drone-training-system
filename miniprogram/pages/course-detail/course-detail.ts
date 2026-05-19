// pages/course-detail/course-detail.ts
// 课程详情页

import { courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { dbGetList, request } from '../../utils/http'
import logger from '../../utils/logger'

// 云存储临时链接缓存（避免重复请求）
const tempUrlCache = new Map<string, string>()

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
      
      // 处理课程预览视频URL（cloud://格式需要转换为临时链接）
      if (course && course.videoUrl) {
        if (course.videoUrl.startsWith('cloud://')) {
          course.videoUrl = await this.getCloudVideoUrl(course.videoUrl)
        }
      }
      
      // 处理课时视频URL
      if (lessons && lessons.length > 0) {
        for (let i = 0; i < lessons.length; i++) {
          if (lessons[i].videoUrl && lessons[i].videoUrl.startsWith('cloud://')) {
            lessons[i].videoUrl = await this.getCloudVideoUrl(lessons[i].videoUrl)
          }
        }
      }
      
      // 检查是否已购买
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

  // 获取云存储视频的临时链接
  getCloudVideoUrl(fileId: string): Promise<string> {
    // 如果已经有缓存的直接返回
    if (tempUrlCache.has(fileId)) {
      return Promise.resolve(tempUrlCache.get(fileId)!)
    }

    return new Promise((resolve) => {
      // 通过 db-init 云函数获取临时链接
      request('/db-init', 'POST', {
        action: 'getTempFileURL',
        fileList: [fileId]
      }).then((res: any) => {
        console.log('[课程详情] 获取视频URL结果:', res)
        if (res.fileList && res.fileList[0]) {
          const file = res.fileList[0]
          if (file.code === 'SUCCESS') {
            const url = file.tempFileURL || file.download_url
            tempUrlCache.set(fileId, url) // 缓存结果
            resolve(url)
          } else {
            resolve(fileId)
          }
        } else {
          resolve(fileId)
        }
      }).catch((err: any) => {
        console.error('[课程详情] 获取视频URL失败:', err)
        resolve(fileId)
      })
    })
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
    
    // 检查是否已有该课程的学习权限
    if (this.data.hasPermission) {
      wx.showModal({
        title: '已购买',
        content: '您已购买过该课程，无需重复购买',
        showCancel: false,
        confirmText: '知道了'
      })
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
      course.coverImage = 'https://mmbiz.qpic.cn/mmbiz_png/Qjiaibiceic3sN1WLVzOicicicicicicicicibicicicibicicicicicicicicicicicicicicicicicicicicicicicicicic/0?wx_fmt=png'
      this.setData({ course })
    }
  },

  // 视频加载失败处理
  onVideoError(e: any) {
    console.error('[课程详情] 视频加载失败:', e.detail)
    showToast('视频加载失败，请稍后重试')
  }
})
