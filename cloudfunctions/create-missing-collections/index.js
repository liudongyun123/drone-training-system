/**
 * 创建缺失的数据库集合
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 通过添加临时数据创建集合
 */
async function createCollection(collectionName, sampleData) {
  console.log(`创建集合: ${collectionName}`)
  
  try {
    // 尝试读取，如果不存在会报错
    await db.collection(collectionName).limit(1).get()
    console.log(`  ✓ 已存在`)
    return { success: true, collection: collectionName, action: 'exists' }
  } catch (e) {
    if (e.code === 'DATABASE_COLLECTION_NOT_EXIST') {
      try {
        // 通过添加数据创建集合
        const result = await db.collection(collectionName).add({
          data: {
            ...sampleData,
            _temp: true,
            createdAt: new Date().toISOString(),
          }
        })
        
        // 删除临时数据
        await db.collection(collectionName).doc(result._id).remove()
        console.log(`  ✓ 创建成功`)
        return { success: true, collection: collectionName, action: 'created' }
      } catch (addError) {
        console.error(`  ✗ 失败: ${addError.message}`)
        return { success: false, collection: collectionName, error: addError.message }
      }
    }
    console.error(`  ✗ 错误: ${e.message}`)
    return { success: false, collection: collectionName, error: e.message }
  }
}

exports.main = async (event, context) => {
  const results = []
  
  console.log('开始创建缺失集合...\n')

  // 1. user_settings - 用户设置
  results.push(await createCollection('user_settings', {
    pushEnabled: true,
    emailEnabled: false,
    theme: 'light',
    language: 'zh-CN',
    notificationPreferences: {},
  }))

  // 2. daily_stats - 每日统计
  results.push(await createCollection('daily_stats', {
    date: '2026-01-01',
    newUsers: 0,
    activeUsers: 0,
    newOrders: 0,
    totalRevenue: 0,
    newCourses: 0,
    newEnrollments: 0,
  }))

  console.log('\n创建完成！')
  console.log(`成功: ${results.filter(r => r.success).length}`)
  console.log(`失败: ${results.filter(r => !r.success).length}`)

  return {
    code: 0,
    data: results,
  }
}
