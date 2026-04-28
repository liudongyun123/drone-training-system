// 管理后台云函数 v2.0
// 处理所有后台管理相关的数据库操作
// 版本: v202604122135-cors
const tcb = require('tcb-admin-node')

// 使用默认初始化（CloudBase 会自动注入凭证）
const app = tcb.init()
const db = app.database()
const _ = db.command

// CORS 头配置
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400'
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action, collection, data, query, docId, options, batchData } = event
  
  // 处理 CORS 预检请求
  if (event.request && event.request.method === 'OPTIONS') {
    return {
      code: 200,
      message: 'OK',
      headers: CORS_HEADERS
    }
  }
  
  console.log('管理后台请求:', { action, collection, docId, dataKeys: data ? Object.keys(data) : [] })
  
  try {
    switch (action) {
      case 'list':
        return await handleList(collection, query, options)
      case 'get':
        return await handleGet(collection, docId)
      case 'add':
        return await handleAdd(collection, data)
      case 'update':
        return await handleUpdate(collection, docId, data)
      case 'delete':
        return await handleDelete(collection, docId)
      case 'batchDelete':
        return await handleBatchDelete(collection, query)
      case 'batchAdd':
        return await handleBatchAdd(collection, batchData || data)
      case 'count':
        return await handleCount(collection, query)
      case 'aggregate':
        return await handleAggregate(collection, pipeline, options)
      // 排课专用方法
      case 'listSchedules':
        return await handleListSchedules(query, options)
      case 'getScheduleWithDetails':
        return await handleGetScheduleWithDetails(docId)
      // 调课专用方法
      case 'insertTransferTestData':
        return await handleInsertTransferTestData()
      case 'listMyRequests':
        return await handleListMyTransferRequests(data, options)
      case 'getRequestDetail':
        return await handleGetTransferRequestDetail(docId)
      case 'createRequest':
        return await handleCreateTransferRequest(data)
      case 'cancelRequest':
        return await handleCancelTransferRequest(data)
      case 'createCollection':
        return await handleCreateCollection(collection)
      // 数据修复
      case 'fixCourseRelations':
        return await handleFixCourseRelations()
      // 测试数据生成
      case 'generateTestData':
        return await handleGenerateTestData(collection, data)
      // Upsert (插入或更新)
      case 'upsert':
        return await handleUpsert(collection, docId, data)
      // 获取用户订单（通过 phone 或 openid）
      case 'getUserOrders':
        return await handleGetUserOrders(event)
      // 学员身份统一迁移
      case 'migrateMemberRelations':
        return await handleMigrateMemberRelations()
      case 'batchDeleteByQuery':
        return await handleBatchDeleteByQuery(collection, query)
      case 'createMemberFromLegacy':
        return await handleCreateMemberFromLegacy(data)
      default:
        return {
          code: 400,
          message: `未知的操作类型: ${action}`
        }
    }
  } catch (error) {
    console.error('管理后台操作失败:', error)
    return {
      code: 500,
      message: error.message || '操作失败',
      error: error.message
    }
  }
}

/**
 * 查询列表（优化版 - 正确的分页统计）
 */
async function handleList(collection, query = {}, options = {}) {
  const { limit = 100, page = 1, offset, orderBy, order = 'desc', field, needTotal = true } = options
  
  let dbQuery = db.collection(collection)
  
  // 应用查询条件
  if (query && Object.keys(query).length > 0) {
    // 处理特殊查询条件
    const processedQuery = processQuery(query)
    dbQuery = dbQuery.where(processedQuery)
  }
  
  // 应用排序
  if (orderBy) {
    // 特殊字段映射
    const orderField = mapFieldName(orderBy)
    dbQuery = dbQuery.orderBy(orderField, order)
  }
  
  // 应用字段过滤
  if (field) {
    dbQuery = dbQuery.field(field)
  }
  
  // 计算偏移量
  const skip = offset !== undefined ? offset : (page - 1) * limit
  
  // 应用分页
  dbQuery = dbQuery.skip(skip).limit(limit)
  
  // 获取总数（优化：只查询一次）
  let total = 0
  if (needTotal) {
    try {
      const countResult = await db.collection(collection).where(query).count()
      total = countResult.total || 0
    } catch (e) {
      console.log('统计失败，使用默认值:', e.message)
    }
  }
  
  const result = await dbQuery.get()
  
  return {
    code: 0,
    message: '查询成功',
    data: result.data || [],
    total: total,
    page: page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit)
  }
}

/**
 * 获取单个文档
 */
async function handleGet(collection, docId) {
  const result = await db.collection(collection).doc(docId).get()
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '文档不存在'
    }
  }
  
  return {
    code: 0,
    message: '查询成功',
    data: result.data[0]
  }
}

/**
 * 添加文档
 */
async function handleAdd(collection, data) {
  const addData = {
    ...data,
    _openid: data._openid || '{admin}',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // 删除可能存在的 _id
  delete addData._id
  
  const result = await db.collection(collection).add(addData)
  
  if (result.code) {
    return {
      code: result.code,
      message: result.message || '添加失败'
    }
  }
  
  return {
    code: 0,
    message: '添加成功',
    data: {
      id: result.id,
      ...addData
    }
  }
}

/**
 * Upsert 文档（插入或更新）
 */
async function handleUpsert(collection, docId, data) {
  if (!docId) {
    return {
      code: 400,
      message: 'Upsert 操作需要提供 docId'
    }
  }
  
  const upsertData = {
    ...data,
    _openid: data._openid || '{admin}',
    updatedAt: new Date().toISOString()
  }
  
  // 检查文档是否存在
  const existing = await db.collection(collection).doc(docId).get()
  
  if (existing.data && existing.data.length > 0) {
    // 文档存在，执行更新
    delete upsertData._id
    const result = await db.collection(collection).doc(docId).update(upsertData)
    
    return {
      code: 0,
      message: '更新成功',
      data: {
        id: docId,
        ...upsertData,
        updated: true
      }
    }
  } else {
    // 文档不存在，执行插入
    const result = await db.collection(collection).add({
      _id: docId,
      ...upsertData
    })
    
    return {
      code: 0,
      message: '插入成功',
      data: {
        id: docId,
        ...upsertData,
        inserted: true
      }
    }
  }
}

/**
 * 批量添加文档（新增）
 */
async function handleBatchAdd(collection, batchData) {
  if (!Array.isArray(batchData)) {
    return {
      code: 400,
      message: '批量数据必须是数组'
    }
  }
  
  if (batchData.length === 0) {
    return {
      code: 0,
      message: '没有数据需要添加',
      data: { inserted: 0, ids: [] }
    }
  }
  
  const now = new Date().toISOString()
  const ids = []
  let successCount = 0
  let errorMessages = []
  
  console.log(`[批量添加] collection=${collection}, count=${batchData.length}`)
  
  // 逐条插入文档（CloudBase SDK不支持真正的批量插入）
  for (let i = 0; i < batchData.length; i++) {
    const item = batchData[i]
    const addData = {
      ...item,
      _openid: item._openid || '{admin}',
      createdAt: now,
      updatedAt: now
    }
    // 删除可能存在的 _id
    delete addData._id
    
    try {
      const result = await db.collection(collection).add(addData)
      
      if (result.id) {
        ids.push(result.id)
        successCount++
      } else if (result.code) {
        errorMessages.push(`第${i + 1}条: ${result.message || '插入失败'}`)
      }
    } catch (error) {
      console.error(`[批量添加] 第${i + 1}条插入失败:`, error)
      errorMessages.push(`第${i + 1}条: ${error.message || '插入失败'}`)
    }
  }
  
  console.log(`[批量添加] 成功: ${successCount} 条, 失败: ${errorMessages.length} 条`)
  
  return {
    code: errorMessages.length > 0 ? 1 : 0,
    message: errorMessages.length > 0 
      ? `成功${successCount}条，失败${errorMessages.length}条`
      : `成功添加 ${successCount} 条记录`,
    data: {
      inserted: successCount,
      ids: ids
    },
    errors: errorMessages.length > 0 ? errorMessages : undefined
  }
}

/**
 * 更新文档
 */
async function handleUpdate(collection, docId, data) {
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString()
  }
  
  // 删除不允许更新的字段
  delete updateData._id
  delete updateData.createdAt
  delete updateData._openid
  
  const result = await db.collection(collection).doc(docId).update(updateData)
  
  if (result.code) {
    return {
      code: result.code,
      message: result.message || '更新失败'
    }
  }
  
  return {
    code: 0,
    message: '更新成功',
    data: updateData
  }
}

