/**
 * 修复培训班分类字段 v4
 * 1. 修复 RENSHE 培训班：根据名称关键字推断分类
 * 2. 修复 CAAC 培训班：使用 categoryName 覆盖 category
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// RENSHE 分类关键字映射
const RENSHE_CATEGORY_KEYWORDS = {
  '植保': '植保无人机',
  '航拍': '航拍无人机',
  '物流': '物流无人机',
  '安防': '安防无人机',
  '测绘': '测绘无人机',
  '巡检': '巡检无人机',
  '装调': '装调检修工',
}

exports.main = async (event, context) => {
  console.log('[fix-class-category] 开始修复培训班分类...')

  try {
    // 1. 获取所有没有 categoryName 的培训班（需要推断分类）
    const classesNeedInfer = await db.collection('classes')
      .where({
        categoryName: _.exists(false)
      })
      .limit(200)
      .get()

    const toInfer = classesNeedInfer.data || []
    console.log(`需要推断分类的培训班: ${toInfer.length} 个`)

    let inferred = 0
    for (const cls of toInfer) {
      let categoryName = ''
      if (cls.name) {
        for (const [keyword, name] of Object.entries(RENSHE_CATEGORY_KEYWORDS)) {
          if (cls.name.includes(keyword)) {
            categoryName = name
            break
          }
        }
      }
      if (categoryName) {
        await db.collection('classes').doc(cls._id).update({
          data: { category: categoryName, categoryName: categoryName }
        })
        inferred++
        console.log(`推断分类: ${cls.name} -> ${categoryName}`)
      }
    }

    // 2. 获取所有有 categoryName 但 category 错误的培训班
    const classesNeedFix = await db.collection('classes')
      .where({
        categoryName: _.exists(true),
        categoryName: _.neq(_.exp('category'))
      })
      .limit(200)
      .get()

    const toFix = classesNeedFix.data || []
    console.log(`需要修复分类的培训班: ${toFix.length} 个`)

    let fixed = 0
    for (const cls of toFix) {
      // 使用 categoryName 覆盖 category
      await db.collection('classes').doc(cls._id).update({
        data: { category: cls.categoryName }
      })
      fixed++
      console.log(`修复分类: ${cls.name}: ${cls.category} -> ${cls.categoryName}`)
    }

    console.log(`[fix-class-category] 完成，推断 ${inferred} 个，修复 ${fixed} 个`)
    return {
      code: 0,
      message: '修复完成',
      inferred: inferred,
      fixed: fixed
    }
  } catch (error) {
    console.error('[fix-class-category] 失败:', error)
    return {
      code: -1,
      message: error.message
    }
  }
}
