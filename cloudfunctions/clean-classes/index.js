// ============================================================================
// 清理 classes 集合的嵌套 data 字段
// 将嵌套 data 字段扁平化到顶层，并转换 {"$date": timestamp} 格式
// ============================================================================

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

// 辅助函数：转换 {"$date": timestamp} 格式为 ISO 字符串
function convertDateValue(value) {
  if (value && typeof value === 'object' && '$date' in value) {
    return new Date(value.$date).toISOString()
  }
  return value
}

// 辅助函数：递归转换对象中的日期格式
function convertDatesInObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  
  const result = Array.isArray(obj) ? [] : {}
  
  for (const key in obj) {
    const value = obj[key]
    if (value && typeof value === 'object') {
      if ('$date' in value) {
        result[key] = convertDateValue(value)
      } else {
        result[key] = convertDatesInObject(value)
      }
    } else {
      result[key] = value
    }
  }
  
  return result
}

// 主函数：清理 classes 集合
async function cleanClassesCollection() {
  const results = {
    total: 0,
    cleaned: 0,
    skipped: 0,
    errors: []
  }
  
  try {
    // 获取所有记录
    const classesRes = await db.collection('classes').limit(100).get()
    const classes = classesRes.data || []
    results.total = classes.length
    
    for (const record of classes) {
      try {
        // 检查是否有嵌套的 data 字段
        if (record.data && typeof record.data === 'object') {
          // 将 data 字段扁平化到顶层
          const data = record.data
          
          // 构建更新对象
          const updateData = {}
          
          // 提取 data 中的字段到顶层
          if (data.title || record.title) updateData.name = data.title || record.title
          if (data.capacity !== undefined) updateData.capacity = data.capacity
          if (data.description !== undefined) updateData.description = data.description
          if (data.endDate !== undefined) updateData.endDate = convertDateValue(data.endDate)
          if (data.enrolled !== undefined) updateData.enrolledCount = data.enrolled
          if (data.location !== undefined) updateData.location = data.location
          if (data.price !== undefined) updateData.price = data.price
          if (data.startDate !== undefined) updateData.startDate = convertDateValue(data.startDate)
          if (data.status !== undefined) updateData.status = data.status
          
          // 清理顶层字段
          if (record.createdAt && typeof record.createdAt === 'object' && '$date' in record.createdAt) {
            updateData.createdAt = convertDateValue(record.createdAt)
          }
          if (record.enrollmentDeadline && typeof record.enrollmentDeadline === 'object' && '$date' in record.enrollmentDeadline) {
            updateData.enrollmentDeadline = convertDateValue(record.enrollmentDeadline)
          }
          if (record.intro && typeof record.intro === 'object') {
            updateData.intro = convertDatesInObject(record.intro)
          }
          if (record.schedule && Array.isArray(record.schedule)) {
            updateData.schedule = convertDatesInObject(record.schedule)
          }
          
          // 删除嵌套的 data 和 title 字段
          updateData.data = app.cloudAPI.db.RegExp({
            regexp: ''
          })
          updateData.title = app.cloudAPI.db.RegExp({
            regexp: ''
          })
          
          // 更新记录
          await db.collection('classes').doc(record._id).update({ data: updateData })
          results.cleaned++
          console.log(`✓ 清理记录: ${record._id}`)
        } else {
          // 没有嵌套 data 字段，检查是否有需要转换的日期格式
          const updateData = {}
          let hasUpdate = false
          
          if (record.createdAt && typeof record.createdAt === 'object' && '$date' in record.createdAt) {
            updateData.createdAt = convertDateValue(record.createdAt)
            hasUpdate = true
          }
          if (record.enrollmentDeadline && typeof record.enrollmentDeadline === 'object' && '$date' in record.enrollmentDeadline) {
            updateData.enrollmentDeadline = convertDateValue(record.enrollmentDeadline)
            hasUpdate = true
          }
          if (record.intro && typeof record.intro === 'object') {
            updateData.intro = convertDatesInObject(record.intro)
            hasUpdate = true
          }
          if (record.schedule && Array.isArray(record.schedule)) {
            updateData.schedule = convertDatesInObject(record.schedule)
            hasUpdate = true
          }
          
          if (hasUpdate) {
            await db.collection('classes').doc(record._id).update({ data: updateData })
            results.cleaned++
            console.log(`✓ 转换日期: ${record._id}`)
          } else {
            results.skipped++
          }
        }
      } catch (err) {
        results.errors.push({ id: record._id, error: err.message })
        console.error(`✗ 错误: ${record._id}`, err.message)
      }
    }
    
    return results
  } catch (error) {
    throw new Error(`清理 classes 集合失败: ${error.message}`)
  }
}

// 云函数入口
exports.main = async (event, context) => {
  try {
    console.log('='.repeat(60))
    console.log('开始清理 classes 集合...')
    console.log('='.repeat(60))
    
    const results = await cleanClassesCollection()
    
    console.log('\n' + '='.repeat(60))
    console.log('清理完成!')
    console.log('='.repeat(60))
    console.log(`总计: ${results.total} 个记录`)
    console.log(`清理: ${results.cleaned} 个`)
    console.log(`跳过: ${results.skipped} 个`)
    console.log(`错误: ${results.errors.length} 个`)
    
    return {
      code: 0,
      message: 'classes 集合清理完成',
      data: results
    }
  } catch (error) {
    console.error('清理失败:', error)
    return {
      code: 500,
      message: '清理失败',
      error: error.message
    }
  }
}
