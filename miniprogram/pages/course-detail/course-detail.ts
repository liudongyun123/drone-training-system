// pages/course-detail/course-detail.ts
// 课程详情页 - 统一入口（介绍/目录/课件 Tab 切换）

import { courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { dbGetList, request } from '../../utils/http'
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
        hasPermission = (permResult.data || []).length > 0
      }
      
      this.setData({ course, lessons, hasPermission, coursewareList, loading: false })
    } catch (err) {
      logger.error('课程', '加载课程失败', err)
      this.setData({ loading: false })
      showToast('加载课程失败')
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

  // 解析PDF文件的URL
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
      const pdfUrl = await this.resolvePdfUrl(fileid)
      logger.info('课件', '开始下载PDF:', pdfUrl.substring(0, 80) + '...')

      const downloadResult = await new Promise<string>((resolve, reject) => {
        wx.downloadFile({
          url: pdfUrl,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.tempFilePath)
            } else {
              reject(new Error(`下载失败，状态码: ${res.statusCode}`))
            }
          },
          fail: (err) => {
            const errMsg = err.errMsg || ''
            if (errMsg.includes('not in domain list') || errMsg.includes('url not in')) {
              reject(new DomainError(pdfUrl))
            } else {
              reject(new Error(`下载请求失败: ${errMsg}`))
            }
          }
        })
      })

      wx.openDocument({
        filePath: downloadResult,
        fileType: 'pdf',
        showMenu: false,  // 禁止转发和保存，仅允许查看
        success: () => {
          logger.info('课件', 'PDF打开成功')
        },
        fail: (err) => {
          logger.error('课件', 'PDF打开失败', err)
          showToast('无法打开课件')
        }
      })
    } catch (err: any) {
      logger.error('课件', 'PDF加载失败:', err)
      if (err instanceof DomainError) {
        // 使用代理下载绕过域名限制
        this.proxyDownloadPdf(fileid)
      } else {
        const msg = err.message || '课件加载失败'
        showToast(msg.length > 20 ? msg.substring(0, 20) + '...' : msg)
      }
    } finally {
      this.setData({ pdfLoading: false })
    }
  },

  // 通过云函数代理下载PDF（绕过小程序域名白名单限制）
  async proxyDownloadPdf(fileId: string) {
    wx.showLoading({ title: '正在加载课件...' })
    try {
      // 如果不是 cloud:// 格式，先获取 cloud:// fileID
      let cloudFileId = fileId
      if (!cloudFileId.startsWith('cloud://')) {
        // 尝试拼接完整 fileID
        cloudFileId = `cloud://rcwljy-5ghmq2ex26764978.rcwljy-5ghmq2ex26764978/${fileId}`
      }

      const res: any = await request('/db-init', 'POST', {
        action: 'proxyDownload',
        fileList: [cloudFileId]
      })

      wx.hideLoading()

      if (res.code === 413) {
        wx.showModal({
          title: '文件过大',
          content: '课件文件超过10MB，无法在小程序中直接打开。链接已复制，请在浏览器中查看。',
          showCancel: false
        })
        if (res.data?.url) {
          wx.setClipboardData({ data: res.data.url })
        }
        return
      }

      if (res.code !== 0 || !res.data?.base64) {
        showToast(res.message || '课件下载失败')
        return
      }

      // base64 写入本地临时文件
      const fs = wx.getFileSystemManager()
      const fileName = res.data.fileName || 'courseware.pdf'
      const tempPath = `${wx.env.USER_DATA_PATH}/${Date.now()}_${fileName}`

      fs.writeFileSync(tempPath, res.data.base64, 'base64')

      wx.openDocument({
        filePath: tempPath,
        fileType: 'pdf',
        showMenu: false,  // 禁止转发和保存，仅允许查看
        success: () => logger.info('课件', 'PDF代理下载打开成功'),
        fail: (err: any) => {
          logger.error('课件', 'PDF代理下载打开失败', err)
          showToast('无法打开课件')
        }
      })
    } catch (err: any) {
      wx.hideLoading()
      logger.error('课件', '代理下载PDF失败:', err)
      showToast('课件加载失败，请稍后重试')
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
    const lesson = this.data.lessons.find((l: any) => l._id === lessonId)
    const isFree = lesson?.isFree || false
    
    if (!this.data.hasPermission && !isFree) {
      showToast('请先购买课程')
      return
    }
    
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

  onVideoError(e: any) {
    logger.error('课程详情', '视频加载失败:', e.detail)
    showToast('视频加载失败，请稍后重试')
  }
})
