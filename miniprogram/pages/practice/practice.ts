// pages/practice/practice.ts
// 练习中心页

import { getDatabase } from '../../utils/cloudbase'

const db = getDatabase()

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
    this.loadData()
  },

  async loadData() {
    this.setData({ loading: true })

    try {
      const [bankResult, examResult] = await Promise.all([
        db.collection('question_banks')
          .orderBy('sort', 'asc')
          .get(),
        db.collection('mock_exams')
          .where({ status: 'published' })
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get()
      ])

      this.setData({
        questionBanks: bankResult.data,
        mockExams: examResult.data,
        loading: false
      })
    } catch (err) {
      console.error('加载练习数据失败:', err)
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