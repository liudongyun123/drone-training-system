/**
 * 数据初始化云函数
 */

const cloud = require('tcb-admin-node')

cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data = {} } = event
  
  if (action === 'init') {
    return await initData()
  }
  
  if (action === 'setRules') {
    return await setRules()
  }

  if (action === 'clean') {
    return await cleanAndReset()
  }

  if (action === 'createAdmin') {
    return await createAdmin(data)
  }

  return { code: -1, message: '未知操作' }
}

// 设置数据库安全规则
async function setRules() {
  console.log('开始设置安全规则...')
  const results = []
  
  // 公开读取的集合
  const publicCollections = ['courses', 'categories', 'teachers', 'products', 'notices', 'classes', 'lessons', 'schedules', 'question_banks', 'questions']
  
  for (const name of publicCollections) {
    try {
      // CloudBase 安全规则格式
      const rule = {
        read: true,  // 所有人可读
        write: "get('database.user_roles[auth.openid].role') == 'admin'"  // 仅管理员可写
      }
      
      // 尝试通过数据库API设置规则
      // 注意：这需要在控制台手动设置，云函数无法直接修改安全规则
      results.push(`⚠️ ${name}: 需在控制台手动设置规则`)
    } catch (e) {
      results.push(`❌ ${name}: ${e.message}`)
    }
  }
  
  // 尝试使用 openapi 设置（如果有权限）
  try {
    // 创建一个简单的文档来测试权限
    await db.collection('courses').limit(1).get()
    results.push('✅ courses 集合可访问')
  } catch (e) {
    results.push(`❌ courses 访问失败: ${e.message}`)
  }
  
  return {
    code: 0,
    message: '安全规则需要在控制台手动设置: https://console.cloud.tencent.com/tcb/database/rule',
    results
  }
}

async function initData() {
  console.log('开始初始化数据...')
  const results = []

  // 1. 课程分类
  const categories = [
    { name: 'CAAC考证', icon: '📜', sortOrder: 1, status: 'active', createdAt: new Date() },
    { name: 'AOPA认证', icon: '🎓', sortOrder: 2, status: 'active', createdAt: new Date() },
    { name: '航拍技能', icon: '📷', sortOrder: 3, status: 'active', createdAt: new Date() },
    { name: '行业应用', icon: '🚁', sortOrder: 4, status: 'active', createdAt: new Date() }
  ]
  
  for (const cat of categories) {
    try {
      await db.collection('categories').add(cat)
      results.push(`✅ 分类: ${cat.name}`)
    } catch (e) {
      results.push(`⏭️ 分类已存在: ${cat.name}`)
    }
  }

  // 2. 教师
  const teachers = [
    { name: '张教官', title: '资深飞行教官', bio: 'AOPA认证教员，拥有10年无人机培训经验，累计培养学员500+', specialties: ['CAAC培训', 'AOPA认证'], experience: 10, coursesCount: 5, studentsCount: 500, rating: 4.9, certifications: ['AOPA教员证', 'CAAC考官证'], status: 'active', createdAt: new Date() },
    { name: '王老师', title: '航拍讲师', bio: '资深航拍师，作品多次获得国内外摄影奖项', specialties: ['航拍技术', '后期剪辑'], experience: 8, coursesCount: 3, studentsCount: 200, rating: 4.8, certifications: ['AOPA航拍师证'], status: 'active', createdAt: new Date() },
    { name: '李工程师', title: '植保专家', bio: '专注农业植保领域，服务多家农业合作社', specialties: ['行业应用', '植保技术'], experience: 6, coursesCount: 2, studentsCount: 150, rating: 4.7, certifications: ['植保飞手证'], status: 'active', createdAt: new Date() }
  ]
  
  const teacherIds = []
  for (const teacher of teachers) {
    try {
      const res = await db.collection('teachers').add(teacher)
      teacherIds.push(res.id)
      results.push(`✅ 教师: ${teacher.name}`)
    } catch (e) {
      results.push(`⏭️ 教师已存在: ${teacher.name}`)
    }
  }

  // 3. 课程
  const courses = [
    {
      title: 'CAAC无人机驾驶员执照培训',
      description: '中国民航局认证的无人机驾驶员执照培训课程',
      cover: '',
      price: 5800,
      originalPrice: 6800,
      level: 'beginner',
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
      description: '从入门到精通的航拍技巧',
      cover: '',
      price: 1999,
      originalPrice: 2499,
      level: 'intermediate',
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
      description: '农业植保无人机的操作培训',
      cover: '',
      price: 2999,
      originalPrice: 3999,
      level: 'beginner',
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
      results.push(`✅ 课程: ${course.title}`)
    } catch (e) {
      results.push(`⏭️ 课程已存在: ${course.title}`)
    }
  }

  // 4. 商品
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
      results.push(`✅ 商品: ${product.title}`)
    } catch (e) {
      results.push(`⏭️ 商品已存在: ${product.title}`)
    }
  }

  // 5. 公告
  try {
    await db.collection('notices').add({
      title: '平台上线公告',
      content: '欢迎使用无人机培训平台！',
      type: 'system',
      isPinned: true,
      status: 'published',
      viewCount: 0,
      publishedAt: new Date(),
      createdAt: new Date()
    })
    results.push('✅ 公告')
  } catch (e) {
    results.push('⏭️ 公告已存在')
  }

  // 6. 轮播图
  const banners = [
    { title: 'CAAC无人机驾驶员培训', subtitle: '专业认证，快速拿证', imageUrl: '', link: '/courses', order: 1, status: 'active', createdAt: new Date() },
    { title: '航拍技术精品课', subtitle: '从入门到精通', imageUrl: '', link: '/courses', order: 2, status: 'active', createdAt: new Date() },
    { title: '春季培训班开班啦', subtitle: '报名享优惠', imageUrl: '', link: '/classes', order: 3, status: 'active', createdAt: new Date() }
  ]
  
  for (const banner of banners) {
    try {
      await db.collection('banners').add(banner)
      results.push(`✅ 轮播图: ${banner.title}`)
    } catch (e) {
      results.push(`⏭️ 轮播图已存在: ${banner.title}`)
    }
  }

  // 7. 班级（开班信息）
  const classes = [
    { name: 'CAAC第12期培训班', courseId: '', teacherId: '', startDate: '2026-05-15', endDate: '2026-06-15', schedule: '周末班', maxStudents: 20, enrolledStudents: 5, status: 'enrolling', location: '深圳总部', createdAt: new Date() },
    { name: '航拍技术周末班', courseId: '', teacherId: '', startDate: '2026-05-20', endDate: '2026-06-20', schedule: '周末班', maxStudents: 15, enrolledStudents: 3, status: 'enrolling', location: '广州分校', createdAt: new Date() }
  ]
  
  for (const cls of classes) {
    try {
      await db.collection('classes').add(cls)
      results.push(`✅ 班级: ${cls.name}`)
    } catch (e) {
      results.push(`⏭️ 班级已存在: ${cls.name}`)
    }
  }

  console.log('数据初始化完成')
  
  // 创建sessions集合
  try {
    await db.collection('sessions').add({ data: { _init: true } })
    console.log('sessions集合已创建')
  } catch (e) {
    console.log('sessions集合:', e.message)
  }
  
  return {
    code: 0,
    message: '初始化完成',
    results
  }
}

