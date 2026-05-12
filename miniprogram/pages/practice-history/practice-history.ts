// pages/practice-history/practice-history.ts
// 练习历史记录页

import { getPracticeRecords } from '../../utils/http'
import logger from '../../utils/logger'

Page({
  data: {
    records: [] as any[],
    loading: true,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '练习记录' })
    this.loadRecords()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true, page: 1 })
    this.loadRecords().then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore()
    }
  },

  async loadRecords() {
    this.setData({ loading: true })
    try {
      const userId = wx.getStorageSync('userId') || ''
      const result = await getPracticeRecords(userId, this.data.pageSize)
      
      const records = (result.data || []).map((record: any) => {
        const duration = record.duration || 0
        const durationText = duration > 60 
          ? Math.round(duration / 60) + '分钟' 
          : duration + '秒'
        
        return {
          _id: record._id,
          type: record.type,
          typeText: record.type === 'bank' ? '题库练习' : '模拟考试',
          typeIcon: record.type === 'bank' ? '📚' : '📋',
          targetName: record.targetName || record.bankName || record.examName || '练习',
          score: record.score || 0,
          correctCount: record.correctCount || 0,
          totalCount: record.totalCount || 0,
          duration: duration,
          durationText: durationText,
          accuracy: record.totalCount > 0 ? Math.round((record.correctCount / record.totalCount) * 100) : 0,
          createdAt: this.formatDate(record.createdAt),
          timeText: this.formatTime(record.createdAt)
        }
      })
      
      this.setData({
        records: records,
        loading: false,
        hasMore: records.length >= this.data.pageSize
      })
    } catch (err) {
      logger.error('练习', '加载记录失败', err)
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage })
    
    try {
      const userId = wx.getStorageSync('userId') || ''
      const result = await getPracticeRecords(userId, this.data.pageSize)
      
      const newRecords = (result.data || []).map((record: any) => {
        const duration = record.duration || 0
        const durationText = duration > 60 
          ? Math.round(duration / 60) + '分钟' 
          : duration + '秒'
        
        return {
          _id: record._id,
          type: record.type,
          typeText: record.type === 'bank' ? '题库练习' : '模拟考试',
          typeIcon: record.type === 'bank' ? '📚' : '📋',
          targetName: record.targetName || record.bankName || record.examName || '练习',
          score: record.score || 0,
          correctCount: record.correctCount || 0,
          totalCount: record.totalCount || 0,
          duration: duration,
          durationText: durationText,
          accuracy: record.totalCount > 0 ? Math.round((record.correctCount / record.totalCount) * 100) : 0,
          createdAt: this.formatDate(record.createdAt),
          timeText: this.formatTime(record.createdAt)
        }
      })
      
      this.setData({
        records: [...this.data.records, ...newRecords],
        hasMore: newRecords.length >= this.data.pageSize
      })
    } catch (err) {
      logger.error('练习', '加载更多失败', err)
      this.setData({ page: this.data.page - 1 })
    }
  },

  formatDate(timeStr: string): string {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  formatTime(timeStr: string): string {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  },

  // 继续练习
  continuePractice(e: any) {
    const record = e.currentTarget.dataset.record
    if (record.type === 'bank') {
      wx.navigateTo({
        url: `/pages/exam/exam?type=practice&bankId=${record.targetId}&bankTitle=${encodeURIComponent(record.targetName)}`
      })
    } else {
      wx.navigateTo({
        url: `/pages/exam/exam?type=exam&examId=${record.targetId}&examTitle=${encodeURIComponent(record.targetName)}`
      })
    }
  },

  // 查看详情
  viewDetail(e: any) {
    const record = e.currentTarget.dataset.record
    wx.showModal({
      title: record.targetName,
      content: `练习时间: ${record.createdAt}\n做题数量: ${record.totalCount}题\n正确数量: ${record.correctCount}题\n正确率: ${record.accuracy}%\n用时: ${Math.round(record.duration / 60)}分钟`,
      showCancel: false
    })
  }
})