/**
 * 删除文档
 */
async function handleDelete(collection, docId) {
  console.log(`[删除文档] collection=${collection}, docId=${docId}`)
  
  if (!docId) {
    console.log('[删除文档] 错误: 文档ID不能为空')
    return {
      code: 400,
      message: '文档ID不能为空'
    }
  }
  
  try {
    const result = await db.collection(collection).doc(docId).remove()
    
    if (result.deleted === undefined) {
      return {
        code: 500,
        message: '删除结果格式异常'
      }
    }
    
    if (result.deleted === 0) {
      return {
        code: 404,
        message: '文档不存在或已被删除'
      }
    }
    
    return {
      code: 0,
      message: '删除成功',
      data: { deleted: result.deleted }
    }
  } catch (error) {
    console.error('[删除文档] 异常:', error)
    return {
      code: 500,
      message: error.message || '删除失败'
    }
  }
}

/**
 * 批量删除
 */
async function handleBatchDelete(collection, query) {
  const result = await db.collection(collection).where(query).remove()
  
  if (result.code) {
    return {
      code: result.code,
      message: result.message || '批量删除失败'
    }
  }
  
  return {
    code: 0,
    message: '批量删除成功',
    data: { deleted: result.deleted || 0 }
  }
}

/**
 * 统计数量
 */
async function handleCount(collection, query = {}) {
  let dbQuery = db.collection(collection)
  
  if (query && Object.keys(query).length > 0) {
    const processedQuery = processQuery(query)
    dbQuery = dbQuery.where(processedQuery)
  }
  
  const result = await dbQuery.count()
  
  return {
    code: 0,
    message: '统计成功',
    data: result.total || 0
  }
}

/**
 * 聚合查询
 */
async function handleAggregate(collection, pipeline = [], options = {}) {
  let aggregate = db.collection(collection)
  
  pipeline.forEach(step => {
    const key = Object.keys(step)[0]
    const value = step[key]
    aggregate = aggregate[key](value)
  })
  
  const result = await aggregate.end()
  
  return {
    code: 0,
    message: '聚合查询成功',
    data: result.list || result.data || []
  }
}

/**
 * 排课列表（带关联信息）
 */
async function handleListSchedules(query = {}, options = {}) {
  const { limit = 100, page = 1, orderBy = 'date', order = 'desc' } = options
  
  // 先获取排课数据
  let scheduleQuery = db.collection('course_schedules')
  
  // 处理查询条件
  if (query) {
    const processedQuery = processScheduleQuery(query)
    if (Object.keys(processedQuery).length > 0) {
      scheduleQuery = scheduleQuery.where(processedQuery)
    }
  }
  
  // 排序
  const orderField = mapFieldName(orderBy)
  scheduleQuery = scheduleQuery.orderBy(orderField, order)
  
  // 分页
  const skip = (page - 1) * limit
  scheduleQuery = scheduleQuery.skip(skip).limit(limit)
  
  const schedulesResult = await scheduleQuery.get()
  const schedules = schedulesResult.data || []
  
  // 获取总数
  let total = 0
  try {
    let countQuery = db.collection('course_schedules')
    if (query) {
      const processedQuery = processScheduleQuery(query)
      if (Object.keys(processedQuery).length > 0) {
        countQuery = countQuery.where(processedQuery)
      }
    }
    const countResult = await countQuery.count()
    total = countResult.total || 0
  } catch (e) {
    console.log('统计排课数量失败:', e.message)
  }
  
  // 获取关联数据
  const schedulesWithDetails = await enrichSchedulesWithDetails(schedules)
  
  return {
    code: 0,
    message: '查询成功',
    data: schedulesWithDetails,
    total: total,
    page: page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit)
  }
}

/**
 * 获取排课详情（带关联信息）
 */
async function handleGetScheduleWithDetails(docId) {
  const result = await db.collection('course_schedules').doc(docId).get()
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '排课不存在'
    }
  }
  
  const schedule = result.data[0]
  const enriched = await enrichSchedulesWithDetails([schedule])
  
  return {
    code: 0,
    message: '查询成功',
    data: enriched[0]
  }
}

/**
 * 丰富排课数据（添加关联信息）
 * 支持多种匹配方式：
 * 1. 通过 courseId/_id 匹配
 * 2. 通过 courseName 匹配课程表 title
 * 3. 通过 teacherName 匹配教师表 name
 */
