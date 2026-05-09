const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 人社培训体系配置
const RENSHE_CATEGORIES = [
  { id: 'cat-drone', name: '多旋翼', description: '多旋翼无人机培训' },
  { id: 'cat-fixedwing', name: '固定翼', description: '固定翼无人机培训' },
  { id: 'cat-helicopter', name: '直升机', description: '直升机无人机培训' },
  { id: 'cat-vtol', name: '垂直起降固定翼', description: '垂直起降固定翼无人机培训' },
  { id: 'cat-assembly', name: '无人机装配调试', description: '无人机装配调试培训' },
  { id: 'cat-mapping', name: '无人机测绘应用', description: '无人机测绘应用培训' },
  { id: 'cat-agriculture', name: '无人机农业应用', description: '无人机农业应用培训' }
]

const RENSHE_LEVELS = [
  { value: '初级工', label: '初级工', badgeColor: 'badge-success' },
  { value: '中级工', label: '中级工', badgeColor: 'badge-info' },
  { value: '高级工', label: '高级工', badgeColor: 'badge-warning' },
  { value: '技师', label: '技师', badgeColor: 'badge-error' },
  { value: '高级技师', label: '高级技师', badgeColor: 'badge-primary' }
]

// 为人社培训生成培训班数据
async function createRENSHEClasses() {
  const classes = []
  const now = Date.now()
  const threeMonthsLater = now + 90 * 24 * 60 * 60 * 1000

  for (const category of RENSHE_CATEGORIES) {
    for (const level of RENSHE_LEVELS) {
      classes.push({
        name: `${category.name}${level.label}培训班`,
        categoryId: category.id,
        categoryName: category.name,
        level: level.value,
        price: 2800 + (RENSHE_LEVELS.indexOf(level) * 1200),
        startDate: new Date(threeMonthsLater),
        endDate: new Date(threeMonthsLater + 30 * 24 * 60 * 60 * 1000),
        location: '无人机培训基地',
        teacherName: getTeacherName(level.value),
        teacherAvatar: 'https://example.com/avatar.jpg',
        totalSeats: 30,
        enrolledCount: Math.floor(Math.random() * 15) + 5,
        status: 'enrolling',
        sourceId: 'RENSHE',
        coverImage: `https://example.com/class-${category.id}-${level.value}.jpg`,
        description: `${category.description}，${level.label}等级培训课程`,
        schedule: `${category.name}无人机${level.label}系统培训，包含理论学习、实操训练、考证辅导等环节。`,
        requirements: `具备${category.name}无人机基础操作能力`,
        certification: `获得${level.label}职业资格证书（人社部颁发）`,
        就业方向: '无人机应用企业、测绘公司、农业植保公司等',
        createdAt: now,
        updatedAt: now
      })
    }
  }

  return classes
}

function getTeacherName(level) {
  const teachers = {
    '初级工': '张老师',
    '中级工': '李老师',
    '高级工': '王老师',
    '技师': '赵老师',
    '高级技师': '陈老师'
  }
  return teachers[level] || '张老师'
}

exports.main = async (event, context) => {
  try {
    // 查询人社已有的培训班数量
    const { total } = await db.collection('classes')
      .where({ sourceId: 'RENSHE' })
      .count()

    if (total > 0) {
      return {
        success: false,
        message: `人社培训体系已有 ${total} 个培训班，如需重新生成请先删除现有数据`
      }
    }

    // 生成35个培训班数据
    const classes = await createRENSHEClasses()

    // 批量写入数据库
    const tasks = []
    for (const cls of classes) {
      tasks.push(db.collection('classes').add({ data: cls }))
    }

    await Promise.all(tasks)

    return {
      success: true,
      message: `创建成功：${classes.length} 个人社培训班`,
      data: {
        categoryCount: RENSHE_CATEGORIES.length,
        levelCount: RENSHE_LEVELS.length,
        totalClasses: classes.length
      }
    }
  } catch (error) {
    return {
      success: false,
      message: '创建失败',
      error: error.message
    }
  }
}