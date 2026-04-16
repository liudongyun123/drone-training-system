// 云开发数据库初始化脚本
import tcb from '@cloudbase/js-sdk'

const envId = 'rcwljy-5ghmq2ex26764978'

async function initDatabase() {
  console.log('🚀 开始初始化云开发数据库...')
  console.log(`📍 环境ID: ${envId}`)

  try {
    // 初始化云开发
    const app = tcb.init({ env: envId })
    console.log('✅ 云开发初始化成功')

    // 匿名登录
    console.log('🔐 正在登录...')
    await app.auth().anonymousAuthProvider().signIn()
    console.log('✅ 登录成功')

    // 调用初始化云函数
    console.log('📦 正在调用云函数初始化课程数据...')
    const result = await app.callFunction({
      name: 'init-database',
      data: { collection: 'courses' }
    })

    if (result.result.code === 0) {
      console.log('✅ 课程数据初始化成功!')
      console.log('📊 课程数据:', result.result.data)
    } else {
      console.error('❌ 初始化失败:', result.result.message)
      process.exit(1)
    }

    // 验证数据
    console.log('🔍 验证数据...')
    const db = app.database()
    const courses = await db.collection('courses').get()

    if (courses.code) {
      console.error('❌ 验证失败:', courses.code, courses.message)
      process.exit(1)
    }

    console.log(`✅ 验证成功，共 ${courses.data.length} 门课程:`)
    courses.data.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.title} - ¥${course.price}`)
    })

    console.log('\n🎉 数据库初始化完成!')
    console.log('💡 提示: 可以在控制台查看数据库数据')
    console.log('🔗 控制台地址: https://tcb.cloud.tencent.com/dev?envId=' + envId + '#/db/doc/collection/courses')

  } catch (error) {
    console.error('❌ 初始化过程中出错:', error)
    process.exit(1)
  }
}

// 执行初始化
initDatabase()
