// utils/http.ts
// HTTP API 请求模块 - 连接腾讯云 CloudBase

import logger from './logger'

const API_BASE = 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'

/**
 * HTTP 请求封装
 */
async function request<T = any>(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res: any) => {
        logger.debug('HTTP', '响应', res.data)
        if (res.statusCode === 200) {
          // 处理云函数 HTTP 触发器返回格式
          let result = res.data
          // 如果是云函数 HTTP 格式 { statusCode, headers, body }
          if (result && typeof result === 'object' && 'body' in result) {
            const bodyStr = result.body
            if (typeof bodyStr === 'string') {
              try {
                result = JSON.parse(bodyStr)
              } catch (e) {
                reject(new Error(`解析响应失败: ${bodyStr}`))
                return
              }
            } else {
              result = bodyStr
            }
          }
          // 如果是直接返回的 JSON 对象（{ code, data }）
          resolve(result as T)
        } else if (res.statusCode === 404) {
          reject(new Error(`API不存在: ${path}`))
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(`网络请求失败: ${err?.errMsg || '未知错误'}`))
      }
    })
  })
}

/**
 * 调用云函数
 */
export async function callFunction(name: string, data?: any) {
  return request<any>(`/${name}`, 'POST', data)
}

/**
 * 数据库操作 - 查询单条
 */
export async function dbQuery(collection: string, query: any = {}) {
  return request<{ data: any[]; total: number }>('/db-init', 'POST', {
    action: 'query',
    collection,
    query
  })
}

/**
 * 数据库操作 - 获取列表
 */
export async function dbGetList(
  collection: string,
  options: {
    where?: any
    orderBy?: string
    limit?: number
    skip?: number
  } = {}
) {
  // 将 where 重命名为 query，因为 db-init 云函数期望 query 参数
  const { where, ...rest } = options
  return request<{ data: any[] }>('/db-init', 'POST', {
    action: 'getList',
    collection,
    query: where,
    ...rest
  })
}

/**
 * 数据库操作 - 新增记录
 */
export async function dbAdd(collection: string, data: any) {
  return request<{ id: string; data: any }>('/db-init', 'POST', {
    action: 'add',
    collection,
    data
  })
}

/**
 * 数据库操作 - 更新记录
 */
export async function dbUpdate(collection: string, id: string, data: any) {
  return request<{ updated: number }>('/db-init', 'POST', {
    action: 'update',
    collection,
    id,
    data
  })
}

/**
 * 数据库操作 - 删除记录
 */
export async function dbDelete(collection: string, id: string) {
  return request<{ deleted: number }>('/db-init', 'POST', {
    action: 'delete',
    collection,
    id
  })
}

/**
 * 测试连接
 */
export async function testConnection() {
  return request<{ success: boolean; message: string }>('/db-init', 'POST', {
    action: 'ping'
  })
}

// ============== 页面专用 API ==============

/**
 * 获取我的报名记录
 */
export async function getMyEnrollments(userId: string) {
  return dbGetList('enrollments', {
    where: { userId },
    orderBy: 'createdAt desc'
  })
}

/**
 * 获取我的日程
 */
export async function getMySchedules(params: { userId?: string; classId?: string }) {
  const where: any = {}
  if (params.userId) where.userId = params.userId
  if (params.classId) where.classId = params.classId
  return dbGetList('schedules', {
    where,
    orderBy: 'startTime asc'
  })
}

/**
 * 获取题库列表
 */
export async function getQuestionBanks() {
  return dbGetList('questionBanks', {
    where: { status: 'active' },
    orderBy: 'createdAt desc'
  })
}

/**
 * 获取题库详情
 */
export async function getQuestionBank(bankId: string) {
  const result = await dbGetList('questionBanks', {
    where: { _id: bankId },
    limit: 1
  })
  return result.data?.[0] || null
}

/**
 * 获取模拟考试列表
 */
export async function getMockExams() {
  return dbGetList('exams', {
    where: { status: 'published' },
    orderBy: 'createdAt desc',
    limit: 5
  })
}

/**
 * 获取考试详情
 */
export async function getExam(examId: string) {
  const result = await dbGetList('exams', {
    where: { _id: examId },
    limit: 1
  })
  return result.data?.[0] || null
}

/**
 * 获取题库题目列表
 */
export async function getBankQuestions(bankId: string, limit: number = 50) {
  return dbGetList('questions', {
    where: { bankId },
    limit
  })
}

