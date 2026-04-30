/**
 * 数据库初始化脚本
 * 运行方式：在 CloudBase 云函数中执行，或在本地通过 tcb 命令行执行
 */

const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = app.database()

// 集合列表
const collections = [
  'courses',      // 课程
  'classes',      // 培训班
  'products',     // 商品
  'orders',       // 订单
  'enrollments',  // 报名记录
  'certificates', // 证书
  'course_permissions' // 课程权限
]

// 课程示例数据
const courses = [
  {
    _id: 'course1',
    title: '无人机基础飞行课程',
    description: '为零基础学员打造的入门课程，包含飞行原理、安全规范、实操训练等内容',
    price: 999,
    level: '初级',
    coverImage: '',
    lessons: [
      { _id: 'l1', title: '认识无人机', duration: 30, videoUrl: '' },
      { _id: 'l2', title: '飞行原理', duration: 45, videoUrl: '' },
      { _id: 'l3', title: '安全规范', duration: 40, videoUrl: '' },
      { _id: 'l4', title: '模拟飞行训练', duration: 60, videoUrl: '' },
      { _id: 'l5', title: '实操起飞降落', duration: 90, videoUrl: '' }
    ],
    status: 'published',
    rating: 4.8,
    salesCount: 156,
    instructor: '张教官',
    instructorTitle: '资深飞行教官，AOPA认证教员',
    features: ['随到随学', '名师指导', '实操为主'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'course2',
    title: '无人机航拍技术进阶',
    description: '学习专业航拍技巧，包含构图、色调、运镜等专业技能',
    price: 1999,
    level: '中级',
    coverImage: '',
    lessons: [
      { _id: 'l6', title: '航拍构图基础', duration: 50, videoUrl: '' },
      { _id: 'l7', title: '光线运用', duration: 45, videoUrl: '' },
      { _id: 'l8', title: '航拍运镜技巧', duration: 60, videoUrl: '' },
      { _id: 'l9', title: '后期处理入门', duration: 90, videoUrl: '' }
    ],
    status: 'published',
    rating: 4.9,
    salesCount: 89,
    instructor: '李导播',
    instructorTitle: '资深航拍摄影师',
    features: ['实战教学', '案例分析', '后期指导'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'course3',
    title: '无人机测绘应用',
    description: '学习无人机在测绘领域的应用，掌握航测数据采集与处理',
    price: 3999,
    level: '高级',
    coverImage: '',
    lessons: [
      { _id: 'l10', title: '测绘基础知识', duration: 60, videoUrl: '' },
      { _id: 'l11', title: '航线规划', duration: 75, videoUrl: '' },
      { _id: 'l12', title: '数据采集', duration: 90, videoUrl: '' },
      { _id: 'l13', title: '数据处理软件', duration: 120, videoUrl: '' }
    ],
    status: 'published',
    rating: 4.7,
    salesCount: 45,
    instructor: '王工程师',
    instructorTitle: '测绘工程师',
    features: ['行业应用', '软件实操', '证书颁发'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 培训班示例数据
const classes = [
  {
    _id: 'class1',
    name: '周末无人机飞行班',
    description: '利用周末时间学习无人机飞行，适合上班族',
    price: 2999,
    level: '初级',
    coverImage: '',
    startDate: '2024-02-01',
    endDate: '2024-02-28',
    location: '成都飞行培训基地',
    schedule: '每周六、周日 9:00-17:00',
    instructor: '张教官',
    maxStudents: 20,
    enrolledCount: 12,
    status: 'enrolling',
    features: ['小班教学', '包午餐', '户外实操'],
    facilities: ['理论教室', '模拟机房', '室外场地', '休息区'],
    includedCourses: ['无人机基础飞行课程'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'class2',
    name: '暑期青少年无人机营',
    description: '面向青少年的无人机科技夏令营',
    price: 4999,
    level: '入门',
    coverImage: '',
    startDate: '2024-07-01',
    endDate: '2024-07-15',
    location: '青少年科技营地',
    schedule: '周一至周五 8:30-18:00',
    instructor: '李老师',
    maxStudents: 30,
    enrolledCount: 18,
    status: 'enrolling',
    features: ['科技探索', '团队协作', '证书认证'],
    facilities: ['多媒体教室', '创客空间', '室外场地'],
    includedCourses: ['无人机基础飞行课程', '航拍技术进阶'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 商品示例数据
const products = [
  {
    _id: 'p1',
    name: '大疆 Mavic 3 无人机',
    price: 9888,
    stock: 50,
    categoryId: 'drone',
    categoryName: '无人机',
    coverImage: '',
    images: [],
    salesCount: 126,
    description: '专业航拍无人机，配备哈苏相机',
    specs: [
      { name: '颜色', options: ['经典灰'] }
    ],
    skus: [
      { _id: 'sku1', specs: { '颜色': '经典灰' }, price: 9888, stock: 50 }
    ],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'p2',
    name: '无人机电池管家',
    price: 299,
    stock: 100,
    categoryId: 'accessory',
    categoryName: '配件',
    coverImage: '',
    images: [],
    salesCount: 89,
    description: '多功能电池充电管家，支持多电池同时充电',
    specs: [],
    skus: [
      { _id: 'sku2', specs: {}, price: 299, stock: 100 }
    ],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'p3',
    name: '遥控器保护罩',
    price: 128,
    stock: 200,
    categoryId: 'accessory',
    categoryName: '配件',
    coverImage: '',
    images: [],
    salesCount: 56,
    description: '防水防尘遥控器保护罩',
    specs: [],
    skus: [
      { _id: 'sku3', specs: {}, price: 128, stock: 200 }
    ],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'p4',
    name: 'ND 镜套装',
    price: 199,
    stock: 80,
    categoryId: 'accessory',
    categoryName: '配件',
    coverImage: '',
    images: [],
    salesCount: 78,
    description: 'ND4/ND8/ND16 三件套滤镜',
    specs: [],
    skus: [
      { _id: 'sku4', specs: {}, price: 199, stock: 80 }
    ],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'p5',
    name: '无人机收纳背包',
    price: 459,
    stock: 30,
    categoryId: 'tool',
    categoryName: '工具',
    coverImage: '',
    images: [],
    salesCount: 134,
    description: '大容量收纳背包，可装无人机及配件',
    specs: [],
    skus: [
      { _id: 'sku5', specs: {}, price: 459, stock: 30 }
    ],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'p6',
    name: '螺旋桨保护架',
    price: 89,
    stock: 500,
    categoryId: 'accessory',
    categoryName: '配件',
    coverImage: '',
    images: [],
    salesCount: 201,
    description: '轻便型螺旋桨保护架，减少碰撞损伤',
    specs: [],
    skus: [
      { _id: 'sku6', specs: {}, price: 89, stock: 500 }
    ],
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 商品分类
const productCategories = [
  { _id: 'drone', name: '无人机' },
  { _id: 'accessory', name: '配件' },
  { _id: 'tool', name: '工具' }
]

// 课程分类
const courseCategories = [
  { _id: 'beginner', name: '入门' },
  { _id: 'basic', name: '基础' },
  { _id: 'intermediate', name: '进阶' },
  { _id: 'advanced', name: '高级' }
]

async function initDatabase() {
  console.log('开始初始化数据库...')
  
  try {
    // 1. 创建集合（如果不存在）
    console.log('1. 检查并创建集合...')
    for (const collectionName of collections) {
      try {
        await db.createCollection(collectionName)
        console.log(`   ✓ 创建集合: ${collectionName}`)
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`   - 集合已存在: ${collectionName}`)
        } else {
          console.log(`   ! 集合 ${collectionName}: ${e.message}`)
        }
      }
    }

    // 2. 初始化课程数据
    console.log('2. 初始化课程数据...')
    const courseCollection = db.collection('courses')
    const existingCourses = await courseCollection.count()
    if (existingCourses.total === 0) {
      for (const course of courses) {
        await courseCollection.add(course)
      }
      console.log(`   ✓ 添加 ${courses.length} 条课程数据`)
    } else {
      console.log(`   - 课程数据已存在 (${existingCourses.total} 条)`)
    }

    // 3. 初始化培训班数据
    console.log('3. 初始化培训班数据...')
    const classCollection = db.collection('classes')
    const existingClasses = await classCollection.count()
    if (existingClasses.total === 0) {
      for (const cls of classes) {
        await classCollection.add(cls)
      }
      console.log(`   ✓ 添加 ${classes.length} 条培训班数据`)
    } else {
      console.log(`   - 培训班数据已存在 (${existingClasses.total} 条)`)
    }

    // 4. 初始化商品数据
    console.log('4. 初始化商品数据...')
    const productCollection = db.collection('products')
    const existingProducts = await productCollection.count()
    if (existingProducts.total === 0) {
      for (const product of products) {
        await productCollection.add(product)
      }
      console.log(`   ✓ 添加 ${products.length} 条商品数据`)
    } else {
      console.log(`   - 商品数据已存在 (${existingProducts.total} 条)`)
    }

    // 5. 初始化商品分类
    console.log('5. 初始化商品分类...')
    const categoryCollection = db.collection('product_categories')
    const existingCategories = await categoryCollection.count()
    if (existingCategories.total === 0) {
      for (const category of productCategories) {
        await categoryCollection.add(category)
      }
      console.log(`   ✓ 添加 ${productCategories.length} 条商品分类`)
    } else {
      console.log(`   - 商品分类已存在 (${existingCategories.total} 条)`)
    }

    console.log('\n✅ 数据库初始化完成！')
    
  } catch (error) {
    console.error('初始化失败:', error)
    throw error
  }
}

// 执行初始化
initDatabase()
  .then(() => {
    console.log('\n🎉 所有数据初始化成功！')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 初始化出错:', err)
    process.exit(1)
  })
