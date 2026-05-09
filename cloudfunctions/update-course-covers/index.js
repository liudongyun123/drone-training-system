/**
 * 更新课程封面图片
 */
let cloud
try {
  cloud = require('wx-server-sdk')
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV || cloud.SYMBOL_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const courses = [
    { id: 'ee33190469f4d3f80083191f250ae9cc', cover: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800' },
    { id: 'edc7bd2969f4d3f800857d752e040df5', cover: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800' },
    { id: 'ae0498ca69f4d3f800831e372d8a07ec', cover: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800' }
  ]

  const results = []
  for (const course of courses) {
    try {
      await db.collection('courses').doc(course.id).update({
        data: { cover: course.cover }
      })
      results.push({ id: course.id, success: true })
    } catch (e) {
      results.push({ id: course.id, success: false, error: e.message })
    }
  }

  return { success: true, results }
}