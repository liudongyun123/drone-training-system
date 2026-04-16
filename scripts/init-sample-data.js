import { dbService } from '../src/services/cloudBaseService'

// 示例课程数据
const sampleCourses = [
  {
    title: '无人机基础操控入门',
    description: '从零开始学习无人机的基本操作，包括起飞、降落、悬停、转弯等基础动作。课程采用理论结合实践的方式，帮助学员快速掌握无人机操控的核心技巧。',
    thumbnail: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    level: 'beginner',
    duration: 10,
    lessons: 15,
    instructor: '张飞行',
    rating: 4.8,
    students: 328,
    price: 299,
    originalPrice: 399,
    tags: ['基础', '入门', '实操'],
    category: '飞行操控'
  },
  {
    title: '航拍技巧与后期处理',
    description: '深入学习无人机航拍技巧，学习构图、运镜、光线运用等专业知识。同时包含完整的视频后期处理教程，帮助学员拍出专业级的航拍作品。',
    thumbnail: 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800',
    level: 'intermediate',
    duration: 15,
    lessons: 20,
    instructor: '李航拍',
    rating: 4.9,
    students: 256,
    price: 599,
    originalPrice: 799,
    tags: ['航拍', '后期', '创作'],
    category: '航拍创作'
  },
  {
    title: '无人机安全与法规',
    description: '全面学习无人机飞行安全知识和相关法律法规，了解禁飞区域、飞行限制、应急处理等重要内容。确保安全合法地使用无人机。',
    thumbnail: 'https://images.unsplash.com/photo-1526304640152-d4619684e484?w=800',
    level: 'beginner',
    duration: 5,
    lessons: 8,
    instructor: '王安全',
    rating: 4.7,
    students: 512,
    price: 199,
    originalPrice: 299,
    tags: ['安全', '法规', '必备'],
    category: '安全法规'
  },
  {
    title: '无人机维修与保养',
    description: '学习无人机的日常维护、故障诊断、零件更换等实用技能。掌握基本的维修知识，延长无人机使用寿命，节省维修成本。',
    thumbnail: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
    level: 'intermediate',
    duration: 12,
    lessons: 18,
    instructor: '赵维修',
    rating: 4.6,
    students: 189,
    price: 499,
    originalPrice: 699,
    tags: ['维修', '保养', '技术'],
    category: '维护保养'
  },
  {
    title: 'FPV竞速飞行训练',
    description: '专业的FPV（第一人称视角）竞速无人机训练课程。学习高速飞行、穿越障碍、竞技技巧等高级内容，适合有一定基础的学员。',
    thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    level: 'advanced',
    duration: 20,
    lessons: 25,
    instructor: '钱竞速',
    rating: 4.9,
    students: 134,
    price: 799,
    originalPrice: 999,
    tags: ['FPV', '竞速', '高级'],
    category: '竞技飞行'
  }
]

// 初始化示例数据
async function initSampleData() {
  console.log('开始初始化示例数据...')

  try {
    // 检查是否已有课程数据
    const existingCourses = await dbService.getAll('courses')
    if (existingCourses.length > 0) {
      console.log(`数据库中已有 ${existingCourses.length} 门课程`)
      console.log('如需重新初始化，请先删除现有数据')
      return
    }

    // 添加示例课程
    for (const course of sampleCourses) {
      const result = await dbService.add('courses', course)
      if (result) {
        console.log(`✓ 课程 "${course.title}" 添加成功，ID: ${result.id}`)
      } else {
        console.error(`✗ 课程 "${course.title}" 添加失败`)
      }
    }

    console.log('\n示例数据初始化完成！')
    console.log('共添加了', sampleCourses.length, '门课程')
  } catch (error) {
    console.error('初始化示例数据失败:', error)
  }
}

// 执行初始化
initSampleData()
