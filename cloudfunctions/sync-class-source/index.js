/**
 * 同步培训班sourceId - 根据level字段判断体系并批量更新
 * RENSHE: 入门班, 基础班, 进阶班, 高级班, 考证班
 * CAAC: CAAC入门班, CAAC基础班, CAAC进阶班, CAAC高级班, CAAC考证班
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

// RENSHE 体系的等级
const RENSHE_LEVELS = ['入门班', '基础班', '进阶班', '高级班', '考证班']
// CAAC 体系的等级
const CAAC_LEVELS = ['CAAC入门班', 'CAAC基础班', 'CAAC进阶班', 'CAAC高级班', 'CAAC考证班']

exports.main = async (event, context) => {
  try {
    // 1. 获取所有没有 sourceId 的培训班
    const classesResult = await db.collection('classes')
      .where({
        sourceId: _.exists(false)
      })
      .limit(100)
      .get()

    const classes = classesResult.data || []
    console.log(`找到 ${classes.length} 条培训班需要更新 sourceId`)

    if (classes.length === 0) {
      return {
        success: true,
        message: '没有需要更新的培训班',
        updated: 0
      }
    }

    // RENSHE sourceId
    const RENSHE_SOURCE = 'e35392d069fc521f0152e2c14dbb4a18'
    const CAAC_SOURCE = 'e35392d069fc521f0152e2c2537e32ad'

    // 2. 批量更新
    const updatePromises = classes.map(async (cls) => {
      const level = cls.level || ''
      let sourceId = null

      // 根据 level 判断体系
      if (CAAC_LEVELS.some(l => level.includes(l) || cls.name?.includes('CAAC'))) {
        sourceId = CAAC_SOURCE
      } else if (RENSHE_LEVELS.some(l => level.includes(l))) {
        sourceId = RENSHE_SOURCE
      }

      if (sourceId) {
        await db.collection('classes').doc(cls._id).update({
          data: {
            sourceId: sourceId
          }
        })
        return { id: cls._id, name: cls.name, level: cls.level, sourceId, updated: true }
      } else {
        console.warn(`培训班 ${cls._id} 的 level ${cls.level} 无法判断体系`)
        return { id: cls._id, name: cls.name, level: cls.level, sourceId: null, updated: false }
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
    console.error('同步培训班sourceId失败:', err)
    return {
      success: false,
      error: err.message || '同步失败',
      message: '同步培训班sourceId失败'
    }
  }
}