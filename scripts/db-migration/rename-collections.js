/**
 * 集合重命名脚本
 * 
 * CloudBase 不支持直接重命名集合，采用"复制到新集合"方式
 * 
 * 执行顺序：
 * 1. init-new-collections.js（创建空集合）
 * 2. rename-collections.js（复制数据到新集合）
 * 3. migrate-users.js（合并用户数据）
 * 4. migrate-orders.js（统一订单格式）
 */

const cloud = require('tcb-admin-node')

cloud.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = cloud.database()

// 重命名映射
const RENAME_MAP = {
  'course_categories': 'categories',
  'learning_progress': 'progress',
  'examAttempts': 'exam_attempts',
  'questionBanks': 'question_banks',
  'practiceRecords': 'practice_records',
  'attendance_records': 'attendance',
  'course_schedules': 'schedules'
}

async function renameCollections() {
  console.log('开始集合重命名（数据复制）...\n')

  for (const [oldName, newName] of Object.entries(RENAME_MAP)) {
    console.log(`${oldName} → ${newName}`)

    try {
      // 1. 检查旧集合是否存在数据
      const oldData = await getAllRecords(oldName)
      
      if (oldData.length === 0) {
        console.log(`  旧集合为空，跳过`)
        continue
      }

      // 2. 检查新集合是否已有数据
      const existingData = await getAllRecords(newName)
      
      if (existingData.length > 0) {
        console.log(`  新集合已有 ${existingData.length} 条数据，跳过`)
        continue
      }

      // 3. 复制数据到新集合
      const BATCH_SIZE = 100
      let copied = 0

      for (let i = 0; i < oldData.length; i += BATCH_SIZE) {
        const batch = oldData.slice(i, i + BATCH_SIZE)
        
        // 移除 _id，让数据库自动生成新ID
        const cleaned = batch.map(({ _id, ...rest }) => rest)
        
        try {
          await db.collection(newName).add(cleaned)
          copied += batch.length
        } catch (e) {
          console.error(`  批次 ${Math.floor(i / BATCH_SIZE) + 1} 失败: ${e.message}`)
        }
      }

      console.log(`  ✅ 复制 ${copied} 条数据`)
    } catch (e) {
      console.error(`  ❌ 失败: ${e.message}`)
    }

    console.log()
  }

  console.log('重命名完成！')
  console.log('\n后续步骤:')
  console.log('1. 确认新集合数据正确后，删除旧集合')
  console.log('2. 运行 migrate-users.js 合并用户数据')
  console.log('3. 运行 migrate-orders.js 统一订单格式')
}

async function getAllRecords(collection) {
  const MAX_LIMIT = 1000
  const result = []
  let skip = 0

  while (true) {
    try {
      const res = await db.collection(collection)
        .skip(skip)
        .limit(MAX_LIMIT)
        .get()
      
      result.push(...res.data)
      if (res.data.length < MAX_LIMIT) break
      skip += MAX_LIMIT
    } catch (e) {
      // 集合可能不存在
      return []
    }
  }

  return result
}

if (require.main === module) {
  renameCollections().catch(err => console.error('错误:', err))
}

module.exports = { renameCollections }
