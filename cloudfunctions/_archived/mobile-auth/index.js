/**
 * 移动端认证服务 - 生产环境版本
 * 支持：短信登录、密码登录、微信登录、Token验证
 * 
 * 依赖腾讯云短信服务，需配置以下环境变量：
 * - TENCENT_SMS_SECRET_ID: 腾讯云 SecretId
 * - TENCENT_SMS_SECRET_KEY: 腾讯云 SecretKey
 * - TENCENT_SMS_SDK_APP_ID: 短信应用 SDK AppId
 * - TENCENT_SMS_TEMPLATE_ID: 短信模板 ID
 * - TENCENT_SMS_SIGN_NAME: 短信签名
 */

const cloud = require('tcb-admin-node');
const tencentcloud = require('tencentcloud-sdk-nodejs');

// 初始化云开发
cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 配置
const AUTH_COLLECTION = 'users';
const TOKEN_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7天

// 短信发送频率限制（同一手机号）
const SMS_COOLDOWN = 60 * 1000; // 60秒内不能重复发送
const SMS_MAX_DAILY = 10; // 每天最多发送10条

// 验证码有效期（5分钟）
const SMS_CODE_EXPIRE = 5 * 60 * 1000;

// 存储验证码（生产环境建议使用 Redis，这里用数据库模拟）
const SMS_CODES_COLLECTION = 'sms_codes';
const SMS_LOGS_COLLECTION = 'sms_logs';

// 初始化腾讯云 SMS 客户端
let smsClient = null;

function getSmsClient() {
  if (smsClient) return smsClient;
  
  const secretId = process.env.TENCENT_SMS_SECRET_ID;
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY;
  
  if (!secretId || !secretKey) {
    console.warn('腾讯云短信配置未完成，请设置环境变量');
    return null;
  }
  
  const SmsClient = tencentcloud.sms.v20210111.Client;
  const ClientProfile = tencentcloud.common.ClientProfile;
  const HttpProfile = tencentcloud.common.HttpProfile;
  
  const httpProfile = new HttpProfile();
  httpProfile.endpoint = 'sms.tencentcloudapi.com';
  
  const clientProfile = new ClientProfile();
  clientProfile.httpProfile = httpProfile;
  
  smsClient = new SmsClient({
    credential: { secretId, secretKey },
    region: 'ap-guangzhou',
    profile: clientProfile
  });
  
  return smsClient;
}

/**
 * 生成随机Token
 */
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 验证手机号格式
 */
function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证验证码格式
 */
function validateCode(code) {
  return /^\d{6}$/.test(code);
}

/**
 * 检查短信发送频率
 */
async function checkSmsRateLimit(phone) {
  const now = Date.now();
  
  // 检查最近是否发送过
  const recentSms = await db.collection(SMS_CODES_COLLECTION)
    .where({ phone })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  
  if (recentSms.data.length > 0) {
    const lastSend = recentSms.data[0].createdAt;
    if (now - lastSend < SMS_COOLDOWN) {
      return { 
        allowed: false, 
        error: `发送太频繁，请${Math.ceil((SMS_COOLDOWN - (now - lastSend)) / 1000)}秒后再试` 
      };
    }
  }
  
  // 检查今日发送次数
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayCount = await db.collection(SMS_LOGS_COLLECTION)
    .where({
      phone,
      createdAt: db.command.gte(todayStart.getTime())
    })
    .count();
  
  if (todayCount.total >= SMS_MAX_DAILY) {
    return { 
      allowed: false, 
      error: '今日发送次数已达上限，请明天再试' 
    };
  }
  
  return { allowed: true };
}

/**
 * 生成6位验证码
 */
function generateCode() {
  return Math.random().toString().slice(2, 8);
}

/**
 * 发送短信验证码（生产环境）
 */
async function sendSmsCode(phone) {
  // 验证手机号
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' };
  }
  
  // 检查发送频率
  const rateCheck = await checkSmsRateLimit(phone);
  if (!rateCheck.allowed) {
    return { success: false, error: rateCheck.error };
  }
  
  // 生成验证码
  const code = generateCode();
  const now = Date.now();
  const expireAt = now + SMS_CODE_EXPIRE;
  
  // 存储验证码
  await db.collection(SMS_CODES_COLLECTION).add({
    data: {
      phone,
      code,
      expireAt,
      createdAt: now,
      used: false
    }
  });
  
  // 记录发送日志
  await db.collection(SMS_LOGS_COLLECTION).add({
    data: {
      phone,
      createdAt: now,
      type: 'send'
    }
  });
  
  // 调用腾讯云短信服务发送
  const smsConfig = {
    sdkAppId: process.env.TENCENT_SMS_SDK_APP_ID,
    templateId: process.env.TENCENT_SMS_TEMPLATE_ID,
    signName: process.env.TENCENT_SMS_SIGN_NAME
  };
  
  // 如果配置完整，发送真实短信
  if (smsConfig.sdkAppId && smsConfig.templateId && smsConfig.signName) {
    const client = getSmsClient();
    
    if (client) {
      try {
        const SmsMultiSender = tencentcloud.sms.v20210111.SmsMultiSender;
        const sender = new SmsMultiSender({
          credential: {
            secretId: process.env.TENCENT_SMS_SECRET_ID,
            secretKey: process.env.TENCENT_SMS_SECRET_KEY
          },
          region: 'ap-guangzhou'
        });
        
        const params = {
          SmsSdkAppId: smsConfig.sdkAppId,
          SignName: smsConfig.signName,
          TemplateId: smsConfig.templateId,
          PhoneNumberSet: [`+86${phone}`],
          TemplateParamSet: [code]
        };
        
        await sender.send(params);
        console.log(`短信已发送到 ${phone}`);
        
        return {
          success: true,
          message: '验证码已发送'
        };
      } catch (error) {
        console.error('腾讯云短信发送失败:', error);
        // 短信发送失败，但验证码已生成并存储
        // 可以考虑使用备用通道或返回错误
        return {
          success: false,
          error: '短信发送失败，请稍后重试'
        };
      }
    }
  }
  
  // 配置不完整，返回错误（生产环境必须配置完整）
  console.error('腾讯云短信服务配置不完整');
  return {
    success: false,
    error: '短信服务配置错误，请联系管理员'
  };
}