async function enrichSchedulesWithDetails(schedules) {
  if (!schedules || schedules.length === 0) {
    return []
  }
  
  // 收集所有需要查询的 ID 和名称
  const courseIds = [...new Set(
    schedules
      .map(s => s.courseId || s._id)
      .filter(Boolean)
  )]
  const courseNames = [...new Set(
    schedules
      .map(s => s.courseName)
      .filter(Boolean)
  )]
  const teacherNames = [...new Set(
    schedules
      .map(s => s.teacherName)
      .filter(Boolean)
  )]
  
  // 查询课程信息 - 同时按 ID 和名称查询
  let coursesMapById = {}
  let coursesMapByName = {}
  try {
    // 按 ID 查询
    if (courseIds.length > 0) {
      const coursesByIdResult = await db.collection('courses')
        .where({
          _id: _.in(courseIds)
        })
        .field({ _id: true, title: true, name: true, coverImage: true, price: true })
        .limit(100)
        .get()
      
      coursesByIdResult.data?.forEach(course => {
        coursesMapById[course._id] = course
      })
    }
    
    // 按课程名称查询（用于匹配没有正确关联 ID 的排课）
    if (courseNames.length > 0) {
      const coursesByNameResult = await db.collection('courses')
        .where(
          _.or(courseNames.map(name => ({ title: name })))
        )
        .field({ _id: true, title: true, name: true, coverImage: true, price: true })
        .limit(100)
        .get()
      
      coursesByNameResult.data?.forEach(course => {
        coursesMapByName[course.title] = course
      })
    }
  } catch (e) {
    console.log('获取课程信息失败:', e.message)
  }
  
  // 查询教师信息 - 同时按 ID 和名称查询
  let teachersMapById = {}
  let teachersMapByName = {}
  try {
    // 按 ID 查询
    if (courseIds.length > 0) {
      const teachersByIdResult = await db.collection('teachers')
        .where({
          _id: _.in(courseIds)
        })
        .field({ _id: true, name: true, phone: true, avatar: true })
        .limit(100)
        .get()
      
      teachersByIdResult.data?.forEach(teacher => {
        teachersMapById[teacher._id] = teacher
      })
    }
    
    // 按教师名称查询
    if (teacherNames.length > 0) {
      const teachersByNameResult = await db.collection('teachers')
        .where(
          _.or(teacherNames.map(name => ({ name: name })))
        )
        .field({ _id: true, name: true, phone: true, avatar: true })
        .limit(100)
        .get()
      
      teachersByNameResult.data?.forEach(teacher => {
        teachersMapByName[teacher.name] = teacher
      })
    }
  } catch (e) {
    console.log('获取教师信息失败:', e.message)
  }
  
  // 合并数据 - 优先使用 ID 匹配，其次使用名称匹配
  return schedules.map(schedule => {
    // 课程匹配：先尝试 ID，再尝试名称
    const courseById = coursesMapById[schedule.courseId] || coursesMapById[schedule._id]
    const courseByName = schedule.courseName ? coursesMapByName[schedule.courseName] : null
    const matchedCourse = courseById || courseByName
    
    // 教师匹配：先尝试 ID，再尝试名称
    const teacherById = teachersMapById[schedule.teacherId] || teachersMapById[schedule._id]
    const teacherByName = schedule.teacherName ? teachersMapByName[schedule.teacherName] : null
    const matchedTeacher = teacherById || teacherByName
    
    return {
      ...schedule,
      // 课程信息
      courseInfo: matchedCourse || null,
      courseTitle: schedule.courseName || schedule.courseTitle || 
                   matchedCourse?.title || 
                   matchedCourse?.name || 
                   '未知课程',
      // 教师信息
      teacherInfo: matchedTeacher || null,
      teacherName: schedule.teacherName || 
                   matchedTeacher?.name || 
                   '待分配',
    }
  })
}

/**
 * 处理查询条件
 */
function processQuery(query) {
  const processed = {}
  
  for (const [key, value] of Object.entries(query)) {
    // 跳过空值
    if (value === undefined || value === null || value === '') {
      continue
    }
    
    // 字段名映射
    const mappedKey = mapFieldName(key)
    
    // 处理特殊查询
    if (key === 'keyword' && typeof value === 'string') {
      // 关键字搜索（需要前端传具体字段）
      processed[mappedKey] = { $regex: value }
    } else if (key === 'dateRange' && Array.isArray(value)) {
      // 日期范围查询
      processed[mapFieldName('date')] = _.and(_.gte(value[0]), _.lte(value[1]))
    } else if (key === 'status' && value === 'all') {
      // 忽略"全部"筛选
      continue
    } else if (typeof value === 'object') {
      processed[mappedKey] = value
    } else {
      processed[mappedKey] = value
    }
  }
  
  return processed
}

/**
 * 处理排课查询条件
 */
function processScheduleQuery(query) {
  const processed = {}
  
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (value === 'all') continue
    
    const mappedKey = mapFieldName(key)
    
    // 状态查询
    if (key === 'status') {
      processed[mappedKey] = value
    }
    // 课程ID
    else if (key === 'courseId') {
      processed[mappedKey] = value
    }
    // 教师ID
    else if (key === 'teacherId') {
      processed[mappedKey] = value
    }
    // 日期查询
    else if (key === 'date') {
      processed[mappedKey] = value
    }
    // 日期范围
    else if (key === 'startDate') {
      processed.date = processed.date || {}
      processed.date.$gte = value
    }
    else if (key === 'endDate') {
      processed.date = processed.date || {}
      processed.date.$lte = value
    }
    else {
      processed[mappedKey] = value
    }
  }
  
  return processed
}

/**
 * 字段名映射（数据库字段 -> 统一字段）
 */
function mapFieldName(field) {
  const fieldMap = {
    // 排课相关
    'startTime': 'date',
    'endTime': 'date',
    'courseName': 'courseTitle',
    'courseTitle': 'courseTitle',
    'teacherName': 'teacherName',
    // 通用
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'create_time': 'createdAt',
    'update_time': 'updatedAt',
  }

  return fieldMap[field] || field
}

/**
 * 生成测试数据
 */
