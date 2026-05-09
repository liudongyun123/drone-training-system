/**
 * 同步课程sourceId - 根据categoryId关联的sourceId批量更新
 */

let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// categoryId -> sourceId 映射
const CATEGORY_SOURCE_MAP = {
  // RENSHE 人社培训
  'ae0498ca69fc35c2014d4d3e332b809b': 'e35392d069fc521f0152e2c14dbb4a18', // 植保无人机
  'edc7bd2969fc35c30151ff035b0c276d': 'e35392d069fc521f0152e2c14dbb4a18', // 航拍无人机
  '97b16bdb69fc35c401505fe61ad82e56': 'e35392d069fc521f0152e2c14dbb4a18', // 物流无人机
  '98d3bbc169fc35c5015270c47a488d1b': 'e35392d069fc521f0152e2c14dbb4a18', // 安防无人机
  '611e990a69fc35c7014cb85146ae2c00': 'e35392d069fc521f0152e2c14dbb4a18', // 测绘无人机
  'edc7bd2969fc35c80151ff497725f148': 'e35392d069fc521f0152e2c14dbb4a18', // 巡检无人机
  '9cd783ff69fc35ca0150cb4436019c71': 'e35392d069fc521f0152e2c14dbb4a18', // 装调检修工
  // CAAC 培训
  'ae0498ca69fc52380151cf9344ba694d': 'e35392d069fc521f0152e2c2537e32ad', // 多旋翼
  'ae0498ca69fc52380151cf9416b82e7b': 'e35392d069fc521f0152e2c2537e32ad', // 固定翼
  'ae0498ca69fc52380151cf9549195c14': 'e35392d069fc521f0152e2c2537e32ad', // 直升机
  'ae0498ca69fc52380151cf96d1a7d0ff1': 'e35392d069fc521f0152e2c2537e32ad', // 垂直起降固定翼
}

exports.main = async (event, context) => {
  try {
    // 1. 获取所有没有 sourceId 的课程
    const coursesResult = await db.collection('courses')
      .where({
        sourceId: _.exists(false)
      })
      .limit(100)
      .get()

    const courses = coursesResult.data || []
    console.log(`找到 ${courses.length} 条课程需要更新 sourceId`)

    if (courses.length === 0) {
      return {
        success: true,
        message: '没有需要更新的课程',
        updated: 0
      }
    }

    // 2. 批量更新
    const updatePromises = courses.map(async (course) => {
      const sourceId = CATEGORY_SOURCE_MAP[course.categoryId]
      if (sourceId) {
        await db.collection('courses').doc(course._id).update({
          data: {
            sourceId: sourceId
          }
        })
        return { id: course._id, categoryId: course.categoryId, sourceId, updated: true }
      } else {
        console.warn(`课程 ${course._id} 的 categoryId ${course.categoryId} 没有对应的 sourceId 映射`)
        return { id: course._id, categoryId: course.categoryId, sourceId: null, updated: false }
      }
    })

    const results = await Promise.all(updatePromises)
    const updatedCount = results.filter(r => r.updated).length

    console.log(`更新完成: 成功 ${updatedCount} 条, 失败 ${results.length - updatedCount} 条`)

    return {
      success: true,
      message: `更新完成: 成功 ${updatedCount} 条`,
      updated: updatedCount,
      failed: results.length - updatedCount,
      details: results
    }
  } catch (err) {
    console.error('同步课程sourceId失败:', err)
    return {
      success: false,
      error: err.message || '同步失败',
      message: '同步课程sourceId失败'
    }
  }
}