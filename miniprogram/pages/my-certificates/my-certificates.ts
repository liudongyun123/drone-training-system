// pages/my-certificates/my-certificates.ts
// 我的证书页

import { getExternalCertificates, getTrainingCertificates } from '../../utils/http'
import { certificateApi } from '../../utils/api'
import { checkLogin, formatDate } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    tabs: [
      { key: 'external', title: '外部证书' },
      { key: 'training', title: '结业证明' },
      { key: 'system', title: '系统证书' }
    ],
    currentTab: 'external',
    externalCerts: [] as any[],
    trainingCerts: [] as any[],
    systemCerts: [] as any[],
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
      const userId = wx.getStorageSync('userId') || ''

      // 并行加载所有证书数据
      const [externalResult, trainingResult, systemCertResult] = await Promise.all([
        // 外部证书
        phone ? getExternalCertificates(phone).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        // 培训证书
        phone ? getTrainingCertificates(phone).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        // 系统证书（使用新 API）
        certificateApi.getList({ userId }).catch(() => [])
      ])

      this.setData({
        externalCerts: externalResult?.data || [],
        trainingCerts: trainingResult?.data || [],
        systemCerts: Array.isArray(systemCertResult) ? systemCertResult : [],
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

  // 查看证书详情（使用新 API）
  async viewCert(e: any) {
    const { id, type } = e.currentTarget.dataset
    try {
      if (type === 'system' && id) {
        const cert = await certificateApi.getDetail(id)
        if (cert) {
          wx.showModal({
            title: '证书详情',
            content: `证书名称: ${cert.name || '培训证书'}\n颁发日期: ${cert.issuedAt || cert.createdAt || '-'}\n证书编号: ${cert.certificateCode || '-'}`
          })
        }
      } else {
        wx.showToast({ title: '证书详情功能开发中', icon: 'none' })
      }
    } catch (err) {
      logger.error('证书', '查看证书详情失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
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
