// ============================================================================
// login 云函数 - 小程序登录
// ============================================================================

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { code, userInfo } = event

  try {
    // 获取 openid
    const openid = wxContext.OPENID

    // 查找或创建用户
    const userResult = await db.collection('users').where({ openid }).get()

    let userId
    if (userResult.data.length > 0) {
      // 用户已存在，更新信息
      userId = userResult.data[0]._id
      if (userInfo) {
        await db.collection('users').doc(userId).update({
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          lastLoginAt: new Date().toISOString()
        })
      }
    } else {
      // 创建新用户
      const newUser = {
        openid,
        nickName: userInfo?.nickName || '',
        avatarUrl: userInfo?.avatarUrl || '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }
      const result = await db.collection('users').add(newUser)
      userId = result.id || result.insertedId
    }

    return {
      openid,
      userId,
      appId: wxContext.APPID,
      unionId: wxContext.UNIONID
    }
  } catch (err) {
    console.error('登录失败:', err)
    return {
      errCode: -1,
      errMsg: err.message
    }
  }
}