async function handleGenerateTestData(collection, options = {}) {
  const { count = 10 } = options
  const now = new Date()
  
  console.log('开始生成测试数据, collection:', collection, 'count:', count)
  
  // 服务级别管理员 OpenID
  const adminOpenid = 'admin_system'
  
  // 根据集合类型生成不同的测试数据
  let testData = []
  
  switch (collection) {
    case 'teachers':
      testData = Array.from({ length: count }, (_, i) => ({
        _openid: adminOpenid,
        name: `教师${i + 1}`,
        phone: `138${String(10000000 + i).slice(-8)}`,
        specialty: ['飞行教官', '维修工程师', '理论教员'][i % 3],
        experience: Math.floor(Math.random() * 10) + 1,
        status: 'active',
        createdAt: now.toISOString()
      }))
      break
      
    case 'courses':
      testData = [
        { name: '无人机基础飞行训练', price: 2999, duration: 5, level: 'beginner', category: '飞行培训', status: 'active' },
        { name: '无人机高级飞行技术', price: 4999, duration: 7, level: 'advanced', category: '飞行培训', status: 'active' },
        { name: '无人机维修保养', price: 1999, duration: 3, level: 'intermediate', category: '维修培训', status: 'active' },
        { name: '无人机航拍技术', price: 3999, duration: 5, level: 'intermediate', category: '航拍培训', status: 'active' },
        { name: '无人机植保应用', price: 3499, duration: 4, level: 'intermediate', category: '应用培训', status: 'active' }
      ]
      break
      
    case 'members':
      testData = Array.from({ length: count }, (_, i) => ({
        _openid: adminOpenid,
        name: `学员${i + 1}`,
        phone: `139${String(10000000 + i).slice(-8)}`,
        idCard: `11010119900101${String(1000 + i).slice(-4)}`,
        level: ['beginner', 'intermediate', 'advanced'][i % 3],
        status: 'active',
        createdAt: now.toISOString()
      }))
      break
      
    case 'course_schedules':
      testData = [
        { _openid: adminOpenid, courseId: 'course_001', courseName: '无人机基础飞行训练', teacherId: 'teacher_001', teacherName: '教师1', startDate: '2026-04-15', endDate: '2026-04-20', location: '东区训练场', maxStudents: 20, enrolledCount: 0, status: 'open' },
        { courseId: 'course_002', courseName: '无人机高级飞行技术', teacherId: 'teacher_002', teacherName: '教师2', startDate: '2026-04-18', endDate: '2026-04-25', location: '西区训练场', maxStudents: 15, enrolledCount: 0, status: 'open' },
        { courseId: 'course_003', courseName: '无人机维修保养', teacherId: 'teacher_003', teacherName: '教师3', startDate: '2026-04-20', endDate: '2026-04-23', location: '维修中心', maxStudents: 10, enrolledCount: 0, status: 'open' }
      ]
      break
      
    case 'enrollments':
      testData = Array.from({ length: count }, (_, i) => ({
        _openid: adminOpenid,
        courseId: `course_00${(i % 3) + 1}`,
        scheduleId: `schedule_00${(i % 3) + 1}`,
        courseName: ['无人机基础飞行训练', '无人机高级飞行技术', '无人机维修保养'][i % 3],
        memberId: `member_00${i + 1}`,
        memberName: `学员${i + 1}`,
        phone: `139${String(10000000 + i).slice(-8)}`,
        status: ['pending', 'confirmed', 'completed'][i % 3],
        enrolledAt: now.toISOString()
      }))
      break
      
    case 'orders':
      testData = Array.from({ length: count }, (_, i) => ({
        _openid: adminOpenid,
        courseId: `course_00${(i % 3) + 1}`,
        courseName: ['无人机基础飞行训练', '无人机高级飞行技术', '无人机维修保养'][i % 3],
        memberId: `member_00${i + 1}`,
        memberName: `学员${i + 1}`,
        amount: [2999, 4999, 1999][i % 3],
        status: ['pending', 'paid', 'cancelled'][i % 3],
        createdAt: now.toISOString()
      }))
      break
    
    // 课程权限测试数据
    case 'course_permissions':
      testData = Array.from({ length: count }, (_, i) => ({
        _openid: adminOpenid,
        userId: `user_${String(i + 1).padStart(3, '0')}`,
        userName: `学员${i + 1}`,
        phone: `139${String(10000000 + i).slice(-8)}`,
        courseId: `course_00${(i % 3) + 1}`,
        courseName: ['无人机基础飞行训练', '无人机高级飞行技术', '无人机维修保养'][i % 3],
        source: ['purchase', 'registration', 'gift'][i % 3], // 购买/报名/赠送
        memberType: ['online_buyer', 'online_registrant', 'offline_registrant'][i % 3],
        videoAccess: {
          enabled: true,
          validFrom: now.toISOString(),
          validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        status: 'active',
        grantedBy: adminOpenid,
        grantedAt: now.toISOString(),
        createdAt: now.toISOString()
      }))
      break
    
    // 班级成员测试数据
    case 'class_members':
      testData = Array.from({ length: count }, (_, i) => ({
        _openid: adminOpenid,
        classId: `class_00${(i % 3) + 1}`,
        className: ['飞行基础班A', '高级飞行班B', '维修实践班C'][i % 3],
        userId: `user_${String(i + 1).padStart(3, '0')}`,
        userName: `学员${i + 1}`,
        phone: `139${String(10000000 + i).slice(-8)}`,
        source: ['registration', 'transfer', 'admin_add'][i % 3], // 报名转入/调班/管理员添加
        status: ['enrolled', 'learning', 'completed'][i % 3],
        enrollmentDate: now.toISOString(),
        attendanceStats: {
          total: Math.floor(Math.random() * 20) + 10,
          present: Math.floor(Math.random() * 18) + 8,
          absent: Math.floor(Math.random() * 5),
          late: Math.floor(Math.random() * 3)
        },
        progress: Math.floor(Math.random() * 100),
        createdAt: now.toISOString()
      }))
      break
      
    default:
      return {
        code: 400,
        message: `不支持生成 ${collection} 的测试数据`
      }
  }
  
  // 插入数据
  let inserted = 0
  for (const item of testData) {
    try {
      const result = await db.collection(collection).add(item)
      if (result.id) {
        inserted++
        console.log(`插入成功: ${result.id}`)
      } else {
        console.log('插入失败，无返回ID')
      }
    } catch (e) {
      console.log('插入失败:', e.message)
    }
  }
  
  return {
    code: 0,
    message: `成功生成 ${inserted} 条 ${collection} 测试数据`,
    data: { inserted, collection }
  }
}

/**
 * 查询我的调课申请
 */
async function handleListMyTransferRequests(data, options = {}) {
  const { studentId, phone, status, transferType } = data || {}
  const { page = 1, pageSize = 20 } = options
  
  if (!studentId && !phone) {
    return {
      code: 400,
      message: '学员ID或手机号不能都为空'
    }
  }
  
  try {
    // 构建查询条件
    const queryConditions = []
    if (studentId) queryConditions.push({ studentId })
    if (phone) queryConditions.push({ phone })
    
    const query = {
      $or: queryConditions
    }
    
    // 添加状态筛选
    if (status && status !== 'all') {
      query.status = status
    }
    
    // 添加类型筛选
    if (transferType && transferType !== 'all') {
      query.transferType = transferType
    }
    
    const result = await db.collection('transfer_requests')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    
    // 获取总数
    const countResult = await db.collection('transfer_requests')
      .where(query)
      .count()
    
    return {
      code: 0,
      data: {
        data: result.data || [],
        total: countResult.total || 0,
        page,
        pageSize,
        totalPages: Math.ceil((countResult.total || 0) / pageSize)
      }
    }
  } catch (error) {
    console.error('查询调课申请失败:', error)
    return {
      code: 500,
      message: error.message || '查询失败'
    }
  }
}

/**
 * 获取调课申请详情
 */
async function handleGetTransferRequestDetail(requestId) {
  if (!requestId) {
    return {
      code: 400,
      message: '申请ID不能为空'
    }
  }
  
  try {
    const result = await db.collection('transfer_requests').doc(requestId).get()
    
    if (result.data && result.data.length > 0) {
      return {
        code: 0,
        data: result.data[0]
      }
    } else {
      return {
        code: 404,
        message: '申请不存在'
      }
    }
  } catch (error) {
    console.error('获取调课申请详情失败:', error)
    return {
      code: 500,
      message: error.message || '查询失败'
    }
  }
}

/**
 * 创建调课申请
 */
async function handleCreateTransferRequest(data) {
  const {
    studentId, studentName, studentPhone,
    originalScheduleId, originalCourseId, originalCourseName,
    originalDate, originalTime, originalTeacher, originalTeacherId, originalLocation,
    targetScheduleId, targetCourseId, targetCourseName,
    targetDate, targetTime, targetTeacher, targetTeacherId, targetLocation,
    transferType, reason, remark
  } = data || {}
  
  if (!studentId) {
    return { code: 400, message: '学员ID不能为空' }
  }
  if (!originalScheduleId) {
    return { code: 400, message: '原排课ID不能为空' }
  }
  if (!transferType) {
    return { code: 400, message: '调课类型不能为空' }
  }
  if (!reason || reason.trim().length < 5) {
    return { code: 400, message: '调课原因至少5个字符' }
  }
  
  try {
    const now = new Date().toISOString()
    const requestData = {
      studentId,
      studentName: studentName || '',
      phone: studentPhone || '',
      originalScheduleId,
      originalCourseId: originalCourseId || '',
      originalCourseName: originalCourseName || '',
      originalDate: originalDate || '',
      originalTime: originalTime || '',
      originalTeacher: originalTeacher || '',
      originalTeacherId: originalTeacherId || '',
      originalLocation: originalLocation || '',
      targetScheduleId: targetScheduleId || '',
      targetCourseId: targetCourseId || '',
      targetCourseName: targetCourseName || '',
      targetDate: targetDate || '',
      targetTime: targetTime || '',
      targetTeacher: targetTeacher || '',
      targetTeacherId: targetTeacherId || '',
      targetLocation: targetLocation || '',
      transferType,
      reason: reason.trim(),
      remark: remark || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now
    }
    
    const result = await db.collection('transfer_requests').add(requestData)
    
    return {
      code: 0,
      message: '调课申请提交成功',
      data: {
        id: result.id,
        ...requestData
      }
    }
  } catch (error) {
    console.error('创建调课申请失败:', error)
    return {
      code: 500,
      message: error.message || '创建失败'
    }
  }
}

/**
 * 取消调课申请
 */
async function handleCancelTransferRequest(data) {
  const { requestId } = data || {}
  
  if (!requestId) {
    return { code: 400, message: '申请ID不能为空' }
  }
  
  try {
    // 检查申请状态
    const existing = await db.collection('transfer_requests').doc(requestId).get()
    
    if (!existing.data || existing.data.length === 0) {
      return { code: 404, message: '申请不存在' }
    }
    
    const request = existing.data[0]
    
    if (request.status !== 'pending') {
      return { code: 400, message: '只有待审核的申请可以取消' }
    }
    
    // 更新状态为已取消
    await db.collection('transfer_requests').doc(requestId).update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    })
    
    return {
      code: 0,
      message: '申请已取消'
    }
  } catch (error) {
    console.error('取消调课申请失败:', error)
    return {
      code: 500,
      message: error.message || '取消失败'
    }
  }
}

