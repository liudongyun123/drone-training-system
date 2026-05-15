// pages/lesson-player/lesson-player.ts
// 课程视频播放页面 - 支持进度同步、断点续播、完成记录

import { showToast } from '../../utils/util'
import { callFunction, dbGetList } from '../../utils/http'
import logger from '../../utils/logger'

interface Lesson {
  _id: string
  title: string
  videoUrl: string
  duration: number
  order: number
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
    // 进度保存定时器
    _progressTimer: null as any,
    // 是否已记录完成
    _completed: false,
    // 下一课时ID
    nextLessonId: ''
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
    // 创建视频上下文
    this.setData({ videoContext: wx.createVideoContext('lessonVideo') })
  },

  onUnload() {
    // 页面卸载时保存进度
    this.saveProgress()
    // 清除定时器
    if (this.data._progressTimer) {
      clearInterval(this.data._progressTimer)
    }
  },

  onHide() {
    // 页面隐藏时保存进度
    this.saveProgress()
  },

  // 加载数据
  async loadData(courseId: string, lessonId: string) {
    this.setData({ loading: true })

    try {
      // 并行加载课程信息、课时列表、学习进度
      const [courseRes, lessonsRes, progressRes] = await Promise.all([
        callFunction('api-course', { action: 'getDetail', courseId }),
        callFunction('api-course', { action: 'getLessons', courseId }),
        this.loadProgress(courseId, lessonId)
      ])

      const course = courseRes?.data || courseRes
      const lessons = lessonsRes?.data || lessonsRes || []
      const lesson = lessons.find((l: Lesson) => l._id === lessonId) || lessons[0]

      if (!lesson) {
        showToast('课时不存在')
        this.setData({ loading: false })
        return
      }

      // 如果视频URL为空，显示占位提示但不阻止页面加载
      const hasVideo = !!(lesson.videoUrl && lesson.videoUrl.trim())

      // 计算进度百分比
      const watchedDuration = progressRes?.watchedDuration || 0
      const progress = lesson.duration > 0 ? Math.min(100, Math.round((watchedDuration / lesson.duration) * 100)) : 0

      this.setData({
        course,
        lesson,
        lessons,
        currentVideoUrl: lesson.videoUrl || '',
        hasVideo,
        watchedDuration,
        progress,
        loading: false,
        // 计算下一课时ID
        nextLessonId: ''
      })

      // 计算下一课时ID
      setTimeout(() => {
        const currentIndex = lessons.findIndex((l: Lesson) => l._id === lessonId)
        const nextLesson = lessons[currentIndex + 1]
        if (nextLesson) {
          this.setData({ nextLessonId: nextLesson._id })
        }
      }, 0)

      // 启动进度保存定时器（每10秒保存一次）
      this.startProgressTimer()

      // 如果有观看记录，提示是否续播
      if (watchedDuration > 10) {
        wx.showModal({
          title: '续播提示',
          content: `上次观看到 ${this.formatTime(watchedDuration)}，是否续播？`,
          confirmText: '续播',
          cancelText: '从头播放',
          success: (res) => {
            if (res.confirm) {
              setTimeout(() => {
                this.data.videoContext?.seek(watchedDuration)
              }, 500)
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
    }, 10000) // 每10秒保存一次

    this.setData({ _progressTimer: timer })
  },

  // 保存学习进度
  async saveProgress() {
    const { courseId, lessonId, currentTime, duration, watchedDuration, _completed } = this.data
    const phone = wx.getStorageSync('phone')

    if (!phone || !courseId || !lessonId || currentTime === 0) return

    // 更新本地观看时长（取较大值）
    const newWatchedDuration = Math.max(watchedDuration, currentTime)
    this.setData({ watchedDuration: newWatchedDuration })

    try {
      await callFunction('api-course', {
        action: 'saveProgress',
        phone,
        courseId,
        lessonId,
        watchedDuration: newWatchedDuration,
        duration,
        completed: _completed
      })
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

    // 更新进度百分比
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
      // 记录完成
      await callFunction('api-course', {
        action: 'markCompleted',
        phone,
        courseId,
        lessonId
      })

      showToast('本课时学习完成', 'success')

      // 检查是否全部完成
      const completedCount = await this.getCompletedCount(courseId, phone)
      if (completedCount >= lessons.length) {
        // 课程全部完成，检查是否需要颁发证书
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
      // 检查课程是否配置了证书
      const course = this.data.course
      if (!course) return

      // 调用证书颁发逻辑
      const result = await callFunction('api-course', {
        action: 'issueCertificate',
        phone,
        courseId
      })

      if (result?.success) {
        wx.showModal({
          title: '恭喜',
          content: '您已完成全部课程学习，证书已颁发！',
          showCancel: false,
          confirmText: '查看证书',
          success: () => {
            wx.navigateTo({ url: '/pages/my-certificates/my-certificates' })
          }
        })
      }
    } catch (e) {
      logger.error('播放', '证书颁发失败', e)
    }
  },

    // 切换课时
    switchLesson(e: any) {
    const lessonId = e.currentTarget.dataset.id
    const lesson = this.data.lessons.find(l => l._id === lessonId)

    if (!lesson || !lesson.videoUrl) {
      showToast('该课时暂无视频')
      return
    }

    // 保存当前课时进度
    this.saveProgress()

    // 计算下一课时ID
    const currentIndex = this.data.lessons.findIndex(l => l._id === lessonId)
    const nextLesson = this.data.lessons[currentIndex + 1]
    const nextLessonId = nextLesson ? nextLesson._id : ''

    // 切换到新课时
    this.setData({
      lessonId,
      lesson,
      currentVideoUrl: lesson.videoUrl,
      currentTime: 0,
      watchedDuration: 0,
      progress: 0,
      _completed: false,
      nextLessonId
    })

    // 加载新课时进度
    this.loadProgress(this.data.courseId, lessonId).then(progress => {
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
  }
})
