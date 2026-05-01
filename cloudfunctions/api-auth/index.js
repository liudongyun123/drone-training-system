/**
 * api-auth 云函数 - 统一认证服务（生产版）
 * 
 * 功能：
 * - 小程序微信登录
 * - 短信验证码登录
 * - 用户名密码登录
 * - 管理员自定义登录（签发CloudBase ticket）
 */

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

// 加载自定义登录私钥
let customLoginKey = null
try {
  customLoginKey = require('./custom-login-key.json')
  console.log('[Auth] 自定义登录私钥已加载')
} catch (e) {
  console.warn('[Auth] 未找到自定义登录私钥')
}

// 配置
const TOKEN_EXPIRE = 7 * 24 * 60 * 60 * 1000
const SMS_CODE_EXPIRE = 5 * 60 * 1000

// ========== CloudBase 自定义登录 Ticket 生成 ==========
const crypto = require('crypto')

function generateCustomLoginTicket(userId, key) {
  // JWT Header
  const header = { alg: 'RS256', typ: 'JWT' }
  
  // JWT Payload - CloudBase 要求的字段
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    uid: userId,
    env: key.env_id,
    iat: now,
    exp: now + 3600 * 24 * 30  // 30天
  }
  
  // Base64URL 编码
  const base64url = (obj) => Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  // 生成签名输入
  const signingInput = `${base64url(header)}.${base64url(payload)}`
  
  // 用私钥签名
  const privateKey = key.private_key
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign.sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const ticket = `${signingInput}.${signature}`
  return ticket
}

// ========== 工具函数 ==========

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function generateCode() {
  return Math.random().toString().slice(2, 8)
}

function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

function getCorsHeaders(origin = '') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  }
}

// ========== 核心业务 ==========

/**
 * 管理员登录（用户名+密码）
 * 验证成功后签发CloudBase ticket
 */
async function adminLogin(username, password) {
  console.log('[adminLogin] 尝试登录:', username)
  
  if (!username || !password) {
    return { success: false, error: '用户名和密码不能为空' }
  }
  
  // 确保sessions集合存在
  try { await db.collection('sessions').limit(1).get() } catch (e) {
    console.log('[adminLogin] 创建sessions集合')
    try { await db.collection('sessions').add({ data: { _init: true } }) } catch (e2) { console.log('[adminLogin] sessions创建失败:', e2.message) }
  }
  
  // 查询管理员账号
  const users = await db.collection('users')
    .where({
      $or: [
        { username: username },
        { phone: username }
      ]
    })
    .limit(1)
    .get()
  
  if (!users.data || users.data.length === 0) {
    console.log('[adminLogin] 用户不存在:', username)
    return { success: false, error: '用户名或密码错误' }
  }
  
  const user = users.data[0]
  
  // 验证密码
  if (user.password !== password) {
    console.log('[adminLogin] 密码错误')
    return { success: false, error: '用户名或密码错误' }
  }
  
  // 验证管理员权限
  if (user.role !== 'admin') {
    console.log('[adminLogin] 非管理员:', user.role)
    return { success: false, error: '没有管理员权限' }
  }
  
  if (user.status !== 'active') {
    return { success: false, error: '账号已被禁用' }
  }
  
  // ✅ 关键：用私钥直接生成CloudBase自定义登录ticket
  let ticket = null
  if (customLoginKey) {
    try {
      ticket = generateCustomLoginTicket(user._id, customLoginKey)
      console.log('[adminLogin] CloudBase ticket生成成功:', ticket ? '有' : '无')
    } catch (e) {
      console.error('[adminLogin] ticket生成失败:', e.message)
    }
  } else {
    console.warn('[adminLogin] 未配置自定义登录私钥')
  }
  
  // 生成应用层Token（备用）
  const token = generateToken()
  const expireAt = Date.now() + TOKEN_EXPIRE
  
  await db.collection('sessions').add({
    data: {
      token,
      userId: user._id,
      expireAt,
      platform: 'admin',
      createdAt: new Date().toISOString()
    }
  })
  
  // 更新登录时间
  await db.collection('users').doc(user._id).update({
    data: { lastLoginAt: new Date().toISOString() }
  })
  
  console.log('[adminLogin] 登录成功:', user.username)
  
  return {
    success: true,
    data: {
      token,
      ticket,  // CloudBase ticket
      expireAt,
      user: {
        _id: user._id,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar || '',
        role: user.role,
        permissions: user.permissions || []
      }
    }
  }
}

