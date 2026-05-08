// 添加用户云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { phone, password, username, role } = event
  
  try {
    // 检查用户是否已存在
    const existResult = await db.collection('users').where({
      'data.phone': phone
    }).count()
    
    if (existResult.total > 0) {
      // 更新现有用户
      const updateResult = await db.collection('users').where({
        'data.phone': phone
      }).update({
        data: {
          password: password,
          'data.updatedAt': new Date().toISOString()
        }
      })
      
      return {
        success: true,
        message: '用户已存在，密码已更新',
        updated: updateResult.updated || 1
      }
    }
    
    // 添加新用户
    const result = await db.collection('users').add({
      password: password,
      data: {
        phone: phone,
        username: username || phone,
        role: role || 'student',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
    
    return {
      success: true,
      message: '用户添加成功',
      id: result.id
    }
  } catch (error) {
    return {
      success: false,
      message: '操作失败',
      error: error.message
    }
  }
}
