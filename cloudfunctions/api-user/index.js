/**
 * api-user 云函数 - Feature: User
 *
 * 功能：
 * - 用户管理（注册、登录、获取信息、更新资料）
 * - 会员管理（等级查询、升级、权益）
 * - 设置管理（用户设置、偏好设置）
 * - 统计管理（用户统计、学习统计）
 *
 * Actions:
 * 用户: register, login, getProfile, updateProfile, getUserById
 * 会员: getMemberLevel, upgradeMember, getMemberBenefits
 * 设置: getSettings, updateSettings, getPreferences, updatePreferences
 * 统计: getStats, getLearningStats, getDailyStats, updateDailyStats
 */

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command
const $ = db.command.aggregate

// ========== 集合名称 ==========

const COLLECTIONS = {
  USERS: 'users',
  USER_SETTINGS: 'user_settings',
  DAILY_STATS: 'daily_stats',
  MEMBERS: 'members',
  LEARNING_PATHS: 'learning_paths',
  CERTIFICATES: 'certificates',
}

// ========== 工具函数 ==========

/**
 * 响应头（CORS 由 CloudBase HTTP 网关自动处理，避免重复导致浏览器报错）
 */
function getHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8'
  }
}

/**
 * 统一成功响应
 */
function success(data, message = 'success') {
  return { success: true, data, message }
}

/**
 * 统一错误响应
 */
function fail(message, error = null) {
  if (error) console.error(`[Error] ${message}:`, error)
  return { success: false, error: message }
}

/**
 * 生成用户 ID
 */
function generateUserId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `U${timestamp}${random}`.toUpperCase()
}

/**
 * 密码加密（简单 hash）
 */
function hashPassword(password) {
  // 实际生产中应使用 bcrypt 等专业加密
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  // HTTP 触发器：解析 body
  let action, data = {}, openid
  if (event.body) {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    action = body.action
    data = body.data || body || {}
    openid = body.openid || data.openid
  } else {
    action = event.action
    data = event.data || {}
    openid = event.openid
  }

  const headers = event.headers || {}
  
  try {
    let result

    // 用户相关
    if (action === 'register') {
      result = await handleRegister(data)
    } else if (action === 'login') {
      result = await handleLogin(data)
    } else if (action === 'getProfile') {
      result = await handleGetProfile(openid || data.openid)
    } else if (action === 'updateProfile') {
      result = await handleUpdateProfile(openid || data.openid, data)
    } else if (action === 'getUserById') {
      result = await handleGetUserById(data.userId)

    // 会员相关
    } else if (action === 'getMemberLevel') {
      result = await handleGetMemberLevel(openid || data.openid)
    } else if (action === 'upgradeMember') {
      result = await handleUpgradeMember(openid || data.openid, data)
    } else if (action === 'getMemberBenefits') {
      result = await handleGetMemberBenefits(data.level)
    } else if (action === 'getList') {
      result = await handleGetUserList(data)
    } else if (action === 'getMemberList') {
      result = await handleGetMemberList(data)

    // 设置相关
    } else if (action === 'getSettings') {
      result = await handleGetSettings(openid || data.openid)
    } else if (action === 'updateSettings') {
      result = await handleUpdateSettings(openid || data.openid, data)
    } else if (action === 'getPreferences') {
      result = await handleGetPreferences(openid || data.openid)
    } else if (action === 'updatePreferences') {
      result = await handleUpdatePreferences(openid || data.openid, data)

    // 统计相关
    } else if (action === 'getStats') {
      result = await handleGetStats(openid || data.openid, data.phone)
    } else if (action === 'getLearningStats') {
      result = await handleGetLearningStats(openid || data.openid, data.phone)
    } else if (action === 'getDailyStats') {
      result = await handleGetDailyStats(openid || data.openid, data.date)
    } else if (action === 'updateDailyStats') {
      result = await handleUpdateDailyStats(openid || data.openid, data)
    } else if (action === 'incrementStat') {
      result = await handleIncrementStat(openid || data.openid, data.phone, data.field, data.value)
    } else {
      result = fail(`Unknown action: ${action}`)
    }

    return {
      ...result,
      headers: getHeaders()
    }
  } catch (error) {
    console.error(`[api-user] Action ${action} error:`, error)
    return {
      ...fail(error.message || 'Internal error', error),
      headers: getHeaders()
    }
  }
}

