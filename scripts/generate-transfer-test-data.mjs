/**
 * 调课申请测试数据生成脚本
 * 使用方法: node scripts/generate-transfer-test-data.mjs
 */
import cloudbase from '@cloudbase/node-sdk'

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const $ = db.command.aggregate

// 测试学员数据
const students = [
  { id: 'student_001', name: '张小明', phone: '13800138001' },
  { id: 'student_002', name: '李小红', phone: '13800138002' },
  { id: 'student_003', name: '王小强', phone: '13800138003' },
  { id: 'student_004', name: '陈小丽', phone: '13800138004' },
  { id: 'student_005', name: '刘小军', phone: '13800138005' },
]

// 排课数据（需要先创建 course_schedules 集合）
const schedules = [
  { id: 'schedule_001', courseName: '无人机基础飞行训练', date: '2026-04-10', time: '09:00', teacher: '李教练', location: '东区训练场' },
  { id: 'schedule_002', courseName: '无人机基础飞行训练', date: '2026-04-15', time: '14:00', teacher: '王教练', location: '西区训练场' },
  { id: 'schedule_003', courseName: '无人机高级航拍技术', date: '2026-04-12', time: '10:00', teacher: '赵教练', location: '北区训练场' },
  { id: 'schedule_004', courseName: '无人机基础飞行训练', date: '2026-04-08', time: '09:00', teacher: '李教练', location: '东区训练场' },
  { id: 'schedule_005', courseName: '无人机飞行安全', date: '2026-04-18', time: '09:00', teacher: '孙教练', location: '南区训练场' },
]

// 调课类型
const transferTypes = ['time', 'teacher', 'location', 'course', 'leave']

// 调课原因
const reasons = [
  '因公司会议冲突，无法参加原定时间的课程',
  '临时有事需要请假，之后会安排时间补课',
  '听说王教练航拍经验丰富，希望能换成王教练授课',
  '家住东区，希望调到东区的训练场',
  '想要学习更高级的航拍课程',
  '最近工作太忙，想调整学习进度',
  '天气原因想延期课程',
  '有重要考试需要复习，想请假一段时间',
]

async function generateTestData() {
  console.log('🚀 开始生成调课申请测试数据...\n')

  const now = new Date()
  const transferRequests = []

  // 生成 10 条测试数据
  for (let i = 0; i < 10; i++) {
    const student = students[i % students.length]
    const originalSchedule = schedules[i % schedules.length]
    const targetSchedule = schedules[(i + 1) % schedules.length]
    const transferType = transferTypes[i % transferTypes.length]
    
    // 随机状态
    let status = 'pending'
    const rand = Math.random()
    if (rand > 0.6) status = 'approved'
    else if (rand > 0.4) status = 'rejected'
    else if (rand > 0.3) status = 'cancelled'

    // 随机日期偏移
    const createdOffset = Math.floor(Math.random() * 7) * 86400000
    const createdAt = new Date(now.getTime() - createdOffset).toISOString()

    const request = {
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      
      originalScheduleId: originalSchedule.id,
      originalCourseId: `course_${i + 1}`,
      originalCourseName: originalSchedule.courseName,
      originalDate: originalSchedule.date,
      originalTime: originalSchedule.time,
      originalTeacher: originalSchedule.teacher,
      originalTeacherId: `teacher_${i % 3 + 1}`,
      originalLocation: originalSchedule.location,
      
      targetScheduleId: status === 'pending' ? targetSchedule.id : null,
      targetCourseId: status === 'pending' ? `course_${(i + 1) % 5 + 1}` : null,
      targetCourseName: status === 'pending' ? targetSchedule.courseName : null,
      targetDate: status === 'pending' ? targetSchedule.date : null,
      targetTime: status === 'pending' ? targetSchedule.time : null,
      targetTeacher: status === 'pending' ? targetSchedule.teacher : null,
      targetTeacherId: status === 'pending' ? `teacher_${(i + 1) % 3 + 1}` : null,
      targetLocation: status === 'pending' ? targetSchedule.location : null,
      
      transferType,
      reason: reasons[i % reasons.length],
      remark: i % 3 === 0 ? '希望尽快安排' : '',
      
      status,
      adminId: status !== 'pending' ? 'admin' : null,
      adminName: status !== 'pending' ? '管理员' : null,
      adminReply: status === 'approved' ? '已通过，请按新时间参加课程' : 
                   status === 'rejected' ? '抱歉，该时段名额已满，建议选择其他时间' : null,
      reviewedAt: status !== 'pending' ? new Date(now.getTime() - createdOffset + 86400000).toISOString() : null,
      
      createdAt,
      updatedAt: createdAt,
      
      _openid: student.id,
      isRead: status !== 'pending',
      notificationSent: status !== 'pending'
    }

    transferRequests.push(request)
  }

  // 插入数据
  console.log('📝 插入调课申请数据...')
  
  for (const request of transferRequests) {
    try {
      await db.collection('transfer_requests').add(request)
      console.log(`  ✅ ${request.studentName} - ${request.originalCourseName} (${request.status})`)
    } catch (e) {
      console.error(`  ❌ 插入失败: ${e.message}`)
    }
  }

  // 查询统计
  const stats = await db.collection('transfer_requests').aggregate()
    .group({
      _id: '$status',
      count: $.sum(1)
    })
    .end()

  console.log('\n📊 统计结果:')
  stats.list?.forEach(item => {
    console.log(`  ${item._id}: ${item.count} 条`)
  })

  const total = await db.collection('transfer_requests').count()
  console.log(`  总计: ${total.total} 条\n`)

  console.log('✅ 测试数据生成完成!')
}

generateTestData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 错误:', err)
    process.exit(1)
  })