/**
 * 插入调课申请测试数据
 */
async function handleInsertTransferTestData() {
  const testData = [
    {
      _openid: "test_user_001",
      studentId: "student_001",
      studentName: "张小明",
      studentPhone: "13800138001",
      originalScheduleId: "schedule_001",
      originalCourseId: "course_001",
      originalCourseName: "无人机基础飞行训练",
      originalDate: "2026-04-10",
      originalTime: "09:00",
      originalTeacher: "李教练",
      originalTeacherId: "teacher_001",
      originalLocation: "东区训练场",
      targetScheduleId: "schedule_002",
      targetCourseId: "course_001",
      targetCourseName: "无人机基础飞行训练",
      targetDate: "2026-04-15",
      targetTime: "14:00",
      targetTeacher: "王教练",
      targetTeacherId: "teacher_002",
      targetLocation: "西区训练场",
      transferType: "time",
      reason: "因公司会议冲突，无法参加原定时间的课程",
      remark: "希望能安排王教练的课程",
      status: "pending",
      adminId: null,
      adminName: null,
      adminReply: null,
      reviewedAt: null,
      createdAt: "2026-04-06T10:00:00.000Z",
      updatedAt: "2026-04-06T10:00:00.000Z",
      isRead: false,
      notificationSent: false
    },
    {
      _openid: "test_user_002",
      studentId: "student_002",
      studentName: "李小红",
      studentPhone: "13800138002",
      originalScheduleId: "schedule_003",
      originalCourseId: "course_002",
      originalCourseName: "无人机高级航拍技术",
      originalDate: "2026-04-12",
      originalTime: "10:00",
      originalTeacher: "赵教练",
      originalTeacherId: "teacher_003",
      originalLocation: "北区训练场",
      targetScheduleId: "schedule_002",
      targetCourseId: "course_001",
      targetCourseName: "无人机基础飞行训练",
      targetDate: "2026-04-15",
      targetTime: "14:00",
      targetTeacher: "王教练",
      targetTeacherId: "teacher_002",
      targetLocation: "西区训练场",
      transferType: "teacher",
      reason: "听说王教练航拍经验丰富，希望能换成王教练授课",
      remark: "",
      status: "pending",
      adminId: null,
      adminName: null,
      adminReply: null,
      reviewedAt: null,
      createdAt: "2026-04-05T14:30:00.000Z",
      updatedAt: "2026-04-05T14:30:00.000Z",
      isRead: false,
      notificationSent: false
    },
    {
      _openid: "test_user_003",
      studentId: "student_003",
      studentName: "王小强",
      studentPhone: "13800138003",
      originalScheduleId: "schedule_004",
      originalCourseId: "course_001",
      originalCourseName: "无人机基础飞行训练",
      originalDate: "2026-04-08",
      originalTime: "09:00",
      originalTeacher: "李教练",
      originalTeacherId: "teacher_001",
      originalLocation: "西区训练场",
      targetScheduleId: null,
      targetCourseId: null,
      targetCourseName: null,
      targetDate: null,
      targetTime: null,
      targetTeacher: null,
      targetTeacherId: null,
      targetLocation: "东区训练场",
      transferType: "location",
      reason: "家住东区，希望调到东区的训练场",
      remark: "",
      status: "approved",
      adminId: "admin",
      adminName: "管理员",
      adminReply: "已通过，请按新时间参加课程",
      reviewedAt: "2026-04-05T10:00:00.000Z",
      createdAt: "2026-04-04T09:15:00.000Z",
      updatedAt: "2026-04-05T10:00:00.000Z",
      isRead: true,
      notificationSent: true
    },
    {
      _openid: "test_user_004",
      studentId: "student_004",
      studentName: "陈小丽",
      studentPhone: "13800138004",
      originalScheduleId: "schedule_005",
      originalCourseId: "course_003",
      originalCourseName: "无人机飞行安全",
      originalDate: "2026-04-18",
      originalTime: "09:00",
      originalTeacher: "孙教练",
      originalTeacherId: "teacher_004",
      originalLocation: "南区训练场",
      targetScheduleId: null,
      targetCourseId: null,
      targetCourseName: null,
      targetDate: null,
      targetTime: null,
      targetTeacher: null,
      targetTeacherId: null,
      targetLocation: null,
      transferType: "time",
      reason: "天气原因想延期课程",
      remark: "希望尽快安排",
      status: "rejected",
      adminId: "admin",
      adminName: "管理员",
      adminReply: "抱歉，该时段名额已满，建议选择其他时间",
      reviewedAt: "2026-04-04T09:00:00.000Z",
      createdAt: "2026-04-03T11:20:00.000Z",
      updatedAt: "2026-04-04T09:00:00.000Z",
      isRead: true,
      notificationSent: true
    },
    {
      _openid: "test_user_005",
      studentId: "student_005",
      studentName: "刘小军",
      studentPhone: "13800138005",
      originalScheduleId: "schedule_001",
      originalCourseId: "course_001",
      originalCourseName: "无人机基础飞行训练",
      originalDate: "2026-04-10",
      originalTime: "09:00",
      originalTeacher: "李教练",
      originalTeacherId: "teacher_001",
      originalLocation: "东区训练场",
      targetScheduleId: null,
      targetCourseId: null,
      targetCourseName: null,
      targetDate: null,
      targetTime: null,
      targetTeacher: null,
      targetTeacherId: null,
      targetLocation: null,
      transferType: "leave",
      reason: "有重要考试需要复习，想请假一段时间",
      remark: "",
      status: "pending",
      adminId: null,
      adminName: null,
      adminReply: null,
      reviewedAt: null,
      createdAt: "2026-04-06T08:45:00.000Z",
      updatedAt: "2026-04-06T08:45:00.000Z",
      isRead: false,
      notificationSent: false
    }
  ];

  try {
    const results = [];
    for (const item of testData) {
      const result = await db.collection('transfer_requests').add(item);
      results.push(result.id);
    }
    
    return {
      code: 0,
      message: '测试数据插入成功',
      data: {
        inserted: results.length,
        ids: results
      }
    };
  } catch (e) {
    return {
      code: 500,
      message: '插入失败: ' + e.message
    };
  }
}

