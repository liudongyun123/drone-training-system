/**
 * 同步课程等级
 * 将课程数据的 level 字段转换为正确的等级名称
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

// 等级映射关系
const levelMapping = {
  'beginner': '初级工',
  'intermediate': '中级工',
  'advanced': '高级工',
  '初级': '初级工',
  '中级': '中级工',
  '高级': '高级工',
  '入门': '初级工',
  '进阶': '中级工',
}

// 正确的等级列表
const validLevels = ['初级工', '中级工', '高级工', '技师', '高级技师']

// 获取所有课程
async function getAllCourses() {
  const courses = []
  let skip = 0
  const limit = 100
  
  while (true) {
    const result = await db.collection('courses')
      .skip(skip)
      .limit(limit)
      .get()
    
    const data = result.data || []
    courses.push(...data)
    
    if (data.length < limit) break
    skip += limit
  }
  
  return courses
}

// 主函数
exports.main = async (event, context) => {
  console.log('='.repeat(60))
  console.log('开始同步课程等级...')
  console.log('='.repeat(60))
  
  try {
    // 1. 获取所有课程
    const courses = await getAllCourses()
    console.log(`\n共找到 ${courses.length} 个课程`)
    
    // 2. 统计结果
    const stats = {
      total: courses.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    }
    
    // 3. 遍历课程并更新等级
    for (const course of courses) {
      const oldLevel = course.level || ''
      
      // 如果已经是正确的等级，跳过
      if (validLevels.includes(oldLevel)) {
        stats.skipped++
        continue
      }
      
      // 查找映射
      let newLevel = levelMapping[oldLevel]
      
      // 如果没有映射，默认设为初级工
      if (!newLevel) {
        newLevel = '初级工'
      }
      
      try {
        await db.collection('courses').doc(course._id).update({
          level: newLevel,
          updatedAt: new Date().toISOString()
        })
        stats.updated++
        stats.details.push({
          title: course.title,
          oldLevel,
          newLevel,
          status: 'updated'
        })
        console.log(`✓ 更新: ${course.title} [${oldLevel}] → [${newLevel}]`)
      } catch (err) {
        stats.errors++
        stats.details.push({
          title: course.title,
          oldLevel,
          newLevel,
          status: 'error',
          error: err.message
        })
        console.error(`✗ 更新失败: ${course.title}`, err.message)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('同步完成!')
    console.log('='.repeat(60))
    console.log(`总计: ${stats.total} 个课程`)
    console.log(`更新: ${stats.updated} 个`)
    console.log(`跳过: ${stats.skipped} 个`)
    console.log(`失败: ${stats.errors} 个`)
    
    return {
      code: 0,
      message: '同步完成',
      data: stats
    }
    
  } catch (error) {
    console.error('同步失败:', error)
    return {
      code: 500,
      message: '同步失败',
      error: error.message
    }
  }
}
