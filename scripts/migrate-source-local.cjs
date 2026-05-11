/**
 * 本地数据迁移脚本
 * 
 * 用途：在本地执行数据库迁移，避免云函数部署的复杂性
 * 
 * 使用方法：
 *   node scripts/migrate-source-local.js [action]
 * 
 * 示例：
 *   node scripts/migrate-source-local.js validate  # 仅验证
 *   node scripts/migrate-source-local.js migrate   # 执行迁移
 *   node scripts/migrate-source-local.js step1     # 仅执行步骤1
 */

const tcb = require('tcb-admin-node')

// 初始化 CloudBase
tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV  // 使用环境变量
})

const db = tcb.database()
const _ = db.command

// ============================================
// ID 映射表
// ============================================

const SOURCE_ID_MAP = {
  'e35392d069fc521f0152e2c2537e32ad': 'CAAC',
  'e35392d069fc521f0152e2c14dbb4a18': 'RENSHE',
}

const SOURCE_NAME_MAP = {
  'CAAC': 'CAAC',
  'CAAC民航局': 'CAAC',
  'RENSHE': 'RENSHE',
  '人社培训': 'RENSHE',
}

const CATEGORY_ID_MAP = {
  'ae0498ca69fc52380151cf9344ba694d': 'CAAC:MULTI_ROTOR',
  'ae0498ca69fc52380151cf9416b82e7b': 'CAAC:FIXED_WING',
  'ae0498ca69fc52380151cf9549195c14': 'CAAC:ROTARY_WING',
  'ae0498ca69fc52380151cf96d1a7d0ff1': 'CAAC:VTOL',
  'ae0498ca69fc35c2014d4d3e332b809b': 'RENSHE:PLANT_PROTECTION',
  'edc7bd2969fc35c30151ff035b0c276d': 'RENSHE:AERIAL_PHOTOGRAPHY',
  '97b16bdb69fc35c401505fe61ad82e56': 'RENSHE:LOGISTICS',
  '98d3bbc169fc35c5015270c47a488d1b': 'RENSHE:SECURITY',
  '611e990a69fc35c7014cb85146ae2c00': 'RENSHE:MAPPING',
  'edc7bd2969fc35c80151ff497725f148': 'RENSHE:INSPECTION',
  '9cd783ff69fc35ca0150cb4436019c71': 'RENSHE:MAINTENANCE',
}

const OLD_CATEGORY_SOURCE_MAP = {
  'ae0498ca69fc35c2014d4d3e332b809b': 'RENSHE',
  'edc7bd2969fc35c30151ff035b0c276d': 'RENSHE',
  '97b16bdb69fc35c401505fe61ad82e56': 'RENSHE',
  '98d3bbc169fc35c5015270c47a488d1b': 'RENSHE',
  '611e990a69fc35c7014cb85146ae2c00': 'RENSHE',
  'edc7bd2969fc35c80151ff497725f148': 'RENSHE',
  '9cd783ff69fc35ca0150cb4436019c71': 'RENSHE',
  'ae0498ca69fc52380151cf9344ba694d': 'CAAC',
  'ae0498ca69fc52380151cf9416b82e7b': 'CAAC',
  'ae0498ca69fc52380151cf9549195c14': 'CAAC',
  'ae0498ca69fc52380151cf96d1a7d0ff1': 'CAAC',
}

// ============================================
// 工具函数
// ============================================

