// pages/lesson-player/lesson-player.ts
// 课程视频播放页 - 沉浸式学习体验

import { showToast } from '../../utils/util'
import { dbGetList, dbAdd, dbUpdate, request } from '../../utils/http'
import logger from '../../utils/logger'

// 云存储临时链接缓存
const tempUrlCache = new Map<string, string>()

interface Lesson {
  _id: string
  title: string
  videoUrl: string
  duration: number
  order: number
  pdfFile?: {
    fileID: string
    name: string
    size: number
  }
  questionBankId?: string
  isPreview?: boolean
}

interface Course {
  _id: string
  title: string
}

Page({
  data: {
    courseId: '',
    lessonId: '',
    course: null as Course | null,
    lesson: null as Lesson | null,
    lessons: [] as Lesson[],
    currentVideoUrl: '',
    currentTime: 0,
    duration: 0,
    watchedDuration: 0,
    progress: 0,
    isPlaying: false,
    loading: true,
    videoContext: null as any,
    _progressTimer: null as any,
    _completed: false,
    nextLessonId: '',
    // 试看控制
    isPreviewMode: false,
    previewDuration: 0
  },

  onLoad(options: any) {
    const { courseId, lessonId } = options
    wx.setNavigationBarTitle({ title: '课程学习' })
    if (!courseId || !lessonId) {
      showToast('参数错误')
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({ courseId, lessonId })
    this.loadData(courseId, lessonId)
  },

  onReady() {
    this.setData({ videoContext: wx.createVideoContext('lessonVideo') })
  },

  onUnload() {
    this.saveProgress()
    if (this.data._progressTimer) {
      clearInterval(this.data._progressTimer)
    }
  },

  onHide() {
    this.saveProgress()
  },

  // 获取云存储视频的临时链接
  getCloudVideoUrl(fileId: string): Promise<string> {
    if (tempUrlCache.has(fileId)) {
      return Promise.resolve(tempUrlCache.get(fileId)!)
    }

    return new Promise((resolve) => {
      request('/db-init', 'POST', {
        action: 'getTempFileURL',
        fileList: [fileId]
      }).then((res: any) => {
        if (res.fileList && res.fileList[0]) {
          const file = res.fileList[0]
          if (file.code === 'SUCCESS') {
            const url = file.tempFileURL || file.download_url
            tempUrlCache.set(fileId, url)
            resolve(url)
          } else {
            resolve(fileId)
          }
        } else {
          resolve(fileId)
        }
      }).catch((err: any) => {
        logger.error('播放', '获取视频URL失败:', err)
        resolve(fileId)
      })
    })
  },

  // 加载数据
  async loadData(courseId: string, lessonId: string) {
    this.setData({ loading: true })

    try {
      let [courseRes, lessonsRes, progressRes] = await Promise.all([
        dbGetList('courses', { where: { _id: courseId }, limit: 1 }),
        dbGetList('lessons', { where: { courseId }, orderBy: 'order asc' }),
        this.loadProgress(courseId, lessonId)
      ])

      const course = courseRes?.data?.[0] || null
      let lessons = lessonsRes?.data || []

      // 回退查询 chapters 集合
      if (lessons.length === 0) {
        const chaptersRes = await dbGetList('chapters', { where: { courseId }, orderBy: 'order asc' })
        if (chaptersRes?.data && chaptersRes.data.length > 0) {
          lessons = chaptersRes.data.map((ch: any) => ({
            _id: ch._id,
            courseId: ch.courseId,
            title: ch.title,
            description: ch.description || '',
            content: ch.content || '',
            videoUrl: ch.videoUrl || '',
            duration: ch.videoDuration || ch.duration || 0,
            order: ch.order ?? ch.sortOrder ?? 0,
            isPreview: ch.isPreview || false,
            questionBankId: ch.questionBankId || '',
            pdfFile: ch.pdfFile || null,
            createdAt: ch.createdAt
          }))
        }
      }

      const lesson = lessons.find((l: Lesson) => l._id === lessonId) || lessons[0]

      if (!lesson) {
        showToast('课时不存在')
        this.setData({ loading: false })
        return
      }

      // 检查试看权限：未购买用户只能看 isFree 课时
      const phone = wx.getStorageSync('phone') || ''
      let hasPermission = false
      if (phone) {
        try {
          const permResult = await dbGetList('course_permissions', {
            where: { phone, courseId }
          })
          hasPermission = (permResult.data || []).length > 0
        } catch (e) {
          // 忽略
        }
      }

      const isFree = (lesson as any).isFree || false
      if (!hasPermission && !isFree) {
        showToast('请先购买课程')
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      // 试看模式：未购买 + 免费 + 设置了试看时长
      const previewDuration = (lesson as any).previewDuration || 0
      const isPreviewMode = !hasPermission && isFree && previewDuration > 0

      // 处理视频URL
      let videoUrl = lesson.videoUrl || ''
      if (videoUrl.startsWith('cloud://')) {
        videoUrl = await this.getCloudVideoUrl(videoUrl)
      }

      const hasVideo = !!(videoUrl && videoUrl.trim())

      // 计算进度
      const watchedDuration = progressRes?.watchedDuration || 0
      const progress = lesson.duration > 0 ? Math.min(100, Math.round((watchedDuration / lesson.duration) * 100)) : 0

      this.setData({
        course,
        lesson,
        lessons,
        currentVideoUrl: videoUrl,
        hasVideo,
        isPreviewMode,
        previewDuration,
        watchedDuration,
        progress,
        loading: false,
        nextLessonId: ''
      })

      // 计算下一课时
      setTimeout(() => {
        const currentIndex = lessons.findIndex((l: Lesson) => l._id === lessonId)
        const nextLesson = lessons[currentIndex + 1]
        if (nextLesson) {
          this.setData({ nextLessonId: nextLesson._id })
        }
      }, 0)

      // 启动进度保存定时器
      this.startProgressTimer()

      // 续播提示
      if (watchedDuration > 10) {
        wx.showModal({
          title: '续播提示',
          content: `上次观看到 ${this.formatTime(watchedDuration)}，是否续播？`,
          confirmText: '续播',
          cancelText: '从头播放',
          success: (res) => {
            if (res.confirm) {
              const trySeek = () => {
                if (this.data.videoContext) {
                  this.data.videoContext.seek(watchedDuration)
                } else {
                  setTimeout(trySeek, 100)
                }
              }
              setTimeout(trySeek, 300)
            }
          }
        })
      }

    } catch (err) {
      logger.error('播放', '加载课程失败', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  // 加载学习进度
  async loadProgress(courseId: string, lessonId: string) {
    try {
      const phone = wx.getStorageSync('phone')
      if (!phone) return null

      const result = await dbGetList('user_progress', {
        where: { phone, courseId, lessonId }
      })

      return result.data?.[0] || null
    } catch (e) {
      return null
    }
  },

  // 启动进度保存定时器
  startProgressTimer() {
    const timer = setInterval(() => {
      this.saveProgress()
    }, 10000)

    this.setData({ _progressTimer: timer })
  },

  // 保存学习进度（试看模式不保存）
  async saveProgress() {
    if (this.data.isPreviewMode) return

    const { courseId, lessonId, currentTime, duration, watchedDuration, _completed } = this.data
    const phone = wx.getStorageSync('phone')

    if (!phone || !courseId || !lessonId) return
    if (currentTime === 0 && watchedDuration === 0) return

    const newWatchedDuration = Math.max(watchedDuration, currentTime)
    this.setData({ watchedDuration: newWatchedDuration })

    try {
      const existing = await dbGetList('user_progress', {
        where: { phone, courseId, lessonId }
      })
      
      const now = new Date().toISOString()
      const progressData = {
        phone,
        courseId,
        lessonId,
        watchedDuration: newWatchedDuration,
        duration,
        completed: _completed,
        updatedAt: now
      }
      
      if (existing.data && existing.data.length > 0) {
        await dbUpdate('user_progress', existing.data[0]._id, progressData)
      } else {
        await dbAdd('user_progress', { ...progressData, createdAt: now })
      }
    } catch (e) {
      logger.error('播放', '保存进度失败', e)
    }
  },

  // 视频事件处理
  onVideoPlay() {
    this.setData({ isPlaying: true })
  },

  onVideoPause() {
    this.setData({ isPlaying: false })
    this.saveProgress()
  },

  onVideoEnded() {
    this.setData({ isPlaying: false, _completed: true })
    this.saveProgress()
    this.markLessonCompleted()
  },

  onTimeUpdate(e: any) {
    const { currentTime, duration } = e.detail
    this.setData({ currentTime, duration })

    // 试看时长限制：到达后暂停并提示购买
    if (this.data.isPreviewMode && this.data.previewDuration > 0 && currentTime >= this.data.previewDuration) {
      if (this.data.videoContext) {
        this.data.videoContext.pause()
        this.data.videoContext.seek(this.data.previewDuration)
      }
      this.setData({ isPlaying: false })
      wx.showModal({
        title: '试看结束',
        content: `本课时仅可试看${this.data.previewDuration}秒，购买课程后可观看完整内容`,
        confirmText: '购买课程',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: `/pages/checkout/checkout?type=course&id=${this.data.courseId}` })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }

    const { watchedDuration } = this.data
    const newWatched = Math.max(watchedDuration, currentTime)
    const progress = duration > 0 ? Math.min(100, Math.round((newWatched / duration) * 100)) : 0
    this.setData({ progress, watchedDuration: newWatched })
  },

  onError(e: any) {
    logger.error('播放', '视频播放错误', e.detail)
    showToast('视频加载失败')
  },

  // 标记课时完成
  async markLessonCompleted() {
    const { courseId, lessonId, lessons } = this.data
    const phone = wx.getStorageSync('phone')

    if (!phone) return

    try {
      const existing = await dbGetList('user_progress', {
        where: { phone, courseId, lessonId }
      })
      
      const now = new Date().toISOString()
      if (existing.data && existing.data.length > 0) {
        await dbUpdate('user_progress', existing.data[0]._id, {
          completed: true,
          completedAt: now,
          updatedAt: now
        })
      }

      showToast('本课时学习完成', 'success')

      // 检查是否全部完成
      const completedCount = await this.getCompletedCount(courseId, phone)
      if (completedCount >= lessons.length) {
        this.checkCertificate(courseId, phone)
      }

    } catch (e) {
      logger.error('播放', '标记完成失败', e)
    }
  },

  // 获取已完成课时数
  async getCompletedCount(courseId: string, phone: string) {
    try {
      const result = await dbGetList('user_progress', {
        where: { phone, courseId, completed: true }
      })
      return result.data?.length || 0
    } catch (e) {
      return 0
    }
  },

  // 检查是否需要颁发证书
  async checkCertificate(courseId: string, phone: string) {
    try {
      const course = this.data.course
      if (!course || !course.certificateTemplate) return

      const existing = await dbGetList('certificates', {
        where: { phone, courseId }
      })
      
      if (existing.data && existing.data.length > 0) return

      const now = new Date().toISOString()
      await dbAdd('certificates', {
        phone,
        courseId,
        courseName: course.title,
        certificateNo: `CERT${Date.now()}`,
        issuedAt: now,
        createdAt: now,
        status: 'active'
      })

      wx.showModal({
        title: '恭喜',
        content: '您已完成全部课程学习，证书已颁发！',
        showCancel: false,
        confirmText: '查看证书',
        success: () => {
          wx.navigateTo({ url: '/pages/my-certificates/my-certificates' })
        }
      })
    } catch (e) {
      logger.error('播放', '证书颁发失败', e)
    }
  },

  // 切换课时
  async switchLesson(e: any) {
    const lessonId = e.currentTarget.dataset.id
    const lesson = this.data.lessons.find((l: Lesson) => l._id === lessonId)

    if (!lesson || !lesson.videoUrl) {
      showToast('该课时暂无视频')
      return
    }

    // 保存当前进度
    this.saveProgress()

    // 计算下一课时
    const currentIndex = this.data.lessons.findIndex((l: Lesson) => l._id === lessonId)
    const nextLesson = this.data.lessons[currentIndex + 1]
    const nextLessonId = nextLesson ? nextLesson._id : ''

    // 处理视频URL
    let videoUrl = lesson.videoUrl || ''
    if (videoUrl.startsWith('cloud://')) {
      videoUrl = await this.getCloudVideoUrl(videoUrl)
    }

    this.setData({
      lessonId,
      lesson,
      currentVideoUrl: videoUrl,
      currentTime: 0,
      watchedDuration: 0,
      progress: 0,
      _completed: false,
      nextLessonId
    })

    // 加载新课时进度
    this.loadProgress(this.data.courseId, lessonId).then((progress: any) => {
      if (progress?.watchedDuration) {
        this.setData({ watchedDuration: progress.watchedDuration })
      }
    })
  },

  // 格式化时间
  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  },

  // 返回
  goBack() {
    this.saveProgress()
    wx.navigateBack()
  },

  // 跳转购买课程
  goBuyCourse() {
    wx.navigateTo({ url: `/pages/checkout/checkout?type=course&id=${this.data.courseId}` })
  }
})
