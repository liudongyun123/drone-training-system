/**
 * 创建调课请求相关数据库集合
 * 脚本版本: v20260406-production
 */
const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

async function createTransferCollections() {
  console.log('🚀 开始创建调课请求相关集合...\n')

  const results = []

  // 1. 创建 transfer_requests 集合
  try {
    // 检查集合是否存在
    const checkResult = await db.collection('transfer_requests').count()
    console.log('ℹ️ transfer_requests 集合已存在')
    results.push({ collection: 'transfer_requests', status: 'exists', count: checkResult.total })
  } catch (e) {
    // 集合不存在，创建示例数据
    const sampleData = [
      {
        studentId: 'test_student_001',
        studentName: '张三',
        studentPhone: '13800138001',
        originalScheduleId: 'schedule_001',
        originalCourseId: 'course_001',
        originalCourseName: '无人机基础飞行训练',
        originalDate: '2026-04-10',
        originalTime: '09:00',
        originalTeacher: '李教练',
        originalTeacherId: 'teacher_001',
        originalLocation: '东区训练场',
        targetScheduleId: 'schedule_002',
        targetCourseId: 'course_001',
        targetCourseName: '无人机基础飞行训练',
        targetDate: '2026-04-15',
        targetTime: '14:00',
        targetTeacher: '王教练',
        targetTeacherId: 'teacher_002',
        targetLocation: '西区训练场',
        transferType: 'time',
        reason: '因公司会议冲突，无法参加原定时间的课程，希望调整到下周三下午',
        remark: '希望能安排王教练的课程',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRead: false,
        notificationSent: false
      },
      {
        studentId: 'test_student_002',
        studentName: '李四',
        studentPhone: '13800138002',
        originalScheduleId: 'schedule_003',
        originalCourseId: 'course_002',
        originalCourseName: '无人机高级航拍技术',
        originalDate: '2026-04-12',
        originalTime: '10:00',
        originalTeacher: '赵教练',
        originalTeacherId: 'teacher_003',
        originalLocation: '北区训练场',
        transferType: 'teacher',
        reason: '听说王教练航拍经验丰富，希望能换成王教练授课',
        remark: '',
        status: 'pending',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        isRead: false,
        notificationSent: false
      },
      {
        studentId: 'test_student_003',
        studentName: '王五',
        studentPhone: '13800138003',
        originalScheduleId: 'schedule_004',
        originalCourseId: 'course_001',
        originalCourseName: '无人机基础飞行训练',
        originalDate: '2026-04-08',
        originalTime: '09:00',
        originalTeacher: '李教练',
        originalTeacherId: 'teacher_001',
        originalLocation: '东区训练场',
        transferType: 'leave',
        reason: '临时有事需要请假，之后会安排时间补课',
        remark: '预计下周末可以参加',
        status: 'approved',
        adminId: 'admin',
        adminName: '管理员',
        adminReply: '已收到您的请假申请，请联系前台安排补课时间。',
        reviewedAt: new Date(Date.now() - 43200000).toISOString(),
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
        isRead: true,
        notificationSent: true
      }
    ]

    // 先添加一条记录以创建集合
    await db.collection('transfer_requests').add(sampleData[0])
    console.log('✅ transfer_requests 集合创建成功')
    
    // 删除示例数据
    await db.collection('transfer_requests').where({}).remove()
    
    results.push({ collection: 'transfer_requests', status: 'created' })
  }

  console.log('\n✅ 所有集合创建完成！\n')

  console.log('📋 创建结果汇总:')
  console.log('═'.repeat(50))
  results.forEach(r => {
    console.log(`  ${r.collection}: ${r.status}`)
    if (r.count !== undefined) {
      console.log(`    - 现有记录数: ${r.count}`)
    }
  })
  console.log('═'.repeat(50))

  console.log('\n📌 下一步操作:')
  console.log('  1. 部署 transfer-request 云函数')
  console.log('  2. 在前端添加调课申请和审核页面路由')
  console.log('  3. 更新导航栏添加调课菜单')

  return results
}

// 执行
createTransferCollections()
  .then(() => {
    console.log('\n🎉 脚本执行完成')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ 脚本执行失败:', err)
    process.exit(1)
  })
