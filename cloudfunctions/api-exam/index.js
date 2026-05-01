/**
 * api-exam 云函数 - 考试服务
 * 
 * 合并来源：
 * - mobile-exam（考试列表）
 * - submit-exam（考试提交）
 * 
 * 功能：
 * - 题库管理
 * - 考试列表/详情
 * - 答题/提交
 * - 成绩查询
 */

// 动态选择 SDK
let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ========== 工具函数 ==========

function getCorsHeaders(origin = '') {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com'
  ]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
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
 * 获取题库列表
 */
async function getBanks(params = {}) {
  const { page = 1, pageSize = 20, courseId = '' } = params

  let where = { status: 'active' }
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
      list: banks.data.map(b => ({
        _id: b._id,
        name: b.name,
        description: b.description,
        courseId: b.courseId,
        questionCount: b.questionCount || 0,
        duration: b.duration || 60,
        passScore: b.passScore || 60,
        totalScore: b.totalScore || 100
      })),
      total: countResult.total,
      page,
      pageSize
    }
  }
}

/**
 * 获取题库详情（含题目）
 */
async function getBankDetail(bankId, params = {}) {
  const { shuffle = true, limit = 0 } = params

  const bank = await db.collection('questionBanks').doc(bankId).get()

  if (!bank.data) {
    return { success: false, error: '题库不存在' }
  }

  // 获取题目
  let questions = await db.collection('bankQuestions')
    .where({ bankId, status: 'active' })
    .get()

  let questionList = questions.data.map(q => ({
    _id: q._id,
    type: q.type || 'single',
    title: q.title,
    options: q.options || [],
    score: q.score || 1,
    // 不返回答案
    // answer: q.answer
  }))

  // 随机排序
  if (shuffle) {
    questionList = questionList.sort(() => Math.random() - 0.5)
  }

  // 限制数量
  if (limit > 0 && questionList.length > limit) {
    questionList = questionList.slice(0, limit)
  }

  return {
    success: true,
    data: {
      _id: bank.data._id,
      name: bank.data.name,
      description: bank.data.description,
      duration: bank.data.duration || 60,
      passScore: bank.data.passScore || 60,
      totalScore: bank.data.totalScore || 100,
      questionCount: questionList.length,
      questions: questionList
    }
  }
}

// ========== 考试相关 ==========

/**
 * 获取考试列表
 */
async function getExams(params = {}) {
  const { page = 1, pageSize = 20, courseId = '', status = '' } = params

  let where = { status: 'published' }
  if (courseId) {
    where.courseId = courseId
  }
  if (status) {
    where.status = status
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
        title: e.title,
        description: e.description,
        courseId: e.courseId,
        duration: e.duration || 60,
        totalScore: e.totalScore || 100,
        passScore: e.passScore || 60,
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

  // 获取关联的题库题目
  let questions = []
  if (e.bankIds && e.bankIds.length > 0) {
    const qResult = await db.collection('bankQuestions')
      .where({ bankId: _.in(e.bankIds), status: 'active' })
      .get()
    
    questions = qResult.data.map(q => ({
      _id: q._id,
      type: q.type || 'single',
      title: q.title,
      options: q.options || [],
      score: q.score || 1
    }))
  }

  return {
    success: true,
    data: {
      _id: e._id,
      title: e.title,
      description: e.description,
      courseId: e.courseId,
      duration: e.duration || 60,
      totalScore: e.totalScore || 100,
      passScore: e.passScore || 60,
      startTime: e.startTime,
      endTime: e.endTime,
      attemptLimit: e.attemptLimit || 1,
      questionCount: questions.length,
      questions
    }
  }
}

/**
 * 开始考试（创建答题记录）
 */
async function startExam(examId, userId) {
  const openid = userId || getOpenId({ userId })

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

  // 检查已答题次数
  const attempts = await db.collection('examAttempts')
    .where({ examId, userId: openid })
    .count()

  const attemptLimit = exam.data.attemptLimit || 1
  if (attempts.total >= attemptLimit) {
    return { success: false, error: '已达最大答题次数' }
  }

  // 创建答题记录
  const attemptId = `${examId}_${openid}_${Date.now()}`
  const now2 = new Date().toISOString()

  await db.collection('examAttempts').add({
    data: {
      _id: attemptId,
      examId,
      userId: openid,
      courseId: exam.data.courseId,
      status: 'in_progress',
      startTime: now2,
      score: 0,
      answers: [],
      createdAt: now2
    }
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
 */
async function submitExam(data, userId) {
  const { attemptId, answers } = data
  const openid = userId || getOpenId({ userId })

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
  const questions = await db.collection('bankQuestions')
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
 */
async function getAttempts(params, userId) {
  const openid = userId || getOpenId({ userId })
  const { examId = '', page = 1, pageSize = 20 } = params

  let where = { userId: openid }
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
  console.log('[api-exam] 收到请求:', event.action)

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
        result = await startExam(data.examId, userId)
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