// ========== 用户操作 ==========

/**
 * 注册用户
 */
async function handleRegister(data) {
  const { phone, password, nickname, avatar } = data

  if (!phone || !password) {
    return fail('手机号和密码不能为空')
  }

  // 检查手机号是否已注册
  const existing = await db.collection(COLLECTIONS.USERS)
    .where({ phone })
    .count()

  if (existing.total > 0) {
    return fail('该手机号已注册')
  }

  const userId = generateUserId()
  const now = new Date()

  // 创建用户
  await db.collection(COLLECTIONS.USERS).add({
      userId,
      phone,
      password: hashPassword(password),
      nickname: nickname || `用户${phone.slice(-4)}`,
      avatar: avatar || '',
      level: 0,
      memberLevel: 'free',
      memberExpireTime: null,
      points: 0,
      totalLearningTime: 0,
      totalCourses: 0,
      totalExams: 0,
      createdAt: now,
      updatedAt: now
    })

  // 创建默认设置
  await db.collection(COLLECTIONS.USER_SETTINGS).add({
      userId,
      openid: '',
      notifications: {
        push: true,
        email: false,
        sms: false
      },
      privacy: {
        showProfile: true,
        showProgress: true
      },
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      createdAt: now,
      updatedAt: now
    })

  return success({ userId, message: '注册成功' })
}

/**
 * 用户登录
 */
async function handleLogin(data) {
  const { phone, password } = data

  if (!phone || !password) {
    return fail('手机号和密码不能为空')
  }

  const res = await db.collection(COLLECTIONS.USERS)
    .where({ phone, password: hashPassword(password) })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return fail('手机号或密码错误')
  }

  const user = res.data[0]
  delete user.password

  // 更新登录信息
  await db.collection(COLLECTIONS.USERS).doc(user._id).update({
      lastLoginAt: new Date(),
      updatedAt: new Date()
    })

  return success({ user }, '登录成功')
}

/**
 * 获取个人资料
 */
async function handleGetProfile(openid) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const res = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return fail('用户不存在')
  }

  const user = res.data[0]
  delete user.password

  return success({ user })
}

/**
 * 更新个人资料
 */
async function handleUpdateProfile(openid, data) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const { nickname, avatar, gender, birthday, bio } = data

  const updateData = { updatedAt: new Date() }
  if (nickname !== undefined) updateData.nickname = nickname
  if (avatar !== undefined) updateData.avatar = avatar
  if (gender !== undefined) updateData.gender = gender
  if (birthday !== undefined) updateData.birthday = birthday
  if (bio !== undefined) updateData.bio = bio

  await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .update(updateData)

  return success({ message: '资料更新成功' })
}

/**
 * 通过用户ID获取用户信息
 */
async function handleGetUserById(userId) {
  if (!userId) {
    return fail('缺少 userId')
  }

  const res = await db.collection(COLLECTIONS.USERS)
    .where({ userId })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return fail('用户不存在')
  }

  const user = res.data[0]
  delete user.password

  return success({ user })
}

// ========== 会员操作 ==========

/**
 * 获取会员等级
 */
async function handleGetMemberLevel(openid) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const res = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .field({ memberLevel: true, memberExpireTime: true, level: true })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return fail('用户不存在')
  }

  const user = res.data[0]
  const now = new Date()

  // 检查会员是否过期
  let memberStatus = 'active'
  if (user.memberLevel !== 'free' && user.memberExpireTime) {
    if (new Date(user.memberExpireTime) < now) {
      memberStatus = 'expired'
    }
  }

  return success({
    level: user.memberLevel,
    status: memberStatus,
    expireTime: user.memberExpireTime
  })
}

/**
 * 升级会员
 */
