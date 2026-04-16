// 练习题库相关类型定义

export interface QuestionBank {
  id: string
  courseIds: string[] // 改为数组，支持多选课程
  courseTitles: string[] // 对应的课程标题数组
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  questionCount: number
  timeLimit: number // 分钟
  passingScore: number // 及格分数
  tags: string[]
  practiceMode: 'study' | 'exam' // 练习模式：study-背题模式, exam-考试模式
  createdAt: string
}

export interface QuestionOption {
  text: string
  isCorrect: boolean
}

export interface PracticeQuestion {
  id: string
  bankId: string
  type: 'single' | 'multiple' | 'judgment' // 改为 judgment 判断题
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options?: QuestionOption[] // 选择题才有
  correctAnswer?: string | string[] // 保留兼容性，实际从options.isCorrect判断
  explanation: string
  order: number
  createdAt: string
}

export interface UserPracticeRecord {
  id: string
  userId: string
  bankId: string
  bankTitle: string
  score: number
  totalQuestions: number
  correctAnswers: number
  passingScore: number
  isPassed: boolean
  timeSpent: number // 秒
  answers: {
    questionId: string
    userAnswer: string | string[]
    isCorrect: boolean
  }[]
  startedAt: string
  completedAt: string
}

export interface PracticeSession {
  bank: QuestionBank
  questions: PracticeQuestion[]
  currentQuestionIndex: number
  answers: Record<string, string | string[]>
  startTime: number
  timeLeft: number
  mode: 'study' | 'exam' // 当前练习模式
}