/**
 * 发送短信验证码
 */
async function sendSmsCode(phone) {
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' }
  }
  
  const code = generateCode()
  const expireAt = Date.now() + SMS_CODE_EXPIRE
  
  await db.collection('sms_codes').add({
    data: { phone, code, expireAt, createdAt: Date.now(), used: false }
  })
  
  console.log(`[Auth] 验证码: ${phone} -> ${code}`)
  
  return {
    success: true,
    message: '验证码已发送',
    // 开发模式返回验证码
    _debugCode: code
  }
}

/**
 * 短信验证码登录
 */
async function loginBySms(phone, code) {
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' }
  }
  
  // 验证验证码
  const records = await db.collection('sms_codes')
    .where({ phone, code, used: false, expireAt: _.gt(Date.now()) })
    .limit(1)
    .get()
  
  if (!records.data || records.data.length === 0) {
    return { success: false, error: '验证码错误或已过期' }
  }
  
  // 标记验证码已使用
  await db.collection('sms_codes').doc(records.data[0]._id).update({ data: { used: true } })
  
  // 查找或创建用户
  let users = await db.collection('users').where({ phone }).limit(1).get()
  let user
  
  if (!users.data || users.data.length === 0) {
    const now = new Date().toISOString()
    user = {
      phone,
      username: `用户${phone.slice(-4)}`,
      role: 'student',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    const result = await db.collection('users').add({ data: user })
    user._id = result.id
  } else {
    user = users.data[0]
    await db.collection('users').doc(user._id).update({ data: { lastLoginAt: new Date().toISOString() } })
  }
  
  const token = generateToken()
  const expireAt = Date.now() + TOKEN_EXPIRE
  
  await db.collection('sessions').add({
    data: { token, userId: user._id, expireAt, platform: 'web', createdAt: new Date().toISOString() }
  })
  
  return {
    success: true,
    data: {
      token,
      expireAt,
      user: { _id: user._id, phone: user.phone, username: user.username, role: user.role }
    }
  }
}

/**
 * 注册（短信验证码验证后设置用户名和密码）
 */
async function register(phone, code, username, password) {
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' }
  }
  if (!code) {
    return { success: false, error: '请输入验证码' }
  }
  if (!username || username.length < 2) {
    return { success: false, error: '用户名至少2个字符' }
  }
  if (!password || password.length < 6) {
    return { success: false, error: '密码至少6位' }
  }

  // 验证验证码
  const records = await db.collection('sms_codes')
    .where({ phone, code, used: false, expireAt: _.gt(Date.now()) })
    .limit(1)
    .get()
  if (!records.data || records.data.length === 0) {
    return { success: false, error: '验证码错误或已过期' }
  }
  
  // 标记验证码已使用
  await db.collection('sms_codes').doc(records.data[0]._id).update({ data: { used: true } })

  // 检查手机号是否已注册
  const existingUsers = await db.collection('users').where({ phone }).limit(1).get()
  if (existingUsers.data && existingUsers.data.length > 0) {
    return { success: false, error: '该手机号已注册，请直接登录' }
  }

  // 创建用户
  const now = new Date().toISOString()
  const user = {
    phone,
    username,
    password, // 存储密码（实际应加密，简化处理）
    role: 'student',
    status: 'active',
    loginType: 'phone',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  }
  const result = await db.collection('users').add({ data: user })
  user._id = result.id

  // 创建用户角色记录
  await db.collection('user_roles').add({
    data: {
      userId: user._id,
      phone,
      role: 'student',
      roleName: '学员',
      status: 'active',
      createdAt: now
    }
  })

  // 生成 token
  const token = generateToken()
  const expireAt = Date.now() + TOKEN_EXPIRE
  await db.collection('sessions').add({
    data: { token, userId: user._id, phone, expireAt, platform: 'web', createdAt: now }
  })

  return {
    success: true,
    data: {
      token,
      expireAt,
      user: { _id: user._id, phone, username, role: 'student' }
    }
  }
}

/**
 * 小程序微信登录
 * 通过 wx.cloud.getOpenId() 获取 openid
 */
async function wxMiniappLogin(event, context) {
  console.log('[wxMiniappLogin] 小程序微信登录')
  
  try {
    // 获取 openid
    const { OPENID, APPID } = cloud.getWXContext()
    const openid = OPENID
    const appid = APPID
    
    if (!openid) {
      return { success: false, error: '获取openid失败' }
    }
    
    console.log('[wxMiniappLogin] openid:', openid)
    
    // 查找或创建用户
    let users = await db.collection('users').where({ openid }).limit(1).get()
    let user
    
    if (!users.data || users.data.length === 0) {
      // 创建新用户
      const now = new Date().toISOString()
      const newUser = {
        openid,
        appid,
        username: `微信用户${openid.slice(-6)}`,
        role: 'student',
        status: 'active',
        loginType: 'wechat',
        createdAt: now,
        lastLoginAt: now
      }
      const result = await db.collection('users').add({ data: newUser })
      user = { ...newUser, _id: result.id }
      console.log('[wxMiniappLogin] 创建新用户:', user._id)
    } else {
      user = users.data[0]
      await db.collection('users').doc(user._id).update({
        data: { lastLoginAt: new Date().toISOString(), loginType: 'wechat' }
      })
      console.log('[wxMiniappLogin] 用户已存在:', user._id)
    }
    
    // 生成 token
    const token = generateToken()
    const expireAt = Date.now() + TOKEN_EXPIRE
    
    await db.collection('sessions').add({
      data: { token, userId: user._id, openid, expireAt, platform: 'miniprogram', createdAt: new Date().toISOString() }
    })
    
    return {
      success: true,
      data: {
        token,
        expireAt,
        userId: user._id,
        openid,
        user: { _id: user._id, username: user.username, phone: user.phone || '', role: user.role }
      }
    }
  } catch (e) {
    console.error('[wxMiniappLogin] 错误:', e)
    return { success: false, error: e.message }
  }
}

/**
 * 小程序手机号登录
 * 通过 cloud.openapi.getPhoneNumber 获取手机号
 */
async function wxPhoneLogin(code, event, context) {
  console.log('[wxPhoneLogin] 小程序手机号登录, code:', code)
  
  if (!code) {
    return { success: false, error: '手机号code不能为空' }
  }
  
  try {
    // 获取 openid
    const { OPENID } = cloud.getWXContext()
    
    // 调用微信接口获取手机号
    const phoneResult = await cloud.openapi.phonenumber.getPhoneNumber({ code })
    
    if (!phoneResult || phoneResult.errcode !== 0) {
      console.error('[wxPhoneLogin] 获取手机号失败:', phoneResult)
      return { success: false, error: '获取手机号失败: ' + (phoneResult?.errmsg || '未知错误') }
    }
    
    const phoneNumber = phoneResult.phoneInfo.phoneNumber
    const purePhoneNumber = phoneResult.phoneInfo.purePhoneNumber
    console.log('[wxPhoneLogin] 手机号:', phoneNumber)
    
    // 查找或创建用户
    let users = await db.collection('users').where({ phone: purePhoneNumber }).limit(1).get()
    let user
    
    if (!users.data || users.data.length === 0) {
      // 创建新用户
      const now = new Date().toISOString()
      const newUser = {
        phone: purePhoneNumber,
        openid: OPENID,
        username: `用户${purePhoneNumber.slice(-4)}`,
        role: 'student',
        status: 'active',
        loginType: 'phone',
        createdAt: now,
        lastLoginAt: now
      }
      const result = await db.collection('users').add({ data: newUser })
      user = { ...newUser, _id: result.id }
      console.log('[wxPhoneLogin] 创建新用户:', user._id)
    } else {
      user = users.data[0]
      // 更新 openid（如果之前没有）
      const updateData = { lastLoginAt: new Date().toISOString(), loginType: 'phone' }
      if (!user.openid && OPENID) {
        updateData.openid = OPENID
      }
      await db.collection('users').doc(user._id).update({ data: updateData })
      console.log('[wxPhoneLogin] 用户已存在:', user._id)
    }
    
    // 生成 token
    const token = generateToken()
    const expireAt = Date.now() + TOKEN_EXPIRE
    
    await db.collection('sessions').add({
      data: { token, userId: user._id, phone: purePhoneNumber, openid: OPENID, expireAt, platform: 'miniprogram', createdAt: new Date().toISOString() }
    })
    
    return {
      success: true,
      data: {
        token,
        expireAt,
        userId: user._id,
        phone: purePhoneNumber,
        user: { _id: user._id, username: user.username, phone: purePhoneNumber, role: user.role }
      }
    }
  } catch (e) {
    console.error('[wxPhoneLogin] 错误:', e)
    return { success: false, error: e.message }
  }
}

/**
 * 验证Token
 */
async function verifyToken(token) {
  if (!token) return { success: false, error: 'Token不能为空' }
  
  const sessions = await db.collection('sessions').where({ token }).limit(1).get()
  
  if (!sessions.data || sessions.data.length === 0) {
    return { success: false, error: 'Token无效' }
  }
  
  const session = sessions.data[0]
  if (session.expireAt < Date.now()) {
    await db.collection('sessions').doc(session._id).remove()
    return { success: false, error: 'Token已过期' }
  }
  
  const user = await db.collection('users').doc(session.userId).get()
  if (!user.data) return { success: false, error: '用户不存在' }
  
  return {
    success: true,
    data: {
      userId: session.userId,
      user: {
        _id: user.data._id,
        username: user.data.username,
        phone: user.data.phone,
        role: user.data.role
      }
    }
  }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[api-auth] action:', event.action || 'default')
  
  // CORS预检
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: getCorsHeaders(), body: '{}' }
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
  
  const token = event.headers?.authorization?.replace('Bearer ', '') || data.token
  
  try {
    let result
    
    switch (action) {
      case 'adminLogin':
        result = await adminLogin(data.username, data.password)
        break
        
      case 'sendSmsCode':
        result = await sendSmsCode(data.phone)
        break
        
      case 'loginBySms':
        result = await loginBySms(data.phone, data.code)
        break

      case 'register':
        result = await register(data.phone, data.code, data.username, data.password)
        break

      case 'wxMiniappLogin':
        result = await wxMiniappLogin(event, context)
        break
        
      case 'wxPhoneLogin':
        result = await wxPhoneLogin(data.code, event, context)
        break
        
      case 'verifyToken':
        result = await verifyToken(token)
        break
        
      case 'logout':
        await db.collection('sessions').where({ token }).remove()
        result = { success: true }
        break
        
      default:
        result = { success: false, error: '未知操作: ' + action }
    }
    
    // HTTP返回格式
    if (event.httpMethod || event.headers) {
      return {
        statusCode: result.success ? 200 : 400,
        headers: getCorsHeaders(),
        body: JSON.stringify(result)
      }
    }
    
    return result
    
  } catch (error) {
    console.error('[api-auth] 错误:', error)
    const errorResult = { success: false, error: error.message }
    
    if (event.httpMethod || event.headers) {
      return { statusCode: 500, headers: getCorsHeaders(), body: JSON.stringify(errorResult) }
    }
    
    return errorResult
  }
}
