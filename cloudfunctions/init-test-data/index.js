/**
 * 测试数据初始化云函数
 * 功能：
 * 1. 创建 lessons 集合（从课程中提取嵌入的课时）
 * 2. 创建 course_permissions（给指定用户开通课程权限）
 * 3. 创建测试订单
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 测试用户ID
const TEST_USER_ID = 'f81188ba69fb35af005c644008c5854e'

// 课时数据
const testLessons = [
  { _id: 'l1', courseId: 'course1', title: '认识无人机', duration: 30, videoUrl: '', order: 1 },
  { _id: 'l2', courseId: 'course1', title: '飞行原理', duration: 45, videoUrl: '', order: 2 },
  { _id: 'l3', courseId: 'course1', title: '安全规范', duration: 40, videoUrl: '', order: 3 },
  { _id: 'l4', courseId: 'course1', title: '模拟飞行训练', duration: 60, videoUrl: '', order: 4 },
  { _id: 'l5', courseId: 'course1', title: '实操起飞降落', duration: 90, videoUrl: '', order: 5 }
]

exports.main = async (event, context) => {
  console.log('[init-test-data] 开始初始化测试数据...')
  console.log('[init-test-data] 用户ID:', TEST_USER_ID)

  try {
    // 1. 创建 lessons 集合
    console.log('[init-test-data] 1. 创建/检查 lessons 集合')
    try {
      await db.createCollection('lessons')
      console.log('[init-test-data] lessons 集合创建成功')
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('[init-test-data] lessons 集合已存在')
      } else {
        console.log('[init-test-data] lessons 集合创建:', e.message)
      }
    }

    // 2. 初始化课时数据
    console.log('[init-test-data] 2. 初始化课时数据')
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
      console.log('[init-test-data] 添加课时数据成功')
    } else {
      console.log('[init-test-data] 课时数据已存在')
    }

    // 3. 为用户开通课程权限
    console.log('[init-test-data] 3. 为用户开通课程权限')
    const permColl = db.collection('course_permissions')
    
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
      console.log('[init-test-data] 课程权限开通成功')
    } else {
      console.log('[init-test-data] 用户已有课程权限')
    }

    // 4. 创建测试订单
    console.log('[init-test-data] 4. 创建测试订单')
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
      console.log('[init-test-data] 测试订单创建成功')
    } else {
      console.log('[init-test-data] 订单已存在')
    }

    return {
      success: true,
      message: '测试数据初始化成功',
      userId: TEST_USER_ID,
      courseId: 'course1',
      lessonsCount: testLessons.length
    }

  } catch (error) {
    console.error('[init-test-data] 初始化失败:', error)
    return {
      success: false,
      error: error.message || '初始化失败'
    }
  }
}
