/**
 * 数据库备份脚本
 * 
 * 用途：导出所有关键集合数据到本地 JSON 文件
 * 
 * 使用方法：
 *   node scripts/backup-database.js
 */

const tcb = require('tcb-admin-node')
const fs = require('fs')
const path = require('path')

// 初始化
tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
})

const db = tcb.database()

// 备份目录
const BACKUP_DIR = path.join(__dirname, '../backups')
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const BACKUP_PATH = path.join(BACKUP_DIR, `backup-${TIMESTAMP}`)

// 需要备份的集合
const COLLECTIONS = [
  'sources',
  'categories', 
  'courses',
  'classes',
  'enrollments',
  'orders',
  'payments',
  'users',
  'admins',
  'teachers',
  'question_banks',
  'questions',
  'exams',
  'exam_attempts',
  'schedules',
  'course_permissions',
  'learning_progress',
  'featured_courses',
  'notices',
  'dictionaries',
]

async function backupCollection(collectionName) {
  console.log(`  备份 ${collectionName}...`)
  
  try {
    let allData = []
    let skip = 0
    const limit = 100
    let total = 0
    
    while (true) {
      const result = await db.collection(collectionName)
        .skip(skip)
        .limit(limit)
        .get()
      
      const data = result.data || []
      allData = allData.concat(data)
      total = data.length
      
      if (data.length < limit) break
      skip += limit
    }
    
    return {
      collection: collectionName,
      count: allData.length,
      data: allData
    }
  } catch (err) {
    console.error(`  ❌ ${collectionName}: ${err.message}`)
    return {
      collection: collectionName,
      count: 0,
      data: [],
      error: err.message
    }
  }
}

async function main() {
  console.log('=========================================')
  console.log('数据库备份开始')
  console.log('时间:', new Date().toISOString())
  console.log('=========================================')
  
  // 创建备份目录
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.mkdirSync(BACKUP_PATH, { recursive: true })
  }
  
  console.log(`\n备份目录: ${BACKUP_PATH}`)
  console.log(`需要备份 ${COLLECTIONS.length} 个集合\n`)
  
  const results = []
  let successCount = 0
  let errorCount = 0
  
  for (const collectionName of COLLECTIONS) {
    const result = await backupCollection(collectionName)
    results.push(result)
    
    if (result.error) {
      errorCount++
    } else {
      successCount++
    }
  }
  
  // 保存备份元数据
  const metadata = {
    timestamp: new Date().toISOString(),
    environment: process.env.TCB_ENV_ID || 'unknown',
    totalCollections: COLLECTIONS.length,
    successCount,
    errorCount,
    collections: results.map(r => ({
      name: r.collection,
      count: r.count,
      status: r.error ? 'error' : 'success'
    }))
  }
  
  // 保存每个集合的数据
  for (const result of results) {
    if (result.data && result.data.length > 0) {
      const filePath = path.join(BACKUP_PATH, `${result.collection}.json`)
      fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2))
      console.log(`  ✅ ${result.collection}: ${result.count} 条记录`)
    } else if (result.error) {
      console.log(`  ❌ ${result.collection}: ${result.error}`)
    } else {
      console.log(`  ⏭️ ${result.collection}: 0 条记录`)
    }
  }
  
  // 保存元数据
  const metadataPath = path.join(BACKUP_PATH, 'metadata.json')
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  
  // 保存汇总报告
  const report = {
    title: '数据库备份报告',
    timestamp: new Date().toISOString(),
    summary: {
      totalCollections: COLLECTIONS.length,
      successCount,
      errorCount,
      totalRecords: results.reduce((sum, r) => sum + r.count, 0)
    },
    details: results
  }
  const reportPath = path.join(BACKUP_DIR, `backup-report-${TIMESTAMP}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  
  console.log('\n=========================================')
  console.log('备份完成!')
  console.log('=========================================')
  console.log(`备份目录: ${BACKUP_PATH}`)
  console.log(`报告文件: ${reportPath}`)
  console.log(`成功: ${successCount} 个集合`)
  console.log(`失败: ${errorCount} 个集合`)
  console.log(`总记录数: ${report.summary.totalRecords}`)
  console.log('=========================================')
  
  // 恢复指南
  console.log('\n恢复数据方法:')
  console.log(`  node scripts/restore-database.js ${TIMESTAMP}`)
  
  return report
}

main().catch(err => {
  console.error('备份失败:', err)
  process.exit(1)
})
