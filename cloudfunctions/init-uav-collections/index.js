/**
 * 创建无人机培训系统所需的新集合
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

/**
 * 创建集合并添加示例数据
 */
async function createCollection(collectionName, sampleData = {}) {
  console.log(`创建集合: ${collectionName}`)

  try {
    // 添加示例数据（如果集合不存在，会自动创建）
    const result = await db.collection(collectionName).add({
      ...sampleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    console.log(`✓ 集合 ${collectionName} 创建成功`)

    // 删除示例数据
    await db.collection(collectionName).doc(result.id).remove()

    console.log(`✓ 已清理示例数据`)

    return {
      code: 0,
      message: '集合创建成功',
      collection: collectionName
    }
  } catch (error) {
    // 如果集合已存在，忽略错误
    if (error.code === 'DATABASE_COLLECTION_ALREADY_EXISTS') {
      console.log(`✓ 集合 ${collectionName} 已存在`)
      return {
        code: 0,
        message: '集合已存在',
        collection: collectionName
      }
    }

    throw error
  }
}

/**
 * 创建 user_profiles 集合
 */
async function createUserProfilesCollection() {
  const sampleData = {
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
  }

  return await createCollection('user_profiles', sampleData)
}

/**
 * 创建 teacher_profiles 集合
 */
async function createTeacherProfilesCollection() {
  const sampleData = {
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
  }

  return await createCollection('teacher_profiles', sampleData)
}

/**
 * 创建 course_schedules 集合
 */
async function createCourseSchedulesCollection() {
  const sampleData = {
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
  }

  return await createCollection('course_schedules', sampleData)
}

/**
 * 创建 enrollments 集合
 */
async function createEnrollmentsCollection() {
  const sampleData = {
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
  }

  return await createCollection('enrollments', sampleData)
}

/**
 * 创建 schedule_changes 集合
 */
async function createScheduleChangesCollection() {
  const sampleData = {
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
  }

  return await createCollection('schedule_changes', sampleData)
}

/**
 * 创建 attendance_records 集合
 */
async function createAttendanceRecordsCollection() {
  const sampleData = {
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
  }

  return await createCollection('attendance_records', sampleData)
}

/**
 * 创建 promotions 集合
 */
async function createPromotionsCollection() {
  const sampleData = {
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
  }

  return await createCollection('promotions', sampleData)
}

/**
 * 创建 statistics_daily 集合
 */
async function createStatisticsDailyCollection() {
  const sampleData = {
    date: '2026-03-17',
    newUserCount: 0,
    newEnrollmentCount: 0,
    newOrderCount: 0,
    totalRevenue: 0,
    totalRefund: 0,
    activeUserCount: 0,
    courseViewCount: 0,
    createTime: new Date().toISOString()
  }

  return await createCollection('statistics_daily', sampleData)
}

/**
 * 创建 statistics_teacher 集合
 */
async function createStatisticsTeacherCollection() {
  const sampleData = {
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
    updateTime: new Date().toISOString()
  }

  return await createCollection('statistics_teacher', sampleData)
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event

  console.log('初始化集合任务:', action)

  try {
    switch (action) {
      case 'createUserProfiles':
        return await createUserProfilesCollection()

      case 'createTeacherProfiles':
        return await createTeacherProfilesCollection()

      case 'createCourseSchedules':
        return await createCourseSchedulesCollection()

      case 'createEnrollments':
        return await createEnrollmentsCollection()

      case 'createScheduleChanges':
        return await createScheduleChangesCollection()

      case 'createAttendanceRecords':
        return await createAttendanceRecordsCollection()

      case 'createPromotions':
        return await createPromotionsCollection()

      case 'createStatisticsDaily':
        return await createStatisticsDailyCollection()

      case 'createStatisticsTeacher':
        return await createStatisticsTeacherCollection()

      case 'createAll':
        const results = []

        console.log('\n' + '='.repeat(60))
        console.log('开始创建所有无人机培训系统集合')
        console.log('='.repeat(60) + '\n')

        results.push(await createUserProfilesCollection())
        results.push(await createTeacherProfilesCollection())
        results.push(await createCourseSchedulesCollection())
        results.push(await createEnrollmentsCollection())
        results.push(await createScheduleChangesCollection())
        results.push(await createAttendanceRecordsCollection())
        results.push(await createPromotionsCollection())
        results.push(await createStatisticsDailyCollection())
        results.push(await createStatisticsTeacherCollection())

        console.log('\n' + '='.repeat(60))
        console.log('所有集合创建完成！')
        console.log('='.repeat(60) + '\n')

        return {
          code: 0,
          message: '所有集合创建成功',
          data: results
        }

      default:
        return {
          code: 400,
          message: `未知的操作: ${action}`
        }
    }
  } catch (error) {
    console.error('创建集合失败:', error)
    return {
      code: 500,
      message: error.message || '创建集合失败',
      error: error
    }
  }
}
