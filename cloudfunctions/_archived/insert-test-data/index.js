/**
 * 通过云函数插入测试数据
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  console.log('开始插入测试数据...')
  
  const { action } = event
  
  if (action !== 'insertTestData') {
    return {
      code: 400,
      message: '无效的操作'
    }
  }

  try {
    // 测试数据
    const teachers = [
      {
        userId: 'teacher001',
        name: '张伟',
        phone: '13800138001',
        email: 'zhangwei@example.com',
        gender: 'male',
        specialty: ['多旋翼飞行', '航拍技巧'],
        certification: ['AOPA 驾驶员执照', 'UTC 航拍执照'],
        teachingExperience: 5,
        rating: 4.8,
        totalTeachingHours: 1200,
        status: 'active',
        introduction: '资深无人机培训师，拥有多年飞行和教学经验',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'teacher002',
        name: '李娜',
        phone: '13800138002',
        email: 'lina@example.com',
        gender: 'female',
        specialty: ['固定翼飞行', '航线规划'],
        certification: ['AOPA 教员执照', 'CAAC 商业飞行证'],
        teachingExperience: 8,
        rating: 4.9,
        totalTeachingHours: 1800,
        status: 'active',
        introduction: '固定翼飞行专家，擅长理论教学和实操指导',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'teacher003',
        name: '王强',
        phone: '13800138003',
        email: 'wangqiang@example.com',
        gender: 'male',
        specialty: ['无人机维修', '故障诊断'],
        certification: ['维修工程师认证', '技术专家资格'],
        teachingExperience: 6,
        rating: 4.7,
        totalTeachingHours: 950,
        status: 'active',
        introduction: '无人机维修专家，精通各类机型维修',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'teacher004',
        name: '赵敏',
        phone: '13800138004',
        email: 'zhaomin@example.com',
        gender: 'female',
        specialty: ['航拍技巧', '后期剪辑'],
        certification: ['UTC 航拍执照', 'Adobe 认证'],
        teachingExperience: 4,
        rating: 4.6,
        totalTeachingHours: 720,
        status: 'active',
        introduction: '航拍与后期剪辑专家，作品多次获奖',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    const students = [
      {
        userId: 'student001',
        name: '刘明',
        phone: '13900139001',
        email: 'liuming@example.com',
        gender: 'male',
        idCard: '310101199001011234',
        address: '上海市浦东新区',
        emergencyContact: '刘父',
        emergencyPhone: '13900139002',
        level: 'beginner',
        totalHours: 0,
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student002',
        name: '陈静',
        phone: '13900139003',
        email: 'chenjing@example.com',
        gender: 'female',
        idCard: '310101199002021234',
        address: '上海市徐汇区',
        emergencyContact: '陈母',
        emergencyPhone: '13900139004',
        level: 'intermediate',
        totalHours: 24,
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student003',
        name: '杨波',
        phone: '13900139005',
        email: 'yangbo@example.com',
        gender: 'male',
        idCard: '310101199003031234',
        address: '上海市静安区',
        emergencyContact: '杨父',
        emergencyPhone: '13900139006',
        level: 'beginner',
        totalHours: 8,
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student004',
        name: '周芳',
        phone: '13900139007',
        email: 'zhoufang@example.com',
        gender: 'female',
        idCard: '310101199004041234',
        address: '上海市长宁区',
        emergencyContact: '周父',
        emergencyPhone: '13900139008',
        level: 'advanced',
        totalHours: 48,
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student005',
        name: '黄磊',
        phone: '13900139009',
        email: 'huanglei@example.com',
        gender: 'male',
        idCard: '310101199005051234',
        address: '上海市黄浦区',
        emergencyContact: '黄母',
        emergencyPhone: '13900139010',
        level: 'intermediate',
        totalHours: 32,
        status: 'active',
        joinDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // 生成排课数据
    const schedules = []
    const today = new Date()

    for (let i = 1; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      
      const dailySchedules = Math.floor(Math.random() * 2) + 2
      
      for (let j = 0; j < dailySchedules; j++) {
        const teacherIndex = Math.floor(Math.random() * teachers.length)
        const courseTypes = ['多旋翼基础', '航拍技巧', '固定翼飞行', '维修保养']
        const locations = ['训练场A', '训练场B', '室内模拟室', '维修车间']
        
        schedules.push({
          courseId: `course_${i}_${j}`,
          courseName: courseTypes[Math.floor(Math.random() * courseTypes.length)],
          teacherId: teachers[teacherIndex].userId,
          teacherName: teachers[teacherIndex].name,
          date: date.toISOString().split('T')[0],
          startTime: `${9 + j * 3}:00`,
          endTime: `${12 + j * 3}:00`,
          location: locations[Math.floor(Math.random() * locations.length)],
          capacity: Math.floor(Math.random() * 5) + 5,
          enrolled: Math.floor(Math.random() * 5),
          type: Math.random() > 0.5 ? 'offline' : 'online',
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    // 生成报名数据
    const enrollments = []
    students.forEach(student => {
      const numEnrollments = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < numEnrollments; i++) {
        const scheduleIndex = Math.floor(Math.random() * schedules.length)
        enrollments.push({
          userId: student.userId,
          userName: student.name,
          scheduleId: schedules[scheduleIndex].courseId,
          courseName: schedules[scheduleIndex].courseName,
          enrollmentDate: new Date().toISOString(),
          status: 'active',
          paymentStatus: 'paid',
          amount: Math.floor(Math.random() * 500) + 500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    })

    // 生成出勤数据
    const attendanceRecords = []
    enrollments.slice(0, 10).forEach(enrollment => {
      const isPresent = Math.random() > 0.2
      attendanceRecords.push({
        userId: enrollment.userId,
        userName: enrollment.userName,
        scheduleId: enrollment.scheduleId,
        courseName: enrollment.courseName,
        attendanceDate: new Date().toISOString(),
        checkInTime: isPresent ? '09:00' : null,
        status: isPresent ? 'present' : (Math.random() > 0.5 ? 'late' : 'absent'),
        notes: isPresent ? '' : '缺勤',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    })

    // 生成调课申请
    const scheduleChanges = [
      {
        userId: 'student001',
        userName: '刘明',
        originalScheduleId: schedules[0].courseId,
        originalCourseName: schedules[0].courseName,
        originalDate: schedules[0].date,
        newScheduleId: schedules[5].courseId,
        newCourseName: schedules[5].courseName,
        newDate: schedules[5].date,
        reason: '临时有事',
        applyDate: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student002',
        userName: '陈静',
        originalScheduleId: schedules[10].courseId,
        originalCourseName: schedules[10].courseName,
        originalDate: schedules[10].date,
        newScheduleId: schedules[15].courseId,
        newCourseName: schedules[15].courseName,
        newDate: schedules[15].date,
        reason: '身体不适',
        applyDate: new Date().toISOString(),
        status: 'approved',
        approvalDate: new Date().toISOString(),
        approvalNote: '同意调课',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student003',
        userName: '杨波',
        originalScheduleId: schedules[20].courseId,
        originalCourseName: schedules[20].courseName,
        originalDate: schedules[20].date,
        newScheduleId: schedules[25].courseId,
        newCourseName: schedules[25].courseName,
        newDate: schedules[25].date,
        reason: '工作冲突',
        applyDate: new Date().toISOString(),
        status: 'rejected',
        rejectionDate: new Date().toISOString(),
        rejectionNote: '该课程已满员,无法调整',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // 生成订单数据
    const orders = [
      {
        userId: 'student001',
        userName: '刘明',
        courseId: 'course_1',
        courseName: '多旋翼基础课程',
        amount: 800,
        paymentMethod: 'wechat',
        paymentStatus: 'paid',
        orderDate: new Date().toISOString(),
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student002',
        userName: '陈静',
        courseId: 'course_2',
        courseName: '航拍技巧进阶',
        amount: 1200,
        paymentMethod: 'alipay',
        paymentStatus: 'paid',
        orderDate: new Date().toISOString(),
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student003',
        userName: '杨波',
        courseId: 'course_3',
        courseName: '固定翼飞行入门',
        amount: 1500,
        paymentMethod: 'wechat',
        paymentStatus: 'pending',
        orderDate: new Date().toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        userId: 'student004',
        userName: '周芳',
        courseId: 'course_4',
        courseName: '无人机维修培训',
        amount: 2000,
        paymentMethod: 'alipay',
        paymentStatus: 'paid',
        orderDate: new Date().toISOString(),
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // 插入教师数据
    console.log('1. 插入教师数据...')
    const teachersResult = await db.collection('teacher_profiles').add(teachers)
    console.log(`   成功插入 ${teachersResult.ids.length} 条教师记录`)
    
    // 插入学员数据
    console.log('2. 插入学员数据...')
    const studentsResult = await db.collection('user_profiles').add(students)
    console.log(`   成功插入 ${studentsResult.ids.length} 条学员记录`)
    
    // 插入排课数据
    console.log('3. 插入排课数据...')
    const schedulesResult = await db.collection('course_schedules').add(schedules)
    console.log(`   成功插入 ${schedulesResult.ids.length} 条排课记录`)
    
    // 插入报名数据
    console.log('4. 插入报名数据...')
    const enrollmentsResult = await db.collection('enrollments').add(enrollments)
    console.log(`   成功插入 ${enrollmentsResult.ids.length} 条报名记录`)
    
    // 插入出勤数据
    console.log('5. 插入出勤数据...')
    const attendanceResult = await db.collection('attendance_records').add(attendanceRecords)
    console.log(`   成功插入 ${attendanceResult.ids.length} 条出勤记录`)
    
    // 插入调课申请
    console.log('6. 插入调课申请...')
    const scheduleChangesResult = await db.collection('schedule_changes').add(scheduleChanges)
    console.log(`   成功插入 ${scheduleChangesResult.ids.length} 条调课申请`)
    
    // 插入订单数据
    console.log('7. 插入订单数据...')
    const ordersResult = await db.collection('orders').add(orders)
    console.log(`   成功插入 ${ordersResult.ids.length} 条订单记录`)
    
    const stats = {
      teachers: teachers.length,
      students: students.length,
      schedules: schedules.length,
      enrollments: enrollments.length,
      attendance: attendanceRecords.length,
      scheduleChanges: scheduleChanges.length,
      orders: orders.length
    }

    console.log('\n🎉 所有测试数据插入完成!')
    console.log('统计信息:', JSON.stringify(stats, null, 2))

    return {
      code: 0,
      message: '测试数据插入成功',
      data: stats
    }
  } catch (error) {
    console.error('插入数据失败:', error)
    return {
      code: 500,
      message: error.message,
      error: error
    }
  }
}
