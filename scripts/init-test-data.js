/**
 * 数据库测试数据初始化脚本
 * 功能：
 * 1. 创建 lessons 集合（从课程中提取嵌入的课时）
 * 2. 创建 course_permissions（给指定用户开通课程权限）
 * 3. 清理用户旧数据
 * 
 * 运行方式：
 * 1. 在 CloudBase 云函数中部署并执行
 * 2. 或通过 tcb CLI: tcb fn invoke db-init-test
 */

const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: 'rcwljy-5ghmq2ex26764978'
})

const db = app.database()

// 需要开通权限的用户ID
const TEST_USER_ID = 'f81188ba69fb35af005c644008c5854e'

// 测试课程数据（带真实课时）
const testCourses = [
  {
    _id: 'course1',
    title: '无人机基础飞行课程',
    description: '为零基础学员打造的入门课程',
    price: 999,
    level: '初级',
    coverImage: '',
    status: 'published',
    rating: 4.8,
    salesCount: 156,
    instructor: '张教官',
    instructorTitle: '资深飞行教官',
    features: ['随到随学', '名师指导', '实操为主']
  }
]

// 课时数据（将被存储到独立的 lessons 集合）
const testLessons = [
  { _id: 'l1', courseId: 'course1', title: '认识无人机', duration: 30, videoUrl: '', order: 1 },
  { _id: 'l2', courseId: 'course1', title: '飞行原理', duration: 45, videoUrl: '', order: 2 },
  { _id: 'l3', courseId: 'course1', title: '安全规范', duration: 40, videoUrl: '', order: 3 },
  { _id: 'l4', courseId: 'course1', title: '模拟飞行训练', duration: 60, videoUrl: '', order: 4 },
  { _id: 'l5', courseId: 'course1', title: '实操起飞降落', duration: 90, videoUrl: '', order: 5 }
]

async function initTestData() {
  console.log('🚀 开始初始化测试数据...')
  console.log(`📌 目标用户ID: ${TEST_USER_ID}`)

  try {
    // 1. 创建 lessons 集合
    console.log('\n1️⃣ 创建 lessons 集合...')
    try {
      await db.createCollection('lessons')
      console.log('   ✅ lessons 集合创建成功')
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   ⏭️  lessons 集合已存在')
      } else {
        console.log(`   ⚠️  创建集合: ${e.message}`)
      }
    }

    // 2. 初始化课时数据
    console.log('\n2️⃣ 初始化课时数据...')
    const lessonsColl = db.collection('lessons')
    const existingLessons = await lessonsColl.count()
    
    if (existingLessons.total === 0) {
      for (const lesson of testLessons) {
        await lessonsColl.add({
          ...lesson,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      console.log(`   ✅ 添加 ${testLessons.length} 条课时数据`)
    } else {
      console.log(`   ⏭️  课时数据已存在 (${existingLessons.total} 条)`)
    }

    // 3. 为测试用户开通课程权限
    console.log('\n3️⃣ 为用户开通课程权限...')
    const permColl = db.collection('course_permissions')
    
    // 检查是否已有权限
    const existingPerms = await permColl.where({
      userId: TEST_USER_ID,
      courseId: 'course1'
    }).get()
    
    if (existingPerms.data.length === 0) {
      await permColl.add({
        userId: TEST_USER_ID,
        courseId: 'course1',
        courseTitle: '无人机基础飞行课程',
        purchasedAt: new Date(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log('   ✅ 已开通 course1 课程权限')
    } else {
      console.log('   ⏭️  用户已有 course1 课程权限')
    }

    // 4. 创建订单记录（可选，用于验证购买流程）
    console.log('\n4️⃣ 创建测试订单...')
    const orderColl = db.collection('orders')
    
    const existingOrders = await orderColl.where({
      userId: TEST_USER_ID,
      courseId: 'course1'
    }).get()
    
    if (existingOrders.data.length === 0) {
      await orderColl.add({
        userId: TEST_USER_ID,
        orderType: 'course',
        courseId: 'course1',
        courseInfo: {
          id: 'course1',
          title: '无人机基础飞行课程',
          price: 999
        },
        items: [{
          productId: 'course1',
          title: '无人机基础飞行课程',
          price: 999,
          quantity: 1
        }],
        totalPrice: 999,
        status: 'paid',
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log('   ✅ 测试订单创建成功')
    } else {
      console.log('   ⏭️  订单已存在')
    }

    console.log('\n🎉 测试数据初始化完成！')
    console.log('\n📋 测试信息:')
    console.log(`   用户ID: ${TEST_USER_ID}`)
    console.log('   课程ID: course1')
    console.log('   课时数量: 5')
    console.log('\n💡 现在可以在小程序中测试:')
    console.log('   1. 登录后进入课程详情')
    console.log('   2. 应该显示"开始学习"按钮（而不是"立即购买"）')
    console.log('   3. 点击开始学习即可播放课程')

    return { success: true }

  } catch (error) {
    console.error('\n❌ 初始化失败:', error)
    throw error
  }
}

// 执行
initTestData()
  .then(() => {
    console.log('\n✅ 脚本执行成功')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })
