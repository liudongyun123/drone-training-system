/**
 * api-auth 云函数 - 统一认证服务（生产版）
 * 
 * 功能：
 * - 小程序微信登录
 * - 短信验证码登录
 * - 用户名密码登录
 * - 管理员自定义登录（签发CloudBase ticket）
 */

const cloudbase = require('@cloudbase/node-sdk')
const https = require('https')

const app = cloudbase.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = app.database()
const _ = db.command

// 微信配置（支持环境变量覆盖）
const WX_CONFIG = {
  APPID: process.env.WX_APPID || 'wx25aaf895ab86181a',
  SECRET: process.env.WX_APPSECRET || process.env.WX_SECRET || ''
}

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

// ========== 密码哈希（与 api-user 保持一致的 sha256，生产环境建议 bcrypt）==========
function hashPassword(password) {
  return crypto.createHash('sha256').update('drone_auth_salt_' + password).digest('hex')
}

// 校验密码：兼容历史明文存储 + 新哈希存储
function verifyPassword(input, stored) {
  if (!stored) return false
  if (stored === input) return true // 兼容历史明文
  return stored === hashPassword(input)
}

// ========== HTTPS 请求工具 ==========

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { resolve(data) }
      })
    }).on('error', reject)
  })
}

function httpsPost(hostname, path, postData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { resolve(data) }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

// 调用微信 jscode2session 接口换取 openid
async function getOpenidByCode(jsCode) {
  if (!WX_CONFIG.SECRET) {
    throw new Error('未配置 WX_APPSECRET 环境变量，请在 CloudBase 云函数环境变量中设置 WX_APPSECRET')
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_CONFIG.APPID}&secret=${WX_CONFIG.SECRET}&js_code=${jsCode}&grant_type=authorization_code`
  const result = await httpsGet(url)
  if (result.errcode !== undefined && result.errcode !== 0) {
    throw new Error(`微信接口错误 ${result.errcode}: ${result.errmsg}`)
  }
  if (!result.openid) {
    throw new Error('微信接口未返回 openid')
  }
  return result
}

// 获取微信 access_token
async function getWxAccessToken() {
  if (!WX_CONFIG.SECRET) {
    throw new Error('未配置 WX_APPSECRET 环境变量')
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_CONFIG.APPID}&secret=${WX_CONFIG.SECRET}`
  const result = await httpsGet(url)
  if (result.errcode !== undefined && result.errcode !== 0) {
    throw new Error(`微信接口错误 ${result.errcode}: ${result.errmsg}`)
  }
  if (!result.access_token) {
    throw new Error('微信接口未返回 access_token')
  }
  return result.access_token
}

// 调用微信 phonenumber.getPhoneNumber 接口
async function getPhoneNumberByCode(code) {
  const accessToken = await getWxAccessToken()
  const postData = JSON.stringify({ code })
  const result = await httpsPost('api.weixin.qq.com', `/wxa/business/getuserphonenumber?access_token=${accessToken}`, postData)
  if (result.errcode !== undefined && result.errcode !== 0) {
    throw new Error(`微信接口错误 ${result.errcode}: ${result.errmsg}`)
  }
  if (!result.phone_info) {
    throw new Error('微信接口未返回手机号信息')
  }
  return result.phone_info
}

// CORS 由 CloudBase HTTP 网关自动处理，云函数代码中不再重复添加
// 避免 Access-Control-Allow-Origin 头重复导致浏览器 CORS 错误
function getHeaders() {
  return {
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
    try { await db.collection('sessions').add({ _init: true }) } catch (e2) { console.log('[adminLogin] sessions创建失败:', e2.message) }
  }
  
  // 查询管理员账号（优先 members，兼容旧 users）
  let users = await db.collection('members')
    .where({
      $or: [
        { name: username },
        { phone: username }
      ]
    })
    .limit(1)
    .get()
  
  let user = null
  let fromUsers = false
  
  // 如果在 members 中找不到，尝试从旧 users 集合查找
  if (!users.data || users.data.length === 0) {
    console.log('[adminLogin] members 中未找到，尝试旧 users 集合')
    const oldUsers = await db.collection('users')
      .where({
        $or: [
          { username: username },
          { phone: username }
        ]
      })
      .limit(1)
      .get()
    
    if (oldUsers.data && oldUsers.data.length > 0) {
      user = oldUsers.data[0]
      fromUsers = true
      console.log('[adminLogin] 从旧 users 集合找到管理员:', user.username)
      
      // 自动迁移到 members 集合
      try {
        const existingMember = await db.collection('members').where({ phone: user.phone || '' }).limit(1).get()
        if (!existingMember.data || existingMember.data.length === 0) {
          const now = new Date().toISOString()
          await db.collection('members').add({
            name: user.username,
            phone: user.phone || '',
            password: user.password,
            role: 'admin',
            status: 'active',
            source: 'system',
            type: 'user',
            profile: {},
            stats: { totalHours: 0, completedCourses: 0, examAttempts: 0, totalOrders: 0, totalSpent: 0 },
            enrolledCourses: [],
            completedCourses: [],
            createdAt: user.createdAt || now,
            updatedAt: now,
            lastLoginAt: now
          })
          console.log('[adminLogin] 管理员账号已自动迁移到 members')
        }
      } catch (migrateErr) {
        console.error('[adminLogin] 迁移管理员到 members 失败:', migrateErr.message)
      }
    }
  } else {
    user = users.data[0]
  }
  
  if (!user) {
    console.log('[adminLogin] 用户不存在:', username)
    return { success: false, error: '用户名或密码错误' }
  }
  
  // 验证密码（使用 verifyPassword 兼容明文/哈希两种存储，避免改密后的管理员无法登录）
  if (!verifyPassword(password, user.password)) {
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
      token,
      userId: user._id,
      expireAt,
      platform: 'admin',
      createdAt: new Date().toISOString()
    })
  
  // 更新登录时间（根据来源使用对应集合）
  const displayName = fromUsers ? user.username : user.name
  if (fromUsers) {
    await db.collection('users').doc(user._id).update({ lastLoginAt: new Date().toISOString() })
  } else {
    await db.collection('members').doc(user._id).update({ lastLoginAt: new Date().toISOString() })
  }
  
  console.log('[adminLogin] 登录成功:', displayName)
  
  return {
    success: true,
    data: {
      token,
      ticket,  // CloudBase ticket
      expireAt,
      user: {
        _id: user._id,
        username: displayName,
        phone: user.phone || '',
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
  
  await db.collection('sms_codes').add({ phone, code, expireAt, createdAt: Date.now(), used: false })
  
  console.log(`[Auth] 验证码: ${phone} -> ${code}`)
  
  return {
    success: true,
    message: '验证码已发送'
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
  await db.collection('sms_codes').doc(records.data[0]._id).update({ used: true })
  
  // 查找或创建用户
  let users = await db.collection('members').where({ phone }).limit(1).get()
  let user
  
  if (!users.data || users.data.length === 0) {
    const now = new Date().toISOString()
    user = {
      phone,
      name: `用户${phone.slice(-4)}`,
      role: 'student',
      status: 'active',
      loginType: 'phone',
      source: 'online_purchase',
      type: 'user',
      profile: {},
      stats: { totalHours: 0, completedCourses: 0, examAttempts: 0, totalOrders: 0, totalSpent: 0 },
      enrolledCourses: [],
      completedCourses: [],
      createdAt: now,
      updatedAt: now
    }
    const result = await db.collection('members').add(user)
    user._id = result.id
  } else {
    user = users.data[0]
    await db.collection('members').doc(user._id).update({ lastLoginAt: new Date().toISOString() })
  }
  
  const token = generateToken()
  const expireAt = Date.now() + TOKEN_EXPIRE
  
  await db.collection('sessions').add({ token, userId: user._id, expireAt, platform: 'web', createdAt: new Date().toISOString() })
  
  return {
    success: true,
    data: {
      token,
      expireAt,
      user: { _id: user._id, phone: user.phone, username: user.name, role: user.role }
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
  await db.collection('sms_codes').doc(records.data[0]._id).update({ used: true })

  // 检查手机号是否已注册
  const existingUsers = await db.collection('members').where({ phone }).limit(1).get()
  if (existingUsers.data && existingUsers.data.length > 0) {
    return { success: false, error: '该手机号已注册，请直接登录' }
  }

  // 创建用户
  const now = new Date().toISOString()
  const user = {
    phone,
    name: username,
    password: hashPassword(password), // 密码哈希存储，避免明文泄露
    role: 'student',
    status: 'active',
    loginType: 'phone',
    source: 'online_purchase',
    type: 'user',
    profile: {},
    stats: { totalHours: 0, completedCourses: 0, examAttempts: 0, totalOrders: 0, totalSpent: 0 },
    enrolledCourses: [],
    completedCourses: [],
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now
  }
  const result = await db.collection('members').add(user)
  user._id = result.id

  // 创建用户角色记录
  await db.collection('user_roles').add({
      userId: user._id,
      phone,
      role: 'student',
      roleName: '学员',
      status: 'active',
      createdAt: now
    })

  // 生成 token
  const token = generateToken()
  const expireAt = Date.now() + TOKEN_EXPIRE
  await db.collection('sessions').add({ token, userId: user._id, phone, expireAt, platform: 'web', createdAt: now })

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
 * 通过 jscode2session 接口获取 openid（HTTP 触发器兼容）
 */
async function wxMiniappLogin(event, context) {
  console.log('[wxMiniappLogin] 小程序微信登录')

  // 解析参数
  let data = event.data || event
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      data = body.data || body
    } catch (e) {}
  }

  // 匿名游客登录：不依赖微信 code，直接返回游客身份
  if (data.type === 'anonymous') {
    const guestId = 'guest_' + generateToken().slice(0, 16)
    const token = generateToken()
    const expireAt = Date.now() + TOKEN_EXPIRE
    try {
      await db.collection('sessions').add({ token, userId: guestId, expireAt, platform: 'anonymous', createdAt: new Date().toISOString() })
    } catch (e) { console.warn('[wxMiniappLogin] 游客会话写入失败:', e.message) }
    return {
      success: true,
      data: {
        token,
        expireAt,
        userId: guestId,
        openid: '',
        user: { _id: guestId, username: '游客', phone: '', role: 'anonymous' }
      }
    }
  }

  const { code } = data
  if (!code) {
    return { success: false, error: '缺少 wx.login 获取的 code 参数' }
  }

  try {
    // 通过 jscode2session 获取 openid
    const session = await getOpenidByCode(code)
    const openid = session.openid
    const appid = session.appid || WX_CONFIG.APPID

    console.log('[wxMiniappLogin] openid:', openid)

    // 查找或创建用户
    let users = await db.collection('members').where({ openid }).limit(1).get()
    let user

    if (!users.data || users.data.length === 0) {
      // 创建新用户
      const now = new Date().toISOString()
      const newUser = {
        openid,
        appid,
        name: `微信用户${openid.slice(-6)}`,
        role: 'student',
        status: 'active',
        loginType: 'wechat',
        source: 'online_purchase',
        type: 'user',
        profile: {},
        stats: { totalHours: 0, completedCourses: 0, examAttempts: 0, totalOrders: 0, totalSpent: 0 },
        enrolledCourses: [],
        completedCourses: [],
        createdAt: now,
        lastLoginAt: now
      }
      const result = await db.collection('members').add(newUser)
      user = { ...newUser, _id: result.id }
      console.log('[wxMiniappLogin] 创建新用户:', user._id)
    } else {
      user = users.data[0]
      await db.collection('members').doc(user._id).update({ lastLoginAt: new Date().toISOString(), loginType: 'wechat' })
      console.log('[wxMiniappLogin] 用户已存在:', user._id)
    }

    // 生成 token
    const token = generateToken()
    const expireAt = Date.now() + TOKEN_EXPIRE

    await db.collection('sessions').add({ token, userId: user._id, openid, expireAt, platform: 'miniprogram', createdAt: new Date().toISOString() })

    return {
      success: true,
      data: {
        token,
        expireAt,
        userId: user._id,
        openid,
        user: { _id: user._id, username: user.name, phone: user.phone || '', role: user.role }
      }
    }
  } catch (e) {
    console.error('[wxMiniappLogin] 错误:', e)
    return { success: false, error: e.message }
  }
}

/**
 * 小程序手机号登录
 * 通过 HTTPS 调用微信 phonenumber 接口获取手机号（HTTP 触发器兼容）
 */
async function wxPhoneLogin(data, event, context) {
  const { code, openid: providedOpenid } = data
  console.log('[wxPhoneLogin] 小程序手机号登录, code:', code)

  if (!code) {
    return { success: false, error: '手机号code不能为空' }
  }

  try {
    // 获取手机号
    const phoneInfo = await getPhoneNumberByCode(code)
    const phoneNumber = phoneInfo.phoneNumber
    const purePhoneNumber = phoneInfo.purePhoneNumber
    console.log('[wxPhoneLogin] 手机号:', phoneNumber)

    // 查找或创建用户
    let users = await db.collection('members').where({ phone: purePhoneNumber }).limit(1).get()
    let user

    if (!users.data || users.data.length === 0) {
      // 创建新用户
      const now = new Date().toISOString()
      const newUser = {
        phone: purePhoneNumber,
        openid: providedOpenid || '',
        name: `用户${purePhoneNumber.slice(-4)}`,
        role: 'student',
        status: 'active',
        loginType: 'phone',
        source: 'online_purchase',
        type: 'user',
        profile: {},
        stats: { totalHours: 0, completedCourses: 0, examAttempts: 0, totalOrders: 0, totalSpent: 0 },
        enrolledCourses: [],
        completedCourses: [],
        createdAt: now,
        lastLoginAt: now
      }
      const result = await db.collection('members').add(newUser)
      user = { ...newUser, _id: result.id }
      console.log('[wxPhoneLogin] 创建新用户:', user._id)
    } else {
      user = users.data[0]
      // 更新 openid（如果之前没有）
      const updateData = { lastLoginAt: new Date().toISOString(), loginType: 'phone' }
      if (!user.openid && providedOpenid) {
        updateData.openid = providedOpenid
      }
      await db.collection('members').doc(user._id).update(updateData)
      console.log('[wxPhoneLogin] 用户已存在:', user._id)
    }

    // 生成 token
    const token = generateToken()
    const expireAt = Date.now() + TOKEN_EXPIRE

    await db.collection('sessions').add({ token, userId: user._id, phone: purePhoneNumber, openid: providedOpenid || user.openid || '', expireAt, platform: 'miniprogram', createdAt: new Date().toISOString() })

    return {
      success: true,
      data: {
        token,
        expireAt,
        userId: user._id,
        phone: purePhoneNumber,
        user: { _id: user._id, username: user.name, phone: purePhoneNumber, role: user.role }
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
  
  const user = await db.collection('members').doc(session.userId).get()
  if (!user.data) return { success: false, error: '用户不存在' }
  
  return {
    success: true,
    data: {
      userId: session.userId,
      user: {
        _id: user.data._id,
        username: user.data.name,
        phone: user.data.phone,
        role: user.data.role
      }
    }
  }
}

/**
 * 校验短信验证码（不创建会话，供绑定/换绑手机号使用）
 */
async function verifySmsCode(phone, code) {
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' }
  }
  if (!code) {
    return { success: false, error: '请输入验证码' }
  }
  try {
    const records = await db.collection('sms_codes')
      .where({ phone, code, used: false, expireAt: _.gt(Date.now()) })
      .limit(1)
      .get()
    if (!records.data || records.data.length === 0) {
      return { success: false, error: '验证码错误或已过期' }
    }
    // 标记已使用，防止重放
    await db.collection('sms_codes').doc(records.data[0]._id).update({ used: true })
    return { success: true, message: '验证通过' }
  } catch (e) {
    console.error('[verifySmsCode] 失败:', e.message)
    return { success: false, error: '验证码校验失败: ' + e.message }
  }
}

/**
 * 修改密码（兼容 members / users 集合）
 */
async function changePassword(params) {
  const { phone, userId, oldPassword, newPassword } = params || {}
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: '新密码至少6位' }
  }
  if (!phone && !userId) {
    return { success: false, error: '缺少用户标识（phone 或 userId）' }
  }

  const query = phone ? { phone } : { _id: userId }
  // 优先查 members，再查 users
  let coll = 'members'
  let rec = await db.collection(coll).where(query).limit(1).get()
  if (!rec.data || rec.data.length === 0) {
    coll = 'users'
    rec = await db.collection(coll).where(query).limit(1).get()
  }
  if (!rec.data || rec.data.length === 0) {
    return { success: false, error: '用户不存在' }
  }
  const user = rec.data[0]
  if (oldPassword && !verifyPassword(oldPassword, user.password)) {
    return { success: false, error: '原密码错误' }
  }
  const newHash = hashPassword(newPassword)
  await db.collection(coll).doc(user._id).update({ password: newHash, updatedAt: new Date().toISOString() })
  console.log('[changePassword] 密码已更新:', user._id)
  return { success: true, message: '密码修改成功' }
}

// ========== 主入口 ==========

exports.main = async (event, context) => {
  console.log('[api-auth] 收到请求:', JSON.stringify({
    httpMethod: event.httpMethod,
    path: event.path,
    queryString: event.queryString,
    headers: event.headers ? Object.keys(event.headers) : null,
    hasBody: !!event.body,
    isBase64Encoded: event.isBase64Encoded,
    action: event.action
  }))

  // CORS预检（CloudBase 网关自动处理 CORS，这里只做快速响应）
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: getHeaders(), body: '{}' }
  }

  // 解析参数（兼容 HTTP 触发器直接调用 / 小程序 callFunction / 事件调用）
  let action = event.action || ''
  let data = event.data || event

  if (event.body) {
    try {
      let bodyStr = event.body
      // CloudBase HTTP 触发器可能将 body 做 Base64 编码
      if (event.isBase64Encoded && typeof bodyStr === 'string') {
        bodyStr = Buffer.from(bodyStr, 'base64').toString('utf8')
        console.log('[api-auth] Base64 body 已解码')
      }
      const body = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr
      action = body.action || action
      data = body.data || body
      console.log('[api-auth] 从 body 解析 action:', action)
    } catch (e) {
      console.error('[api-auth] 解析 body 失败:', e.message, 'body前100字符:', String(event.body).slice(0, 100))
    }
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
        result = await wxPhoneLogin(data, event, context)
        break
        
      case 'verifyToken':
        result = await verifyToken(token)
        break
        
      case 'logout':
        await db.collection('sessions').where({ token }).remove()
        result = { success: true }
        break

      case 'verifySmsCode':
        result = await verifySmsCode(data.phone, data.code)
        break

      case 'changePassword':
        result = await changePassword(data)
        break

      default:
        result = { success: false, error: '未知操作: ' + action }
    }
    
    // HTTP返回格式（始终返回200，CORS由CloudBase网关自动处理）
    if (event.httpMethod || event.headers) {
      return {
        statusCode: 200,
        headers: getHeaders(),
        body: JSON.stringify(result)
      }
    }
    
    return result
    
  } catch (error) {
    console.error('[api-auth] 错误:', error)
    const errorResult = { success: false, error: error.message }
    
    if (event.httpMethod || event.headers) {
      return { statusCode: 200, headers: getHeaders(), body: JSON.stringify(errorResult) }
    }
    
    return errorResult
  }
}
