/**
 * 扩展 users 集合 - 添加无人机培训系统字段
 * 执行前请备份现有数据！
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

/**
 * 迁移 users 集合
 */
async function migrateUsers() {
  console.log('开始迁移 users 集合...')

  try {
    // 查询所有用户
    const usersResult = await db.collection('users').get()
    const users = usersResult.data

    console.log(`找到 ${users.length} 个用户`)

    let updatedCount = 0
    let skippedCount = 0

    for (const user of users) {
      // 检查是否已经迁移过
      if (user.userType) {
        console.log(`跳过已迁移用户: ${user.username || user._id}`)
        skippedCount++
        continue
      }

      // 构建更新数据
      const updateData = {
        // 用户基本信息
        realName: user.realName || '', // 真实姓名
        email: user.email || '', // 邮箱
        gender: user.gender || '', // 性别
        birthday: user.birthday || '', // 生日
        idCard: user.idCard || '', // 身份证号

        // 地址信息
        address: user.address || {
          province: '',
          city: '',
          district: '',
          detail: ''
        },

        // 用户类型：默认为学员
        userType: 'student', // student学员, teacher教师, admin管理员

        // 账号状态：默认正常
        status: 'active', // active正常, frozen冻结, banned禁用

        // 实名认证：默认未认证
        isVerified: false,
        verifiedTime: '',

        // 更新时间
        updatedAt: new Date().toISOString()
      }

      // 更新用户
      await db.collection('users').doc(user._id).update(updateData)

      console.log(`更新用户: ${user.username || user._id}`)
      updatedCount++
    }

    console.log(`\n迁移完成！`)
    console.log(`成功更新: ${updatedCount} 个用户`)
    console.log(`跳过: ${skippedCount} 个用户`)

    return {
      code: 0,
      message: '迁移成功',
      data: {
        total: users.length,
        updated: updatedCount,
        skipped: skippedCount
      }
    }
  } catch (error) {
    console.error('迁移失败:', error)
    throw error
  }
}

/**
 * 扩展 courses 集合
 */
async function migrateCourses() {
  console.log('\n开始迁移 courses 集合...')

  try {
    // 查询所有课程
    const coursesResult = await db.collection('courses').get()
    const courses = coursesResult.data

    console.log(`找到 ${courses.length} 个课程`)

    let updatedCount = 0
    let skippedCount = 0

    for (const course of courses) {
      // 检查是否已经迁移过
      if (course.type) {
        console.log(`跳过已迁移课程: ${course.title}`)
        skippedCount++
        continue
      }

      // 构建更新数据
      const updateData = {
        // 课程分类和等级
        category: course.category || '多旋翼培训', // 多旋翼培训/固定翼培训/直升机培训
        level: course.level || 'beginner', // beginner初级/intermediate中级/advanced高级

        // 课程类型：默认线上
        type: course.type || 'online', // online线上/offline线下/hybrid混合

        // 课程容量
        capacity: course.capacity || 30, // 最大容纳人数

        // 教师信息
        teacherId: course.teacherId || '', // 主讲教师ID
        assistantTeacherIds: course.assistantTeacherIds || [], // 助教教师ID列表

        // 上课地点（线下课程需要）
        location: course.location || {
          type: 'indoor', // indoor室内/outdoor室外
          address: '',
          coordinates: {
            latitude: 0,
            longitude: 0
          }
        },

        // 所需设备
        equipment: course.equipment || '',

        // 报名要求
        requirements: course.requirements || [
          '年满18岁',
          '身体健康'
        ],

        // 课程时间（线下课程）
        startTime: course.startTime || '', // 开课时间
        endTime: course.endTime || '', // 结课时间
        enrollmentDeadline: course.enrollmentDeadline || '', // 报名截止时间

        // 课程亮点和标签
        tags: course.tags || [],
        highlights: course.highlights || [],
        syllabus: course.syllabus || [],

        // 更新时间
        updatedAt: new Date().toISOString()
      }

      // 更新课程
      await db.collection('courses').doc(course._id).update(updateData)

      console.log(`更新课程: ${course.title}`)
      updatedCount++
    }

    console.log(`\n迁移完成！`)
    console.log(`成功更新: ${updatedCount} 个课程`)
    console.log(`跳过: ${skippedCount} 个课程`)

    return {
      code: 0,
      message: '迁移成功',
      data: {
        total: courses.length,
        updated: updatedCount,
        skipped: skippedCount
      }
    }
  } catch (error) {
    console.error('迁移失败:', error)
    throw error
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event

  console.log('迁移任务:', action)

  try {
    switch (action) {
      case 'migrateUsers':
        return await migrateUsers()

      case 'migrateCourses':
        return await migrateCourses()

      case 'migrateAll':
        const usersResult = await migrateUsers()
        const coursesResult = await migrateCourses()

        return {
          code: 0,
          message: '全部迁移成功',
          data: {
            users: usersResult.data,
            courses: coursesResult.data
          }
        }

      default:
        return {
          code: 400,
          message: `未知的迁移操作: ${action}`
        }
    }
  } catch (error) {
    console.error('迁移失败:', error)
    return {
      code: 500,
      message: error.message || '迁移失败',
      error: error
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const action = process.argv[2] || 'migrateAll'

  migrateAll().then(result => {
    console.log('\n' + '='.repeat(50))
    console.log('迁移结果:', result)
    console.log('='.repeat(50))
    process.exit(0)
  }).catch(error => {
    console.error('\n迁移失败:', error)
    process.exit(1)
  })
}