function getSourceIdFromCategoryId(categoryId) {
  if (categoryId && categoryId.includes(':')) {
    const source = categoryId.split(':')[0]
    if (['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(source)) {
      return source
    }
  }
  return OLD_CATEGORY_SOURCE_MAP[categoryId] || null
}

function normalizeCategoryId(categoryId) {
  if (categoryId && categoryId.includes(':')) {
    return categoryId
  }
  return CATEGORY_ID_MAP[categoryId] || categoryId
}

// ============================================
// 迁移步骤
// ============================================

async function migrateSources() {
  console.log('【步骤1】开始修正 sources 集合...')
  const results = []
  
  try {
    const sourcesResult = await db.collection('sources').get()
    const sources = sourcesResult.data || []
    console.log(`找到 ${sources.length} 条 sources 记录`)
    
    for (const source of sources) {
      const oldId = source._id
      const newId = SOURCE_NAME_MAP[source.name] || SOURCE_ID_MAP[oldId]
      
      if (newId && oldId !== newId) {
        console.log(`  更新 source: ${oldId} -> ${newId} (${source.name})`)
        
        const newSource = { ...source, _id: newId, code: newId, updatedAt: new Date() }
        delete newSource._id
        
        await db.collection('sources').add(newSource)
        await db.collection('sources').doc(oldId).remove()
        
        results.push({ action: 'updated', oldId, newId })
      } else {
        results.push({ action: 'skipped', id: oldId })
      }
    }
    
    return { success: true, count: sources.length, results }
  } catch (err) {
    console.error('步骤1失败:', err)
    return { success: false, error: err.message }
  }
}

async function migrateCategories() {
  console.log('【步骤2】开始修正 categories 集合...')
  const results = []
  
  try {
    const categoriesResult = await db.collection('categories').get()
    const categories = categoriesResult.data || []
    console.log(`找到 ${categories.length} 条 categories 记录`)
    
    for (const category of categories) {
      const oldId = category._id
      const newId = CATEGORY_ID_MAP[oldId]
      const sourceId = getSourceIdFromCategoryId(newId || oldId)
      
      if (newId && oldId !== newId) {
        console.log(`  更新 category: ${oldId} -> ${newId} (${category.name})`)
        
        const newCategory = {
          ...category,
          _id: newId,
          sourceId: sourceId,
          code: newId.split(':')[1],
          updatedAt: new Date()
        }
        
        await db.collection('categories').add(newCategory)
        await db.collection('categories').doc(oldId).remove()
        
        results.push({ action: 'updated', oldId, newId, sourceId })
      } else if (sourceId && category.sourceId !== sourceId) {
        await db.collection('categories').doc(oldId).update({
          data: { sourceId: sourceId, updatedAt: new Date() }
        })
        results.push({ action: 'updated_sourceId', id: oldId, sourceId })
      } else {
        results.push({ action: 'skipped', id: oldId })
      }
    }
    
    return { success: true, count: categories.length, results }
  } catch (err) {
    console.error('步骤2失败:', err)
    return { success: false, error: err.message }
  }
}

async function migrateCourses() {
  console.log('【步骤3】开始同步 courses 的 sourceId...')
  let updated = 0, skipped = 0, errors = 0
  
  try {
    let hasMore = true
    let skip = 0
    const limit = 100
    
    while (hasMore) {
      const coursesResult = await db.collection('courses').skip(skip).limit(limit).get()
      const courses = coursesResult.data || []
      hasMore = courses.length === limit
      skip += limit
      
      for (const course of courses) {
        let newSourceId = getSourceIdFromCategoryId(course.categoryId)
        
        if (course.sourceId && ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(course.sourceId)) {
          skipped++
          continue
        }
        
        if (newSourceId) {
          try {
            await db.collection('courses').doc(course._id).update({
              data: { sourceId: newSourceId }
            })
            updated++
          } catch (e) {
            errors++
          }
        } else {
          skipped++
        }
      }
    }
    
    console.log(`  更新 ${updated}, 跳过 ${skipped}, 错误 ${errors}`)
    return { success: true, updated, skipped, errors }
  } catch (err) {
    console.error('步骤3失败:', err)
    return { success: false, error: err.message }
  }
}

async function migrateClasses() {
  console.log('【步骤4】开始同步 classes 的 sourceId...')
  let updated = 0, skipped = 0, errors = 0
  
  try {
    let hasMore = true
    let skip = 0
    const limit = 100
    
    while (hasMore) {
      const classesResult = await db.collection('classes').skip(skip).limit(limit).get()
      const classes = classesResult.data || []
      hasMore = classes.length === limit
      skip += limit
      
      for (const cls of classes) {
        let newSourceId = getSourceIdFromCategoryId(cls.categoryId)
        
        if (cls.courseId && !newSourceId) {
          try {
            const courseResult = await db.collection('courses').doc(cls.courseId).get()
            if (courseResult.data?.sourceId) {
              newSourceId = courseResult.data.sourceId
            }
          } catch (e) {}
        }
        
        if (newSourceId) {
          try {
            await db.collection('classes').doc(cls._id).update({
              data: { sourceId: newSourceId }
            })
            updated++
          } catch (e) {
            errors++
          }
        } else {
          skipped++
        }
      }
    }
    
    console.log(`  更新 ${updated}, 跳过 ${skipped}, 错误 ${errors}`)
    return { success: true, updated, skipped, errors }
  } catch (err) {
    console.error('步骤4失败:', err)
    return { success: false, error: err.message }
  }
}

async function migrateEnrollments() {
  console.log('【步骤5】开始同步 enrollments 的 sourceId...')
  let updated = 0, skipped = 0, errors = 0
  
  try {
    let hasMore = true
    let skip = 0
    const limit = 100
    
    while (hasMore) {
      const result = await db.collection('enrollments')
        .where({ sourceId: _.exists(false) })
        .skip(skip)
        .limit(limit)
        .get()
      
      const enrollments = result.data || []
      hasMore = enrollments.length === limit
      skip += limit
      
      for (const enrollment of enrollments) {
        if (enrollment.courseId) {
          try {
            const courseResult = await db.collection('courses').doc(enrollment.courseId).get()
            if (courseResult.data?.sourceId) {
              await db.collection('enrollments').doc(enrollment._id).update({
                data: { sourceId: courseResult.data.sourceId }
              })
              updated++
            } else {
              skipped++
            }
          } catch (e) {
            errors++
          }
        } else {
          skipped++
        }
      }
    }
    
    console.log(`  更新 ${updated}, 跳过 ${skipped}, 错误 ${errors}`)
    return { success: true, updated, skipped, errors }
  } catch (err) {
    console.error('步骤5失败:', err)
    return { success: false, error: err.message }
  }
}

async function migrateOrders() {
  console.log('【步骤6】开始同步 orders 的 sourceId...')
  let updated = 0, skipped = 0, errors = 0
  
  try {
    let hasMore = true
    let skip = 0
    const limit = 100
    
    while (hasMore) {
      const result = await db.collection('orders')
        .where({ sourceId: _.exists(false) })
        .skip(skip)
        .limit(limit)
        .get()
      
      const orders = result.data || []
      hasMore = orders.length === limit
      skip += limit
      
      for (const order of orders) {
        if (order.courseId) {
          try {
            const courseResult = await db.collection('courses').doc(order.courseId).get()
            if (courseResult.data?.sourceId) {
              await db.collection('orders').doc(order._id).update({
                data: { sourceId: courseResult.data.sourceId }
              })
              updated++
            } else {
              skipped++
            }
          } catch (e) {
            errors++
          }
        } else {
          skipped++
        }
      }
    }
    
    console.log(`  更新 ${updated}, 跳过 ${skipped}, 错误 ${errors}`)
    return { success: true, updated, skipped, errors }
  } catch (err) {
    console.error('步骤6失败:', err)
    return { success: false, error: err.message }
  }
}

async function migratePayments() {
  console.log('【步骤7】开始同步 payments 的 sourceId...')
  let updated = 0, skipped = 0, errors = 0
  
  try {
    let hasMore = true
    let skip = 0
    const limit = 100
    
    while (hasMore) {
      const result = await db.collection('payments')
        .where({ sourceId: _.exists(false) })
        .skip(skip)
        .limit(limit)
        .get()
      
      const payments = result.data || []
      hasMore = payments.length === limit
      skip += limit
      
      for (const payment of payments) {
        if (payment.orderId) {
          try {
            const orderResult = await db.collection('orders').doc(payment.orderId).get()
            let sourceId = orderResult.data?.sourceId
            
            if (!sourceId && orderResult.data?.courseId) {
              const courseResult = await db.collection('courses').doc(orderResult.data.courseId).get()
              sourceId = courseResult.data?.sourceId
            }
            
            if (sourceId) {
              await db.collection('payments').doc(payment._id).update({
                data: { sourceId: sourceId }
              })
              updated++
            } else {
              skipped++
            }
          } catch (e) {
            errors++
          }
        } else {
          skipped++
        }
      }
    }
    
    console.log(`  更新 ${updated}, 跳过 ${skipped}, 错误 ${errors}`)
    return { success: true, updated, skipped, errors }
  } catch (err) {
    console.error('步骤7失败:', err)
    return { success: false, error: err.message }
  }
}

async function migrateExams() {
  console.log('【步骤8】开始同步 exams 的 sourceId...')
  let updated = 0, skipped = 0, errors = 0
  
  try {
    let hasMore = true
    let skip = 0
    const limit = 100
    
    while (hasMore) {
      const result = await db.collection('exams')
        .where({ sourceId: _.exists(false) })
        .skip(skip)
        .limit(limit)
        .get()
      
      const exams = result.data || []
      hasMore = exams.length === limit
      skip += limit
      
      for (const exam of exams) {
        if (exam.courseId) {
          try {
            const courseResult = await db.collection('courses').doc(exam.courseId).get()
            if (courseResult.data?.sourceId) {
              await db.collection('exams').doc(exam._id).update({
                data: { sourceId: courseResult.data.sourceId }
              })
              updated++
            } else {
              skipped++
            }
          } catch (e) {
            errors++
          }
        } else {
          skipped++
        }
      }
    }
    
    console.log(`  更新 ${updated}, 跳过 ${skipped}, 错误 ${errors}`)
    return { success: true, updated, skipped, errors }
  } catch (err) {
    console.error('步骤8失败:', err)
    return { success: false, error: err.message }
  }
}

async function validate() {
  console.log('=========================================')
  console.log('【验证】数据完整性检查')
  console.log('=========================================')
  
  const results = {}
  
  try {
    // 检查 sources
    const sources = await db.collection('sources').get()
    results.sources = {
      total: sources.data.length,
      valid: sources.data.filter(s => ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(s._id)).length
    }
    
    // 检查 categories
    const categories = await db.collection('categories').get()
    results.categories = {
      total: categories.data.length,
      valid: categories.data.filter(c => c._id.includes(':') && c.sourceId).length
    }
    
    // 检查 courses
    const courses = await db.collection('courses').get()
    results.courses = {
      total: courses.data.length,
      valid: courses.data.filter(c => ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(c.sourceId)).length,
      noSourceId: courses.data.filter(c => !c.sourceId).length
    }
    
    // 检查 classes
    const classes = await db.collection('classes').get()
    results.classes = {
      total: classes.data.length,
      valid: classes.data.filter(c => ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(c.sourceId)).length,
      noSourceId: classes.data.filter(c => !c.sourceId).length
    }
    
    // 检查 enrollments
    const enrollments = await db.collection('enrollments').get()
    results.enrollments = {
      total: enrollments.data.length,
      valid: enrollments.data.filter(e => ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(e.sourceId)).length,
      noSourceId: enrollments.data.filter(e => !e.sourceId).length
    }
    
    // 检查 orders
    const orders = await db.collection('orders').get()
    results.orders = {
      total: orders.data.length,
      valid: orders.data.filter(o => ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(o.sourceId)).length,
      noSourceId: orders.data.filter(o => !o.sourceId).length
    }
    
    // 检查 payments
    const payments = await db.collection('payments').get()
    results.payments = {
      total: payments.data.length,
      valid: payments.data.filter(p => ['CAAC', 'RENSHE', 'NATIONAL_DEFENSE'].includes(p.sourceId)).length,
      noSourceId: payments.data.filter(p => !p.sourceId).length
    }
    
    console.log(JSON.stringify(results, null, 2))
    return { success: true, results }
  } catch (err) {
    console.error('验证失败:', err)
    return { success: false, error: err.message }
  }
}

// ============================================
// 主入口
// ============================================

async function main() {
  const action = process.argv[2] || 'validate'
  
  console.log('=========================================')
  console.log('数据库源数据迁移')
  console.log('操作:', action)
  console.log('时间:', new Date().toISOString())
  console.log('=========================================')
  
  try {
    if (action === 'validate') {
      return await validate()
    }
    
    if (action === 'migrate') {
      await migrateSources()
      await migrateCategories()
      await migrateCourses()
      await migrateClasses()
      await migrateEnrollments()
      await migrateOrders()
      await migratePayments()
      await migrateExams()
      
      console.log('\\n========== 迁移完成 ==========')
      return await validate()
    }
    
    const steps = {
      step1: migrateSources,
      step2: migrateCategories,
      step3: migrateCourses,
      step4: migrateClasses,
      step5: migrateEnrollments,
      step6: migrateOrders,
      step7: migratePayments,
      step8: migrateExams,
    }
    
    if (steps[action]) {
      return await steps[action]()
    }
    
    console.log('未知操作:', action)
    console.log('可用操作: validate, migrate, step1-step8')
  } catch (err) {
    console.error('执行失败:', err)
    process.exit(1)
  }
}

main().then(res => {
  console.log('\\n结果:', JSON.stringify(res, null, 2))
  process.exit(0)
}).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
