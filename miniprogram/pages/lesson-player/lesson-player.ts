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
    hasVideo: false,
    currentTime: 0,
    duration: 0,
    watchedDuration: 0,
    progress: 0,
    isPlaying: false,
    loading: true,
    videoContext: null as any,
    _progressTimer: null as any,
    _completed: false,
    _downloadTask: null as any,
    _originalVideoUrl: '',
  nextLessonId: '',
    // 试看控制
    isPreviewMode: false,
    previewDuration: 0,
    // 视频下载状态
    videoLoading: false,
    videoLoadProgress: 0,
    videoLoadTip: ''
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

  // 获取云存储文件的临时链接（视频和PDF兼容HTTP/外部链接）
  getCloudFileUrl(fileId: string): Promise<string> {
    if (tempUrlCache.has(fileId)) {
      return Promise.resolve(tempUrlCache.get(fileId)!)
    }

    return new Promise((resolve) => {
      request('/db-init', 'POST', {
        action: 'getTempFileURL',
        fileList: [fileId]
      }).then((res: any) => {
        logger.info('播放', 'getTempFileURL 响应', res)
        if (res.fileList && res.fileList[0]) {
          const file = res.fileList[0]
          if (file.code === 'SUCCESS') {
            // 小程序视频播放要求 HTTPS，优先使用 tempFileURL
            let url = file.tempFileURL || ''

            // 备选：download_url 如果是 http://，尝试替换为 https://（CloudBase 存储通常同时支持）
            if (!url && file.download_url) {
              const downloadUrl = String(file.download_url)
              if (downloadUrl.startsWith('https://')) {
                url = downloadUrl
              } else if (downloadUrl.startsWith('http://')) {
                url = downloadUrl.replace(/^http:\/\//, 'https://')
                logger.info('播放', 'download_url 由 HTTP 转换为 HTTPS', url)
              }
            }

            if (url) {
              tempUrlCache.set(fileId, url)
              resolve(url)
            } else {
              logger.warn('播放', '未获取到可用的 HTTPS 文件链接', file)
              resolve(fileId)
            }
          } else {
            logger.warn('播放', '获取文件URL失败: code=' + file.code, file)
            resolve(fileId)
          }
        } else {
          logger.warn('播放', 'getTempFileURL 返回空 fileList', res)
          resolve(fileId)
        }
      }).catch((err: any) => {
        logger.error('播放', '获取文件URL失败:', err)
        resolve(fileId)
      })
    })
  },

  // 保留旧函数名兼容
  getCloudVideoUrl(fileId: string): Promise<string> {
    return this.getCloudFileUrl(fileId)
  },

  // 下载视频到本地临时路径（绕过 <video> 组件对远程 HTTPS 域名的严格校验）
  downloadVideoLocally(httpsUrl: string): Promise<string> {
    const that = this
    
    // 取消上一个下载任务
    if (this.data._downloadTask) {
      this.data._downloadTask.abort()
    }

    return new Promise((resolve, reject) => {
      that.setData({
        videoLoading: true,
        videoLoadProgress: 0,
        videoLoadTip: '视频加载中...'
      })

      const task = wx.downloadFile({
        url: httpsUrl,
        success: (res) => {
          that.setData({ videoLoading: false, videoLoadProgress: 100 })
          if (res.statusCode === 200 && res.tempFilePath) {
            logger.info('播放', '视频下载完成:', res.tempFilePath)
            resolve(res.tempFilePath)
          } else {
            reject(new Error(`下载失败，状态码: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          that.setData({ videoLoading: false })
          logger.error('播放', '视频下载失败:', err)
          reject(new Error(err.errMsg || '视频下载失败'))
        }
      })

      // 监听下载进度
      task.onProgressUpdate((res) => {
        that.setData({ videoLoadProgress: res.progress })
        if (res.totalBytesExpectedToWrite > 0) {
          const mb = (res.totalBytesExpectedToWrite / 1024 / 1024).toFixed(1)
          that.setData({ videoLoadTip: `视频加载中 ${mb}MB...` })
        }
      })

      that.setData({ _downloadTask: task })
    })
  },

  // 处理视频加载：优先 HTTPS 直连（可边播边下），记录原始 URL 用于兜底
  async prepareVideoUrl(videoUrl: string): Promise<string> {
    // cloud:// 格式先解析为 HTTPS
    if (videoUrl && videoUrl.startsWith('cloud://')) {
      videoUrl = await this.getCloudVideoUrl(videoUrl)
    }
    
    if (!videoUrl || !videoUrl.trim()) return ''
    
    // 优先尝试 HTTPS 直连（支持流式播放），缓存备用
    if (videoUrl.startsWith('https://')) {
      this.data._originalVideoUrl = videoUrl
    }

    return videoUrl
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

      // 检查学习权限（已购买 / 免费课程 / 试看课时）
      const phone = wx.getStorageSync('phone') || ''
      let hasPermission = false
      if (phone) {
        const courseId = course?._id || course?.id || this.data.courseId
        const permResult = await dbGetList('course_permissions', {
          where: { phone, courseId }
        })
        const perms = (permResult.data || []) as any[]
        // 记录须存在且未被撤销/关闭、未过期才算有权限（旧记录无 videoAccess 字段则向后兼容视为有效）
        hasPermission = perms.some((p: any) => {
          if (p.status === 'revoked') return false
          if (p.videoAccess && p.videoAccess.enabled === false) return false
          if (p.videoAccess && p.videoAccess.validUntil) {
            const until = new Date(p.videoAccess.validUntil).getTime()
            if (!isNaN(until) && until < Date.now()) return false
          }
          return true
        })
      }

      // 免费课程（价格为0）或课时本身为试看课时，可直接学习
      const isFree = (course?.price === 0) || lesson.isPreview

      if (!hasPermission && !isFree) {
        showToast('请先购买课程')
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }

      const isPreviewMode = false

      // 处理视频URL：cloud:// 解析 + 真机本地下载兜底
      const rawVideoUrl = lesson.videoUrl || ''
      const videoUrl = await this.prepareVideoUrl(rawVideoUrl)
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
        previewDuration: this.data.previewDuration,
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

    // 试看时长限制（previewDuration 由课程配置，当前默认 0 表示不限时长）
    /*
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
    */

    const { watchedDuration } = this.data
    const newWatched = Math.max(watchedDuration, currentTime)
    const progress = duration > 0 ? Math.min(100, Math.round((newWatched / duration) * 100)) : 0
    this.setData({ progress, watchedDuration: newWatched })
  },

  onError(e: any) {
    const { currentVideoUrl } = this.data
    logger.error('播放', '视频播放错误', e.detail)

    const errorMsg = e.detail?.errMsg || ''
    const mediaError = e.detail?.errCode || e.detail?.code || ''

    // 格式/编码不支持：提示使用 MP4（H.264 + AAC）重新上传
    if (errorMsg.includes('MEDIA_ERR_SRC_NOT_SUPPORTED') || errorMsg.includes('DEMUXER_ERROR') || mediaError === 1) {
      if (currentVideoUrl && currentVideoUrl.startsWith('cloud://')) {
        logger.info('播放', '格式不支持，尝试获取 HTTPS 临时链接:', currentVideoUrl)
        this.getCloudVideoUrl(currentVideoUrl).then((url: string) => {
          if (url && url !== currentVideoUrl && url.startsWith('https://')) {
            logger.info('播放', '切换到 HTTPS 临时链接:', url)
            this.data._originalVideoUrl = url
            this.setData({ currentVideoUrl: url })
          } else {
            showToast('视频格式不支持，请使用 H.264 + AAC 编码的 MP4 重新上传')
          }
        })
      } else {
        showToast('视频格式不支持，请使用 H.264 + AAC 编码的 MP4 重新上传')
      }
      return
    }

    // 如果当前是 cloud:// 地址，尝试使用临时链接重播
    if (currentVideoUrl && currentVideoUrl.startsWith('cloud://')) {
      logger.info('播放', 'cloud:// 播放失败，尝试临时链接:', currentVideoUrl)
      this.getCloudVideoUrl(currentVideoUrl).then((url: string) => {
        if (url && url !== currentVideoUrl) {
          this.data._originalVideoUrl = url
          this.setData({ currentVideoUrl: url })
        } else {
          showToast('视频加载失败')
        }
      })
      return
    }

    // 网络错误：尝试下载到本地播放（绕过 <video> 组件域名白名单）
    if (errorMsg.includes('MEDIA_ERR_NETWORK') || mediaError === 2) {
      const fallbackUrl = this.data._originalVideoUrl || currentVideoUrl
      if (fallbackUrl && fallbackUrl.startsWith('https://')) {
        logger.info('播放', 'MEDIA_ERR_NETWORK，下载到本地播放:', fallbackUrl)
        this.downloadVideoLocally(fallbackUrl).then((localPath: string) => {
          this.setData({
            currentVideoUrl: localPath,
            videoLoading: false
          })
        }).catch((err: any) => {
          logger.error('播放', '下载兜底也失败:', err)
          this.setData({ videoLoading: false })
          showToast('视频加载失败，请检查网络')
        })
        return
      }
    }

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

    if (!lesson) {
      showToast('课时不存在')
      return
    }

    // 保存当前进度
    this.saveProgress()

    // 计算下一课时
    const currentIndex = this.data.lessons.findIndex((l: Lesson) => l._id === lessonId)
    const nextLesson = this.data.lessons[currentIndex + 1]
    const nextLessonId = nextLesson ? nextLesson._id : ''

    // 处理视频URL：cloud:// 解析 + 记录备用
    const rawVideoUrl = lesson.videoUrl || ''
    let videoUrl = rawVideoUrl
    if (rawVideoUrl && rawVideoUrl.startsWith('cloud://')) {
      videoUrl = await this.getCloudVideoUrl(rawVideoUrl)
    }
    if (videoUrl.startsWith('https://')) {
      this.data._originalVideoUrl = videoUrl
    }

    this.setData({
      lessonId,
      lesson,
      currentVideoUrl: videoUrl,
      hasVideo: !!(videoUrl && videoUrl.trim()),
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
