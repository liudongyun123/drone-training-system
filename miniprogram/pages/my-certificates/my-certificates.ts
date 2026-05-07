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
      const phone = wx.getStorageSync('phone') || ''
      const userId = wx.getStorageSync('userId') || ''

      // 尝试加载证书数据（可能集合不存在）- 同时查询 phone 和 userId
      const queryPromises = []
      
      if (phone) {
        queryPromises.push(
          getExternalCertificates(phone).catch(() => ({ data: [] })),
          getTrainingCertificates(phone).catch(() => ({ data: [] })),
          getCertificates(phone).catch(() => ({ data: [] }))
        )
      }
      
      if (userId) {
        queryPromises.push(
          getExternalCertificates(userId).catch(() => ({ data: [] })),
          getTrainingCertificates(userId).catch(() => ({ data: [] })),
          getCertificates(userId).catch(() => ({ data: [] }))
        )
      }

      const results = await Promise.all(queryPromises)
      
      // 合并结果并去重
      const allExternal = []
      const allTraining = []
      
      for (let i = 0; i < results.length; i += 3) {
        if (results[i]?.data) allExternal.push(...results[i].data)
        if (results[i + 1]?.data) allTraining.push(...results[i + 1].data)
        if (results[i + 2]?.data) allExternal.push(...results[i + 2].data)
      }
      
      // 去重
      const seen = new Set()
      const uniqueExternal = allExternal.filter(c => {
        if (seen.has(c._id)) return false
        seen.add(c._id)
        return true
      })
      
      this.setData({
        externalCerts: uniqueExternal,
        trainingCerts: allTraining,
        loading: false
      })

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
