// pages/class-detail/class-detail.ts
// 培训班详情页

import { classApi, orderApi, courseApi } from '../../utils/api'
import { checkLogin, getPhone, showToast } from '../../utils/util'
import { dbGetList, request } from '../../utils/http'
import logger from '../../utils/logger'
import { DEFAULT_COVER, SERVICE_PHONE } from '../../utils/constants'

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
}

Page({
  data: {
    classId: '',
    classInfo: null as any,
    schedules: [] as any[],
    includedCourses: [] as any[],   // 关联课程详情列表
    coursewareList: [] as CoursewareItem[], // 关联课程的全部课件
    loading: true,
    isEnrolled: false,
    defaultCover: DEFAULT_COVER,
    // Tab
    activeTab: 'intro' as 'intro' | 'schedule' | 'courses',
    pdfLoading: false
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ classId: options.id })
      wx.setNavigationBarTitle({ title: '培训班详情' })
      this.loadClass(options.id)
    }
  },

  async loadClass(classId: string) {
    this.setData({ loading: true })
    try {
      logger.debug('培训班详情', '加载培训班, classId:', classId)

      const classInfo = await classApi.getDetail(classId)
      logger.debug('培训班详情', '培训班数据:', classInfo)

      // 获取排课
      const schedulesResult = await dbGetList('class_schedules', {
        where: { classId },
        orderBy: 'date asc'
      })

      // 确保封面图片有值
      if (classInfo && !classInfo.coverImage && !classInfo.cover) {
        classInfo.coverImage = DEFAULT_COVER
      }

      // 加载关联课程详情 + 课件汇总
      let includedCourses: any[] = []
      let coursewareList: CoursewareItem[] = []

      // 优先使用 includedCourseIds（ID数组，新格式）
      let courseIdList: string[] = classInfo?.includedCourseIds || []
      // 兼容：如果 includedCourseIds 为空但 courseId 存在，使用 courseId
      if (courseIdList.length === 0 && classInfo?.courseId) {
        courseIdList = [classInfo.courseId]
      }
      // 兼容旧格式：includedCourses 可能是ID数组或名称数组
      let courseNameList: string[] = []
      const rawIncludedCourses: string[] = classInfo?.includedCourses || []
      if (courseIdList.length === 0 && rawIncludedCourses.length > 0) {
        // 区分ID和名称：ID通常是24位hex字符串
        const ids: string[] = []
        const names: string[] = []
        for (const item of rawIncludedCourses) {
          if (typeof item === 'string' && /^[a-f0-9]{16,}$/i.test(item)) {
            ids.push(item)
          } else if (typeof item === 'string') {
            names.push(item)
          }
        }
        if (ids.length > 0) {
          courseIdList = ids
        } else {
          courseNameList = names
        }
      }

      if (courseIdList.length > 0) {
        // 新格式：ID 数组，直接查询课程详情
        for (const courseId of courseIdList) {
          try {
            const course = await courseApi.getDetail(courseId)
            if (course) {
              try {
                const lessons = await courseApi.getLessons(course._id)
                course._lessons = lessons || []
                for (const l of (lessons || [])) {
                  if (l.pdfFile && l.pdfFile.fileID) {
                    coursewareList.push({
                      lessonId: l._id,
                      lessonTitle: l.title,
                      pdfFile: l.pdfFile
                    })
                  }
                }
              } catch (e) {
                logger.warn('培训班详情', '获取课时失败:', e)
              }
              includedCourses.push(course)
            }
          } catch (e) {
            logger.warn('培训班详情', '加载关联课程失败:', courseId, e)
          }
        }
      } else if (courseNameList.length > 0) {
        // 旧格式：名称数组，通过 getList 查找
        try {
          const allCourses = await courseApi.getList({ pageSize: 100 })
          for (const name of courseNameList) {
            const found = allCourses.find((c: any) => c.title === name)
            if (found) {
              try {
                const lessons = await courseApi.getLessons(found._id)
                found._lessons = lessons || []
                for (const l of (lessons || [])) {
                  if (l.pdfFile && l.pdfFile.fileID) {
                    coursewareList.push({
                      lessonId: l._id,
                      lessonTitle: l.title,
                      pdfFile: l.pdfFile
                    })
                  }
                }
              } catch (e) {
                logger.warn('培训班详情', '获取课时失败:', e)
              }
              includedCourses.push(found)
            }
          }
        } catch (e) {
          logger.warn('培训班详情', '加载课程列表失败:', e)
        }
      }

      // 检查用户是否已购买/已报名
      const isEnrolled = await this.checkEnrollmentStatus(classId)

      this.setData({
        classInfo,
        schedules: schedulesResult.data || [],
        includedCourses,
        coursewareList,
        isEnrolled,
        loading: false
      })
    } catch (err) {
      logger.error('培训班', '加载培训班失败', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  // 检查用户是否已购买/已报名该培训班
  async checkEnrollmentStatus(classId: string): Promise<boolean> {
    const phone = getPhone()
    if (!phone) return false

    try {
      const membersResult = await dbGetList('class_members', {
        where: {
          classId,
          phone,
          status: { $in: ['enrolled', 'learning', 'pending', 'confirmed', 'active', 'completed'] }
        }
      })

      if (membersResult.data && membersResult.data.length > 0) return true

      const enrollmentsResult = await dbGetList('enrollments', {
        where: {
          classId,
          phone,
          status: { $in: ['enrolled', 'learning', 'pending', 'confirmed', 'active', 'completed'] }
        }
      })

      if (enrollmentsResult.data && enrollmentsResult.data.length > 0) return true

      const PAID_STATUSES = ['paid', 'completed', 'paid_offline']
      const orders = await orderApi.getByUserId('', 'class')
      return orders.some((o: any) =>
        o.classId === classId && PAID_STATUSES.includes(o.status)
      )
    } catch (err) {
      logger.error('培训班详情', '检查报名状态失败:', err)
      return false
    }
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 跳转到课程详情
  goToCourse(e: any) {
    const courseId = e.currentTarget.dataset.id
    if (!courseId) return
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${courseId}` })
  },

  // 解析PDF文件URL
  async resolvePdfUrl(fileid: string): Promise<string> {
    if (fileid.startsWith('http://') || fileid.startsWith('https://')) return fileid
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
    const res: any = await request('/db-init', 'POST', {
      action: 'getTempFileURL',
      fileList: [fileid]
    })
    if (res.code === 0 && res.fileList && res.fileList[0] && res.fileList[0].code === 'SUCCESS') {
      return res.fileList[0].tempFileURL || res.fileList[0].download_url
    }
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
    const { fileid } = e.currentTarget.dataset
    if (!fileid) { showToast('课件不存在'); return }

    this.setData({ pdfLoading: true })

    try {
      let localPath: string
      const pdfUrl = await this.resolvePdfUrl(fileid)

      // 尝试1：直接使用 wx.downloadFile（快速路径，域名已配置时）
      try {
        localPath = await new Promise<string>((resolve, reject) => {
          wx.downloadFile({
            url: pdfUrl,
            success: (res) => {
              if (res.statusCode === 200) resolve(res.tempFilePath)
              else reject(new Error(`下载失败，状态码: ${res.statusCode}`))
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
      } catch (downloadErr: any) {
        if (downloadErr instanceof DomainError) {
          // ★ 域名限制时，回退到代理下载（完全绕过域名限制）
          logger.info('课件', 'wx.downloadFile 域名限制，回退到代理下载')
          localPath = await this.proxyDownloadPdf(fileid)
        } else {
          throw downloadErr
        }
      }

      // 打开本地PDF
      wx.openDocument({
        filePath: localPath,
        fileType: 'pdf',
        showMenu: false,  // 禁止转发和保存，仅允许查看
        success: () => logger.info('课件', 'PDF打开成功'),
        fail: (err) => { logger.error('课件', 'PDF打开失败', err); showToast('无法打开课件') }
      })
    } catch (err: any) {
      logger.error('课件', 'PDF加载失败:', err)
      const msg = err.message || '课件加载失败'
      showToast(msg.length > 20 ? msg.substring(0, 20) + '...' : msg)
    } finally {
      this.setData({ pdfLoading: false })
    }
  },

  // ★ 代理下载PDF：通过云函数后端下载，绕过小程序 downloadFile 域名限制
  async proxyDownloadPdf(fileId: string): Promise<string> {
    const res: any = await request('/db-init', 'POST', {
      action: 'proxyDownload',
      fileList: [fileId]
    })

    if (res.code !== 0) {
      if (res.code === 413) {
        // 文件过大，提示用浏览器打开
        throw new Error(res.message || '文件过大，请在浏览器中打开')
      }
      throw new Error(res.message || '代理下载失败')
    }

    const { base64, fileName } = res.data
    if (!base64) {
      throw new Error('代理下载返回数据为空')
    }

    // 将 base64 写入本地临时文件
    const fs = wx.getFileSystemManager()
    const tempPath = `${wx.env.USER_DATA_PATH}/${fileName || 'temp.pdf'}`

    return new Promise<string>((resolve, reject) => {
      fs.writeFile({
        filePath: tempPath,
        data: base64,
        encoding: 'base64',
        success: () => resolve(tempPath),
        fail: (err) => reject(new Error(`写入本地文件失败: ${err.errMsg}`))
      })
    })
  },

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  },

  goToEnrollment() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    if (this.data.isEnrolled) {
      wx.showModal({
        title: '已报名',
        content: '您已报名此培训班，是否查看详情？',
        confirmText: '查看',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/my-classes/my-classes' })
          }
        }
      })
      return
    }

    wx.navigateTo({
      url: `/pages/class-enrollment/class-enrollment?id=${this.data.classId}`
    })
  },

  shareClass() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: `如有疑问，请拨打客服电话：${SERVICE_PHONE}`,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) wx.makePhoneCall({ phoneNumber: SERVICE_PHONE })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.classInfo?.name || '培训班报名',
      path: `/pages/class-detail/class-detail?id=${this.data.classId}`,
      imageUrl: this.data.classInfo?.coverImage || this.data.classInfo?.cover || ''
    }
  },

  onCoverError() {
    const classInfo = this.data.classInfo
    if (classInfo) {
      classInfo.coverImage = '/assets/images/default-cover.png'
      this.setData({ classInfo })
    }
  }
})
