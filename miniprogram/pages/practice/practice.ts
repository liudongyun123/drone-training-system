// pages/practice/practice.ts
// 练习中心页

import { getQuestionBanks, getMockExams } from '../../utils/http'
import logger from '../../utils/logger'

interface QuestionBank {
  _id: string
  title: string
  description: string
  questionCount: number
  icon: string
  category: string
}

Page({
  data: {
    questionBanks: [] as QuestionBank[],
    mockExams: [] as any[],
    loading: true
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '练习中心' })
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })

    try {
      const [bankResult, examResult] = await Promise.all([
        getQuestionBanks(),
        getMockExams()
      ])

      this.setData({
        questionBanks: bankResult.data || [],
        mockExams: examResult.data || [],
        loading: false
      })
    } catch (err) {
      logger.error('练习', '加载练习数据失败', err)
      this.setData({ loading: false })
    }
  },

  // 开始练习
  startPractice(e: any) {
    const bankId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/exam/exam?type=practice&bankId=${bankId}` })
  },

  // 开始模拟考试
  startMockExam(e: any) {
    const examId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/exam/exam?type=exam&examId=${examId}` })
  }
})