async function handleUpgradeMember(openid, data) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const { level, months = 1 } = data

  const levels = ['free', 'basic', 'silver', 'gold', 'platinum']
  if (!levels.includes(level)) {
    return fail('无效的会员等级')
  }

  const expireTime = new Date()
  expireTime.setMonth(expireTime.getMonth() + months)

  await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .update({
        memberLevel: level,
        memberExpireTime: expireTime,
        updatedAt: new Date()
      })

  return success({ level, expireTime }, '升级成功')
}

/**
 * 获取会员权益
 */
async function handleGetMemberBenefits(level) {
  const benefits = {
    free: {
      level: 'free',
      name: '免费会员',
      color: '#999',
      features: [
        { name: '基础课程', limit: 5 },
        { name: '观看次数', limit: 10 },
        { name: '证书', available: false },
        { name: '优先客服', available: false }
      ]
    },
    basic: {
      level: 'basic',
      name: '基础会员',
      color: '#1890ff',
      features: [
        { name: '基础课程', limit: 20 },
        { name: '观看次数', limit: 50 },
        { name: '证书', available: true },
        { name: '优先客服', available: false }
      ]
    },
    silver: {
      level: 'silver',
      name: '银牌会员',
      color: '#c0c0c0',
      features: [
        { name: '全部课程', limit: -1 },
        { name: '观看次数', limit: -1 },
        { name: '证书', available: true },
        { name: '优先客服', available: false }
      ]
    },
    gold: {
      level: 'gold',
      name: '金牌会员',
      color: '#ffd700',
      features: [
        { name: '全部课程', limit: -1 },
        { name: '观看次数', limit: -1 },
        { name: '证书', available: true },
        { name: '优先客服', available: true }
      ]
    },
    platinum: {
      level: 'platinum',
      name: '铂金会员',
      color: '#e5e4e2',
      features: [
        { name: '全部课程', limit: -1 },
        { name: '无限观看', limit: -1 },
        { name: '证书', available: true },
        { name: '专属客服', available: true },
        { name: '线下活动', available: true }
      ]
    }
  }

  return success(benefits[level] || benefits.free)
}

// ========== 管理后台列表 ==========

/**
 * 用户列表（users 集合）
 */
async function handleGetUserList(params = {}) {
  const { page = 1, pageSize = 20, keyword = '' } = params
  const where = {}
  if (keyword) {
    where.name = db.RegExp({ regexp: keyword, options: 'i' })
  }
  const countRes = await db.collection(COLLECTIONS.USERS).where(where).count()
  const res = await db.collection(COLLECTIONS.USERS)
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  return success({
    list: res.data || [],
    total: countRes.total || 0,
    page,
    pageSize
  })
}

/**
 * 会员列表（members 集合）
 */
async function handleGetMemberList(params = {}) {
  const { page = 1, pageSize = 20, keyword = '' } = params
  const where = {}
  if (keyword) {
    where.name = db.RegExp({ regexp: keyword, options: 'i' })
  }
  const countRes = await db.collection(COLLECTIONS.MEMBERS).where(where).count()
  const res = await db.collection(COLLECTIONS.MEMBERS)
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  return success({
    list: res.data || [],
    total: countRes.total || 0,
    page,
    pageSize
  })
}

// ========== 设置操作 ==========

/**
 * 获取用户设置
 */
async function handleGetSettings(openid) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const res = await db.collection(COLLECTIONS.USER_SETTINGS)
    .where({ openid })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    // 返回默认设置
    return success({
      notifications: { push: true, email: false, sms: false },
      privacy: { showProfile: true, showProgress: true },
      language: 'zh-CN',
      timezone: 'Asia/Shanghai'
    })
  }

  return success(res.data[0])
}

/**
 * 更新用户设置
 */
