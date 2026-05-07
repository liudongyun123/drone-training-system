const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const APPID = 'wx25aaf895ab86181a'
const SECRET = '4836700e9a4212516aed373393a38248'

// 获取 access_token
let cachedAccessToken = null
let accessTokenExpireTime = 0

async function getAccessToken() {
  // 如果有缓存且未过期，直接返回
  if (cachedAccessToken && Date.now() < accessTokenExpireTime) {
    return cachedAccessToken
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.errcode) {
            reject(new Error(`获取access_token失败: ${result.errmsg}`))
          } else {
            // 缓存 access_token，提前5分钟过期
            cachedAccessToken = result.access_token
            accessTokenExpireTime = Date.now() + (result.expires_in - 300) * 1000
            console.log('[login-http] access_token 已刷新，有效期:', result.expires_in, '秒')
            resolve(result.access_token)
          }
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// 小程序登录 - codeToSession
async function wxMiniappLogin(code) {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          if (result.errcode) {
            reject(new Error(`微信API错误: errcode=${result.errcode}, errmsg=${result.errmsg}`))
          } else {
            resolve(result)
          }
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

// 获取手机号
async function getPhoneNumber(code, openid) {
  const accessToken = await getAccessToken()
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`

  const postData = JSON.stringify({ code })

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          console.log('[login-http] getPhoneNumber result:', JSON.stringify(result))
          if (result.errcode) {
            reject(new Error(`获取手机号失败: errcode=${result.errcode}, errmsg=${result.errmsg}`))
          } else {
            resolve(result.phone_info)
          }
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

// 保存用户信息
async function saveUserInfo(openid, userInfo, phone) {
  const db = cloud.database()

  // 查询用户
  const users = await db.collection('users').where({ openid }).get()

  const updateData = {
    lastLoginTime: new Date()
  }

  if (userInfo) {
    updateData.nickname = userInfo.nickname || userInfo.userInfo?.nickName
    updateData.avatarUrl = userInfo.avatarUrl || userInfo.userInfo?.avatarUrl
    updateData.gender = userInfo.gender || userInfo.userInfo?.gender
    updateData.country = userInfo.country || userInfo.userInfo?.country
    updateData.province = userInfo.province || userInfo.userInfo?.province
    updateData.city = userInfo.city || userInfo.userInfo?.city
  }

  if (phone) {
    updateData.phone = phone
    updateData.phoneBindTime = new Date()
  }

  if (users.data.length > 0) {
    // 用户已存在，更新
    await db.collection('users').doc(users.data[0]._id).update({
      data: updateData
    })
    return users.data[0]._id
  } else {
    // 新用户创建
    const createData = {
      openid,
      createTime: new Date(),
      ...updateData
    }
    const res = await db.collection('users').add({ data: createData })
    return res.id
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  console.log('[login-http] wxContext:', JSON.stringify(wxContext))

  // HTTP 触发器：body 是 JSON 字符串，需要解析
  let action, params
  if (event.body) {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    action = body.action
    params = body
  } else {
    action = event.action
    params = event
  }

  console.log('[login-http] 收到请求, action:', action)

  try {
    switch (action) {
      case 'wxMiniappLogin': {
        const { code, userInfo } = params
        console.log('[login-http] 小程序微信登录, code:', code)

        // 使用手动实现的 codeToSession
        const sessionData = await wxMiniappLogin(code)
        console.log('[login-http] sessionData:', JSON.stringify(sessionData))

        const openid = sessionData.openid
        const session_key = sessionData.session_key

        if (!openid) {
          console.error('[login-http] 无法获取 openid')
          return {
            statusCode: 400,
            body: JSON.stringify({ success: false, error: '获取openid失败' })
          }
        }

        // 保存用户信息
        const userId = await saveUserInfo(openid, userInfo, null)

        console.log('[login-http] 登录成功, userId:', userId)

        // HTTP 触发器直接返回 JSON 对象
        return {
          success: true,
          data: {
            openid,
            userId,
            session_key
          }
        }
      }

      case 'getPhoneNumber': {
        const { code } = params
        console.log('[login-http] 获取手机号, code:', code)

        if (!code) {
          return {
            success: false,
            error: 'code不能为空'
          }
        }

        // 获取手机号
        const phoneInfo = await getPhoneNumber(code)
        console.log('[login-http] phoneInfo:', JSON.stringify(phoneInfo))

        const { phoneNumber, openid } = phoneInfo

        if (!phoneNumber) {
          throw new Error('获取手机号失败')
        }

        // 更新用户信息中的手机号
        if (openid) {
          await saveUserInfo(openid, null, phoneNumber)
        }

        return {
          success: true,
          data: {
            phone: phoneNumber,
            openid: openid || ''
          }
        }
      }

      case 'updateUserInfo': {
        const { openid, userInfo, phone } = params
        console.log('[login-http] 更新用户信息, openid:', openid)

        if (!openid) {
          return {
            success: false,
            error: 'openid不能为空'
          }
        }

        const userId = await saveUserInfo(openid, userInfo, phone)

        return {
          success: true,
          data: { userId }
        }
      }

      default:
        console.error('[login-http] 未知action:', action)
        return {
          success: false,
          error: '未知action: ' + action
        }
    }
  } catch (error) {
    console.error('[login-http] 错误:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}