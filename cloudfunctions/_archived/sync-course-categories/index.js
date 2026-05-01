/**
 * 同步课程分类
 * 将课程数据的 category 字段与 categories 集合中的分类名称同步
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

// 分类映射关系：将旧分类映射到新分类
const categoryMapping = {
  '基础入门': '植保无人机',
  '进阶提升': '航拍无人机',
  '行业应用': '安防无人机',
  '专业认证': '电力巡检无人机',
  '基础培训': '植保无人机',
  '航拍技术': '航拍无人机',
  '维修技术': '电力巡检无人机',
}

// 获取 categories 集合中的所有分类名称
async function getCategories() {
  const result = await db.collection('categories').orderBy('sort', 'asc').get()
  return result.data || []
}

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
  console.log('开始同步课程分类...')
  console.log('='.repeat(60))
  
  try {
    // 1. 获取 categories 集合中的所有分类
    const categories = await getCategories()
    const categoryNames = categories.map(c => c.name)
    console.log('数据库中的分类:', categoryNames)
    
    // 2. 获取所有课程
    const courses = await getAllCourses()
    console.log(`\n共找到 ${courses.length} 个课程`)
    
    // 3. 统计结果
    const stats = {
      total: courses.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    }
    
    // 4. 遍历课程并更新分类
    for (const course of courses) {
      const oldCategory = course.category || ''
      
      if (!oldCategory) {
        stats.skipped++
        continue
      }
      
      // 如果已经是新分类，跳过
      if (categoryNames.includes(oldCategory)) {
        stats.skipped++
        continue
      }
      
      // 查找映射
      let newCategory = categoryMapping[oldCategory]
      
      // 如果有映射，更新课程
      if (newCategory) {
        try {
          await db.collection('courses').doc(course._id).update({
            category: newCategory,
            updatedAt: new Date().toISOString()
          })
          stats.updated++
          stats.details.push({
            title: course.title,
            oldCategory,
            newCategory,
            status: 'updated'
          })
          console.log(`✓ 更新: ${course.title} [${oldCategory}] → [${newCategory}]`)
        } catch (err) {
          stats.errors++
          stats.details.push({
            title: course.title,
            oldCategory,
            newCategory,
            status: 'error',
            error: err.message
          })
          console.error(`✗ 更新失败: ${course.title}`, err.message)
        }
      } else {
        // 没有映射，看看是否需要创建新分类
        stats.skipped++
        console.log(`○ 跳过: ${course.title} (分类 "${oldCategory}" 无对应映射)`)
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