async function handleUpdateSettings(openid, data) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const { notifications, privacy, language, timezone } = data

  const updateData = { updatedAt: new Date() }
  if (notifications) updateData.notifications = notifications
  if (privacy) updateData.privacy = privacy
  if (language) updateData.language = language
  if (timezone) updateData.timezone = timezone

  const existing = await db.collection(COLLECTIONS.USER_SETTINGS)
    .where({ openid })
    .count()

  if (existing.total === 0) {
    // 创建设置
    await db.collection(COLLECTIONS.USER_SETTINGS).add({
        openid,
        notifications: notifications || { push: true, email: false, sms: false },
        privacy: privacy || { showProfile: true, showProgress: true },
        language: language || 'zh-CN',
        timezone: timezone || 'Asia/Shanghai',
        createdAt: new Date(),
        updatedAt: new Date()
      })
  } else {
    // 更新设置
    await db.collection(COLLECTIONS.USER_SETTINGS)
      .where({ openid })
      .update(updateData)
  }

  return success({ message: '设置更新成功' })
}

/**
 * 获取偏好设置
 */
async function handleGetPreferences(openid) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const res = await db.collection(COLLECTIONS.USER_SETTINGS)
    .where({ openid })
    .field({
      favoriteCategories: true,
      favoriteInstructors: true,
      difficultyPreference: true,
      learningGoals: true
    })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return success({
      favoriteCategories: [],
      favoriteInstructors: [],
      difficultyPreference: 'all',
      learningGoals: []
    })
  }

  return success(res.data[0])
}

/**
 * 更新偏好设置
 */
async function handleUpdatePreferences(openid, data) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const { favoriteCategories, favoriteInstructors, difficultyPreference, learningGoals } = data

  const updateData = { updatedAt: new Date() }
  if (favoriteCategories) updateData.favoriteCategories = favoriteCategories
  if (favoriteInstructors) updateData.favoriteInstructors = favoriteInstructors
  if (difficultyPreference) updateData.difficultyPreference = difficultyPreference
  if (learningGoals) updateData.learningGoals = learningGoals

  const existing = await db.collection(COLLECTIONS.USER_SETTINGS)
    .where({ openid })
    .count()

  if (existing.total === 0) {
    await db.collection(COLLECTIONS.USER_SETTINGS).add({
        openid,
        ...updateData,
        notifications: { push: true, email: false, sms: false },
        privacy: { showProfile: true, showProgress: true },
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        createdAt: new Date()
      })
  } else {
    await db.collection(COLLECTIONS.USER_SETTINGS)
      .where({ openid })
      .update(updateData)
  }

  return success({ message: '偏好设置更新成功' })
}

// ========== 统计操作 ==========

/**
 * 获取用户统计
 * 注意：用户主表为 members（微信/手机号登录都写入 members），
 * 课程权限(course_permissions)按 phone 存储，证书(certificates)按 _openid 存储。
 * 因此优先用 phone 统计，openid 仅作兜底。
 */
