/**
 * 数据库备份云函数
 * 
 * 用途：导出所有关键集合数据，返回 JSON 结果
 * 
 * 调用方式：在云函数控制台测试
 *   { "action": "backup" }
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

const COLLECTIONS = [
  'sources', 'categories', 'courses', 'classes',
  'enrollments', 'orders', 'payments', 'users',
  'teachers', 'question_banks', 'questions', 'exams',
  'exam_attempts', 'schedules', 'course_permissions',
  'featured_courses', 'notices', 'dictionaries'
]

async function backupCollection(collectionName) {
  try {
    let allData = []
    let skip = 0
    const limit = 100
    
    while (true) {
      const result = await db.collection(collectionName)
        .skip(skip)
        .limit(limit)
        .get()
      
      const data = result.data || []
      allData = allData.concat(data)
      
      if (data.length < limit) break
      skip += limit
    }
    
    return { collection: collectionName, count: allData.length, data: allData }
  } catch (err) {
    return { collection: collectionName, count: 0, error: err.message }
  }
}

exports.main = async (event, context) => {
  const { action } = event
  
  console.log('数据库备份开始', new Date().toISOString())
  
  const results = []
  let totalRecords = 0
  
  for (const collectionName of COLLECTIONS) {
    console.log(`备份 ${collectionName}...`)
    const result = await backupCollection(collectionName)
    results.push(result)
    totalRecords += result.count
  }
  
  return {
    code: 0,
    timestamp: new Date().toISOString(),
    totalCollections: results.length,
    totalRecords,
    results
  }
}
