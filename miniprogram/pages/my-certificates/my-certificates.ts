// pages/my-certificates/my-certificates.ts
// 我的证书页

import { getDatabase } from '../../utils/cloudbase'
import { checkLogin, formatDate } from '../../utils/util'

const db = getDatabase()

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

      const [externalResult, trainingResult] = await Promise.all([
        db.collection('external_certificates')
          .where({ userId })
          .orderBy('createdAt', 'desc')
          .get(),
        db.collection('training_certificates')
          .where({ userId })
          .orderBy('issuedAt', 'desc')
          .get()
      ])

      this.setData({
        externalCerts: externalResult.data,
        trainingCerts: trainingResult.data,
        loading: false
      })
    } catch (err) {
      console.error('加载证书失败:', err)
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
  formatDate(dateStr: string): string {
    return formatDate(dateStr, 'YYYY-MM-DD')
  }
})