const tcb = require('@cloudbase/node-sdk')

exports.main = async (event) => {
  const { app } = tcb.init({
    env: event.envId || process.env.TCB_ENV_ID
  })

  const { openid, courseId, lessonId, progress } = event

  try {
    const db = app.database()

    // 更新学习进度
    const result = await db
      .collection('user_progress')
      .where({
        openid,
        course_id: courseId
      })
      .get()

    if (result.data.length > 0) {
      // 更新现有进度
      await db
        .collection('user_progress')
        .doc(result.data[0]._id)
        .update({
          lesson_id: lessonId,
          progress,
          updated_at: new Date().toISOString()
        })
    } else {
      // 创建新进度记录
      await db.collection('user_progress').add({
        openid,
        course_id: courseId,
        lesson_id: lessonId,
        progress,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    // 检查是否完成课程
    if (progress === 100) {
      await db
        .collection('users')
        .where({ openid })
        .update({
          'progress.completedCourses': db.command.unshift([courseId]),
          updated_at: new Date().toISOString()
        })
    }

    return {
      code: 0,
      message: '进度更新成功'
    }
  } catch (error) {
    console.error('更新进度错误:', error)
    return {
      code: -1,
      message: '进度更新失败',
      error: error.message
    }
  }
}
