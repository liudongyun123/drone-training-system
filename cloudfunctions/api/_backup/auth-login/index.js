const tcb = require('@cloudbase/node-sdk')
const jwt = require('jsonwebtoken')

exports.main = async (event) => {
  const { app } = tcb.init({
    env: event.envId || process.env.TCB_ENV_ID
  })

  const { code } = event

  try {
    // 这里应该调用微信API获取用户信息
    // 暂时返回模拟用户数据
    const mockUser = {
      openid: 'mock_openid_' + Date.now(),
      name: '测试用户',
      email: 'test@example.com',
      avatar: '',
      level: 'beginner',
      created_at: new Date().toISOString()
    }

    // 生成JWT token
    const token = jwt.sign(
      { openid: mockUser.openid, name: mockUser.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    // 检查用户是否已存在
    const db = app.database()
    const result = await db
      .collection('users')
      .where({
        openid: mockUser.openid
      })
      .get()

    if (result.data.length === 0) {
      // 新用户，创建记录
      await db.collection('users').add({
        ...mockUser,
        progress: {
          completedCourses: [],
          currentCourseId: null,
          totalHours: 0
        }
      })
    }

    return {
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: mockUser
      }
    }
  } catch (error) {
    console.error('登录错误:', error)
    return {
      code: -1,
      message: '登录失败',
      error: error.message
    }
  }
}
