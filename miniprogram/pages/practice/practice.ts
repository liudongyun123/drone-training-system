// pages/practice/practice.ts
// 练习中心页

import { 
  getQuestionBanks, 
  getMockExams,
  getPracticeRecords,
  getPracticeStats 
} from '../../utils/http'
import logger from '../../utils/logger'

interface QuestionBank {
  _id: string
  title: string
  description: string
  questionCount: number
  icon: string
  category: string
}

interface MockExam {
  _id: string
  title: string
  description: string
  duration: number
  questionCount: number
  passScore: number
}

interface PracticeStats {
  totalPractices: number
  totalQuestions: number
  totalCorrect: number
  todayQuestions: number
  accuracy: number
}

interface RecentPractice {
  _id: string
  type: 'bank' | 'exam'
  targetId: string
  targetName: string
  score: number
  correctCount: number
  totalCount: number
  duration: number
  createdAt: string
}

Page({
  data: {
    questionBanks: [] as QuestionBank[],
    mockExams: [] as MockExam[],
    loading: true,
    refreshing: false,
    stats: {
      totalPractices: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      todayQuestions: 0,
      accuracy: 0
    } as PracticeStats,
    recentPractices: [] as RecentPractice[]
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '练习中心' })
    this.init()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadStats()
    this.loadRecentPractices()
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    Promise.all([
      this.loadData(),
      this.loadStats(),
      this.loadRecentPractices()
    ]).then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  init() {
    this.loadData()
    this.loadStats()
    this.loadRecentPractices()
  },

  async loadData() {
    this.setData({ loading: true })

    try {
      const [bankResult, examResult] = await Promise.all([
        getQuestionBanks(),
        getMockExams()
      ])

      // 处理题库数据
      const questionBanks = (bankResult.data || []).map((bank: any) => ({
        _id: bank._id,
        title: bank.name || bank.title || '未命名题库',
        description: bank.description || '',
        questionCount: bank.questionCount || 0,
        icon: this.getCategoryIcon(bank.category),
        category: bank.category || 'general',
        level: bank.level || '初级'
      }))

      // 处理模拟考试数据
      const mockExams = (examResult.data || []).map((exam: any) => ({
        _id: exam._id,
        title: exam.title || exam.name || '未命名考试',
        description: exam.description || '',
        duration: exam.duration || exam.timeLimit || 60,
        questionCount: exam.questionCount || 0,
        passScore: exam.passScore || exam.passingScore || 60
      }))

      this.setData({
        questionBanks,
        mockExams,
        loading: false
      })
    } catch (err) {
      logger.error('练习', '加载练习数据失败', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 根据分类获取图标
  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      '法规政策': '📜',
      '飞行理论': '✈️',
      '专业技能': '🎯',
      '安全操作': '⚠️',
      '气象知识': '🌤️',
      '应急处理': '🚨',
      '无人机法规': '📜',
      '无人机飞行': '✈️',
      '综合练习': '📚',
      'default': '📝'
    }
    return iconMap[category] || iconMap['default']
  },

  // 加载练习统计
  async loadStats() {
    try {
      const userId = wx.getStorageSync('userId') || ''
      if (!userId) {
        // 未登录用户，使用本地缓存的统计
        const localStats = wx.getStorageSync('practice_stats') || {
          totalPractices: 0,
          totalQuestions: 0,
          totalCorrect: 0,
          todayQuestions: 0,
          accuracy: 0
        }
        this.setData({ stats: localStats })
        return
      }

      const stats = await getPracticeStats(userId)
      this.setData({ stats })
      // 同步到本地缓存
      wx.setStorageSync('practice_stats', stats)
    } catch (err) {
      logger.error('练习', '加载统计失败', err)
    }
  },

  // 加载最近练习记录
  async loadRecentPractices() {
    try {
      const userId = wx.getStorageSync('userId') || ''
      const result = await getPracticeRecords(userId, 5)
      
      const recentPractices = (result.data || []).map((record: any) => ({
        _id: record._id,
        type: record.type,
        targetId: record.targetId || record.bankId || record.examId,
        targetName: record.targetName || '练习',
        score: record.score || 0,
        correctCount: record.correctCount || 0,
        totalCount: record.totalCount || 0,
        duration: record.duration || 0,
        createdAt: this.formatTime(record.createdAt)
      }))
      
      this.setData({ recentPractices })
    } catch (err) {
      logger.error('练习', '加载最近练习失败', err)
    }
  },

  // 格式化时间
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
    return `${date.getMonth() + 1}/${date.getDate()}`
  },

  // 开始练习
  startPractice(e: any) {
    const bankId = e.currentTarget.dataset.id
    const bankTitle = e.currentTarget.dataset.title
    const questionCount = e.currentTarget.dataset.count
    
    if (questionCount === 0) {
      wx.showToast({ title: '该题库暂无题目', icon: 'none' })
      return
    }
    
    // 记录最近练习
    this.addRecentPractice({
      type: 'bank',
      id: bankId,
      title: bankTitle,
      time: new Date().toISOString()
    })
    
    wx.navigateTo({ 
      url: `/pages/exam/exam?type=practice&bankId=${bankId}&bankTitle=${encodeURIComponent(bankTitle)}` 
    })
  },

  // 开始模拟考试
  startMockExam(e: any) {
    const examId = e.currentTarget.dataset.id
    const examTitle = e.currentTarget.dataset.title
    
    wx.showModal({
      title: '开始考试',
      content: `确定要开始「${examTitle}」吗？考试时长 ${e.currentTarget.dataset.duration} 分钟。`,
      success: (res) => {
        if (res.confirm) {
          // 记录最近练习
          this.addRecentPractice({
            type: 'exam',
            id: examId,
            title: examTitle,
            time: new Date().toISOString()
          })
          
          wx.navigateTo({ 
            url: `/pages/exam/exam?type=exam&examId=${examId}&examTitle=${encodeURIComponent(examTitle)}` 
          })
        }
      }
    })
  },

  // 添加最近练习记录
  addRecentPractice(practice: any) {
    try {
      let recentPractices = wx.getStorageSync('recent_practices') || []
      // 去重，最多保留10条
      recentPractices = recentPractices.filter((p: any) => p.id !== practice.id)
      recentPractices.unshift(practice)
      recentPractices = recentPractices.slice(0, 10)
      wx.setStorageSync('recent_practices', recentPractices)
      this.setData({ recentPractices })
    } catch (err) {
      logger.error('练习', '保存最近练习失败', err)
    }
  },

  // 继续上次练习
  continueLastPractice(e: any) {
    const practice = e.currentTarget.dataset.item
    if (practice.type === 'bank') {
      wx.navigateTo({ 
        url: `/pages/exam/exam?type=practice&bankId=${practice.id}&bankTitle=${encodeURIComponent(practice.title)}` 
      })
    } else {
      wx.navigateTo({ 
        url: `/pages/exam/exam?type=exam&examId=${practice.id}&examTitle=${encodeURIComponent(practice.title)}` 
      })
    }
  },

  // 查看全部题库
  viewAllBanks() {
    wx.navigateTo({ url: '/pages/question-banks/question-banks' })
  },

  // 查看全部模拟考试
  viewAllExams() {
    wx.navigateTo({ url: '/pages/mock-exams/mock-exams' })
  },

  // 查看练习历史
  viewHistory() {
    wx.navigateTo({ url: '/pages/practice-history/practice-history' })
  },

  // 查看错题本
  viewWrongQuestions() {
    wx.navigateTo({ url: '/pages/wrong-questions/wrong-questions' })
  }
})
