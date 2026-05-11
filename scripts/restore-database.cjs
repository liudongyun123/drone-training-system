/**
 * 数据库恢复脚本
 * 
 * 用途：从备份文件恢复数据
 * 
 * 使用方法：
 *   node scripts/restore-database.js [timestamp]
 * 
 * 示例：
 *   node scripts/restore-database.js 2026-05-11T18-10-00
 */

const tcb = require('tcb-admin-node')
const fs = require('fs')
const path = require('path')

// 初始化
tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
})

const db = tcb.database()
const _ = db.command

// 备份目录
const BACKUP_DIR = path.join(__dirname, '../backups')

async function restoreCollection(collectionName, data) {
  console.log(`  恢复 ${collectionName}...`)
  
  try {
    // 清空现有数据
    const existing = await db.collection(collectionName).get()
    if (existing.data && existing.data.length > 0) {
      const ids = existing.data.map(doc => doc._id)
      await db.collection(collectionName).where({
        _id: _.in(ids)
      }).remove()
    }
    
    // 插入备份数据
    if (data && data.length > 0) {
      // 批量插入（每次最多100条）
      const batchSize = 100
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        for (const doc of batch) {
          delete doc._id  // 让数据库生成新ID
          await db.collection(collectionName).add(doc)
        }
      }
    }
    
    return { collection: collectionName, count: data.length, success: true }
  } catch (err) {
    console.error(`  ❌ ${collectionName}: ${err.message}`)
    return { collection: collectionName, error: err.message, success: false }
  }
}

async function main() {
  const timestamp = process.argv[2]
  
  if (!timestamp) {
    console.log('请指定备份时间戳')
    console.log('用法: node scripts/restore-database.js [timestamp]')
    console.log('\n可用备份:')
    
    if (fs.existsSync(BACKUP_DIR)) {
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup-'))
        .sort()
        .reverse()
      
      if (backups.length === 0) {
        console.log('  没有找到备份')
      } else {
        backups.slice(0, 10).forEach(b => console.log(`  - ${b.replace('backup-', '')}`))
      }
    } else {
      console.log('  没有找到备份目录')
    }
    return
  }
  
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`)
  
  if (!fs.existsSync(backupPath)) {
    console.error(`备份不存在: ${backupPath}`)
    return
  }
  
  console.log('=========================================')
  console.log('数据库恢复开始')
  console.log('备份: backup-' + timestamp)
  console.log('时间:', new Date().toISOString())
  console.log('=========================================')
  console.log('⚠️  警告: 此操作将清空现有数据并替换为备份数据!')
  console.log('')
  
  // 确认操作
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const answer = await new Promise(resolve => {
    rl.question('确认恢复? (yes/no): ', resolve)
  })
  rl.close()
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('已取消')
    return
  }
  
  // 读取备份文件
  const metadataPath = path.join(backupPath, 'metadata.json')
  if (!fs.existsSync(metadataPath)) {
    console.error('无效的备份目录')
    return
  }
  
  const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.json') && f !== 'metadata.json')
  
  console.log(`\n将恢复 ${files.length} 个集合\n`)
  
  const results = []
  for (const file of files) {
    const collectionName = file.replace('.json', '')
    const data = JSON.parse(fs.readFileSync(path.join(backupPath, file), 'utf8'))
    const result = await restoreCollection(collectionName, data)
    results.push(result)
    
    if (result.success) {
      console.log(`  ✅ ${collectionName}: ${result.count} 条`)
    }
  }
  
  console.log('\n=========================================')
  console.log('恢复完成!')
  console.log('=========================================')
  console.log(`成功: ${results.filter(r => r.success).length} 个集合`)
  console.log(`失败: ${results.filter(r => !r.success).length} 个集合`)
}

main().catch(err => {
  console.error('恢复失败:', err)
  process.exit(1)
})
