// pages/my-certificates/my-certificates.ts
// 我的证书页

import { getExternalCertificates, getTrainingCertificates, getCertificates } from '../../utils/http'
import { certificateApi } from '../../utils/api'
import { checkLogin, formatDate } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    tabs: [
      { key: 'external', title: '外部证书' },
      { key: 'training', title: '结业证明' }
    ],
    currentTab: 'external',
    externalCerts: [] as any[],
    trainingCerts: [] as any[],
    loading: true
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '我的证书' })
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.loadData()
  },

  onShow() {
    if (checkLogin()) {
      this.loadData()
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    this.setData({ loading: true })

    try {
      const phone = wx.getStorageSync('phone') || ''

      // 并行加载所有证书数据
      const [externalResult, trainingResult, completionResult] = await Promise.all([
        // 外部证书
        phone ? getExternalCertificates(phone).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        // 培训证书（后台颁发）
        phone ? getTrainingCertificates(phone).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        // 课程结业证书（课程学完自动颁发，写入 certificates 集合）
        phone ? getCertificates(phone).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ])

      // 合并后台颁发的培训证书与课程自动颁发的结业证书，统一在「结业证明」Tab 展示，
      // 避免课程完成后用户在小程序端看不到自己的证书。
      const trainingCerts = [
        ...(trainingResult?.data || []),
        ...(completionResult?.data || [])
      ].map((c: any) => ({
        ...c,
        displayTitle: c.courseName || c.courseTitle || c.className || c.name || '结业证书',
        displayDate: this.formatCertDate(c.issuedAt || c.issueDate || c.createdAt || '')
      }))

      this.setData({
        externalCerts: externalResult?.data || [],
        trainingCerts,
        loading: false
      })

    } catch (err) {
      logger.error('证书', '加载证书失败', err)
      this.setData({ loading: false })
    }
  },

  // 切换 Tab
  switchTab(e: any) {
    const key = e.currentTarget.dataset.key
    this.setData({ currentTab: key })
  },

  // 添加外部证书
  addExternalCert() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },

  // 查看证书详情 - 跳转仿真证书详情页
  viewCert(e: any) {
    const { id, type } = e.currentTarget.dataset
    const list = type === 'external' ? this.data.externalCerts : this.data.trainingCerts
    const cert = (list || []).find((c: any) => c._id === id)
    wx.navigateTo({
      url: `/pages/certificate-detail/certificate-detail?id=${id}&type=${type}`,
      success: (res) => {
        res.eventChannel.emit('cert', { cert, type })
      }
    })
  },

  // 下载证书（使用新 API）
  async downloadCert(e: any) {
    const { id } = e.currentTarget.dataset
    try {
      wx.showLoading({ title: '生成中...' })
      const result = await certificateApi.download(id)
      wx.hideLoading()
      if (result?.url) {
        wx.previewImage({
          urls: [result.url],
          current: result.url
        })
      } else {
        wx.showToast({ title: '证书生成中，请稍后', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      logger.error('证书', '下载证书失败', err)
      wx.showToast({ title: '下载失败', icon: 'none' })
    }
  },

  // 格式化日期
  formatCertDate(dateStr: string): string {
    return formatDate(dateStr, 'YYYY-MM-DD')
  }
})
