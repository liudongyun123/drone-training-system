/**
 * 初始化无人机培训系统数据库集合
 * 通过添加示例数据自动创建集合，然后删除示例数据
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

/**
 * 创建集合并添加示例数据，然后删除示例数据
 */
async function createCollection(collectionName, sampleData) {
  console.log(`正在创建集合: ${collectionName}`)

  try {
    // 添加示例数据（自动创建集合）
    const result = await db.collection(collectionName).add({
      ...sampleData,
      _temp: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`✓ 集合 ${collectionName} 创建成功，ID: ${result.id}`)

    // 删除示例数据
    await db.collection(collectionName).doc(result.id).remove()

    console.log(`✓ 已清理示例数据`)

    return {
      success: true,
      collection: collectionName
    }
  } catch (error) {
    // 如果集合已存在，忽略错误
    if (error.code === 'DATABASE_COLLECTION_ALREADY_EXISTS') {
      console.log(`✓ 集合 ${collectionName} 已存在`)
      return {
        success: true,
        collection: collectionName,
        message: '集合已存在'
      }
    }

    console.error(`✗ 创建集合 ${collectionName} 失败:`, error)
    return {
      success: false,
      collection: collectionName,
      error: error.message
    }
  }
}

/**
 * 创建所有必需的集合
 */
async function initCollections() {
  console.log('开始初始化无人机培训系统数据库集合...\n')

  const results = []

  // 1. user_profiles - 学员档案表
  results.push(await createCollection('user_profiles', {
    userId: '',
    studentNo: 'STU000001',
    emergencyContact: {
      name: '紧急联系人',
      phone: '13800138000',
      relationship: '父母'
    },
    education: '本科',
    profession: '工程师',
    experience: '1-3年',
    certificateLevel: '无',
    healthStatus: '良好',
    remark: ''
  }))

  // 2. teacher_profiles - 教师档案表
  results.push(await createCollection('teacher_profiles', {
    userId: '',
    teacherNo: 'TEA000001',
    certificateNo: 'AOPA-001',
    certificateLevel: '中级',
    specialties: ['多旋翼', '固定翼'],
    teachingExperience: 5,
    rating: 4.8,
    totalHours: 200,
    certificateImages: [],
    introduction: '资深无人机教练',
    status: 'active'
  }))

  // 3. course_schedules - 课程排课表
  results.push(await createCollection('course_schedules', {
    courseId: '',
    scheduleNo: 'SCH000001',
    title: '第1节课：飞行原理',
    teacherId: '',
    classroom: 'A区飞行场地',
    date: '2026-03-20',
    startTime: '09:00',
    endTime: '12:00',
    content: '学习无人机飞行基本原理',
    status: 'scheduled',
    attendanceCount: 30,
    actualCount: 0,
    remark: ''
  }))

  // 4. enrollments - 报名记录表
  results.push(await createCollection('enrollments', {
    enrollmentNo: 'ENR000001',
    courseId: '',
    userId: '',
    enrollmentTime: new Date().toISOString(),
    status: 'active',
    paymentStatus: 'paid',
    paymentTime: new Date().toISOString(),
    totalAmount: 2999,
    paidAmount: 2999,
    discountAmount: 0,
    couponId: '',
    source: 'online',
    remark: ''
  }))

  // 5. schedule_changes - 调课申请表
  results.push(await createCollection('schedule_changes', {
    enrollmentId: '',
    courseId: '',
    scheduleId: '',
    userId: '',
    applyTime: new Date().toISOString(),
    changeType: 'reschedule',
    reason: '临时有事',
    originalDate: '2026-03-20',
    originalStartTime: '09:00',
    originalEndTime: '12:00',
    newDate: '2026-03-21',
    newStartTime: '09:00',
    newEndTime: '12:00',
    status: 'pending',
    approverId: '',
    approveTime: '',
    approveRemark: ''
  }))

  // 6. attendance_records - 出勤记录表
  results.push(await createCollection('attendance_records', {
    enrollmentId: '',
    courseId: '',
    scheduleId: '',
    userId: '',
    teacherId: '',
    attendanceStatus: 'present',
    checkInTime: new Date().toISOString(),
    checkOutTime: '',
    duration: 0,
    remark: ''
  }))

  // 7. promotions - 宣传素材表
  results.push(await createCollection('promotions', {
    title: '无人机飞行教学视频',
    type: 'video',
    fileUrl: '',
    thumbnailUrl: '',
    duration: 300,
    fileSize: 0,
    category: 'course',
    description: '无人机基础飞行教学视频',
    sort: 1,
    status: 'active',
    publishTime: new Date().toISOString(),
    viewCount: 0
  }))

  // 8. statistics_daily - 每日统计表
  results.push(await createCollection('statistics_daily', {
    date: '2026-03-17',
    newUserCount: 0,
    newEnrollmentCount: 0,
    newOrderCount: 0,
    totalRevenue: 0,
    totalRefund: 0,
    activeUserCount: 0,
    courseViewCount: 0,
    createTime: new Date().toISOString()
  }))

  // 9. statistics_teacher - 教师统计表
  results.push(await createCollection('statistics_teacher', {
    teacherId: '',
    year: 2026,
    month: 3,
    totalCourses: 0,
    totalSchedules: 0,
    totalStudents: 0,
    totalHours: 0,
    attendanceRate: 0,
    rating: 0,
    createTime: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  console.log('\n' + '='.repeat(60))
  console.log('集合初始化完成！')
  console.log('='.repeat(60) + '\n')

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  console.log(`成功: ${successCount} 个集合`)
  console.log(`失败: ${failCount} 个集合`)

  if (failCount > 0) {
    console.log('\n失败的集合:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.collection}: ${r.error}`)
    })
  }

  return {
    code: 0,
    message: '初始化完成',
    data: {
      total: results.length,
      success: successCount,
      failed: failCount,
      results
    }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event

  console.log('初始化任务:', action)

  try {
    switch (action) {
      case 'init':
        return await initCollections()

      default:
        return {
          code: 400,
          message: `未知的操作: ${action}`
        }
    }
  } catch (error) {
    console.error('初始化失败:', error)
    return {
      code: 500,
      message: error.message || '初始化失败',
      error: error
    }
  }
}
