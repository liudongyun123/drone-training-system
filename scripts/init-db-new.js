/**
 * 数据库初始化脚本 - 使用新的 api-admin 云函数
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: 'rcwljy-5ghmq2ex26764978',
  credentials: {
    secret_id: process.env.TENCENT_SECRET_ID,
    secret_key: process.env.TENCENT_SECRET_KEY
  }
})

const db = app.database()

async function initCollections() {
  console.log('🚀 开始初始化数据库...\n')

  // 需要创建的集合
  const collections = [
    'courses',
    'lessons',
    'categories',
    'progress',
    'classes',
    'schedules',
    'registrations',
    'attendance',
    'exams',
    'exam_attempts',
    'question_banks',
    'questions',
    'practice_records',
    'products',
    'orders',
    'notices',
    'messages',
    'certificates',
    'users',
    'user_roles',
    'teachers'
  ]

  // 1. 创建集合
  for (const name of collections) {
    try {
      await db.createCollection(name)
      console.log(`✅ 创建集合: ${name}`)
    } catch (e) {
      if (e.code === 'DATABASE_COLLECTION_ALREADY_EXIST') {
        console.log(`⏭️ 集合已存在: ${name}`)
      } else {
        console.log(`❌ 创建失败 ${name}: ${e.message}`)
      }
    }
  }

  // 2. 插入示例数据
  console.log('\n📦 插入示例数据...\n')

  // 课程分类
  const categories = [
    { name: 'CAAC考证', icon: '📜', sortOrder: 1, status: 'active' },
    { name: 'AOPA认证', icon: '🎓', sortOrder: 2, status: 'active' },
    { name: '航拍技能', icon: '📷', sortOrder: 3, status: 'active' },
    { name: '行业应用', icon: '🚁', sortOrder: 4, status: 'active' }
  ]
  
  for (const cat of categories) {
    try {
      await db.collection('categories').add(cat)
      console.log(`✅ 分类: ${cat.name}`)
    } catch (e) {}
  }

  // 课程数据
  const courses = [
    {
      title: 'CAAC无人机驾驶员执照培训',
      description: '中国民航局认证的无人机驾驶员执照培训课程，包含理论和实操训练',
      cover: '',
      price: 5800,
      originalPrice: 6800,
      categoryId: 'CAAC考证',
      level: 'beginner',
      teacherId: 'teacher1',
      type: 'hybrid',
      duration: 120,
      lessonCount: 24,
      stats: { studentCount: 0, rating: 4.8, reviewCount: 0 },
      status: 'published',
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: '无人机航拍进阶课程',
      description: '从入门到精通的航拍技巧，包含构图、运镜、后期处理等内容',
      cover: '',
      price: 1999,
      originalPrice: 2499,
      categoryId: '航拍技能',
      level: 'intermediate',
      teacherId: 'teacher2',
      type: 'online',
      duration: 60,
      lessonCount: 12,
      stats: { studentCount: 0, rating: 4.6, reviewCount: 0 },
      status: 'published',
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: '植保无人机操作培训',
      description: '农业植保无人机的操作、维护和作业规范培训',
      cover: '',
      price: 2999,
      originalPrice: 3999,
      categoryId: '行业应用',
      level: 'beginner',
      teacherId: 'teacher1',
      type: 'offline',
      duration: 80,
      lessonCount: 16,
      stats: { studentCount: 0, rating: 4.5, reviewCount: 0 },
      status: 'published',
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  for (const course of courses) {
    try {
      await db.collection('courses').add(course)
      console.log(`✅ 课程: ${course.title}`)
    } catch (e) {}
  }

  // 教师数据
  const teachers = [
    {
      name: '张教官',
      avatar: '',
      title: '资深飞行教官',
      bio: 'AOPA认证教员，10年飞行培训经验',
      specialty: ['CAAC考证', 'AOPA认证'],
      status: 'active',
      createdAt: new Date()
    },
    {
      name: '王老师',
      avatar: '',
      title: '航拍讲师',
      bio: '资深航拍师，作品多次获奖',
      specialty: ['航拍技能', '后期处理'],
      status: 'active',
      createdAt: new Date()
    }
  ]

  for (const teacher of teachers) {
    try {
      await db.collection('teachers').add(teacher)
      console.log(`✅ 教师: ${teacher.name}`)
    } catch (e) {}
  }

  // 商品数据
  const products = [
    {
      title: '大疆御3桨叶',
      description: '适用于Mavic 3系列的原厂桨叶',
      cover: '',
      price: 199,
      originalPrice: 299,
      stock: 100,
      sales: 0,
      category: 'propeller',
      status: 'active',
      createdAt: new Date()
    },
    {
      title: '智能飞行电池',
      description: '大疆原厂智能电池',
      cover: '',
      price: 799,
      originalPrice: 999,
      stock: 50,
      sales: 0,
      category: 'battery',
      status: 'active',
      createdAt: new Date()
    }
  ]

  for (const product of products) {
    try {
      await db.collection('products').add(product)
      console.log(`✅ 商品: ${product.title}`)
    } catch (e) {}
  }

  // 公告数据
  await db.collection('notices').add({
    title: '平台上线公告',
    content: '欢迎使用无人机培训平台！我们提供CAAC/AOPA认证培训、航拍技能课程等一站式服务。',
    type: 'system',
    isPinned: true,
    status: 'published',
    viewCount: 0,
    publishedAt: new Date(),
    createdAt: new Date()
  })
  console.log('✅ 公告')

  console.log('\n🎉 数据库初始化完成！')
}

initCollections().catch(e => console.error('❌ 错误:', e))