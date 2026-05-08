const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// CAAC 分类映射
const CAAC_CATEGORY_MAP = {
  '多旋翼': 'ae0498ca69fc52380151cf9344ba694d',
  '固定翼': 'ae0498ca69fc52380151cf9416b82e7b',
  '直升机': 'ae0498ca69fc52380151cf9549195c14',
  '垂直起降固定翼': 'ae0498ca69fc52380151cf9623c7aaa9'
}

const CAAC_SOURCE_ID = 'e35392d069fc521f0152e2c2537e32ad'

exports.main = async (event, context) => {
  try {
    // 查询所有CAAC培训班
    const { data: classes } = await db.collection('classes')
      .where({ sourceId: CAAC_SOURCE_ID })
      .field({ _id: true, name: true })
      .get()

    let updated = 0
    let skipped = 0

    for (const cls of classes) {
      // 从培训班名称中提取分类
      let categoryName = ''
      for (const name of Object.keys(CAAC_CATEGORY_MAP)) {
        if (cls.name.includes(name)) {
          categoryName = name
          break
        }
      }

      if (!categoryName) {
        console.log(`无法识别分类: ${cls.name}`)
        skipped++
        continue
      }

      // 更新培训班
      await db.collection('classes').doc(cls._id).update({
        data: {
          categoryId: CAAC_CATEGORY_MAP[categoryName],
          categoryName: categoryName
        }
      })
      updated++
    }

    return {
      success: true,
      message: `同步完成：更新了 ${updated} 个CAAC培训班，跳过 ${skipped} 个`
    }
  } catch (error) {
    return {
      success: false,
      message: '同步失败',
      error: error.message
    }
  }
}