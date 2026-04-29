// pages/exam/exam.ts
// 考试/练习答题页

import { getDatabase } from '../../utils/cloudbase'

const db = getDatabase()

interface Question {
  _id: string
  type: 'single' | 'multiple' | 'judge'
  title: string
  options: string[]
  answer: string | string[]
  analysis: string
}

Page({
  data: {
    type: 'practice' as 'practice' | 'exam',
    questions: [] as Question[],
    currentIndex: 0,
    currentQuestion: null as Question | null,
    userAnswers: {} as Record<string, string[]>,
    timeLeft: 0,
    timeText: '00:00',
    submitting: false,
    finished: false,
    bankId: '',
    examId: ''
  },

  timer: null as any,

  onLoad(options: any) {
    const { type, bankId, examId } = options
    this.setData({ type, bankId: bankId || '', examId: examId || '' })
    this.loadQuestions()
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },

  async loadQuestions() {
    try {
      const { type, bankId, examId } = this.data

      if (type === 'exam' && examId) {
        // 模拟考试 - 加载考试题目
        const examResult = await db.collection('mock_exams').doc(examId).get()
        const exam = examResult.data
        const questionsResult = await db.collection('questions')
          .where({ _id: exam.questionIds ? { $in: exam.questionIds } : { examId } })
          .get()
        this.setData({
          questions: questionsResult.data,
          currentQuestion: questionsResult.data[0] || null,
          timeLeft: exam.duration * 60
        })
        this.startTimer()
      } else {
        // 练习模式 - 加载题库题目
        const result = await db.collection('questions')
          .where({ bankId })
          .limit(50)
          .get()
        this.setData({
          questions: result.data,
          currentQuestion: result.data[0] || null
        })
      }
    } catch (err) {
      console.error('加载题目失败:', err)
      wx.showToast({ title: '加载题目失败', icon: 'error' })
    }
  },

  // 开始计时
  startTimer() {
    this.timer = setInterval(() => {
      if (this.data.timeLeft <= 0) {
        clearInterval(this.timer)
        this.submitExam()
        return
      }
      const timeLeft = this.data.timeLeft - 1
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60
      this.setData({
        timeLeft,
        timeText: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      })
    }, 1000)
  },

  // 选择答案
  selectAnswer(e: any) {
    const { questionId, optionIndex } = e.currentTarget.dataset
    const question = this.data.currentQuestion
    if (!question) return

    const userAnswers = { ...this.data.userAnswers }

    if (question.type === 'multiple') {
      // 多选题
      const current = userAnswers[questionId] || []
      const optionKey = String.fromCharCode(65 + optionIndex)

      if (current.includes(optionKey)) {
        // 取消选择
        userAnswers[questionId] = current.filter((k: string) => k !== optionKey)
      } else {
        // 添加选择
        userAnswers[questionId] = [...current, optionKey]
      }
    } else {
      // 单选/判断
      userAnswers[questionId] = [String.fromCharCode(65 + optionIndex)]
    }

    this.setData({ userAnswers })
  },

  // 上一题
  prevQuestion() {
    if (this.data.currentIndex > 0) {
      const index = this.data.currentIndex - 1
      this.setData({
        currentIndex: index,
        currentQuestion: this.data.questions[index]
      })
    }
  },

  // 下一题
  nextQuestion() {
    if (this.data.currentIndex < this.data.questions.length - 1) {
      const index = this.data.currentIndex + 1
      this.setData({
        currentIndex: index,
        currentQuestion: this.data.questions[index]
      })
    }
  },

  // 跳转题目
  goToQuestion(e: any) {
    const index = e.currentTarget.dataset.index
    this.setData({
      currentIndex: index,
      currentQuestion: this.data.questions[index],
      showQuestionSheet: false
    })
  },

  // 显示题号面板
  showQuestionSheet() {
    this.setData({ showQuestionSheet: true })
  },

  hideQuestionSheet() {
    this.setData({ showQuestionSheet: false })
  },

  // 提交考试
  submitExam() {
    if (this.timer) {
      clearInterval(this.timer)
    }

    const { questions, userAnswers } = this.data

    // 计算得分
    let correctCount = 0
    const questionResults = questions.map((q: any) => {
      const userAnswer = (userAnswers[q._id] || []).sort().join(',')
      const correctAnswer = Array.isArray(q.answer) ? q.answer.sort().join(',') : q.answer
      const isCorrect = userAnswer === correctAnswer
      if (isCorrect) correctCount++
      return {
        question: q,
        userAnswer: userAnswers[q._id] || [],
        correctAnswer: correctAnswer,
        isCorrect
      }
    })

    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

    // 存储结果供 result 页面使用
    wx.setStorageSync('examResult', {
      type: this.data.type,
      totalQuestions: questions.length,
      correctCount,
      score,
      questionResults,
      timeUsed: (this.data.type === 'exam' ? (this.data.timeLeft > 0 ? 0 : 0) : 0)
    })

    wx.redirectTo({ url: '/pages/result/result' })
  },

  // 确认提交
  async doSubmit() {
    if (this.data.submitting) return

    const answeredCount = Object.keys(this.data.userAnswers).length
    const totalCount = this.data.questions.length

    if (answeredCount < totalCount) {
      const res = await wx.showModal({
        title: '确认提交',
        content: `还有 ${totalCount - answeredCount} 题未作答，确定提交吗？`
      })
      if (!res.confirm) return
    }

    this.setData({ submitting: true })
    this.submitExam()
  }
})