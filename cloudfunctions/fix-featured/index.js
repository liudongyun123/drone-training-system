/**
 * 修复首页配置云函数 v2
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

exports.main = async (event, context) => {
  console.log('[fix-featured-v2] 开始修复首页配置...')
  
  try {
    // 正确的课程ID
    const correctCourseIds = [
      '98d3bbc169f4c25c00858e7126923354',
      'ae0498ca69f4c25c0081596c2f51f2b5',
      '399cd1a569f4c2610080937d35342599',
      'e35392d069f4c261007e9aa3342e0710',
    ]

    // 正确的班级ID
    const correctClassIds = [
      '8e40b4e269f4c25d00816c430b856da4',
      'ee33190469f4c25d0080d9634d1121d5',
      'ae0498ca69f4c261008159a308011a88',
    ]

    const results = {}

    // 1. 更新热门课程配置 - 使用 upsert
    try {
      await db.collection('featuredCourses').doc('home-featured').set({
        data: {
          courseIds: correctCourseIds,
          updateTime: new Date().toISOString()
        }
      })
      console.log('[fix-featured-v2] 热门课程配置已更新')
      results.courses = 'success'
    } catch (e) {
      console.error('[fix-featured-v2] 更新热门课程失败:', e.message)
      results.courses = 'error: ' + e.message
    }

    // 2. 更新热门班级配置 - 使用 upsert
    try {
      await db.collection('featuredClasses').doc('home-featured-classes').set({
        data: {
          classIds: correctClassIds,
          description: '首页展示班级配置',
          updateTime: new Date().toISOString()
        }
      })
      console.log('[fix-featured-v2] 热门班级配置已更新')
      results.classes = 'success'
    } catch (e) {
      console.error('[fix-featured-v2] 更新热门班级失败:', e.message)
      results.classes = 'error: ' + e.message
    }

    return {
      success: true,
      message: '首页配置修复完成',
      results,
      courseIds: correctCourseIds,
      classIds: correctClassIds
    }

  } catch (error) {
    console.error('[fix-featured-v2] 修复失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
