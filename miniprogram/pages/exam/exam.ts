// pages/exam/exam.ts
// 考试/练习答题页

import { getQuestions, dbGetList, savePracticeRecord, addWrongQuestion } from '../../utils/http'
import logger from '../../utils/logger'

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
    const { type, bankId, examId, singleMode, bankTitle, examTitle } = options
    wx.setNavigationBarTitle({ title: type === 'exam' ? '模拟考试' : '答题练习' })
    this.setData({
      type,
      bankId: bankId || '',
      examId: examId || '',
      targetName: (type === 'exam' ? examTitle : bankTitle) || bankId || examId || '练习'
    })

    if (singleMode === 'true') {
      this.loadSingleQuestion()
    } else {
      this.loadQuestions()
    }
  },

  // 加载单题模式（错题重练）
  loadSingleQuestion() {
    try {
      const retryData = wx.getStorageSync('retryQuestion')
      if (!retryData) {
        wx.showToast({ title: '题目数据丢失', icon: 'none' })
        wx.navigateBack()
        return
      }

      const question = {
        _id: retryData.questionId || `retry_${Date.now()}`,
        type: retryData.type || 'single',
        title: retryData.title || '',
        options: retryData.options || [],
        answer: retryData.answer || '',
        analysis: retryData.analysis || ''
      }

      this.setData({
        questions: [question],
        currentQuestion: question
      })

      // 清除 storage 中的临时数据
      wx.removeStorageSync('retryQuestion')
    } catch (err) {
      logger.error('考试', '加载单题失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  },

  // 题目字段归一化：题库文档存 content/question，练习页渲染用 title，三者兜底
  normalizeQuestion(q: any): any {
    if (!q) return q
    return {
      ...q,
      title: q.title || q.question || q.content || '',
      question: q.question || q.content || q.title || '',
      content: q.content || q.question || q.title || ''
    }
  },

  async loadQuestions() {
    try {
      const { type, bankId, examId } = this.data

      if (type === 'exam' && examId) {
        // 模拟考试 - 加载考试信息
        const examResult = await dbGetList('exams', {
          where: { _id: examId }
        })
        const exam = examResult.data?.[0]
        
        if (exam) {
          const questionsResult = await getQuestions({ examId })
          const qs = (questionsResult.data || []).map((q: any) => this.normalizeQuestion(q))
          this.setData({
            questions: qs,
            currentQuestion: qs[0] || null,
            timeLeft: (exam.duration || 30) * 60
          })
          this.startTimer()
        }
      } else {
        // 练习模式 - 加载题库题目
        const result = await getQuestions({ bankId })
        const qs = (result.data || []).map((q: any) => this.normalizeQuestion(q))
        this.setData({
          questions: qs,
          currentQuestion: qs[0] || null
        })
      }
    } catch (err) {
      logger.error('考试', '加载题目失败', err)
      wx.showToast({ title: '加载题目失败', icon: 'none' })
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
      const current = userAnswers[questionId] || []
      const optionKey = String.fromCharCode(65 + optionIndex)

      if (current.includes(optionKey)) {
        userAnswers[questionId] = current.filter((k: string) => k !== optionKey)
      } else {
        userAnswers[questionId] = [...current, optionKey]
      }
    } else {
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
  async submitExam() {
    if (this.timer) {
      clearInterval(this.timer)
    }

    const { questions, userAnswers } = this.data

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

    // 持久化：练习记录 + 错题（不阻塞跳转）
    try {
      const userId = wx.getStorageSync('userId') || wx.getStorageSync('phone') || wx.getStorageSync('openid') || ''
      const targetId = this.data.examId || this.data.bankId || ''
      await savePracticeRecord({
        type: this.data.type === 'exam' ? 'exam' : 'bank',
        targetId,
        targetName: this.data.targetName || targetId,
        score,
        correctCount,
        totalCount: questions.length,
        duration: 0,
        answers: userAnswers
      })
      // 错题入库（按 userId + questionId 去重累加）
      const wrong = questionResults.filter((r: any) => !r.isCorrect)
      for (const w of wrong) {
        const q = w.question || {}
        try {
          await addWrongQuestion({
            userId,
            bankId: this.data.bankId || '',
            questionId: q._id || '',
            question: q.title || q.question || q.content || '',
            options: q.options || [],
            yourAnswer: (userAnswers[q._id] || []).join(','),
            correctAnswer: Array.isArray(q.answer) ? q.answer.join(',') : (q.answer || '')
          })
        } catch (e) {
          logger.error('考试', '写入错题失败', e)
        }
      }
    } catch (e) {
      logger.error('考试', '保存练习记录失败', e)
    }

    wx.setStorageSync('examResult', {
      type: this.data.type,
      totalQuestions: questions.length,
      correctCount,
      score,
      questionResults,
      timeUsed: 0
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