/**
 * 创建数据库集合
 */
async function handleCreateCollection(collectionName) {
  try {
    // CloudBase NoSQL 数据库会自动创建集合
    // 尝试向集合中添加一条记录，如果集合不存在会自动创建
    const result = await db.collection(collectionName).add({
      _openid: '__init__',
      createdAt: new Date().toISOString(),
      isInit: true
    })
    
    // 删除初始化记录
    if (result.id) {
      await db.collection(collectionName).doc(result.id).remove()
    }
    
    return {
      code: 0,
      message: '集合创建成功',
      data: { collection: collectionName, id: result.id }
    }
  } catch (e) {
    // 如果错误是集合不存在，尝试用其他方式创建
    if (e.code === 'DATABASE_COLLECTION_NOT_EXIST' || e.message.includes('not exist')) {
      try {
        // 使用 database 的 createCollection 方法
        const dbInstance = app.database()
        await dbInstance.createCollection(collectionName)
        return {
          code: 0,
          message: '集合创建成功',
          data: { collection: collectionName }
        }
      } catch (e2) {
        return {
          code: 500,
          message: '创建集合失败: ' + e2.message
        }
      }
    }
    return {
      code: 500,
      message: '创建集合失败: ' + e.message
    }
  }
}

/**
 * 数据修复工具 - 统一课程、排课、报名的关联关系
 * 
 * 问题分析：
 * 1. courses 表: _id = course_001, course_002...
 * 2. course_schedules 表: courseId = course_1_0, course_1_1... (不匹配!)
 * 3. enrollments 表: scheduleId = course_1_0 (对应 course_schedules.courseId)
 * 4. orders 表: courseId = course_1, course_2... (不匹配!)
 */
