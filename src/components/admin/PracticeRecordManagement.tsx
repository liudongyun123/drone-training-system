/**
 * 练习记录与成绩管理组件 - 纯 Tailwind CSS 版本
 */
import React, { useState, useEffect } from 'react'
import { CloudPracticeService } from '@/services/CloudPracticeService'
import type { UserPracticeRecord } from '@/types/practice'
import type { Question } from '@/types/service'
import { TrendingUp, CheckCircle, Clock, Trophy, Target, Award, BookOpen, AlertCircle, Loader2 } from 'lucide-react'

type TabValue = 'records' | 'stats' | 'wrong' | 'leaderboard'

// 排行榜条目
interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  userAvatar?: string
  totalScore: number
  practiceCount: number
  averageScore: number
  isCurrentUser?: boolean
}

// 错题数据结构
interface WrongQuestion {
  question: Question
  recordId: string
  bankTitle?: string
  questionId?: string
  score?: number
  isPassed?: boolean
  userAnswer: string | string[]
  correctAnswer: string | string[]
  timesWrong: number
}

export default function PracticeRecordManagement() {
  const [tabValue, setTabValue] = useState<TabValue>('records')
  const [records, setRecords] = useState<UserPracticeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const [userStats, setUserStats] = useState({
    totalPractices: 0,
    passedPractices: 0,
    averageScore: 0,
    totalQuestions: 0,
    totalCorrect: 0,
  })
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<number | undefined>()

  useEffect(() => {
    loadRecords()
    loadStats()
    loadWrongQuestions()
  }, [])

  useEffect(() => {
    if (tabValue === 'leaderboard') {
      loadLeaderboard()
    }
  }, [tabValue])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const result = await CloudPracticeService.getUserRecords()
      // @ts-ignore
      const mappedData: UserPracticeRecord[] = (Array.isArray(result) ? result : []).map((item: any) => ({
        id: item._id || item.id,
        bankId: item.bankId || item.bank_id || '',
        bankTitle: item.bankTitle || item.bank_title || '',
        score: item.score || 0,
        totalQuestions: item.totalQuestions || item.total_questions || 0,
        correctAnswers: item.correctAnswers || item.correct_answers || 0,
        duration: item.duration || 0,
        isPassed: item.isPassed || item.is_passed || false,
        completedAt: item.completedAt || item.completed_at || '',
        createdAt: item.createdAt || item.created_at || '',
        answers: (item.answers || []).map((a: any) => ({
          questionId: a.questionId || a.question_id || '',
          userAnswer: a.userAnswer || a.user_answer || '',
          correctAnswer: a.correctAnswer || a.correct_answer || '',
          isCorrect: a.isCorrect ?? a.is_correct ?? false,
        })),
      }))
      setRecords(mappedData)
    } catch (error) {
      console.error('加载练习记录失败:', error)
      setToast({ show: true, message: '加载练习记录失败', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const stats = await CloudPracticeService.getUserStats()
      setUserStats(stats)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const loadWrongQuestions = () => {
    const wrongQuestions: WrongQuestion[] = []
    records.forEach(record => {
      if (record.answers) {
        record.answers.forEach((answer) => {
          if (!answer.isCorrect) {
            wrongQuestions.push({
              question: { id: answer.questionId } as any,
              recordId: record.id,
              bankTitle: record.bankTitle,
              questionId: answer.questionId,
              score: record.score,
              isPassed: record.isPassed,
              userAnswer: answer.userAnswer,
              // @ts-ignore
              correctAnswer: answer.correctAnswer,
              timesWrong: 1,
            })
          }
        })
      }
    })
    setWrongQuestions(wrongQuestions)
  }

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true)
      const result = await CloudPracticeService.getLeaderboard({ limit: 50 })
      if (result.success) {
        setLeaderboard(result.data)
        setCurrentUserRank(result.currentUserRank)
      }
    } catch (error) {
      console.error('加载排行榜失败:', error)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}分${remainingSeconds}秒`
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getAccuracy = (record: UserPracticeRecord) => {
    return record.totalQuestions > 0 ? Math.round((record.correctAnswers / record.totalQuestions) * 100) : 0
  }

  const tabs = [
    { key: 'records', label: '练习记录', icon: BookOpen },
    { key: 'stats', label: '成绩统计', icon: TrendingUp },
    { key: 'wrong', label: '错题集', icon: AlertCircle },
    { key: 'leaderboard', label: '排行榜', icon: Trophy },
  ]

  if (loading && tabValue === 'records') {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-500">加载中...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toast 提示 */}
      {toast.show && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ ...toast, show: false })} className="ml-4 hover:opacity-80">×</button>
        </div>
      )}

      {/* 标签页 */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTabValue(tab.key as TabValue)}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
              tabValue === tab.key
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-slate-600 border-transparent hover:text-blue-600 hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 练习记录列表 */}
      {tabValue === 'records' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">题库</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">分数</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">正确率</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">用时</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">完成时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无练习记录</p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-800">{record.bankTitle}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{record.score} 分</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getAccuracy(record) >= 60 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {getAccuracy(record)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-4 h-4" />
                        // @ts-ignore
                        {formatTime(record.duration || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.isPassed ? '及格' : '不及格'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(record.completedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 成绩统计 */}
      {tabValue === 'stats' && (
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-1">练习次数</p>
              <p className="text-3xl font-bold text-slate-800">{userStats.totalPractices}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-1">及格次数</p>
              <p className="text-3xl font-bold text-slate-800">{userStats.passedPractices}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-1">平均分数</p>
              <p className="text-3xl font-bold text-slate-800">{userStats.averageScore}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-1">总答题数</p>
              <p className="text-3xl font-bold text-slate-800">{userStats.totalQuestions}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-1">正确题数</p>
              <p className="text-3xl font-bold text-slate-800">{userStats.totalCorrect}</p>
            </div>
          </div>
        </div>
      )}

      {/* 错题集 */}
      {tabValue === 'wrong' && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">题库</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">题目ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">用户答案</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">练习成绩</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">是否及格</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wrongQuestions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>恭喜！暂无错题</p>
                  </td>
                </tr>
              ) : (
                wrongQuestions.map((wrong, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-800">{wrong.bankTitle || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-sm">{wrong.questionId || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {Array.isArray(wrong.userAnswer) ? wrong.userAnswer.join(', ') : wrong.userAnswer}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{wrong.score ?? 0} 分</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        wrong.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {wrong.isPassed ? '及格' : '不及格'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 排行榜 */}
      {tabValue === 'leaderboard' && (
        <div className="p-6">
          {currentUserRank && (
            <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700">您当前的排名：第 {currentUserRank} 名</span>
            </div>
          )}

          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600 mb-2">暂无排行榜数据</p>
              <p className="text-slate-400">完成练习后即可参与排行榜</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">排名</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">用户</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">练习次数</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">总分</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">平均分</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={`hover:bg-slate-50 transition-colors ${entry.isCurrentUser ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                          entry.rank === 1 ? 'bg-amber-100 text-amber-700' :
                          entry.rank === 2 ? 'bg-slate-200 text-slate-600' :
                          entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {entry.userName?.[0] || '?'}
                          </div>
                          <span className={`font-medium ${entry.isCurrentUser ? 'text-blue-700' : 'text-slate-800'}`}>
                            {entry.userName}{entry.isCurrentUser && ' (您)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-sm">{entry.practiceCount}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-2xl font-bold text-blue-600">{entry.totalScore}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                          entry.averageScore >= 60 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.averageScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
