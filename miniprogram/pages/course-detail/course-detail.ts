// pages/course-detail/course-detail.ts
// 课程详情页 - 统一入口（介绍/目录/课件 Tab 切换）

import { courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { dbGetList, dbQuery, request } from '../../utils/http'
import logger from '../../utils/logger'
import { DEFAULT_COVER, SERVICE_PHONE } from '../../utils/constants'

// 云存储临时链接缓存（避免重复请求）
const tempUrlCache = new Map<string, string>()

// 域名白名单错误
class DomainError extends Error {
  url: string
  constructor(url: string) {
    super('下载域名未在白名单中')
    this.url = url
  }
}

interface PdfFile {
  fileID: string
  name: string
  size: number
}

interface CoursewareItem {
  lessonId: string
  lessonTitle: string
  pdfFile: PdfFile
  isFree: boolean
}

Page({
  data: {
    courseId: '',
    course: null as any,
    lessons: [] as any[],
    hasPermission: false,
    loading: true,
    defaultCover: DEFAULT_COVER,
    // Tab 切换
    activeTab: 'intro' as 'intro' | 'lessons' | 'courseware',
    coursewareList: [] as CoursewareItem[],
    // PDF 加载
    pdfLoading: false
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
      logger.debug('课程详情', '加载课程, courseId:', courseId)
      
      const [course, lessons] = await Promise.all([
        courseApi.getDetail(courseId),
        courseApi.getLessons(courseId)
      ])
      
      logger.debug('课程详情', '课程数据:', course)
      logger.debug('课程详情', '课时数据:', lessons)

      // 课程视频URL：cloud:// 且扩展名不是 .mp4 时，需要先获取临时链接（小程序 video 组件对 .m4v/.mov 扩展名支持不佳）
      if (course && course.videoUrl && course.videoUrl.startsWith('cloud://') && !course.videoUrl.toLowerCase().endsWith('.mp4')) {
        course.videoUrl = await this.getCloudVideoUrl(course.videoUrl)
      }

      // 汇总课件列表
      const coursewareList: CoursewareItem[] = (lessons || [])
        .filter((l: any) => l.pdfFile && l.pdfFile.fileID)
        .map((l: any) => ({
          lessonId: l._id,
          lessonTitle: l.title,
          pdfFile: l.pdfFile,
          isFree: l.isFree || l.isPreview || false
        }))
      
      // 检查是否已购买
      let hasPermission = false
      const phone = wx.getStorageSync('phone') || ''

      if (phone) {
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
      
      // 确保课程有封面兜底
      if (course) {
        course.coverImage = course.coverImage || course.cover || DEFAULT_COVER
        course.cover = course.cover || course.coverImage || DEFAULT_COVER
      }

      // ★ 加载/补齐教师信息：课程可能只有 teacherId，需要从 teachers 集合查询头像
      if (course && (course.teacherId || course.instructorId)) {
        await this.enrichInstructor(course)
      }

      this.setData({ course, lessons, hasPermission, coursewareList, loading: false })
    } catch (err) {
      logger.error('课程', '加载课程失败', err)
      this.setData({ loading: false })
      showToast('加载课程失败')
    }
  },

  // 补齐/丰富教师信息（头像、职称等）
  async enrichInstructor(course: any) {
    try {
      const teacherId = course.teacherId || course.instructorId
      if (!teacherId) return

      // 已有头像且不是 cloud:// 空地址时，无需查询
      const existingAvatar = course.instructorAvatar || course.teacher?.avatar
      if (existingAvatar && !existingAvatar.startsWith('cloud://') && existingAvatar.length > 10) {
        return
      }

      // 查询 teachers 集合
      const result = await dbQuery('teachers', { _id: teacherId })
      const teacher = result.data?.[0]
      if (!teacher) return

      // 写入头像（支持 cloud:// URL）
      const avatarUrl = teacher.avatar || teacher.avatarUrl || teacher.coverImage || ''
      if (avatarUrl) {
        course.instructorAvatar = avatarUrl
        if (course.teacher) course.teacher.avatar = avatarUrl
      }

      // 写入姓名/职称（如果课程中没有）
      if (teacher.name && !course.instructor) course.instructor = teacher.name
      if (teacher.title && !course.instructorTitle) course.instructorTitle = teacher.title

      // 解析 cloud:// 头像 URL
      if (course.instructorAvatar && course.instructorAvatar.startsWith('cloud://')) {
        const res: any = await request('/db-init', 'POST', {
          action: 'getTempFileURL',
          fileList: [course.instructorAvatar]
        })
        if (res.fileList && res.fileList[0] && res.fileList[0].code === 'SUCCESS') {
          course.instructorAvatar = res.fileList[0].tempFileURL || res.fileList[0].download_url
          if (course.teacher) course.teacher.avatar = course.instructorAvatar
        }
      }
    } catch (err) {
      logger.warn('课程详情', '补齐教师信息失败', err)
    }
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
        logger.debug('课程详情', '获取视频URL结果:', res)
        if (res.fileList && res.fileList[0]) {
          const file = res.fileList[0]
          if (file.code === 'SUCCESS') {
            // 小程序视频播放要求 HTTPS，优先使用 tempFileURL；download_url 通常是 HTTP，不直接使用
            const url = file.tempFileURL || (file.download_url && file.download_url.startsWith('https://') ? file.download_url : '')
            if (url) {
              tempUrlCache.set(fileId, url)
              resolve(url)
            } else {
              resolve(fileId)
            }
          } else {
            resolve(fileId)
          }
        } else {
          resolve(fileId)
        }
      }).catch((err: any) => {
        logger.error('课程详情', '获取视频URL失败:', err)
        resolve(fileId)
      })
    })
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 解析PDF文件的URL（HTTP/外部链接兼容）
  async resolvePdfUrl(fileid: string): Promise<string> {
    if (fileid.startsWith('http://') || fileid.startsWith('https://')) {
      return fileid
    }
    if (fileid.startsWith('cloud://')) {
      const res: any = await request('/db-init', 'POST', {
        action: 'getTempFileURL',
        fileList: [fileid]
      })
      if (res.code !== 0) throw new Error(res.message || '获取文件链接失败')
      if (res.fileList && res.fileList[0] && res.fileList[0].code === 'SUCCESS') {
        return res.fileList[0].tempFileURL || res.fileList[0].download_url
      }
      throw new Error('文件链接返回为空')
    }
    // 其他格式尝试 getTempFileURL
    const res: any = await request('/db-init', 'POST', {
      action: 'getTempFileURL',
      fileList: [fileid]
    })
    if (res.code === 0 && res.fileList && res.fileList[0] && res.fileList[0].code === 'SUCCESS') {
      return res.fileList[0].tempFileURL || res.fileList[0].download_url
    }
    // 拼接完整 cloud:// URL
    const fullFileId = `cloud://rcwljy-5ghmq2ex26764978.rcwljy-5ghmq2ex26764978/${fileid}`
    const res2: any = await request('/db-init', 'POST', {
      action: 'getTempFileURL',
      fileList: [fullFileId]
    })
    if (res2.code === 0 && res2.fileList && res2.fileList[0] && res2.fileList[0].code === 'SUCCESS') {
      return res2.fileList[0].tempFileURL || res2.fileList[0].download_url
    }
    throw new Error('无法识别文件格式，请重新上传课件')
  },

  // 标准化云文件 ID
  normalizeCloudFileID(fileID: string): string {
    if (fileID.startsWith('cloud://')) return fileID
    return `cloud://rcwljy-5ghmq2ex26764978.rcwljy-5ghmq2ex26764978/${fileID}`
  },

  // 使用 wx.cloud 直接下载云文件（绕过小程序域名白名单）
  async downloadCloudFile(fileID: string): Promise<string> {
    const normalizedFileID = this.normalizeCloudFileID(fileID)
    return new Promise((resolve, reject) => {
      wx.cloud.downloadFile({
        fileID: normalizedFileID,
        success: (res) => {
          if (res.tempFilePath) {
            resolve(res.tempFilePath)
          } else {
            reject(new Error('下载文件无临时路径'))
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '云文件下载失败'))
        }
      })
    })
  },

  // 打开PDF课件
  async openPdf(e: any) {
    const { fileid, isfree } = e.currentTarget.dataset
    if (!fileid) {
      showToast('课件不存在')
      return
    }

    // 权限检查：未购买时只允许查看免费课件
    if (!this.data.hasPermission && !isfree) {
      showToast('购买课程后可查看全部课件')
      return
    }

    this.setData({ pdfLoading: true })

    try {
      wx.showLoading({ title: '加载课件...' })

      // 优先使用 wx.cloud 直接下载，绕过域名白名单和 6MB 响应限制
      let tempFilePath = ''
      try {
        tempFilePath = await this.downloadCloudFile(fileid)
      } catch (cloudErr: any) {
        logger.warn('课件', 'wx.cloud 下载失败，尝试代理下载:', cloudErr)
        tempFilePath = await this.proxyDownloadFile(fileid)
      }

      await wx.openDocument({
        filePath: tempFilePath,
        fileType: 'pdf',
        showMenu: true,
        success: () => {
          logger.info('课件', 'PDF打开成功')
        },
        fail: (err) => {
          logger.error('课件', 'PDF打开失败', err)
          throw err
        }
      })

      wx.hideLoading()
    } catch (err: any) {
      wx.hideLoading()
      logger.error('课件', 'PDF加载失败:', err)
      const msg = err.message || err.errMsg || '课件加载失败'
      showToast(msg.length > 20 ? msg.substring(0, 20) + '...' : msg)
    } finally {
      this.setData({ pdfLoading: false })
    }
  },

  // 通过云函数代理下载并写入本地临时文件
  async proxyDownloadFile(fileId: string): Promise<string> {
    const res: any = await request('/db-init', 'POST', {
      action: 'proxyDownload',
      fileList: [this.normalizeCloudFileID(fileId)]
    })

    if (res.code === 413) {
      throw new Error('课件超过10MB，无法直接打开')
    }
    if (res.code !== 0 || !res.data?.base64) {
      throw new Error(res.message || '代理下载失败')
    }

    const fs = wx.getFileSystemManager()
    const fileName = res.data.fileName || 'courseware.pdf'
    const tempPath = `${wx.env.USER_DATA_PATH}/${Date.now()}_${fileName}`
    fs.writeFileSync(tempPath, res.data.base64, 'base64')
    return tempPath
  },

  // 通过云函数代理下载PDF（保留兼容，实际优先使用 wx.cloud.downloadFile）
  async proxyDownloadPdf(fileId: string) {
    wx.showLoading({ title: '正在加载课件...' })
    try {
      const tempFilePath = await this.proxyDownloadFile(fileId)
      wx.openDocument({
        filePath: tempFilePath,
        fileType: 'pdf',
        showMenu: true,
        success: () => logger.info('课件', 'PDF代理下载打开成功'),
        fail: (err: any) => {
          logger.error('课件', 'PDF代理下载打开失败', err)
          showToast('无法打开课件')
        }
      })
    } catch (err: any) {
      wx.hideLoading()
      logger.error('课件', '代理下载PDF失败:', err)
      const msg = err.message || err.errMsg || '课件加载失败，请稍后重试'
      showToast(msg.length > 20 ? msg.substring(0, 20) + '...' : msg)
    } finally {
      this.setData({ pdfLoading: false })
    }
  },

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  },

  startLearning(e: any) {
    logger.debug('课程详情', 'startLearning 被调用', e.currentTarget.dataset)
    
    const lessonId = e.currentTarget.dataset.id
    const targetLessonId = lessonId || (this.data.lessons[0]?._id)
    
    logger.debug('课程详情', 'targetLessonId:', targetLessonId, 'lessons:', this.data.lessons)
    
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
      content: `如有疑问，请拨打客服电话：${SERVICE_PHONE}`,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: SERVICE_PHONE
          })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.course?.title || '无人机培训课程',
      path: `/pages/course-detail/course-detail?id=${this.data.courseId}`,
      imageUrl: this.data.course?.coverImage || this.data.course?.cover || ''
    }
  },

  onCoverError() {
    const course = this.data.course
    if (course) {
      course.coverImage = DEFAULT_COVER
      this.setData({ course })
    }
  },

  // 教师头像加载失败兜底
  onTeacherAvatarError() {
    const course = this.data.course
    if (course) {
      course.instructorAvatar = DEFAULT_COVER
      if (course.teacher) course.teacher.avatar = DEFAULT_COVER
      this.setData({ course })
    }
  },

  onVideoError(e: any) {
    const { course } = this.data
    const videoUrl = course?.videoUrl || ''
    logger.error('课程详情', '视频加载失败:', e.detail)

    const errorMsg = e.detail?.errMsg || ''

    // 格式/编码不支持：提示使用 MP4（H.264 + AAC）重新上传
    if (errorMsg.includes('MEDIA_ERR_SRC_NOT_SUPPORTED') || errorMsg.includes('DEMUXER_ERROR')) {
      if (videoUrl.startsWith('cloud://')) {
        logger.info('课程详情', '格式不支持，尝试临时链接:', videoUrl)
        this.getCloudVideoUrl(videoUrl).then((url) => {
          if (url && url !== videoUrl) {
            course.videoUrl = url
            this.setData({ course })
          } else {
            showToast('视频格式不支持，请重新上传 MP4 格式')
          }
        })
      } else {
        showToast('视频格式不支持，请重新上传 MP4 格式')
      }
      return
    }

    // 如果当前是 cloud:// 地址，尝试使用临时链接重播
    if (videoUrl.startsWith('cloud://')) {
      logger.info('课程详情', 'cloud:// 播放失败，尝试临时链接:', videoUrl)
      this.getCloudVideoUrl(videoUrl).then((url) => {
        if (url && url !== videoUrl) {
          course.videoUrl = url
          this.setData({ course })
        } else {
          showToast('视频加载失败，请稍后重试')
        }
      })
      return
    }

    showToast('视频加载失败，请稍后重试')
  }
})