async function handleFixCourseRelations() {
  console.log('开始修复课程关联数据...');
  
  const results = {
    schedules: null,
    enrollments: null,
    orders: null,
  };
  
  try {
    // 1. 获取所有课程，建立 courseName -> _id 映射
    const coursesResult = await db.collection('courses').get();
    const courseNameMap = {};
    const courseIdMap = {};  // course_1 -> course_001
    
    coursesResult.data.forEach(course => {
      // 以 title 为键
      courseNameMap[course.title] = course._id;
      
      // 提取 course_001 中的数字 001 -> course_001
      const match = course._id.match(/course_(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        // 同时支持 course_1, course_01, course_001 格式
        courseIdMap[`course_${num}`] = course._id;
        courseIdMap[`course_${num.toString().padStart(2, '0')}`] = course._id;
        courseIdMap[`course_${num.toString().padStart(3, '0')}`] = course._id;
      }
    });
    
    // 添加别名映射
    const nameAliases = {
      '多旋翼基础': 'course_001',
      '多旋翼飞行': 'course_001',
      '航拍技巧': 'course_003',
      '航拍技巧进阶': 'course_003',
      '固定翼飞行': 'course_002',
      '固定翼飞行入门': 'course_002',
      '维修保养': 'course_004',
      '无人机维修培训': 'course_004',
      'AOPA无人机驾驶员认证课程': 'course_002',
      'CAAC无人机驾驶员执照培训': 'course_001',
      '无人机航拍技术专业课程': 'course_003',
      '植保无人机操作与维护': 'course_004',
    };
    Object.assign(courseNameMap, nameAliases);
    
    console.log('课程映射表:', JSON.stringify(courseNameMap, null, 2));
    console.log('ID映射表:', JSON.stringify(courseIdMap, null, 2));
    
    // 2. 修复排课表
    console.log('开始修复排课表...');
    const schedulesResult = await db.collection('course_schedules').get();
    let scheduleUpdated = 0;
    let scheduleErrors = [];
    
    for (const schedule of schedulesResult.data) {
      let correctCourseId = null;
      
      // 方式1: 通过 courseName 匹配
      if (schedule.courseName) {
        correctCourseId = courseNameMap[schedule.courseName];
      }
      
      // 方式2: 通过 courseId 数字匹配 (course_1_0 -> course_001)
      if (!correctCourseId && schedule.courseId) {
        const idMatch = schedule.courseId.match(/course_(\d+)/);
        if (idMatch) {
          const num = parseInt(idMatch[1]);
          correctCourseId = `course_${num.toString().padStart(3, '0')}`;
        }
      }
      
      if (correctCourseId) {
        // 更新排课表的 courseId
        try {
          await db.collection('course_schedules').doc(schedule._id).update({
            data: {
              courseId: correctCourseId,
              courseTitle: schedule.courseName,  // 保留原始名称
            }
          });
          scheduleUpdated++;
          console.log(`更新排课 ${schedule._id}: courseId -> ${correctCourseId}`);
        } catch (e) {
          scheduleErrors.push({ id: schedule._id, error: e.message });
        }
      } else {
        scheduleErrors.push({ 
          id: schedule._id, 
          courseId: schedule.courseId, 
          courseName: schedule.courseName,
          error: '无法匹配课程' 
        });
      }
    }
    
    results.schedules = {
      total: schedulesResult.data.length,
      updated: scheduleUpdated,
      errors: scheduleErrors.slice(0, 10)
    };
    console.log('排课表修复完成:', results.schedules);
    
    // 3. 修复报名表
    console.log('开始修复报名表...');
    const enrollmentsResult = await db.collection('enrollments').get();
    let enrollmentUpdated = 0;
    let enrollmentErrors = [];
    
    for (const enrollment of enrollmentsResult.data) {
      let correctCourseId = null;
      
      // 方式1: 通过 scheduleId 找到对应的排课，再获取正确的 courseId
      try {
        const scheduleResult = await db.collection('course_schedules')
          .where(db.command.or(
            { _id: enrollment.scheduleId },
            { courseId: enrollment.scheduleId }
          ))
          .limit(1)
          .get();
        
        if (scheduleResult.data && scheduleResult.data.length > 0) {
          correctCourseId = scheduleResult.data[0].courseId;
        }
      } catch (e) {
        console.log('查询排课失败:', e.message);
      }
      
      // 方式2: 通过 courseName 匹配
      if (!correctCourseId && enrollment.courseName) {
        correctCourseId = courseNameMap[enrollment.courseName];
      }
      
      if (correctCourseId) {
        try {
          await db.collection('enrollments').doc(enrollment._id).update({
            data: {
              courseId: correctCourseId,
            }
          });
          enrollmentUpdated++;
        } catch (e) {
          enrollmentErrors.push({ id: enrollment._id, error: e.message });
        }
      } else {
        enrollmentErrors.push({
          id: enrollment._id,
          scheduleId: enrollment.scheduleId,
          courseName: enrollment.courseName,
          error: '无法匹配课程'
        });
      }
    }
    
    results.enrollments = {
      total: enrollmentsResult.data.length,
      updated: enrollmentUpdated,
      errors: enrollmentErrors.slice(0, 10)
    };
    console.log('报名表修复完成:', results.enrollments);
    
    // 4. 修复订单表（只处理老格式）
    console.log('开始修复订单表...');
    const ordersResult = await db.collection('orders')
      .where({
        courseId: _.exists(true)
      })
      .limit(100)
      .get();
    
    let orderUpdated = 0;
    let orderErrors = [];
    
    for (const order of ordersResult.data) {
      // 跳过新格式订单
      if (order.items && order.items.length > 0) {
        continue;
      }
      
      let correctCourseId = null;
      
      // 方式1: 通过 courseName 匹配
      if (order.courseName) {
        correctCourseId = courseNameMap[order.courseName];
      }
      
      // 方式2: 数字匹配 (course_1 -> course_001)
      if (!correctCourseId && order.courseId) {
        const idMatch = order.courseId.match(/course_(\d+)$/);
        if (idMatch) {
          const num = parseInt(idMatch[1]);
          correctCourseId = `course_${num.toString().padStart(3, '0')}`;
        }
      }
      
      if (correctCourseId) {
        try {
          await db.collection('orders').doc(order._id).update({
            data: {
              courseId: correctCourseId,
            }
          });
          orderUpdated++;
          console.log(`更新订单 ${order._id}: courseId -> ${correctCourseId}`);
        } catch (e) {
          orderErrors.push({ id: order._id, error: e.message });
        }
      } else {
        orderErrors.push({
          id: order._id,
          courseId: order.courseId,
          courseName: order.courseName,
          error: '无法匹配课程'
        });
      }
    }
    
    results.orders = {
      total: ordersResult.data.length,
      updated: orderUpdated,
      errors: orderErrors.slice(0, 10)
    };
    console.log('订单表修复完成:', results.orders);
    
    return {
      code: 0,
      message: '数据修复完成',
      results,
      summary: {
        schedulesFixed: scheduleUpdated,
        enrollmentsFixed: enrollmentUpdated,
        ordersFixed: orderUpdated,
      }
    };
    
  } catch (error) {
    console.error('数据修复失败:', error);
    return {
      code: 500,
      message: '数据修复失败: ' + error.message,
      results
    };
  }
}

/**
 * 学员身份统一迁移
 * 将 class_members, enrollments, orders 中的学员ID统一关联到 members 表
 */
async function handleMigrateMemberRelations() {
  console.log('开始学员身份统一迁移...');
  
  const results = {
    members: null,
    classMembers: { total: 0, updated: 0, failed: 0, details: [] },
    enrollments: { total: 0, updated: 0, failed: 0, details: [] },
    orders: { total: 0, updated: 0, failed: 0, details: [] },
  };
  
  try {
    // 步骤1: 获取所有 members，建立 phone → memberId 映射
    console.log('步骤1: 建立手机号映射表...');
    const membersResult = await db.collection('members').limit(1000).get();
    const members = membersResult.data || [];
    
    const phoneToMemberId = new Map();
    const namePhoneToMemberId = new Map(); // name_last4phone → memberId
    
    members.forEach(m => {
      if (m.phone) {
        phoneToMemberId.set(m.phone, m._id);
        if (m.name) {
          // 创建 name + phone后4位 的映射
          namePhoneToMemberId.set(`${m.name}_${m.phone.slice(-4)}`, m._id);
        }
      }
    });
    
    results.members = {
      total: members.length,
      phoneMapSize: phoneToMemberId.size,
    };
    console.log(`读取 ${members.length} 条学员记录，建立 ${phoneToMemberId.size} 个手机号映射`);
    
    // 步骤2: 迁移 class_members 表
    console.log('步骤2: 迁移 class_members 表...');
    const classMembersResult = await db.collection('class_members').limit(1000).get();
    const classMembers = classMembersResult.data || [];
    results.classMembers.total = classMembers.length;
    
    for (const record of classMembers) {
      // 跳过已有 memberId 的记录
      if (record.memberId) {
        results.classMembers.updated++;
        continue;
      }
      
      let memberId = null;
      let matchType = '';
      
      // 匹配方式1: 直接用 phone
      if (record.phone && phoneToMemberId.has(record.phone)) {
        memberId = phoneToMemberId.get(record.phone);
        matchType = 'phone';
      }
      // 匹配方式2: phone_17628157097 格式
      else if (record.studentId && record.studentId.startsWith('phone_')) {
        const phone = record.studentId.replace('phone_', '');
        if (phoneToMemberId.has(phone)) {
          memberId = phoneToMemberId.get(phone);
          matchType = 'studentId(phone_)';
        }
      }
      // 匹配方式3: 直接用手机号作为 studentId
      else if (record.studentId && /^1[3-9]\d{9}$/.test(record.studentId)) {
        if (phoneToMemberId.has(record.studentId)) {
          memberId = phoneToMemberId.get(record.studentId);
          matchType = 'studentId(phone)';
        }
      }
      // 匹配方式4: 通过姓名+电话后4位
      else if (record.studentName && record.studentId) {
        const phoneLast4 = record.studentId.replace(/[^0-9]/g, '').slice(-4);
        if (phoneLast4 && phoneLast4.length === 4) {
          // 尝试用姓名+电话后4位匹配
          const key = `${record.studentName}_${phoneLast4}`;
          if (namePhoneToMemberId.has(key)) {
            memberId = namePhoneToMemberId.get(key);
            matchType = 'name_phoneLast4';
          }
        }
      }
      
      if (memberId) {
        try {
          await db.collection('class_members').doc(record._id).update({
            memberId,
            _migrated: true,
            _migratedAt: new Date().toISOString(),
          });
          results.classMembers.updated++;
          results.classMembers.details.push({
            id: record._id,
            studentId: record.studentId,
            studentName: record.studentName,
            memberId,
            matchType,
          });
        } catch (e) {
          results.classMembers.failed++;
          console.log(`class_members 更新失败: ${record._id} - ${e.message}`);
        }
      } else {
        results.classMembers.failed++;
        results.classMembers.details.push({
          id: record._id,
          studentId: record.studentId,
          studentName: record.studentName,
          phone: record.phone,
          status: 'no_match',
        });
      }
    }
    console.log(`class_members: 更新 ${results.classMembers.updated}, 失败 ${results.classMembers.failed}`);
    
    // 步骤3: 迁移 enrollments 表
    console.log('步骤3: 迁移 enrollments 表...');
    const enrollmentsResult = await db.collection('enrollments').limit(1000).get();
    const enrollments = enrollmentsResult.data || [];
    results.enrollments.total = enrollments.length;
    
    for (const record of enrollments) {
      if (record.memberId) {
        results.enrollments.updated++;
        continue;
      }
      
      let memberId = null;
      let matchType = '';
      
      // 匹配方式1: 直接用 userId 作为 phone
      if (record.userId && phoneToMemberId.has(record.userId)) {
        memberId = phoneToMemberId.get(record.userId);
        matchType = 'userId(phone)';
      }
      // 匹配方式2: userId = student001 → 尝试匹配
      else if (record.userId && record.userId.match(/^student\d+$/)) {
        // student001 格式，先尝试作为 phone
        if (phoneToMemberId.has(record.userId)) {
          memberId = phoneToMemberId.get(record.userId);
          matchType = 'userId(studentXXX)';
        }
      }
      // 匹配方式3: 通过 userName + userId 后4位
      else if (record.userName && record.userId) {
        const phoneLast4 = record.userId.replace(/[^0-9]/g, '').slice(-4);
        if (phoneLast4 && phoneLast4.length === 4) {
          const key = `${record.userName}_${phoneLast4}`;
          if (namePhoneToMemberId.has(key)) {
            memberId = namePhoneToMemberId.get(key);
            matchType = 'userName_phoneLast4';
          }
        }
      }
      
      if (memberId) {
        try {
          await db.collection('enrollments').doc(record._id).update({
            memberId,
            _migrated: true,
            _migratedAt: new Date().toISOString(),
          });
          results.enrollments.updated++;
          results.enrollments.details.push({
            id: record._id,
            userId: record.userId,
            userName: record.userName,
            memberId,
            matchType,
          });
        } catch (e) {
          results.enrollments.failed++;
        }
      } else {
        results.enrollments.failed++;
        if (results.enrollments.failed <= 10) {
          results.enrollments.details.push({
            id: record._id,
            userId: record.userId,
            userName: record.userName,
            status: 'no_match',
          });
        }
      }
    }
    console.log(`enrollments: 更新 ${results.enrollments.updated}, 失败 ${results.enrollments.failed}`);
    
    // 步骤4: 迁移 orders 表
    console.log('步骤4: 迁移 orders 表...');
    const ordersResult = await db.collection('orders').limit(1000).get();
    const orders = ordersResult.data || [];
    results.orders.total = orders.length;
    
    for (const record of orders) {
      if (record.memberId) {
        results.orders.updated++;
        continue;
      }
      
      let memberId = null;
      let matchType = '';
      
      // 匹配方式1: 直接用 userId 作为 phone
      if (record.userId && phoneToMemberId.has(record.userId)) {
        memberId = phoneToMemberId.get(record.userId);
        matchType = 'userId(phone)';
      }
      // 匹配方式2: userId = student001 格式
      else if (record.userId && record.userId.match(/^student\d+$/)) {
        if (phoneToMemberId.has(record.userId)) {
          memberId = phoneToMemberId.get(record.userId);
          matchType = 'userId(studentXXX)';
        }
      }
      // 匹配方式3: 通过 userName + userId 后4位
      else if (record.userName && record.userId) {
        const phoneLast4 = record.userId.replace(/[^0-9]/g, '').slice(-4);
        if (phoneLast4 && phoneLast4.length === 4) {
          const key = `${record.userName}_${phoneLast4}`;
          if (namePhoneToMemberId.has(key)) {
            memberId = namePhoneToMemberId.get(key);
            matchType = 'userName_phoneLast4';
          }
        }
      }
      
      if (memberId) {
        try {
          await db.collection('orders').doc(record._id).update({
            memberId,
            _migrated: true,
            _migratedAt: new Date().toISOString(),
          });
          results.orders.updated++;
          results.orders.details.push({
            id: record._id,
            userId: record.userId,
            userName: record.userName,
            memberId,
            matchType,
          });
        } catch (e) {
          results.orders.failed++;
        }
      } else {
        results.orders.failed++;
        if (results.orders.failed <= 10) {
          results.orders.details.push({
            id: record._id,
            userId: record.userId,
            userName: record.userName,
            status: 'no_match',
          });
        }
      }
    }
    console.log(`orders: 更新 ${results.orders.updated}, 失败 ${results.orders.failed}`);
    
    // 返回汇总
    return {
      code: 0,
      message: '学员身份统一迁移完成',
      results,
      summary: {
        membersTotal: results.members.total,
        classMembersMigrated: results.classMembers.updated,
        enrollmentsMigrated: results.enrollments.updated,
        ordersMigrated: results.orders.updated,
      },
    };
    
  } catch (error) {
    console.error('迁移失败:', error);
    return {
      code: 500,
      message: '迁移失败: ' + error.message,
      results,
    };
  }
}

/**
 * 根据查询条件批量删除
 */
async function handleBatchDeleteByQuery(collection, query) {
  if (!collection) {
    return { code: 400, message: '缺少 collection 参数' };
  }
  
  try {
    // 先查询有多少条记录
    const countResult = await db.collection(collection).where(query).count();
    const total = countResult.total || 0;
    
    if (total === 0) {
      return { code: 0, message: '没有需要删除的记录', data: { deleted: 0 } };
    }
    
    // 执行删除
    const deleteResult = await db.collection(collection).where(query).remove();
    
    return {
      code: 0,
      message: `成功删除 ${deleteResult.deleted || 0} 条记录`,
      data: { deleted: deleteResult.deleted || 0, total }
    };
  } catch (error) {
    console.error('批量删除失败:', error);
    return {
      code: 500,
      message: '批量删除失败: ' + error.message
    };
  }
}

/**
 * 从遗留数据创建 members 记录
 * 用于补充真实学员数据
 */
async function handleCreateMemberFromLegacy(data) {
  const { studentId, name, phone, idCard, source, level } = data || {};
  
  if (!phone) {
    return { code: 400, message: '手机号不能为空' };
  }
  
  try {
    // 检查是否已存在
    const existing = await db.collection('members')
      .where({ phone })
      .limit(1)
      .get();
    
    if (existing.data && existing.data.length > 0) {
      return {
        code: 0,
        message: '该手机号已有学员记录',
        data: existing.data[0],
        action: 'existing'
      };
    }
    
    // 创建新记录
    const now = new Date().toISOString();
    const memberData = {
      _openid: '{admin}',
      name: name || '',
      phone,
      idCard: idCard || '',
      level: level || 'beginner',
      status: 'active',
      source: source || 'offline_enroll',
      type: 'student',
      createdAt: now,
      updatedAt: now,
    };
    
    // 添加旧系统标识
    if (studentId) {
      memberData.legacyStudentId = studentId;
    }
    
    const result = await db.collection('members').add(memberData);
    
    return {
      code: 0,
      message: '创建学员记录成功',
      data: { _id: result.id, ...memberData },
      action: 'created'
    };
  } catch (error) {
    console.error('创建学员记录失败:', error);
    return {
      code: 500,
      message: '创建失败: ' + error.message
    };
  }
}

/**
 * 获取用户订单（云函数版本）
 * 支持通过 phone、openid、userId 任一字段查询
 */
async function handleGetUserOrders(event) {
  const { phone, openid, userId } = event

  console.log('[handleGetUserOrders] 查询参数:', { phone, openid, userId })

  if (!phone && !openid && !userId) {
    return {
      code: 400,
      message: '缺少查询参数：phone、openid 或 userId'
    }
  }

  try {
    // 构建查询条件
    const queryConditions = []
    if (phone) queryConditions.push({ phone })
    if (openid) queryConditions.push({ _openid: openid })
    if (userId) queryConditions.push({ userId })

    // 如果有多个条件，使用 $or
    let dbQuery
    if (queryConditions.length === 1) {
      dbQuery = db.collection('orders').where(queryConditions[0])
    } else {
      dbQuery = db.collection('orders').where(_.or(queryConditions))
    }

    const result = await dbQuery.orderBy('createdAt', 'desc').get()

    console.log('[handleGetUserOrders] 查询结果:', result.data.length, '条')

    return {
      code: 0,
      data: result.data,
      total: result.data.length,
      message: '查询成功'
    }
  } catch (error) {
    console.error('[handleGetUserOrders] 查询失败:', error)
    return {
      code: 500,
      message: '查询失败: ' + error.message
    }
  }
}
