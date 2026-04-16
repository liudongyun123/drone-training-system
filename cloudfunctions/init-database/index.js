const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { collection } = event

    // 初始化课程数据
    if (collection === 'courses') {
      const courses = [
        {
          title: '无人机基础入门',
          description: '从零开始学习无人机基础知识',
          thumbnail: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400',
          level: 'beginner',
          duration: 8,
          lessons: 12,
          instructor: '张老师',
          rating: 4.8,
          students: 324,
          tags: ['基础', '入门'],
          price: 99,
          originalPrice: 199,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          title: '航拍技巧实战',
          description: '掌握专业航拍技巧与后期处理',
          thumbnail: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=400',
          level: 'intermediate',
          duration: 10,
          lessons: 15,
          instructor: '李老师',
          rating: 4.9,
          students: 256,
          tags: ['航拍', '实战'],
          price: 199,
          originalPrice: 299,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          title: '无人机飞行法规',
          description: '了解并掌握相关法律法规',
          thumbnail: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=400',
          level: 'beginner',
          duration: 6,
          lessons: 10,
          instructor: '王老师',
          rating: 4.7,
          students: 189,
          tags: ['法规', '安全'],
          price: 149,
          originalPrice: 249,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      // 批量插入课程
      const results = await Promise.all(
        courses.map(course => db.collection('courses').add({ data: course }))
      )

      return {
        code: 0,
        message: '课程数据初始化成功',
        data: results
      }
    }

    return {
      code: -1,
      message: '不支持的集合类型'
    }
  } catch (error) {
    console.error('初始化数据库失败:', error)
    return {
      code: -1,
      message: '初始化数据库失败',
      error: error.message
    }
  }
}
