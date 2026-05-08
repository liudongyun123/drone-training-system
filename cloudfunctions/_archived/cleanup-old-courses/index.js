const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 有效的sourceId：RENSHE 和 新的CAAC ID
const VALID_SOURCE_IDS = ['RENSHE', 'e35392d069fc521f0152e2c2537e32ad']

exports.main = async (event, context) => {
  try {
    // 先统计所有课程
    const { total } = await db.collection('courses').count()

    // 删除不在有效sourceId列表中的课程
    const deleteResult = await db.collection('courses')
      .where({
        sourceId: db.command.nin(VALID_SOURCE_IDS)
      })
      .remove()

    return {
      success: true,
      message: `清理完成：删除了 ${deleteResult.deleted || 0} 个旧课程，共保留 ${total - (deleteResult.deleted || 0)} 个有效课程`,
      deleted: deleteResult.deleted || 0,
      remaining: total - (deleteResult.deleted || 0),
      totalBefore: total
    }
  } catch (error) {
    return {
      success: false,
      message: '删除失败',
      error: error.message
    }
  }
}