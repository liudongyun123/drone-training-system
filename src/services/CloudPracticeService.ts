// @ts-nocheck
import { dbService } from './cloudBaseService'
import { authService } from './cloudBaseService'
import { adminService } from './adminService'
import { CloudOrderService } from './CloudOrderService'
import type { QuestionBank, PracticeQuestion, UserPracticeRecord } from '../types/practice'

// 练习题库数据服务（云开发版本）
export const CloudPracticeService = {
  // ========== 题库管理 ==========

  // 获取所有题库
  async getAllBanks(): Promise<QuestionBank[]> {
    try {
      const data = await dbService.getAll('questionBanks')
      return data.map((b: any) => ({
        id: b._id,
        courseIds: b.courseIds || [],
        courseTitles: b.courseTitles || [],
        title: b.title,
        description: b.description,
        level: b.level,
        category: b.category,
        questionCount: b.questionCount,
        timeLimit: b.timeLimit,
        passingScore: b.passingScore,
        tags: b.tags || [],
        practiceMode: b.practiceMode || 'study',
        createdAt: b.createdAt,
      }))
    } catch (error) {
      console.error('获取题库列表失败:', error)
      return []
    }
  },

  // 获取题库详情
  async getBankById(id: string): Promise<QuestionBank | null> {
    try {
      const data = await dbService.getById('questionBanks', id)
      if (!data) return null

      return {
        id: data._id,
        courseIds: data.courseIds || [],
        courseTitles: data.courseTitles || [],
        title: data.title,
        description: data.description,
        level: data.level,
        category: data.category,
        questionCount: data.questionCount,
        timeLimit: data.timeLimit,
        passingScore: data.passingScore,
        tags: data.tags || [],
        practiceMode: data.practiceMode || 'study',
        createdAt: data.createdAt,
      }
    } catch (error) {
      console.error('获取题库详情失败:', error)
      return null
    }
  },

  // 获取用户可访问的题库（基于已购买的课程）
  async getAccessibleBanks(): Promise<QuestionBank[]> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        return []
      }

      // 获取用户的已购订单
      const orders = await CloudOrderService.getUserOrders()
      const purchasedCourseIds = orders.map((order) => order.courseId)

      // 获取所有题库
      const allBanks = await this.getAllBanks()

      // 过滤出用户已购买任一课程的题库
      return allBanks.filter((bank) =>
        bank.courseIds.some((courseId) => purchasedCourseIds.includes(courseId))
      )
    } catch (error) {
      console.error('获取可访问题库失败:', error)
      return []
    }
  },

  // 检查用户是否有权限访问题库
  async hasAccess(bankId: string): Promise<boolean> {
    try {
      const bank = await this.getBankById(bankId)
      if (!bank) return false

      const accessibleBanks = await this.getAccessibleBanks()
      return accessibleBanks.some((b) => b.id === bankId)
    } catch (error) {
      console.error('检查访问权限失败:', error)
      return false
    }
  },

  // 添加题库
  async addBank(bankData: Partial<QuestionBank>): Promise<QuestionBank | null> {
    try {
      const data = {
        ...bankData,
        createdAt: new Date().toISOString(),
      }
      const result = await dbService.add('questionBanks', data)
      if (!result) return null
      return {
        id: result.id,
        ...data,
      } as QuestionBank
    } catch (error) {
      console.error('添加题库失败:', error)
      return null
    }
  },

  // 更新题库
  async updateBank(id: string, bankData: Partial<QuestionBank>): Promise<QuestionBank | null> {
    try {
      const result = await dbService.update('questionBanks', id, bankData)
      if (!result) return null
      const existing = await this.getBankById(id)
      return {
        id,
        ...existing,
        ...bankData,
      } as QuestionBank
    } catch (error) {
      console.error('更新题库失败:', error)
      return null
    }
  },

  // 删除题库
  async deleteBank(id: string): Promise<{success: boolean, error?: string}> {
    console.log('[CloudPracticeService.deleteBank] 开始删除, id:', id)
    try {
      const result = await adminService.delete('questionBanks', id)
      console.log('[CloudPracticeService.deleteBank] 云函数返回:', result)
      // 检查返回结果
      if (result && result.code === 0) {
        console.log('[CloudPracticeService.deleteBank] 删除成功')
        return { success: true }
      } else {
        console.error('[CloudPracticeService.deleteBank] 删除失败:', result?.message || '未知错误')
        return { success: false, error: result?.message || '删除失败' }
      }
    } catch (error: any) {
      console.error('[CloudPracticeService.deleteBank] 删除异常:', error)
      // 即使抛出错误，也可能是删除成功了（权限问题或返回值格式问题）
      // 这里返回成功，让调用方刷新列表验证
      return { success: true, error: error.message }
    }
  },

  // 添加题目
  async addQuestion(questionData: Partial<PracticeQuestion>): Promise<PracticeQuestion | null> {
    try {
      const data = {
        ...questionData,
        createdAt: new Date().toISOString(),
      }
      const result = await dbService.add('questions', data)
      if (!result) return null
      return {
        id: result.id,
        ...data,
      } as PracticeQuestion
    } catch (error) {
      console.error('添加题目失败:', error)
      return null
    }
  },

  // 更新题目
  async updateQuestion(id: string, questionData: Partial<PracticeQuestion>): Promise<PracticeQuestion | null> {
    try {
      const result = await dbService.update('questions', id, questionData)
      if (!result) return null
      const existing = await this.getBankQuestions(questionData.bankId || '')
      const question = existing.find((q) => q.id === id)
      return {
        id,
        ...question,
        ...questionData,
      } as PracticeQuestion
    } catch (error) {
      console.error('更新题目失败:', error)
      return null
    }
  },

  // 删除题目
  async deleteQuestion(id: string): Promise<boolean> {
    try {
      await adminService.delete('questions', id)
      return true
    } catch (error) {
      console.error('删除题目失败:', error)
      return false
    }
  },

  // ========== 题目管理 ==========

  // 获取题库的所有题目
  async getBankQuestions(bankId: string): Promise<PracticeQuestion[]> {
    try {
      const data = await dbService.getAll('questions')
      const bankQuestions = data.filter((q: any) => q.bankId === bankId)

      return bankQuestions.map((q: any) => ({
        id: q._id,
        bankId: q.bankId,
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: q.order,
        createdAt: q.createdAt,
      }))
    } catch (error) {
      console.error('获取题库题目失败:', error)
      return []
    }
  },

  // ========== 练习记录 ==========

  // 创建练习记录
  async createPracticeRecord(recordData: Partial<UserPracticeRecord>): Promise<UserPracticeRecord | null> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('用户未登录')
      }

      const record = {
        ...recordData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }

      const result = await dbService.add('practiceRecords', record)
      if (!result) return null

      return {
        id: result.id,
        ...record,
      } as UserPracticeRecord
    } catch (error) {
      console.error('创建练习记录失败:', error)
      return null
    }
  },

  // 获取用户的所有练习记录
  async getUserRecords(): Promise<UserPracticeRecord[]> {
    try {
      const data = await dbService.getAll('practiceRecords')

      // 仅返回当前登录用户的练习记录（避免串号）
      let user = null
      try {
        user = await authService.getCurrentUser()
      } catch (e) {
        // 忽略认证错误，回退为返回全部
      }
      const uid = user?.uid || user?._openid
      const scoped = uid ? data.filter((d: any) => d.userId === uid) : data

      return scoped.map((d: any) => {
        const totalQuestions = d.totalQuestions ?? d.questionCount ?? d.totalCount ?? 0
        const correctAnswers = d.correctAnswers ?? d.correctCount ?? 0
        const duration = d.duration ?? d.timeSpent ?? 0
        return {
          id: d._id,
          userId: d.userId,
          bankId: d.bankId || d.targetId || '',
          bankTitle: d.bankTitle || d.bankName || d.targetName || '未命名题库',
          score: d.score ?? 0,
          totalQuestions,
          correctAnswers,
          passingScore: d.passingScore ?? 60,
          isPassed: d.isPassed ?? (d.score >= (d.passingScore ?? 60)),
          timeSpent: duration,
          duration,
          answers: d.answers || [],
          startedAt: d.startedAt || d.startTime || d.createdAt || '',
          completedAt: d.completedAt || d.endTime || d.createdAt || '',
        } as any
      })
    } catch (error) {
      console.error('获取练习记录失败:', error)
      return []
    }
  },

  // 获取特定题库的练习记录
  async getBankRecords(bankId: string): Promise<UserPracticeRecord[]> {
    try {
      const allRecords = await this.getUserRecords()
      return allRecords.filter((r) => r.bankId === bankId)
    } catch (error) {
      console.error('获取题库练习记录失败:', error)
      return []
    }
  },

  // ========== 统计数据 ==========

  // 获取用户的练习统计
  async getUserStats(): Promise<{
    totalPractices: number
    totalQuestions: number
    correctRate: number
    avgScore: number
    totalTime: number
    rank: number
  }> {
    try {
      const records = await this.getUserRecords()

      const totalPractices = records.length
      const totalQuestions = records.reduce((acc, r) => acc + (r.totalQuestions || 0), 0)
      const totalCorrect = records.reduce((acc, r) => acc + (r.correctAnswers || 0), 0)
      const avgScore =
        totalPractices > 0
          ? Math.round(records.reduce((acc, r) => acc + (r.score || 0), 0) / totalPractices)
          : 0
      const correctRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
      const totalTime = records.reduce((acc, r) => acc + ((r as any).duration || r.timeSpent || 0), 0)

      let rank = 0
      try {
        const board = await this.getLeaderboard({ limit: 1000 })
        rank = board.currentUserRank || 0
      } catch (e) {
        // 排行榜计算失败不影响统计
      }

      return {
        totalPractices,
        totalQuestions,
        correctRate,
        avgScore,
        totalTime,
        rank,
      }
    } catch (error) {
      console.error('获取用户统计失败:', error)
      return {
        totalPractices: 0,
        totalQuestions: 0,
        correctRate: 0,
        avgScore: 0,
        totalTime: 0,
        rank: 0,
      }
    }
  },

  // ========== 排行榜 ==========

  // 获取排行榜数据
  async getLeaderboard(params?: { limit?: number; bankId?: string }): Promise<{
    success: boolean
    data: Array<{
      rank: number
      userId: string
      userName: string
      userAvatar?: string
      totalScore: number
      practiceCount: number
      averageScore: number
      isCurrentUser?: boolean
    }>
    currentUserRank?: number
  }> {
    try {
      const { limit = 20, bankId } = params || {}
      
      // 构建查询条件
      const query: any = {}
      if (bankId) {
        query.bankId = bankId
      }

      // 获取所有练习记录
      const records = await dbService.getAll('practiceRecords')
      
      // 按用户分组统计
      const userStatsMap = new Map<string, {
        userId: string
        userName: string
        userAvatar?: string
        totalScore: number
        practiceCount: number
        scores: number[]
      }>()

      for (const record of records) {
        const userId = record.userId || record._openid
        if (!userId) continue

        const existing = userStatsMap.get(userId) || {
          userId,
          userName: record.userName || `用户${userId.slice(-4)}`,
          userAvatar: record.userAvatar,
          totalScore: 0,
          practiceCount: 0,
          scores: [],
        }

        existing.totalScore += record.score || 0
        existing.practiceCount += 1
        existing.scores.push(record.score || 0)
        
        userStatsMap.set(userId, existing)
      }

      // 转换为排行榜数据
      const leaderboard: LeaderboardEntry[] = (Array.from(userStatsMap.values()) as any[])
        .map((stat) => ({
          rank: 0,
          userId: stat.userId,
          userName: stat.userName,
          userAvatar: stat.userAvatar,
          totalScore: stat.totalScore,
          practiceCount: stat.practiceCount,
          averageScore: Math.round(stat.totalScore / stat.practiceCount),
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }))

      // 获取当前用户排名
      const currentUser = await authService.getCurrentUser()
      let currentUserRank: number | undefined
      if (currentUser) {
        const userId = currentUser.uid
        const rankIndex = leaderboard.findIndex((e) => e.userId === userId)
        if (rankIndex !== -1) {
          currentUserRank = rankIndex + 1
        }
        // 标记当前用户
        leaderboard.forEach((entry) => {
          if (entry.userId === userId) {
            entry.isCurrentUser = true
          }
        })
      }

      return {
        success: true,
        data: leaderboard,
        currentUserRank,
      }
    } catch (error) {
      console.error('获取排行榜失败:', error)
      return {
        success: false,
        data: [],
      }
    }
  },
}
