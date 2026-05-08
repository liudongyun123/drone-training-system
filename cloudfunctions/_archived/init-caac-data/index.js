/**
 * 初始化CAAC课程和培训班数据
 * 为每个CAAC分类创建3个等级的课程和培训班
 */

let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()

// CAAC 分类
const CAAC_CATEGORIES = [
  { _id: 'ae0498ca69fc52380151cf9344ba694d', name: '多旋翼', code: 'MULTI_ROTOR' },
  { _id: 'ae0498ca69fc52380151cf9416b82e7b', name: '固定翼', code: 'FIXED_WING' },
  { _id: 'ae0498ca69fc52380151cf9549195c14', name: '直升机', code: 'HELICOPTER' },
  { _id: 'ae0498ca69fc52380151cf9623c7aaa9', name: '垂直起降固定翼', code: 'VTOL' }
]

// CAAC sourceId
const CAAC_SOURCE_ID = 'e35392d069fc521f0152e2c2537e32ad'

// CAAC 教官 ID
const TEACHER_ID = '611e990a69f4c25c0082aa214a0ede65'

// 等级
const LEVELS = ['视距内驾驶员', '超视距驾驶员', '教员']

// 课程模板
const COURSE_TEMPLATES = {
  '视距内驾驶员': {
    title: '{category}视距内驾驶员培训课程',
    description: 'CAAC认证视距内驾驶员培训，飞行原理、操作技能、安全规范全覆盖',
    price: 6800,
    originalPrice: 8800,
    duration: 80,
    level: '视距内驾驶员'
  },
  '超视距驾驶员': {
    title: '{category}超视距驾驶员（机长）培训课程',
    description: 'CAAC认证超视距驾驶员培训，航路规划、任务执行、应急处理专业训练',
    price: 9800,
    originalPrice: 12800,
    duration: 120,
    level: '超视距驾驶员'
  },
  '教员': {
    title: '{category}教员培训课程',
    description: 'CAAC认证飞行教员培训，教学法、评估技能、带飞技巧全面培养',
    price: 15800,
    originalPrice: 19800,
    duration: 160,
    level: '教员'
  }
}

// 培训班模板
const CLASS_TEMPLATES = {
  '视距内驾驶员': {
    name: '{category}视距内驾驶员培训班',
    description: 'CAAC视距内驾驶员取证培训，系统学习飞行技能',
    price: 9800,
    level: '视距内驾驶员',
    maxStudents: 20,
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    location: '深圳总部',
    schedule: '全日制'
  },
  '超视距驾驶员': {
    name: '{category}超视距驾驶员（机长）培训班',
    description: 'CAAC超视距驾驶员取证培训，成就机长梦想',
    price: 15800,
    level: '超视距驾驶员',
    maxStudents: 15,
    startDate: '2026-06-16',
    endDate: '2026-07-01',
    location: '深圳总部',
    schedule: '全日制'
  },
  '教员': {
    name: '{category}飞行教员培训班',
    description: 'CAAC飞行教员取证培训，培养优秀教官人才',
    price: 25800,
    level: '教员',
    maxStudents: 10,
    startDate: '2026-07-05',
    endDate: '2026-07-20',
    location: '深圳总部',
    schedule: '全日制'
  }
}

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

exports.main = async (event, context) => {
  const results = {
    courses: [],
    classes: []
  }

  try {
    for (const category of CAAC_CATEGORIES) {
      for (const level of LEVELS) {
        // 创建课程
        const courseTemplate = COURSE_TEMPLATES[level]
        const course = {
          _id: generateId() + generateId(),
          title: courseTemplate.title.replace('{category}', category.name),
          description: courseTemplate.description,
          category: category.name,
          categoryId: category._id,
          level: courseTemplate.level,
          price: courseTemplate.price,
          originalPrice: courseTemplate.originalPrice,
          duration: courseTemplate.duration,
          coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
          status: 'published',
          teacherId: TEACHER_ID,
          instructor: '张教官',
          sourceId: CAAC_SOURCE_ID,
          salesCount: Math.floor(Math.random() * 100),
          rating: 4.5 + Math.random() * 0.5,
          reviewCount: Math.floor(Math.random() * 50),
          maxStudents: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const courseResult = await db.collection('courses').add({ data: course })
        results.courses.push({ id: courseResult._id, title: course.title, level })

        // 创建培训班
        const classTemplate = CLASS_TEMPLATES[level]
        const classItem = {
          _id: generateId() + generateId(),
          name: classTemplate.name.replace('{category}', category.name),
          description: classTemplate.description,
          level: classTemplate.level,
          price: classTemplate.price,
          maxStudents: classTemplate.maxStudents,
          startDate: classTemplate.startDate,
          endDate: classTemplate.endDate,
          location: classTemplate.location,
          schedule: classTemplate.schedule,
          status: 'enrolling',
          teacherId: TEACHER_ID,
          teacherName: '张教官',
          sourceId: CAAC_SOURCE_ID,
          cover: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
          enrolledStudents: Math.floor(Math.random() * 10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const classResult = await db.collection('classes').add({ data: classItem })
        results.classes.push({ id: classResult._id, name: classItem.name, level })
      }
    }

    console.log('CAAC数据初始化完成:', JSON.stringify(results))

    return {
      success: true,
      message: `创建成功：${results.courses.length} 门课程，${results.classes.length} 个培训班`,
      courses: results.courses,
      classes: results.classes
    }
  } catch (err) {
    console.error('初始化CAAC数据失败:', err)
    return {
      success: false,
      error: err.message || '初始化失败'
    }
  }
}