// 清理并重置数据
async function cleanAndReset() {
  console.log('开始清理数据...')
  const results = []
  const collections = ['courses', 'categories', 'teachers', 'products', 'notices', 'classes', 'banners']
  
  // 清理每个集合
  for (const col of collections) {
    try {
      // 先获取所有文档
      const { data } = await db.collection(col).limit(1000).get()
      
      // 删除所有文档
      for (const doc of data) {
        try {
          await db.collection(col).doc(doc._id).remove()
        } catch (e) {
          // 忽略单个删除错误
        }
      }
      results.push(`✅ 清理 ${col}: 删除 ${data.length} 条`)
    } catch (e) {
      results.push(`❌ 清理 ${col} 失败: ${e.message}`)
    }
  }
  
  // 然后初始化
  console.log('开始重新初始化数据...')
  const initResult = await initData()
  
  return {
    code: 0,
    message: '清理并初始化完成',
    results: [...results, ...initResult.results]
  }
}
async function createAdmin(data) {
  const results = []
  
  try {
    // 检查是否已存在
    const exist = await db.collection('users').where({ username: 'admin' }).limit(1).get()
    
    if (exist.data && exist.data.length > 0) {
      // 更新
      await db.collection('users').doc(exist.data[0]._id).update({
        password: data.password || 'admin123',
        phone: data.phone || '17628157097',
        role: 'admin',
        status: 'active',
        updatedAt: new Date().toISOString()
      })
      results.push(`✅ 管理员已更新: ${exist.data[0]._id}`)
      
      // 同时更新 user_roles（用用户ID作为文档ID，匹配安全规则）
      try {
        const userId = exist.data[0]._id
        // 用 doc(userId).set() 确保文档ID等于用户ID
        await db.collection('user_roles').doc(userId).set({
          userId: userId,
          username: 'admin',
          phone: data.phone || '17628157097',
          role: 'admin',
          status: 'active',
          updatedAt: new Date().toISOString()
        })
        results.push(`✅ user_roles 已更新（docId=${userId})`)
      } catch (e) {
        console.warn('user_roles更新失败:', e)
        results.push(`⚠️ user_roles 更新失败: ${e.message}`)
      }
      
      return { code: 0, message: '管理员更新成功', results }
    }
    
    // 创建新管理员
    const now = new Date().toISOString()
    const result = await db.collection('users').add({
      data: {
        username: data.username || 'admin',
        password: data.password || 'admin123',
        phone: data.phone || '17628157097',
        name: '系统管理员',
        avatar: '',
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    })
    
    results.push(`✅ 管理员创建成功: ${result.id}`)
    
    // 创建 user_roles 记录（用用户ID作为文档ID，匹配安全规则）
    try {
      await db.collection('user_roles').doc(result.id).set({
        userId: result.id,
        username: data.username || 'admin',
        phone: data.phone || '17628157097',
        role: 'admin',
        status: 'active',
        createdAt: now
      })
      results.push(`✅ user_roles 记录创建成功（docId=${result.id})`)
    } catch (e) {
      console.warn('user_roles创建失败:', e)
      results.push(`⚠️ user_roles 创建失败: ${e.message}`)
    }
    
    return { code: 0, message: '管理员创建成功', results }
  } catch (e) {
    return { code: -1, message: '创建管理员失败: ' + e.message, results }
  }
}
