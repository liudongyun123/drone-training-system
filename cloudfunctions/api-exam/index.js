/**
 * api-exam 云函数 - 考试服务
 * 
 * 功能：考试列表、考试提交
 * 
 * 功能：
 * - 题库管理
 * - 考试列表/详情
 * - 答题/提交
 * - 成绩查询
 */

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command

// ========== 工具函数 ==========

const { getCorsHeaders } = require('./lib/cors')

/**
 * 题目归一化 — 兼容两套数据源
 * 
 * System A (CloudPracticeService): questions 集合
 *   { question, type, correctAnswer, explanation, options: [{text, isCorrect}], bankId }
 * 
 * System B (database.ts / examService.ts): 也使用 questions 集合（已统一）
 *   { question/content, type, answer, explanation/analysis, options: [{key, content, isCorrect}], bankId }
 * 
 * 输出统一格式（小程序期望）:
 *   { _id, type, title, options: string[], answer, analysis }
 */
function normalizeQuestion(q) {
  if (!q) return null

  // 题目文本: question | content | title
  const title = q.title || q.question || q.content || ''

  // 题型统一: judgment → judge
  let type = (q.type || 'single').toLowerCase()
  if (type === 'judgment') type = 'judge'

  // 答案: answer | correctAnswer
  const answer = q.answer || q.correctAnswer || ''

  // 解析: analysis | explanation
  const analysis = q.analysis || q.explanation || ''

  // 选项归一化为 string[]
  let options = []
  if (Array.isArray(q.options)) {
    options = q.options.map((opt, idx) => {
      // 纯字符串
      if (typeof opt === 'string') return opt
      // { content: "xxx" }
      if (opt.content) return opt.content
      // { text: "xxx" }
      if (opt.text) return opt.text
      // { key: "A", content: "xxx" }
      if (opt.key && opt.content) return `${opt.key}. ${opt.content}`
      // { key: "A", text: "xxx" }
      if (opt.key && opt.text) return `${opt.key}. ${opt.text}`
      return `选项${String.fromCharCode(65 + idx)}`
    })
  }

  return {
    _id: q._id,
    type,
    title,
    options,
    answer,
    analysis,
    difficulty: q.difficulty || '',
    score: q.score || 1,
    bankId: q.bankId || ''
  }
}

/**
 * 题目加载 — 从 questions 集合读取并归一化
 */
async function loadQuestionsFromBanks(bankIds, limit = 0) {
  let allQuestions = []

  const qResult = await db.collection('questions')
    .where({ bankId: _.in(bankIds) })
    .get()
  allQuestions = allQuestions.concat(qResult.data)

  // 归一化
  let normalized = allQuestions.map(normalizeQuestion).filter(Boolean)

  // 限制数量
  if (limit > 0 && normalized.length > limit) {
    normalized = normalized.slice(0, limit)
  }

  return normalized
}

/**
 * 题库归一化 — 兼容 name/title 字段
 */
function normalizeBank(b) {
  return {
    _id: b._id,
    title: b.name || b.title || '未命名题库',
    name: b.name || b.title || '未命名题库',
    description: b.description || '',
    category: b.category || '综合',
    level: b.level || '初级',
    questionCount: b.questionCount || 0,
    courseId: b.courseId || '',
    duration: b.duration || b.timeLimit || 60,
    passScore: b.passScore || b.passingScore || 60,
    totalScore: b.totalScore || 100,
    createdAt: b.createdAt || ''
  }
}

/**
 * 获取 openid
 */
function getOpenId(event) {
  if (isWxEnv) {
    return cloud.getWXContext().OPENID
  }
  return event.userId || event._openid || ''
}

// ========== 题库相关 ==========

/**
 * 获取题库列表（小程序用 — 不强制 status 过滤）
 */
