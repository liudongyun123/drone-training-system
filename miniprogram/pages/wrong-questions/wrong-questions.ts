// pages/wrong-questions/wrong-questions.ts
// 错题本页

import { getWrongQuestions } from '../../utils/http'
import logger from '../../utils/logger'

Page({
  data: {
    questions: [] as any[],
    loading: true,
    refreshing: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '错题本' })
    this.loadQuestions()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadQuestions().then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  async loadQuestions() {
    this.setData({ loading: true })
    try {
      const userId = wx.getStorageSync('userId') || ''
      const result = await getWrongQuestions(userId)
      
      const questions = (result.data || []).map((q: any) => ({
        _id: q._id,
        questionId: q.questionId,
        question: q.question || q.content,
        yourAnswer: q.yourAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        type: q.type || 'single',
        options: q.options || [],
        wrongCount: q.wrongCount || 1,
        lastWrongAt: this.formatTime(q.lastWrongAt || q.createdAt)
      }))
      
      this.setData({
        questions,
        loading: false
      })
    } catch (err) {
      logger.error('错题本', '加载失败', err)
      this.setData({ loading: false })
    }
  },

  formatTime(timeStr: string): string {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const days = Math.floor(diff / 86400000)
    if (days < 1) return '今天'
    if (days < 7) return `${days}天前`
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  // 查看详情
  viewDetail(e: any) {
    const q = e.currentTarget.dataset.question
    let optionsHtml = ''
    if (q.options && q.options.length > 0) {
      optionsHtml = q.options.map((opt: any, idx: number) => {
        const prefix = String.fromCharCode(65 + idx) // A, B, C, D
        const isCorrect = q.correctAnswer === prefix || q.correctAnswer === opt.key
        const isWrong = q.yourAnswer === prefix || q.yourAnswer === opt.key
        return `${prefix}. ${opt.content} ${isCorrect ? '✅' : ''} ${isWrong ? '(你的答案)' : ''}`
      }).join('\n')
    }
    
    wx.showModal({
      title: '题目详情',
      content: `${q.question}\n\n${optionsHtml ? '选项:\n' + optionsHtml + '\n\n' : ''}正确答案: ${q.correctAnswer}\n你的答案: ${q.yourAnswer}\n\n${q.explanation ? '解析: ' + q.explanation : ''}`,
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 重新练习
  retryQuestion(e: any) {
    const q = e.currentTarget.dataset.question
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
    // TODO: 跳转到单题练习页面
  }
})
