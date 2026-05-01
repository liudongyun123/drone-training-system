// ============================================================================
// getPhoneNumber 云函数 - 获取用户手机号
// ============================================================================

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { code } = event

  try {
    // 调用微信接口获取手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code
    })

    const phoneNumber = result.phoneInfo.phoneNumber
    const openid = wxContext.OPENID

    // 更新用户手机号
    await db.collection('users').where({ openid }).update({
      phone: phoneNumber,
      updatedAt: new Date().toISOString()
    })

    return {
      phoneNumber,
      openid
    }
  } catch (err) {
    console.error('获取手机号失败:', err)
    return {
      errCode: -1,
      errMsg: err.message
    }
  }
}