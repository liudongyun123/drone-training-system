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
 * CORS 头
 */
function getCorsHeaders(origin = '') {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://rcwljy-5ghmq2ex26764978.tcloudbaseapp.com'
  ]
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  const { action, data = {}, openid } = event
  const headers = event.headers || {}
  const origin = headers.origin || ''

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
      result = await handleGetStats(openid || data.openid)
    } else if (action === 'getLearningStats') {
      result = await handleGetLearningStats(openid || data.openid)
    } else if (action === 'getDailyStats') {
      result = await handleGetDailyStats(openid || data.openid, data.date)
    } else if (action === 'updateDailyStats') {
      result = await handleUpdateDailyStats(openid || data.openid, data)
    } else if (action === 'incrementStat') {
      result = await handleIncrementStat(openid || data.openid, data.field)
    } else {
      result = fail(`Unknown action: ${action}`)
    }

    return {
      ...result,
      headers: getCorsHeaders(origin)
    }
  } catch (error) {
    console.error(`[api-user] Action ${action} error:`, error)
    return {
      ...fail(error.message || 'Internal error', error),
      headers: getCorsHeaders(origin)
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
    data: {
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
    }
  })

  // 创建默认设置
  await db.collection(COLLECTIONS.USER_SETTINGS).add({
    data: {
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
    }
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
    data: {
      lastLoginAt: new Date(),
      updatedAt: new Date()
    }
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
    .update({ data: updateData })

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
      data: {
        memberLevel: level,
        memberExpireTime: expireTime,
        updatedAt: new Date()
      }
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
      data: {
        openid,
        notifications: notifications || { push: true, email: false, sms: false },
        privacy: privacy || { showProfile: true, showProgress: true },
        language: language || 'zh-CN',
        timezone: timezone || 'Asia/Shanghai',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  } else {
    // 更新设置
    await db.collection(COLLECTIONS.USER_SETTINGS)
      .where({ openid })
      .update({ data: updateData })
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
      data: {
        openid,
        ...updateData,
        notifications: { push: true, email: false, sms: false },
        privacy: { showProfile: true, showProgress: true },
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        createdAt: new Date()
      }
    })
  } else {
    await db.collection(COLLECTIONS.USER_SETTINGS)
      .where({ openid })
      .update({ data: updateData })
  }

  return success({ message: '偏好设置更新成功' })
}

// ========== 统计操作 ==========

/**
 * 获取用户统计
 */
async function handleGetStats(openid) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const res = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .field({
      level: true,
      points: true,
      totalLearningTime: true,
      totalCourses: true,
      totalExams: true,
      memberLevel: true
    })
    .limit(1)
    .get()

  if (res.data.length === 0) {
    return fail('用户不存在')
  }

  return success(res.data[0])
}

/**
 * 获取学习统计
 */
async function handleGetLearningStats(openid) {
  if (!openid) {
    return fail('缺少 openid')
  }

  // 获取用户信息
  const userRes = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .field({ totalLearningTime: true, totalCourses: true })
    .limit(1)
    .get()

  const totalLearningTime = userRes.data[0]?.totalLearningTime || 0
  const totalCourses = userRes.data[0]?.totalCourses || 0

  // 获取学习路径进度
  const pathRes = await db.collection(COLLECTIONS.LEARNING_PATHS)
    .where({ openid })
    .field({ progress: true, status: true })
    .get()

  // 获取证书数量
  const certRes = await db.collection(COLLECTIONS.CERTIFICATES)
    .where({ openid })
    .count()

  // 计算本周学习时间
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const weekStats = await db.collection(COLLECTIONS.DAILY_STATS)
    .where({
      openid,
      date: _.gte(weekAgo.toISOString().split('T')[0])
    })
    .field({ learningTime: true })
    .get()

  const weekLearningTime = weekStats.data.reduce((sum, d) => sum + (d.learningTime || 0), 0)

  return success({
    totalLearningTime,
    totalCourses,
    learningPaths: pathRes.data.length,
    certificates: certRes.total,
    weekLearningTime,
    avgDailyTime: weekLearningTime / 7
  })
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
      data: {
        openid,
        date: targetDate,
        learningTime,
        coursesCompleted,
        examsTaken,
        loginCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  } else {
    // 更新统计
    const updateData = { updatedAt: new Date() }
    if (learningTime) updateData.learningTime = _.inc(learningTime)
    if (coursesCompleted) updateData.coursesCompleted = _.inc(coursesCompleted)
    if (examsTaken) updateData.examsTaken = _.inc(examsTaken)

    await db.collection(COLLECTIONS.DAILY_STATS)
      .where({ openid, date: targetDate })
      .update({ data: updateData })
  }

  return success({ message: '统计更新成功' })
}

/**
 * 增量更新统计字段
 */
async function handleIncrementStat(openid, field) {
  if (!openid) {
    return fail('缺少 openid')
  }

  const allowedFields = ['totalLearningTime', 'totalCourses', 'totalExams', 'points']
  if (!allowedFields.includes(field)) {
    return fail('无效的统计字段')
  }

  await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .update({
      data: {
        [field]: _.inc(1),
        updatedAt: new Date()
      }
    })

  return success({ message: '统计更新成功' })
}
