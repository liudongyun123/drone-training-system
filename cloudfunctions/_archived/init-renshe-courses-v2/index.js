const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 人社课程体系配置 - 正确的分类
const RENSHE_CATEGORIES = [
  { id: 'cat-plant', name: '植保无人机' },
  { id: 'cat-aerial', name: '航拍无人机' },
  { id: 'cat-logistics', name: '物流无人机' },
  { id: 'cat-security', name: '安防无人机' },
  { id: 'cat-mapping', name: '测绘无人机' },
  { id: 'cat-inspection', name: '巡检无人机' },
  { id: 'cat-assembly', name: '装调检修工' }
]

const RENSHE_LEVELS = [
  { value: '初级工', price: 2800, duration: 60 },
  { value: '中级工', price: 3800, duration: 80 },
  { value: '高级工', price: 4800, duration: 100 },
  { value: '技师', price: 6800, duration: 120 },
  { value: '高级技师', price: 8800, duration: 160 }
]

// 课程模板
const COURSE_TEMPLATES = {
  '初级工': {
    title: '{category}初级工培训课程',
    description: '人社部认证初级工培训，无人机基础知识与基本操作技能',
    originalPrice: 3800
  },
  '中级工': {
    title: '{category}中级工培训课程',
    description: '人社部认证中级工培训，飞行技能与作业能力提升',
    originalPrice: 4800
  },
  '高级工': {
    title: '{category}高级工培训课程',
    description: '人社部认证高级工培训，高级飞行技术与复杂作业',
    originalPrice: 5800
  },
  '技师': {
    title: '{category}技师培训课程',
    description: '人社部认证技师培训，专业技术与管理能力培养',
    originalPrice: 7800
  },
  '高级技师': {
    title: '{category}高级技师培训课程',
    description: '人社部认证高级技师培训，顶尖技术与行业专家培养',
    originalPrice: 9800
  }
}

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

exports.main = async (event, context) => {
  try {
    // 先删除人社已有的课程
    const deleteResult = await db.collection('courses')
      .where({ sourceId: 'RENSHE' })
      .remove()

    const results = { courses: [] }

    for (const category of RENSHE_CATEGORIES) {
      for (const level of RENSHE_LEVELS) {
        const template = COURSE_TEMPLATES[level.value]
        const course = {
          _id: generateId() + generateId(),
          title: template.title.replace('{category}', category.name),
          description: template.description,
          category: category.name,
          categoryId: category.id,
          level: level.value,
          price: level.price,
          originalPrice: template.originalPrice,
          duration: level.duration,
          coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
          status: 'published',
          instructor: getTeacherName(level.value),
          sourceId: 'RENSHE',
          salesCount: Math.floor(Math.random() * 100),
          rating: 4.5 + Math.random() * 0.5,
          reviewCount: Math.floor(Math.random() * 50),
          maxStudents: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const result = await db.collection('courses').add({ data: course })
        results.courses.push({ id: result._id, title: course.title, level: level.value })
      }
    }

    return {
      success: true,
      message: `重建成功：${results.courses.length} 个人社课程`,
      data: {
        categoryCount: RENSHE_CATEGORIES.length,
        levelCount: RENSHE_LEVELS.length,
        totalCourses: results.courses.length,
        categories: RENSHE_CATEGORIES.map(c => c.name),
        levels: RENSHE_LEVELS.map(l => l.value)
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