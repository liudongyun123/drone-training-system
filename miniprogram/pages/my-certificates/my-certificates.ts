// pages/my-certificates/my-certificates.ts
// 我的证书页

import { getExternalCertificates, getTrainingCertificates, getCertificates } from '../../utils/http'
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
      const userId = wx.getStorageSync('userId')

      // 尝试加载证书数据（可能集合不存在）
      const [externalResult, trainingResult, certResult] = await Promise.all([
        getExternalCertificates(userId).catch(() => ({ data: [] })),
        getTrainingCertificates(userId).catch(() => ({ data: [] })),
        getCertificates(userId).catch(() => ({ data: [] }))
      ])

      this.setData({
        externalCerts: externalResult.data || certResult.data || [],
        trainingCerts: trainingResult.data || [],
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

  // 查看证书详情
  viewCert(e: any) {
    const { id, type } = e.currentTarget.dataset
    wx.showToast({ title: '证书详情功能开发中', icon: 'none' })
  },

  // 格式化日期
  formatCertDate(dateStr: string): string {
    return formatDate(dateStr, 'YYYY-MM-DD')
  }
})
