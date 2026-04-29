// 云函数: getPhoneNumber
// 获取用户手机号并绑定

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 使用微信接口获取手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: event.code
    })
    
    const phoneInfo = result.phoneInfo
    const phone = phoneInfo.phoneNumber
    
    if (!phone) {
      return { success: false, error: '获取手机号失败' }
    }
    
    // 更新用户手机号
    const userResult = await db.collection('users')
      .where({ openid })
      .get()
    
    if (userResult.data.length > 0) {
      await db.collection('users').doc(userResult.data[0]._id).update({
        phone,
        phoneVerified: true,
        updatedAt: db.serverDate()
      })
    }
    
    return {
      success: true,
      phoneNumber: phone,
      purePhoneNumber: phoneInfo.purePhoneNumber,
      countryCode: phoneInfo.countryCode
    }
  } catch (err) {
    console.error('获取手机号失败:', err)
    return { success: false, error: err.message }
  }
}