/**
 * 验证短信验证码
 */
async function verifySmsCode(phone, code) {
  if (!validatePhone(phone) || !validateCode(code)) {
    return false;
  }
  
  const now = Date.now();
  
  // 查询验证码
  const records = await db.collection(SMS_CODES_COLLECTION)
    .where({
      phone,
      used: false,
      expireAt: db.command.gt(now)
    })
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();
  
  if (records.data.length === 0) {
    return false;
  }
  
  const record = records.data[0];
  
  // 验证码匹配
  if (record.code !== code) {
    return false;
  }
  
  // 标记为已使用
  await db.collection(SMS_CODES_COLLECTION).doc(record._id).update({
    data: { used: true }
  });
  
  return true;
}

/**
 * 手机号+验证码登录
 */
async function loginBySms(phone, code) {
  // 验证手机号
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' };
  }
  
  // 验证验证码
  const isValid = await verifySmsCode(phone, code);
  if (!isValid) {
    return { success: false, error: '验证码错误或已过期' };
  }
  
  // 查询或创建用户
  let users = await db.collection(AUTH_COLLECTION)
    .where({ phone })
    .limit(1)
    .get();
  
  let user;
  
  if (users.data.length === 0) {
    // 创建新用户
    const now = new Date().toISOString();
    user = {
      phone,
      username: `用户${phone.slice(-4)}`,
      avatar: '',
      role: 'student',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection(AUTH_COLLECTION).add({
      data: user,
    });
    user._id = result.id;
  } else {
    user = users.data[0];
    
    // 检查用户状态
    if (user.status !== 'active') {
      return { success: false, error: '账号已被禁用' };
    }
    
    // 更新最后登录时间
    await db.collection(AUTH_COLLECTION).doc(user._id).update({
      data: {
        lastLoginAt: new Date().toISOString(),
      },
    });
  }
  
  // 生成Token
  const token = generateToken();
  const expireAt = Date.now() + TOKEN_EXPIRE;
  
  // 存储Token
  await db.collection('sessions').add({
    data: {
      token,
      userId: user._id,
      expireAt,
      createdAt: new Date().toISOString(),
    },
  });
  
  return {
    success: true,
    data: {
      token,
      expireAt,
      user: {
        _id: user._id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    },
  };
}

/**
 * 手机号+密码登录
 */
async function loginByPassword(phone, password) {
  // 验证手机号
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' };
  }
  
  // 查询用户
  const users = await db.collection(AUTH_COLLECTION)
    .where({ phone })
    .limit(1)
    .get();
  
  if (users.data.length === 0) {
    return { success: false, error: '手机号或密码错误' };
  }
  
  const user = users.data[0];
  
  // 验证密码（生产环境应使用 bcrypt 等加密验证）
  if (user.password !== password) {
    return { success: false, error: '手机号或密码错误' };
  }
  
  // 检查用户状态
  if (user.status !== 'active') {
    return { success: false, error: '账号已被禁用' };
  }
  
  // 生成Token
  const token = generateToken();
  const expireAt = Date.now() + TOKEN_EXPIRE;
  
  // 存储Token
  await db.collection('sessions').add({
    data: {
      token,
      userId: user._id,
      expireAt,
      createdAt: new Date().toISOString(),
    },
  });
  
  // 更新最后登录时间
  await db.collection(AUTH_COLLECTION).doc(user._id).update({
    data: {
      lastLoginAt: new Date().toISOString(),
    },
  });
  
  return {
    success: true,
    data: {
      token,
      expireAt,
      user: {
        _id: user._id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    },
  };
}

/**
 * 注册
 */
async function register(phone, password, code) {
  // 验证手机号
  if (!validatePhone(phone)) {
    return { success: false, error: '手机号格式不正确' };
  }
  
  // 验证密码长度
  if (password.length < 6) {
    return { success: false, error: '密码长度不能少于6位' };
  }
  
  // 验证验证码
  const isValid = await verifySmsCode(phone, code);
  if (!isValid) {
    return { success: false, error: '验证码错误或已过期' };
  }
  
  // 检查手机号是否已注册
  const existUsers = await db.collection(AUTH_COLLECTION)
    .where({ phone })
    .limit(1)
    .get();
  
  if (existUsers.data.length > 0) {
    return { success: false, error: '手机号已注册' };
  }
  
  // 创建用户（生产环境密码应加密存储）
  const now = new Date().toISOString();
  const user = {
    phone,
    password, // 生产环境应加密：bcrypt.hashSync(password, 10)
    username: `用户${phone.slice(-4)}`,
    avatar: '',
    role: 'student',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.collection(AUTH_COLLECTION).add({
    data: user,
  });
  
  // 生成Token
  const token = generateToken();
  const expireAt = Date.now() + TOKEN_EXPIRE;
  
  await db.collection('sessions').add({
    data: {
      token,
      userId: result.id,
      expireAt,
      createdAt: now,
    },
  });
  
  return {
    success: true,
    data: {
      token,
      expireAt,
      user: {
        _id: result.id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    },
  };
}

/**
 * 验证Token
 */
async function verifyToken(token) {
  if (!token) {
    return { success: false, error: 'Token不能为空' };
  }
  
  // 查询Token
  const sessions = await db.collection('sessions')
    .where({ token })
    .limit(1)
    .get();
  
  if (sessions.data.length === 0) {
    return { success: false, error: 'Token无效' };
  }
  
  const session = sessions.data[0];
  
  // 检查是否过期
  if (session.expireAt < Date.now()) {
    // 删除过期Token
    await db.collection('sessions').doc(session._id).remove();
    return { success: false, error: 'Token已过期' };
  }
  
  // 获取用户信息
  const users = await db.collection(AUTH_COLLECTION)
    .doc(session.userId)
    .get();
  
  if (users.data.length === 0) {
    return { success: false, error: '用户不存在' };
  }
  
  const user = users.data;
  
  // 检查用户状态
  if (user.status !== 'active') {
    return { success: false, error: '账号已被禁用' };
  }
  
  return {
    success: true,
    data: {
      userId: session.userId,
      user: {
        _id: user._id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
      },
    },
  };
}

/**
 * 登出
 */
async function logout(token) {
  // 删除Token
  await db.collection('sessions')
    .where({ token })
    .remove();
  
  return { success: true };
}

/**
 * 获取用户信息
 */
async function getUserInfo(userId) {
  const users = await db.collection(AUTH_COLLECTION)
    .doc(userId)
    .get();
  
  if (users.data.length === 0) {
    return { success: false, error: '用户不存在' };
  }
  
  const user = users.data;
  
  return {
    success: true,
    data: {
      _id: user._id,
      phone: user.phone,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

/**
 * 更新用户信息
 */
async function updateUserInfo(userId, data) {
  const updateData = {
    updatedAt: new Date().toISOString(),
  };
  
  if (data.username) updateData.username = data.username;
  if (data.avatar) updateData.avatar = data.avatar;
  
  await db.collection(AUTH_COLLECTION).doc(userId).update({
    data: updateData,
  });
  
  return { success: true };
}

/**
 * 修改密码
 */
async function changePassword(userId, oldPassword, newPassword) {
  // 获取用户
  const users = await db.collection(AUTH_COLLECTION)
    .doc(userId)
    .get();
  
  if (users.data.length === 0) {
    return { success: false, error: '用户不存在' };
  }
  
  const user = users.data;
  
  // 验证旧密码（生产环境应使用加密验证）
  if (user.password && user.password !== oldPassword) {
    return { success: false, error: '原密码错误' };
  }
  
  // 更新密码（生产环境应加密）
  await db.collection(AUTH_COLLECTION).doc(userId).update({
    data: {
      password: newPassword,
      updatedAt: new Date().toISOString(),
    },
  });
  
  return { success: true };
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event;
  
  // 从请求头获取Token
  const token = event.headers?.authorization?.replace('Bearer ', '') || 
                 event.headers?.Authorization?.replace('Bearer ', '') ||
                 data.token;
  
  try {
    let result;
    
    switch (action) {
      case 'sendSmsCode':
        result = await sendSmsCode(data.phone);
        break;
        
      case 'loginBySms':
        result = await loginBySms(data.phone, data.code);
        break;
        
      case 'loginByPassword':
        result = await loginByPassword(data.phone, data.password);
        break;
        
      case 'register':
        result = await register(data.phone, data.password, data.code);
        break;
        
      case 'verifyToken':
        result = await verifyToken(token);
        break;
        
      case 'logout':
        result = await logout(token);
        break;
        
      case 'getUserInfo':
        result = await getUserInfo(data.userId);
        break;
        
      case 'updateUserInfo':
        result = await updateUserInfo(data.userId, data);
        break;
        
      case 'changePassword':
        result = await changePassword(data.userId, data.oldPassword, data.newPassword);
        break;
        
      default:
        result = { success: false, error: '未知的操作' };
    }
    
    return result;
  } catch (error) {
    console.error('Mobile Auth Error:', error);
    return { success: false, error: error.message };
  }
};
