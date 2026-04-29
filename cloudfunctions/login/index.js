// 云函数: login
// 小程序登录 - 获取 openid，创建/更新用户记录

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { code, userInfo } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 查找用户
    const userResult = await db.collection('users')
      .where({ openid })
      .get()
    
    let userId
    
    if (userResult.data.length > 0) {
      // 已有用户，更新信息
      userId = userResult.data[0]._id
      await db.collection('users').doc(userId).update({
        nickName: userInfo?.nickName || userResult.data[0].nickName,
        avatarUrl: userInfo?.avatarUrl || userResult.data[0].avatarUrl,
        lastLoginAt: db.serverDate()
      })
    } else {
      // 新用户
      const result = await db.collection('users').add({
        data: {
          openid,
          nickName: userInfo?.nickName || '微信用户',
          avatarUrl: userInfo?.avatarUrl || '',
          role: 'student',
          phone: '',
          createdAt: db.serverDate(),
          lastLoginAt: db.serverDate()
        }
      })
      userId = result._id
    }
    
    return {
      success: true,
      userId,
      openid,
      userInfo: userResult.data[0] || { openid }
    }
  } catch (err) {
    console.error('登录失败:', err)
    return { success: false, error: err.message }
  }
}
