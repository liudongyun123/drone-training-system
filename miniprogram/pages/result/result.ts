// pages/result/result.ts
// 考试结果页

Page({
  data: {
    type: 'practice' as 'practice' | 'exam',
    totalQuestions: 0,
    correctCount: 0,
    score: 0,
    accuracy: 0,
    questionResults: [] as any[],
    showAnalysis: false,
    currentAnalysisIndex: 0
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '答题结果' })
    const result = wx.getStorageSync('examResult')
    if (result) {
      const accuracy = result.totalQuestions > 0
        ? Math.round(result.correctCount / result.totalQuestions * 100)
        : 0
      this.setData({
        type: result.type,
        totalQuestions: result.totalQuestions,
        correctCount: result.correctCount,
        score: result.score,
        accuracy,
        questionResults: result.questionResults
      })
      wx.removeStorageSync('examResult')
    }
  },

  // 显示答题详情
  showAnalysis() {
    this.setData({ showAnalysis: true })
  },

  // 关闭答题详情
  hideAnalysis() {
    this.setData({ showAnalysis: false })
  },

  // 重新做题
  retry() {
    wx.navigateBack()
  },

  // 返回练习中心
  goBack() {
    wx.navigateBack({ delta: 2 })
  },

  // 查看单题详情
  showQuestionDetail(e: any) {
    const index = e.currentTarget.dataset.index
    this.setData({
      showAnalysis: true,
      currentAnalysisIndex: index
    })
  },

  // 切换题目详情
  prevQuestion() {
    if (this.data.currentAnalysisIndex > 0) {
      this.setData({ currentAnalysisIndex: this.data.currentAnalysisIndex - 1 })
    }
  },

  nextQuestion() {
    if (this.data.currentAnalysisIndex < this.data.questionResults.length - 1) {
      this.setData({ currentAnalysisIndex: this.data.currentAnalysisIndex + 1 })
    }
  }
})
