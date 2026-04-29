const tcb = require('@cloudbase/node-sdk')

exports.main = async (event) => {
  const { app } = tcb.init({
    env: event.envId || process.env.TCB_ENV_ID
  })

  try {
    const db = app.database()

    // 查询所有课程
    const result = await db.collection('courses').get()

    return {
      code: 0,
      message: '获取课程列表成功',
      data: result.data
    }
  } catch (error) {
    console.error('获取课程列表错误:', error)
    return {
      code: -1,
      message: '获取课程列表失败',
      error: error.message
    }
  }
}
