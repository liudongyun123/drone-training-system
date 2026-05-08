const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 更新人社分类的sourceId为'RENSHE'
    const updateResult = await db.collection('categories')
      .where({
        sourceId: 'e35392d069fc521f0152e2c14dbb4a18'
      })
      .update({
        data: {
          sourceId: 'RENSHE'
        }
      })

    return {
      success: true,
      message: `更新成功：修改了 ${updateResult.updated}个人社分类的sourceId为'RENSHE'`
    }
  } catch (error) {
    return {
      success: false,
      message: '更新失败',
      error: error.message
    }
  }
}