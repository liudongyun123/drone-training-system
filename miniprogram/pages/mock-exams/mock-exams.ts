// pages/mock-exams/mock-exams.ts
// 模拟考试列表页 - 展示所有模拟考试

import { getMockExams } from '../../utils/http'
import logger from '../../utils/logger'

interface MockExam {
  _id: string
  title: string
  description: string
  duration: number
  questionCount: number
  passScore: number
  status: string
  totalAttempts: number
}

Page({
  data: {
    exams: [] as MockExam[],
    loading: true,
    refreshing: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '模拟考试' })
    this.loadExams()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadExams().then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  async loadExams() {
    this.setData({ loading: true })
    try {
      const result = await getMockExams(100)

      const exams = (result.data || []).map((exam: any) => ({
        _id: exam._id,
        title: exam.title || exam.name || '未命名考试',
        description: exam.description || '模拟真实考试环境',
        duration: exam.duration || exam.timeLimit || 60,
        questionCount: exam.questionCount || 0,
        passScore: exam.passScore || exam.passingScore || 60,
        status: exam.status || 'published',
        totalAttempts: exam.totalAttempts || 0
      }))

      this.setData({
        exams,
        loading: false
      })
    } catch (err) {
      logger.error('模拟考试', '加载失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 开始考试
  startExam(e: any) {
    const { id, title, duration } = e.currentTarget.dataset

    wx.showModal({
      title: '开始考试',
      content: `确定要开始「${title}」吗？\n考试时长：${duration}分钟`,
      confirmText: '开始考试',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: `/pages/exam/exam?type=exam&examId=${id}&examTitle=${encodeURIComponent(title)}`
          })
        }
      }
    })
  }
})
