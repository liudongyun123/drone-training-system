/**
 * 同步培训班level名称 - 将旧名称映射到新名称
 * RENSHE: 入门班→初级工, 基础班→中级工, 进阶班→高级工, 高级班→技师, 考证班→高级技师
 * CAAC: CAAC入门班→视距内驾驶员, CAAC基础班→超视距驾驶员, CAAC进阶班→教员
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

// RENSHE 旧→新映射
const RENSHE_LEVEL_MAP = {
  '入门班': '初级工',
  '基础班': '中级工',
  '进阶班': '高级工',
  '高级班': '技师',
  '考证班': '高级技师'
}

// CAAC 旧→新映射
const CAAC_LEVEL_MAP = {
  'CAAC入门班': '视距内驾驶员',
  'CAAC基础班': '超视距驾驶员',
  'CAAC进阶班': '教员'
}

exports.main = async (event, context) => {
  try {
    // 1. 获取所有培训班
    const classesResult = await db.collection('classes')
      .limit(100)
      .get()

    const classes = classesResult.data || []
    console.log(`找到 ${classes.length} 条培训班`)

    if (classes.length === 0) {
      return { success: true, message: '没有培训班', updated: 0 }
    }

    // 2. 批量更新 level 字段
    const updatePromises = classes.map(async (cls) => {
      const oldLevel = cls.level || ''
      let newLevel = oldLevel

      // 检查是否是RENSHE旧名称
      if (RENSHE_LEVEL_MAP[oldLevel]) {
        newLevel = RENSHE_LEVEL_MAP[oldLevel]
        await db.collection('classes').doc(cls._id).update({
          data: { level: newLevel }
        })
        return { id: cls._id, name: cls.name, oldLevel, newLevel, updated: true }
      }

      // 检查是否是CAAC旧名称
      if (CAAC_LEVEL_MAP[oldLevel]) {
        newLevel = CAAC_LEVEL_MAP[oldLevel]
        await db.collection('classes').doc(cls._id).update({
          data: { level: newLevel }
        })
        return { id: cls._id, name: cls.name, oldLevel, newLevel, updated: true }
      }

      // 检查名称中是否包含CAAC
      if (cls.name?.includes('CAAC')) {
        // CAAC的培训班默认设置为超视距驾驶员
        newLevel = '超视距驾驶员'
        await db.collection('classes').doc(cls._id).update({
          data: { level: newLevel }
        })
        return { id: cls._id, name: cls.name, oldLevel: oldLevel || '(空)', newLevel, updated: true }
      }

      return { id: cls._id, name: cls.name, oldLevel, newLevel, updated: false }
    })

    const results = await Promise.all(updatePromises)
    const updatedCount = results.filter(r => r.updated).length

    console.log(`更新完成: 成功 ${updatedCount} 条, 无需更新 ${results.length - updatedCount} 条`)

    return {
      success: true,
      message: `更新完成: 成功 ${updatedCount} 条`,
      updated: updatedCount,
      unchanged: results.length - updatedCount,
      details: results
    }
  } catch (err) {
    console.error('同步培训班level失败:', err)
    return { success: false, error: err.message || '同步失败' }
  }
}