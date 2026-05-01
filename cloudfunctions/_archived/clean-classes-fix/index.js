// ============================================================================
// 清理 classes 集合的嵌套 data 字段
// ============================================================================

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

function convertDateValue(value) {
  if (value && typeof value === 'object' && '$date' in value) {
    return new Date(value.$date).toISOString()
  }
  return value
}

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

exports.main = async (event, context) => {
  try {
    console.log('开始清理 classes 集合...')
    
    const classesRes = await db.collection('classes').limit(100).get()
    const classes = classesRes.data || []
    const results = { total: classes.length, cleaned: 0, skipped: 0, errors: [] }
    
    for (const record of classes) {
      try {
        if (record.data && typeof record.data === 'object') {
          const data = record.data
          const updateData = {}
          
          if (data.title || record.title) updateData.name = data.title || record.title
          if (data.capacity !== undefined) updateData.capacity = data.capacity
          if (data.description !== undefined) updateData.description = data.description
          if (data.endDate !== undefined) updateData.endDate = convertDateValue(data.endDate)
          if (data.enrolled !== undefined) updateData.enrolledCount = data.enrolled
          if (data.location !== undefined) updateData.location = data.location
          if (data.price !== undefined) updateData.price = data.price
          if (data.startDate !== undefined) updateData.startDate = convertDateValue(data.startDate)
          if (data.status !== undefined) updateData.status = data.status
          
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
          
          updateData.data = db.command.remove()
          updateData.title = db.command.remove()
          
          await db.collection('classes').doc(record._id).update({ data: updateData })
          results.cleaned++
          console.log(`✓ 清理记录: ${record._id}`)
        } else {
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
    
    console.log(`\n总计: ${results.total} 个记录, 清理: ${results.cleaned} 个, 跳过: ${results.skipped} 个, 错误: ${results.errors.length} 个`)
    
    return { code: 0, message: 'classes 集合清理完成', data: results }
  } catch (error) {
    console.error('清理失败:', error)
    return { code: 500, message: '清理失败', error: error.message }
  }
}