async function handleGetStats(openid, phone) {
  if (!openid && !phone) {
    return fail('缺少用户标识')
  }

  // 解析手机号：优先传入的 phone，否则用 openid 在 members 反查
  let targetPhone = phone || ''
  if (!targetPhone && openid) {
    try {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ openid }).limit(1).get()
      if (mRes.data && mRes.data.length > 0) {
        targetPhone = mRes.data[0].phone || ''
      }
    } catch (e) {
      console.warn('[api-user] 反查手机号失败:', e.message)
    }
  }

  // 课程权限按 phone 存储；证书按 _openid 存储（兼容 openid / phone）
  const permWhere = targetPhone ? { phone: targetPhone } : (openid ? { openid } : {})
  const certWhere = targetPhone
    ? { $or: [{ phone: targetPhone }, { _openid: openid }, { openid }] }
    : (openid ? { $or: [{ _openid: openid }, { openid }] } : {})

  try {
    // 1. 获取用户基本信息（members 优先 phone）
    let member = null
    if (targetPhone) {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ phone: targetPhone }).limit(1).get()
      member = mRes.data && mRes.data.length > 0 ? mRes.data[0] : null
    }
    if (!member && openid) {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ openid }).limit(1).get()
      member = mRes.data && mRes.data.length > 0 ? mRes.data[0] : null
    }

    // 2. 在学课程数（course_permissions 按 phone）
    let courseCount = 0
    try {
      const courseRes = await db.collection('course_permissions').where(permWhere).count()
      courseCount = courseRes.total || 0
    } catch (e) {
      console.warn('[api-user] 统计课程数失败:', e.message)
    }

    // 3. 在学培训班数（class_members + enrollments + orders(培训班) 合并去重 classId）
    const classIds = new Set()
    try {
      const [cmRes, enrRes, ordRes] = await Promise.all([
        db.collection('class_members').where({ phone: targetPhone }).get(),
        db.collection('enrollments').where({ phone: targetPhone }).get(),
        db.collection('orders').where({
          phone: targetPhone,
          orderType: 'class',
          status: _.in(['paid', 'completed', 'paid_offline'])
        }).get()
      ])
      for (const d of (cmRes.data || [])) if (d.classId) classIds.add(d.classId)
      for (const d of (enrRes.data || [])) if (d.classId) classIds.add(d.classId)
      for (const d of (ordRes.data || [])) if (d.classId) classIds.add(d.classId)
    } catch (e) {
      console.warn('[api-user] 统计培训班数失败:', e.message)
    }
    const classCount = classIds.size

    // 4. 学习时长 = 已完成课时的视频时长之和（秒），不随重复/快进观看变化
    let learningSeconds = 0
    try {
      const progRes = await db.collection('user_progress').where({ phone: targetPhone, completed: true }).get()
      const lessonIds = [...new Set((progRes.data || []).map((p) => p.lessonId).filter(Boolean))]
      if (lessonIds.length > 0) {
        const lessonRes = await db.collection('lessons').where({ _id: { $in: lessonIds } }).get()
        learningSeconds = (lessonRes.data || []).reduce((sum, l) => sum + (Number(l.duration) || 0), 0)
      }
    } catch (e) {
      console.warn('[api-user] 统计学习时长失败:', e.message)
    }
    const totalLearningTime = Math.round(learningSeconds / 60)
    const learningHours = Math.round((learningSeconds / 3600) * 10) / 10

    // 5. 统计证书数量（certificates 按 _openid）
    let certificateCount = 0
    try {
      const certRes = await db.collection(COLLECTIONS.CERTIFICATES).where(certWhere).count()
      certificateCount = certRes.total || 0
    } catch (e) {
      console.warn('[api-user] 统计证书数失败:', e.message)
    }

    return success({
      courseCount,
      classCount,
      learningHours,
      certificateCount,
      totalLearningTime,
      totalExams: member?.stats?.examAttempts || member?.totalExams || 0,
      level: member?.level || 1,
      points: member?.points || 0,
      memberLevel: member?.memberLevel || 'free'
    })
  } catch (error) {
    console.error('[api-user] getStats 失败:', error)
    return fail('获取统计失败: ' + error.message)
  }
}

/**
 * 获取学习统计
 * 同样基于 members + phone 统计（与 handleGetStats 一致）
 */
async function handleGetLearningStats(openid, phone) {
  if (!openid && !phone) {
    return fail('缺少用户标识')
  }

  let targetPhone = phone || ''
  if (!targetPhone && openid) {
    try {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ openid }).limit(1).get()
      if (mRes.data && mRes.data.length > 0) {
        targetPhone = mRes.data[0].phone || ''
      }
    } catch (e) {
      console.warn('[api-user] 反查手机号失败:', e.message)
    }
  }

  const permWhere = targetPhone ? { phone: targetPhone } : (openid ? { openid } : {})
  const certWhere = targetPhone
    ? { $or: [{ phone: targetPhone }, { _openid: openid }, { openid }] }
    : (openid ? { $or: [{ _openid: openid }, { openid }] } : {})

  try {
    let member = null
    if (targetPhone) {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ phone: targetPhone }).limit(1).get()
      member = mRes.data && mRes.data.length > 0 ? mRes.data[0] : null
    }
    if (!member && openid) {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ openid }).limit(1).get()
      member = mRes.data && mRes.data.length > 0 ? mRes.data[0] : null
    }

    const totalHours = member?.stats?.totalHours || 0
    const totalMinutes = member?.totalLearningTime || Math.round(totalHours * 60)

    const courseRes = await db.collection('course_permissions').where(permWhere).count()
    const certRes = await db.collection(COLLECTIONS.CERTIFICATES).where(certWhere).count()
    const pathRes = await db.collection(COLLECTIONS.LEARNING_PATHS)
      .where(targetPhone ? { phone: targetPhone } : { openid })
      .get()

    return success({
      courseCount: courseRes.total || 0,
      learningHours: Math.round((totalMinutes / 60) * 10) / 10,
      certificateCount: certRes.total || 0,
      learningPaths: pathRes.data.length,
      totalLearningTime: totalMinutes,
      weekLearningTime: 0,
      avgDailyTime: 0
    })
  } catch (error) {
    console.error('[api-user] getLearningStats 失败:', error)
    return fail('获取学习统计失败: ' + error.message)
  }
}

