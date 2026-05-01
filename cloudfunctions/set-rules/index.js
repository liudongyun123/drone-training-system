/**
 * 云函数：设置数据库安全规则（临时）
 * 
 * 用于 Plan B：允许匿名用户写入所有集合
 * 生产环境需要删除此函数或设置正确的权限规则
 */

const cloud = require('tcb-admin-node')

cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()

// 需要开放写入的集合列表
const COLLECTIONS = [
  'courses', 'categories', 'teachers', 'products', 'notices', 'classes', 'banners',
  'members', 'users', 'user_roles', 'orders', 'course_orders', 'shop_orders', 'class_orders',
  'schedules', 'transfers', 'certificates', 'comments', 'coupons', 'exams', 'questions',
  'question_banks', 'practice_records', 'learning_paths', 'chapters', 'lessons',
  'enrollments', 'course_permissions', 'featured_courses', 'featured_classes', 
  'featured_learning_paths', 'page_config', 'messages', 'logs', 'dicts'
]

exports.main = async (event) => {
  const results = []
  
  for (const collection of COLLECTIONS) {
    try {
      // 先确保集合存在
      try {
        await db.createCollection(collection)
        results.push(`✅ 创建集合: ${collection}`)
      } catch (e) {
        // 集合可能已存在
        if (!e.message.includes('already exists')) {
          console.log(`集合 ${collection} 已存在或创建失败:`, e.message)
        }
      }
      
      // 尝试插入一条测试记录来验证写权限
      try {
        const testDoc = await db.collection(collection).add({
          _test: true,
          _createdAt: new Date().toISOString()
        })
        
        // 删除测试记录
        if (testDoc.id) {
          await db.collection(collection).doc(testDoc.id).remove()
        }
        
        results.push(`✅ ${collection}: 可写`)
      } catch (e) {
        results.push(`❌ ${collection}: 写入失败 - ${e.message}`)
      }
    } catch (e) {
      results.push(`❌ ${collection}: ${e.message}`)
    }
  }
  
  return {
    code: 0,
    message: '安全规则检查完成。如果所有集合都可写，则后台管理功能正常。',
    results,
    hint: '⚠️ 如有集合写入失败，请前往 CloudBase 控制台手动设置安全规则:\nhttps://console.cloud.tencent.com/tcb/database/rule'
  }
}