/**
 * 获取考试题目列表
 */
export async function getExamQuestions(examId: string) {
  return dbGetList('questions', {
    where: { examId },
    limit: 100
  })
}

/**
 * 获取练习/考试题目（统一接口）
 * @param params bankId 或 examId
 */
export async function getQuestions(params: { bankId?: string; examId?: string; limit?: number }) {
  const where: any = {}
  if (params.bankId) where.bankId = params.bankId
  if (params.examId) where.examId = params.examId
  
  return dbGetList('questions', {
    where,
    limit: params.limit || 100
  })
}

/**
 * 保存练习记录
 */
export async function savePracticeRecord(data: {
  type: 'bank' | 'exam'
  targetId: string
  targetName: string
  score: number
  correctCount: number
  totalCount: number
  duration: number
  answers: Record<string, any>
}) {
  return dbAdd('practiceRecords', {
    ...data,
    userId: wx.getStorageSync('userId') || '',
    createdAt: new Date().toISOString()
  })
}

/**
 * 获取练习记录列表
 */
export async function getPracticeRecords(userId?: string, limit: number = 10) {
  const where: any = {}
  if (userId) where.userId = userId
  return dbGetList('practiceRecords', {
    where,
    orderBy: 'createdAt desc',
    limit
  })
}

/**
 * 获取错题列表
 */
export async function getWrongQuestions(userId?: string) {
  const where: any = {}
  if (userId) where.userId = userId
  return dbGetList('wrongQuestions', {
    where,
    orderBy: 'createdAt desc',
    limit: 50
  })
}

/**
 * 添加错题
 */
export async function addWrongQuestion(data: {
  userId: string
  bankId: string
  questionId: string
  question: string
  yourAnswer: string
  correctAnswer: string
}) {
  // 先查询是否已存在
  const existing = await dbGetList('wrongQuestions', {
    where: { userId: data.userId, questionId: data.questionId }
  })
  if (existing.data?.length > 0) {
    // 已存在，更新
    return dbUpdate('wrongQuestions', existing.data[0]._id, {
      ...data,
      wrongCount: (existing.data[0].wrongCount || 1) + 1,
      lastWrongAt: new Date().toISOString()
    })
  }
  return dbAdd('wrongQuestions', {
    ...data,
    wrongCount: 1,
    createdAt: new Date().toISOString()
  })
}

/**
 * 获取练习统计
 */
export async function getPracticeStats(userId: string) {
  try {
    // 获取总练习次数
    const records = await dbGetList('practiceRecords', {
      where: { userId },
      limit: 100
    })
    
    const totalPractices = records.data?.length || 0
    let totalQuestions = 0
    let totalCorrect = 0
    let todayQuestions = 0
    
    const today = new Date().toDateString()
    
    records.data?.forEach((record: any) => {
      totalQuestions += record.totalCount || 0
      totalCorrect += record.correctCount || 0
      if (new Date(record.createdAt).toDateString() === today) {
        todayQuestions += record.totalCount || 0
      }
    })
    
    return {
      totalPractices,
      totalQuestions,
      totalCorrect,
      todayQuestions,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
    }
  } catch (err) {
    logger.error('练习', '获取统计失败', err)
    return {
      totalPractices: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      todayQuestions: 0,
      accuracy: 0
    }
  }
}

/**
 * 获取外部证书
 */
export async function getExternalCertificates(userId: string) {
  return dbGetList('external_certificates', {
    where: { userId },
    orderBy: 'createdAt desc'
  })
}

/**
 * 获取培训证书
 */
export async function getTrainingCertificates(userId: string) {
  return dbGetList('training_certificates', {
    where: { userId },
    orderBy: 'issuedAt desc'
  })
}

/**
 * 获取证书列表
 */
export async function getCertificates(userId: string) {
  return dbGetList('certificates', {
    where: { userId },
    orderBy: 'createdAt desc'
  })
}

// ============== API 云函数封装 ==============

/**
 * 调用 api-user 云函数
 */
export async function callApiUser(action: string, data?: any) {
  return request<any>('/api-user', 'POST', { action, data })
}

/**
 * 调用 api-order 云函数
 */
export async function callApiOrder(action: string, data?: any) {
  return request<any>('/api-order', 'POST', { action, data })
}

/**
 * 调用 mobile-learning 云函数
 */
export async function callMobileLearning(action: string, data?: any) {
  return request<any>('/mobile-learning', 'POST', { action, data })
}