/**
 * 获取每日统计
 */
async function handleGetDailyStats(openid, date) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const targetDate = date || new Date().toISOString().split('T')[0]

  const res = await db.collection(COLLECTIONS.DAILY_STATS)
    .where({ openid, date: targetDate })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return success({
      date: targetDate,
      learningTime: 0,
      coursesCompleted: 0,
      examsTaken: 0,
      loginCount: 0
    })
  }

  return success(res.data[0])
}

/**
 * 更新每日统计
 */
async function handleUpdateDailyStats(openid, data) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const { date, learningTime = 0, coursesCompleted = 0, examsTaken = 0 } = data
  const targetDate = date || new Date().toISOString().split('T')[0]

  const existing = await db.collection(COLLECTIONS.DAILY_STATS)
    .where({ openid, date: targetDate })
    .count()

  if (existing.total === 0) {
    // 创建统计
    await db.collection(COLLECTIONS.DAILY_STATS).add({
        openid,
        date: targetDate,
        learningTime,
        coursesCompleted,
        examsTaken,
        loginCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
  } else {
    // 更新统计
    const updateData = { updatedAt: new Date() }
    if (learningTime) updateData.learningTime = _.inc(learningTime)
    if (coursesCompleted) updateData.coursesCompleted = _.inc(coursesCompleted)
    if (examsTaken) updateData.examsTaken = _.inc(examsTaken)

    await db.collection(COLLECTIONS.DAILY_STATS)
      .where({ openid, date: targetDate })
      .update(updateData)
  }

  return success({ message: '统计更新成功' })
}

/**
 * 增量更新统计字段
 * 基于 members 集合，phone 优先；支持传入增量 value（如学习时长分钟数）
 */
async function handleIncrementStat(openid, phone, field, value) {
  if (!openid && !phone) {
    return fail('缺少用户标识')
  }
  const numValue = Number(value) || 0
  if (numValue === 0) {
    return success({ message: '无变化' })
  }

  const allowedFields = [
    'totalLearningTime',        // 学习总时长（分钟）
    'stats.totalHours',         // 学习总时长（小时）
    'stats.completedCourses',
    'stats.examAttempts',
    'totalExams',
    'totalCourses',
    'points'
  ]
  if (!allowedFields.includes(field)) {
    return fail('无效的统计字段: ' + field)
  }

  // phone 优先定位 members，openid 兜底
  let targetPhone = phone || ''
  if (!targetPhone && openid) {
    try {
      const mRes = await db.collection(COLLECTIONS.MEMBERS).where({ openid }).limit(1).get()
      if (mRes.data && mRes.data.length > 0) {
        targetPhone = mRes.data[0].phone || ''
      }
    } catch (e) {
      console.warn('[api-user] 反查手机号失败:', e.message)
    }
  }

  try {
    const where = targetPhone ? { phone: targetPhone } : { openid }
    await db.collection(COLLECTIONS.MEMBERS)
      .where(where)
      .update({
        [field]: _.inc(numValue),
        updatedAt: new Date()
      })
    return success({ message: '统计更新成功' })
  } catch (error) {
    console.error('[api-user] incrementStat 失败:', error)
    return fail('更新统计失败: ' + error.message)
  }
}
