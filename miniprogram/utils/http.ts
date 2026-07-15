// utils/http.ts
// HTTP API 请求模块 - 连接腾讯云 CloudBase

import logger from './logger'

const API_BASE = 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
// 说明：api-shop 的 HTTP 访问入口注册在 .service 旧网关的 `*` 域（WEB_SCF / Web 函数模式），
// 且 api-shop 已改造为 Web 函数（监听 :9000），因此所有云函数统一走 .service 网关。
// （历史上曾尝试把 api-shop 单独路由到 .app 网关，但 .app 并未注册 /api-shop 路由，一直 INVALID_PATH，已废弃。）

function resolveBase(path: string): string {
  return API_BASE
}

/**
 * HTTP 请求封装
 */
export async function request<T = any>(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any
): Promise<T> {
  const base = resolveBase(path)
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${path}`,
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
    order?: string
    limit?: number
    skip?: number
    useOperators?: boolean
  } = {}
) {
  // 将 where 重命名为 query，因为 db-init 云函数期望 query 参数
  const { where, useOperators, ...rest } = options
  return request<{ data: any[] }>('/db-init', 'POST', {
    action: 'getList',
    collection,
    query: where,
    useOperators,
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

/**
 * 数据迁移：将 sourceId 从 UUID 统一为体系 code
 * 在部署新版本后运行一次即可
 */
export async function migrateSourceId() {
  return request<{
    code: number
    message: string
    data: {
      stats: {
        sources: number
        categories: number
        courses: number
        classes: number
        page_configs: number
        errors: string[]
      }
    }
  }>('/db-init', 'POST', {
    action: 'migrateSourceId'
  })
}

// ============== 页面专用 API ==============

/**
 * 获取我的报名记录
 * @param phone 手机号（主要标识）
 * @param userId 用户ID（备用）
 */
export async function getMyEnrollments(phoneOrUserId: string, userId?: string) {
  // 优先使用 phone 查询，因为报名时使用 phone 作为标识
  const isPhone = phoneOrUserId.includes('@') || /^\d{11}$/.test(phoneOrUserId)
  const where: any = isPhone ? { phone: phoneOrUserId } : { userId: phoneOrUserId }

  // 同时查询三个集合并合并（orders 兼容 enrollClass 失败的历史数据）
  const [classMembers, enrollments, ordersResult] = await Promise.all([
    dbGetList('class_members', {
      where,
      orderBy: 'enrollmentTime desc'
    }),
    dbGetList('enrollments', {
      where,
      orderBy: 'createdAt desc'
    }),
    // ★ 补充查询 orders 集合中的培训班订单（兼容 enrollClass 调用失败的情况）
    dbGetList('orders', {
      where: {
        ...where,
        orderType: 'class',
        status: { $in: ['pending', 'paid', 'completed'] }
      },
      orderBy: 'createdAt desc'
    })
  ])

  // 合并三个集合的数据，标记来源和数据优先级
  // 优先级：class_members > enrollments > orders（class_members 数据最完整）
  // 过滤已退课(dropped)/已取消报名(cancelled) 的记录，保证后台"移出/重新加入"在端上同步
  const members = (classMembers.data || [])
    .filter((item: any) => item.status !== 'dropped')
    .map((item: any) => ({
      ...item,
      _source: 'class_members',
      _priority: 1
    }))
  const enrolls = (enrollments.data || [])
    .filter((item: any) => item.status !== 'cancelled')
    .map((item: any) => ({
      ...item,
      _source: 'enrollments',
      _priority: 2
    }))
  // orders 数据映射为报名记录格式（跳过后台已取消报名的班级订单）
  const orders = (ordersResult.data || [])
    .filter((item: any) => !item.enrollmentCancelled)
    .map((item: any) => ({
    ...item,
    classId: item.classId || '',
    className: item.className || item.items?.[0]?.className || '',
    status: item.status === 'completed' ? 'confirmed' : (item.status || 'pending'),
    enrollmentTime: item.createdAt,
    _source: 'orders',
    _priority: 3
  }))

  // 合并并去重（以 classId 为键，优先使用高优先级来源的数据）
  const all = [...members, ...enrolls, ...orders]
  const bestByClass = new Map<string, any>()
  for (const item of all) {
    const classId = item.classId || ''
    if (!classId) continue
    const existing = bestByClass.get(classId)
    if (!existing || (item._priority || 99) < (existing._priority || 99)) {
      bestByClass.set(classId, item)
    }
  }
  const unique = Array.from(bestByClass.values())

  return { data: unique }
}

/**
 * 获取我的日程
 * 排课记录由后台按「班级」创建，存于 class_schedules 集合（字段：classId/date/startTime/endTime），
 * 不含 userId。因此需先解析用户报名的班级 classId，再按 classId 查询排课。
 */
export async function getMySchedules(params: { userId?: string; classId?: string }) {
  // 1. 确定要查询的班级 ID 列表
  let classIds: string[] = []
  if (params.classId) {
    classIds = [params.classId]
  } else if (params.userId) {
    // 未指定班级时，查出用户报名的所有班级
    const enroll = await getMyEnrollments(params.userId)
    classIds = (enroll.data || [])
      .map((e: any) => e.classId)
      .filter(Boolean)
  }

  if (classIds.length === 0) {
    return { data: [] }
  }

  // 2. 按班级查询排课（后台写入的集合为 class_schedules）
  return dbGetList('class_schedules', {
    where: { classId: { $in: classIds } },
    orderBy: 'date asc'
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
export async function getMockExams(limit: number = 100) {
  return dbGetList('exams', {
    where: { status: 'published' },
    orderBy: 'createdAt desc',
    limit
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
export async function getPracticeRecords(userId?: string, limit: number = 10, skip: number = 0) {
  const where: any = {}
  if (userId) where.userId = userId
  return dbGetList('practiceRecords', {
    where,
    orderBy: 'createdAt desc',
    limit,
    skip
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
  options?: string[]
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

// ============== 云存储文件URL解析 ==============

// 内存缓存：避免重复请求相同的 fileID
const fileUrlCache = new Map<string, string>()

/**
 * 批量解析云存储文件ID（cloud:// 格式）为 HTTPS 临时链接
 * 调用 db-init 云函数的 getTempFileURL action
 * 
 * @param fileIDs cloud:// 格式的文件ID数组
 * @returns Map<fileID, httpsURL> — 解析成功返回临时链接，失败保留原始值
 */
export async function resolveCloudFileURLs(fileIDs: string[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()
  
  if (!fileIDs || fileIDs.length === 0) return urlMap
  
  // 过滤掉非 cloud:// 格式的 URL 和非空字符串
  const cloudIDs = fileIDs.filter(id => id && typeof id === 'string' && id.startsWith('cloud://'))
  
  // 检查缓存
  const uncachedIDs: string[] = []
  for (const id of cloudIDs) {
    if (fileUrlCache.has(id)) {
      urlMap.set(id, fileUrlCache.get(id)!)
    } else {
      uncachedIDs.push(id)
    }
  }
  
  if (uncachedIDs.length === 0) return urlMap
  
  try {
    const res: any = await request('/db-init', 'POST', {
      action: 'getTempFileURL',
      fileList: uncachedIDs
    })
    
    if (res.fileList && Array.isArray(res.fileList)) {
      for (const file of res.fileList) {
        const fileID = file.fileID
        if (!fileID) continue
        
        if (file.code === 'SUCCESS' && file.tempFileURL) {
          const url = file.tempFileURL as string
          urlMap.set(fileID, url)
          fileUrlCache.set(fileID, url)  // 缓存7天内有效
        } else if (file.download_url) {
          // 备选：download_url（可能为 HTTP）
          let url = file.download_url as string
          if (url.startsWith('http://')) {
            url = url.replace(/^http:\/\//, 'https://')
          }
          urlMap.set(fileID, url)
          fileUrlCache.set(fileID, url)
        } else {
          // 解析失败，保留原始值
          urlMap.set(fileID, fileID)
        }
      }
    }
  } catch (err) {
    console.error('[resolveCloudFileURLs] 解析失败:', err)
    // 失败时保留原始值
    for (const id of uncachedIDs) {
      urlMap.set(id, id)
    }
  }
  
  return urlMap
}

/**
 * 批量解析对象数组中封面/图片字段里的 cloud:// URL 为 HTTPS 临时链接
 * 直接在原数组中原地替换，并返回该数组
 * 
 * @param items 任意对象数组
 * @param fields 需要解析的字段名，默认 ['coverImage', 'cover']
 */
export async function resolveCoverUrls<T extends Record<string, any>>(
  items: T[],
  fields: string[] = ['coverImage', 'cover']
): Promise<T[]> {
  if (!items || items.length === 0) return items

  // 收集所有 cloud:// 格式的 URL
  const cloudIDs = new Set<string>()
  for (const item of items) {
    for (const field of fields) {
      const val = item[field]
      if (val && typeof val === 'string' && val.startsWith('cloud://')) {
        cloudIDs.add(val)
      }
    }
  }

  if (cloudIDs.size === 0) return items

  // 批量解析
  const urlMap = await resolveCloudFileURLs(Array.from(cloudIDs))

  // 原地替换
  for (const item of items) {
    for (const field of fields) {
      const val = item[field]
      if (val && typeof val === 'string' && val.startsWith('cloud://')) {
        const resolved = urlMap.get(val)
        if (resolved && resolved !== val) {
          item[field] = resolved
        }
      }
    }
  }

  return items
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
 * 调用 api-course 云函数
 */
export async function callApiCourse(action: string, data?: any) {
  return request<any>('/api-course', 'POST', { action, data })
}

// ============== 培训合同 API ==============

/**
 * 创建合同
 */
export async function createContract(data: {
  userId: string
  userName: string
  phone: string
  idCard?: string
  orderId?: string
  registrationId?: string
  courseId?: string
  courseName?: string
}) {
  return callApiOrder('createContract', data)
}

/**
 * 签署合同
 */
export async function signContract(data: {
  contractId: string
  signatureImage: string
  verifyMethod?: 'sms' | 'none'
}) {
  return callApiOrder('signContract', data)
}

/**
 * 获取合同详情
 */
export async function getContract(params: {
  contractId?: string
  orderId?: string
  registrationId?: string
}) {
  return callApiOrder('getContract', params)
}

/**
 * 获取合同列表
 */
export async function getContractList(params: {
  phone?: string
  userId?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  return callApiOrder('getContractList', params)
}