async function getBanks(params = {}) {
  const { page = 1, pageSize = 100, courseId = '', status = '' } = params

  let where = {}
  if (status) {
    where.status = status
  }
  if (courseId) {
    where.courseId = courseId
  }

  const countResult = await db.collection('questionBanks').where(where).count()

  const banks = await db.collection('questionBanks')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: banks.data.map(normalizeBank),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 获取题库详情（含题目 — 双集合合并）
 */
async function getBankDetail(bankId, params = {}) {
  const { shuffle = true, limit = 0 } = params

  const bank = await db.collection('questionBanks').doc(bankId).get()

  if (!bank.data) {
    return { success: false, error: '题库不存在' }
  }

  // 从双集合加载题目
  let questionList = await loadQuestionsFromBanks([bankId], limit)

  // 随机排序
  if (shuffle) {
    questionList = questionList.sort(() => Math.random() - 0.5)
  }

  // 移除答案（练习时不返回）
  const questionsForPractice = questionList.map(q => ({
    _id: q._id,
    type: q.type,
    title: q.title,
    options: q.options,
    score: q.score
  }))

  const bankData = normalizeBank(bank.data)

  return {
    success: true,
    data: {
      ...bankData,
      questionCount: questionList.length,
      questions: questionsForPractice
    }
  }
}

// ========== 考试相关 ==========

/**
 * 获取考试列表
 */
async function getExams(params = {}) {
  const { page = 1, pageSize = 100, courseId = '', status = '' } = params

  let where = {}
  if (status) {
    where.status = status
  }
  if (courseId) {
    where.courseId = courseId
  }

  const countResult = await db.collection('exams').where(where).count()

  const exams = await db.collection('exams')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: exams.data.map(e => ({
        _id: e._id,
        title: e.title || e.name || '未命名考试',
        description: e.description || '',
        courseId: e.courseId || '',
        duration: e.duration || e.timeLimit || 60,
        questionCount: e.questionCount || 0,
        totalScore: e.totalScore || 100,
        passScore: e.passScore || e.passingScore || 60,
        startTime: e.startTime,
        endTime: e.endTime,
        attemptLimit: e.attemptLimit || 1
      })),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 获取考试详情
 */
async function getExamDetail(examId) {
  const exam = await db.collection('exams').doc(examId).get()

  if (!exam.data) {
    return { success: false, error: '考试不存在' }
  }

  const e = exam.data

  // 从双集合加载关联题目的题目
  let questions = []
  if (e.bankIds && e.bankIds.length > 0) {
    questions = await loadQuestionsFromBanks(e.bankIds)
  }

  // 移除答案（考试时不返回）
  const questionsForExam = questions.map(q => ({
    _id: q._id,
    type: q.type,
    title: q.title,
    options: q.options,
    score: q.score
  }))

  return {
    success: true,
    data: {
      _id: e._id,
      title: e.title || e.name || '未命名考试',
      description: e.description || '',
      courseId: e.courseId || '',
      duration: e.duration || e.timeLimit || 60,
      totalScore: e.totalScore || 100,
      passScore: e.passScore || e.passingScore || 60,
      startTime: e.startTime,
      endTime: e.endTime,
      attemptLimit: e.attemptLimit || 1,
      questionCount: questions.length,
      questions: questionsForExam
    }
  }
}

/**
 * 开始考试（创建答题记录）
 * 优先使用 phone 作为用户标识
 */
async function startExam(examId, data, userId) {
  const phone = data.phone || ''
  const openid = userId || getOpenId({ userId: data.userId })

  // 检查考试是否存在
  const exam = await db.collection('exams').doc(examId).get()
  if (!exam.data) {
    return { success: false, error: '考试不存在' }
  }

  // 检查是否在考试时间范围内
  const now = new Date()
  if (exam.data.startTime && new Date(exam.data.startTime) > now) {
    return { success: false, error: '考试尚未开始' }
  }
  if (exam.data.endTime && new Date(exam.data.endTime) < now) {
    return { success: false, error: '考试已结束' }
  }

  // 检查已答题次数（使用 phone 或 userId 查询）
  let attempts
  if (phone) {
    attempts = await db.collection('examAttempts')
      .where({ examId, phone })
      .count()
  } else {
    attempts = await db.collection('examAttempts')
      .where({ examId, userId: openid })
      .count()
  }

  const attemptLimit = exam.data.attemptLimit || 1
  if (attempts.total >= attemptLimit) {
    return { success: false, error: '已达最大答题次数' }
  }

  // 创建答题记录
  const attemptId = `${examId}_${phone || openid}_${Date.now()}`
  const now2 = new Date().toISOString()

  const attemptData: any = {
    _id: attemptId,
    examId,
    courseId: exam.data.courseId,
    status: 'in_progress',
    startTime: now2,
    score: 0,
    answers: [],
    createdAt: now2
  }

  if (phone) {
    attemptData.phone = phone
  }
  if (openid) {
    attemptData.userId = openid
  }

  await db.collection('examAttempts').add({
    data: attemptData
  })

  return {
    success: true,
    data: {
      attemptId,
      examId,
      startTime: now2,
      duration: exam.data.duration || 60
    }
  }
}

/**
 * 提交考试
 * 优先使用 phone 作为用户标识
 */
async function submitExam(data, userId) {
  const { attemptId, answers } = data
  const phone = data.phone || ''
  const openid = userId || getOpenId({ userId: data.userId })

  // 获取答题记录
  const attempt = await db.collection('examAttempts').doc(attemptId).get()
  if (!attempt.data) {
    return { success: false, error: '答题记录不存在' }
  }

  if (attempt.data.status !== 'in_progress') {
    return { success: false, error: '考试已提交' }
  }

  // 获取题目和答案
  const questionIds = answers.map(a => a.questionId)
  const questions = await db.collection('questions')
    .where({ _id: _.in(questionIds) })
    .get()

  const questionsMap = new Map(questions.data.map(q => [q._id, q]))

  // 评分
  let totalScore = 0
  const scoredAnswers = answers.map(a => {
    const question = questionsMap.get(a.questionId)
    if (!question) {
      return { questionId: a.questionId, userAnswer: a.answer, isCorrect: false, score: 0 }
    }

    const isCorrect = checkAnswer(question, a.answer)
    const score = isCorrect ? (question.score || 1) : 0
    totalScore += score

    return {
      questionId: a.questionId,
      userAnswer: a.answer,
      correctAnswer: question.answer,
      isCorrect,
      score
    }
  })

  // 获取考试信息（判断是否通过）
  const exam = await db.collection('exams').doc(attempt.data.examId).get()
  const passScore = exam.data?.passScore || 60
  const passStatus = totalScore >= passScore

  const now = new Date().toISOString()

  // 更新答题记录
  await db.collection('examAttempts').doc(attemptId).update({
    status: 'completed',
    score: totalScore,
    passStatus,
    answers: scoredAnswers,
    submitTime: now,
    duration: Math.round((new Date(now) - new Date(attempt.data.startTime)) / 60000),
    updatedAt: now
  })

  return {
    success: true,
    data: {
      attemptId,
      examId: attempt.data.examId,
      score: totalScore,
      passStatus,
      passScore,
      totalQuestions: answers.length,
      correctCount: scoredAnswers.filter(a => a.isCorrect).length,
      submitTime: now
    }
  }
}

/**
 * 检查答案是否正确
 */
function checkAnswer(question, userAnswer) {
  const correctAnswer = question.answer

  // 判断题
  if (question.type === 'boolean' || question.type === 'judgment') {
    const userVal = String(userAnswer).toLowerCase()
    const correctVal = String(correctAnswer).toLowerCase()
    return userVal === correctVal ||
      (correctVal === 'true' && userVal === 'a') ||
      (correctVal === 'false' && userVal === 'b')
  }

  // 单选题
  if (typeof correctAnswer === 'string' && /^[A-D]$/i.test(String(correctAnswer))) {
    return String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase()
  }

  // 多选题
  if (Array.isArray(correctAnswer)) {
    const userArr = Array.isArray(userAnswer) ? userAnswer.map(String).sort() : [String(userAnswer)]
    const correctArr = correctAnswer.map(String).sort()
    return JSON.stringify(userArr) === JSON.stringify(correctArr)
  }

  // 直接匹配
  return String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase()
}

/**
 * 获取答题记录
 * 优先使用 phone 作为用户标识
 */
async function getAttempts(params, userId) {
  const phone = params.phone || ''
  const openid = userId || getOpenId({ userId: params.userId })
  const { examId = '', page = 1, pageSize = 20 } = params

  let where: any = {}
  if (phone) {
    where.phone = phone
  } else if (openid) {
    where.userId = openid
  }
  if (examId) {
    where.examId = examId
  }

  const countResult = await db.collection('examAttempts').where(where).count()

  const attempts = await db.collection('examAttempts')
    .where(where)
    .orderBy('submitTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    success: true,
    data: {
      list: attempts.data.map(a => ({
        _id: a._id,
        examId: a.examId,
        courseId: a.courseId,
        score: a.score || 0,
        passStatus: a.passStatus,
        status: a.status,
        startTime: a.startTime,
        submitTime: a.submitTime,
        duration: a.duration
      })),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 获取答题详情
 */
async function getAttemptDetail(attemptId, userId) {
  const openid = userId || getOpenId({ userId })

  const attempt = await db.collection('examAttempts').doc(attemptId).get()

  if (!attempt.data) {
    return { success: false, error: '答题记录不存在' }
  }

  // 验证权限
  if (attempt.data.userId !== openid) {
    return { success: false, error: '无权查看此记录' }
  }

  return {
    success: true,
    data: {
      _id: attempt.data._id,
      examId: attempt.data.examId,
      courseId: attempt.data.courseId,
      score: attempt.data.score || 0,
      passStatus: attempt.data.passStatus,
      status: attempt.data.status,
      startTime: attempt.data.startTime,
      submitTime: attempt.data.submitTime,
      duration: attempt.data.duration,
      answers: attempt.data.answers || []
    }
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin),
      body: JSON.stringify({ code: 0, message: 'OK' })
    }
  }

  // 解析参数
  let action = event.action || ''
  let data = event.data || event

  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || action
      data = body.data || body
    } catch (e) {}
  }

  const userId = data.userId || data._openid || (isWxEnv ? cloud.getWXContext().OPENID : '')

  try {
    let result

    switch (action) {
      // 题库
      case 'banks':
      case 'getBanks':
        result = await getBanks(data)
        break
      case 'bankDetail':
      case 'getBankDetail':
        result = await getBankDetail(data.bankId, data)
        break

      // 考试
      case 'exams':
      case 'getExams':
        result = await getExams(data)
        break
      case 'examDetail':
      case 'getExamDetail':
        result = await getExamDetail(data.examId)
        break
      case 'startExam':
        result = await startExam(data.examId, data, userId)
        break
      case 'submitExam':
        result = await submitExam(data, userId)
        break

      // 答题记录
      case 'attempts':
      case 'getAttempts':
        result = await getAttempts(data, userId)
        break
      case 'attemptDetail':
      case 'getAttemptDetail':
        result = await getAttemptDetail(data.attemptId, userId)
        break

      default:
        result = { success: false, error: '未知的操作: ' + action }
    }

    // HTTP 返回格式
    if (event.httpMethod || event.headers) {
      return {
        statusCode: result.success ? 200 : 400,
        headers: getCorsHeaders(event.headers?.origin),
        body: JSON.stringify(result)
      }
    }

    return result

  } catch (error) {
    console.error('[api-exam] 错误:', error)
    const errorResult = { success: false, error: error.message }

    if (event.httpMethod || event.headers) {
      return {
        statusCode: 500,
        headers: getCorsHeaders(),
        body: JSON.stringify(errorResult)
      }
    }

    return errorResult
  }
}