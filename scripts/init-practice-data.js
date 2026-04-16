/**
 * 初始化练习题库数据
 * 使用方式：在浏览器控制台运行
 * 前置条件：需要先初始化课程数据
 */

// 示例题库数据
const sampleBanks = [
  {
    courseId: 'course_001', // 需要与实际课程ID匹配
    courseTitle: '无人机基础飞行',
    title: '无人机基础飞行练习',
    description: '包含无人机飞行前检查、基本操作、安全规范等基础知识',
    level: 'beginner',
    category: '基础操作',
    questionCount: 5,
    timeLimit: 10, // 10分钟
    passingScore: 3, // 及格3题
    tags: ['飞行前检查', '基本操作', '安全规范'],
    createdAt: new Date().toISOString(),
  },
  {
    courseId: 'course_001',
    courseTitle: '无人机基础飞行',
    title: '无人机进阶飞行练习',
    description: '包含航线飞行、悬停控制、应急处理等进阶技能',
    level: 'intermediate',
    category: '进阶操作',
    questionCount: 5,
    timeLimit: 15,
    passingScore: 4,
    tags: ['航线飞行', '悬停控制', '应急处理'],
    createdAt: new Date().toISOString(),
  },
]

// 示例题目数据
const sampleQuestions = [
  {
    bankId: 'bank_001', // 第一题库
    type: 'single',
    difficulty: 'easy',
    question: '无人机在飞行前应该做哪些检查？',
    options: [
      '不需要检查，直接起飞',
      '检查电池电量、螺旋桨、遥控器连接等',
      '只检查电池电量即可',
      '起飞后再检查',
    ],
    correctAnswer: '检查电池电量、螺旋桨、遥控器连接等',
    explanation: '飞行前必须进行全面检查，包括电池电量、螺旋桨是否完好、遥控器连接是否正常等，确保飞行安全。',
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    bankId: 'bank_001',
    type: 'single',
    difficulty: 'easy',
    question: '无人机在以下哪种天气情况下不宜飞行？',
    options: ['晴朗微风', '阴天无风', '大雨大风', '多云无风'],
    correctAnswer: '大雨大风',
    explanation: '大雨大风天气会影响无人机的稳定性和安全性，应该避免在这样的天气下飞行。',
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    bankId: 'bank_001',
    type: 'multiple',
    difficulty: 'medium',
    question: '关于无人机的飞行高度，以下说法正确的是？',
    options: [
      '可以无限高度飞行',
      '应该遵守当地法律法规规定的飞行高度限制',
      '越高越好',
      '根据个人喜好决定',
    ],
    correctAnswer: ['应该遵守当地法律法规规定的飞行高度限制'],
    explanation: '无人机的飞行高度必须遵守当地法律法规的规定，通常不能超过120米，以确保航空安全。',
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    bankId: 'bank_001',
    type: 'single',
    difficulty: 'medium',
    question: '无人机遥控器的两个摇杆分别控制什么？',
    options: [
      '左摇杆控制前后，右摇杆控制左右',
      '左摇杆控制升降和航向，右摇杆控制前后和左右',
      '左摇杆控制左右，右摇杆控制前后',
      '两个摇杆功能相同',
    ],
    correctAnswer: '左摇杆控制升降和航向，右摇杆控制前后和左右',
    explanation: '标准模式下，左摇杆控制无人机的高度升降（上下）和航向（左右旋转），右摇杆控制无人机的前后和左右移动。',
    order: 4,
    createdAt: new Date().toISOString(),
  },
  {
    bankId: 'bank_001',
    type: 'single',
    difficulty: 'hard',
    question: '当无人机失去连接时，应该怎么做？',
    options: [
      '立即关闭遥控器',
      '保持冷静，等待无人机自动返航',
      '频繁操作遥控器尝试连接',
      '追着无人机跑',
    ],
    correctAnswer: '保持冷静，等待无人机自动返航',
    explanation: '当无人机失去连接时，应该保持冷静，不要频繁操作遥控器。大多数无人机具有失控自动返航功能，会自动返回起飞点。',
    order: 5,
    createdAt: new Date().toISOString(),
  },
]

// 初始化函数
async function initPracticeData() {
  try {
    console.log('🚀 开始初始化练习题库数据...')

    // 获取环境信息
    const app = tcb.getCurrentEnv()
    console.log('✅ 当前环境:', app)

    const db = tcb.database()

    // 初始化题库
    console.log('\n📝 创建题库...')
    for (const bank of sampleBanks) {
      const result = await db.collection('question_banks').add(bank)
      console.log(`✅ 创建题库: ${bank.title}, ID: ${result.id}`)

      // 更新题目数据中的 bankId
      sampleQuestions.forEach((q) => {
        if (q.bankId === 'bank_001') {
          q.bankId = result.id
        }
      })
    }

    // 初始化题目
    console.log('\n📚 创建题目...')
    for (const question of sampleQuestions) {
      const result = await db.collection('questions').add(question)
      console.log(`✅ 创建题目: ${question.question.substring(0, 20)}..., ID: ${result.id}`)
    }

    console.log('\n✅ 练习题库数据初始化完成！')
    console.log('📊 数据统计:')
    console.log(`   - 题库数量: ${sampleBanks.length}`)
    console.log(`   - 题目数量: ${sampleQuestions.length}`)

  } catch (error) {
    console.error('❌ 初始化失败:', error)
  }
}

// 清空数据函数
async function clearPracticeData() {
  try {
    console.log('🗑️ 开始清空练习题库数据...')

    const db = tcb.database()

    // 清空题目
    const questions = await db.collection('questions').get()
    for (const doc of questions.data) {
      await db.collection('questions').doc(doc._id).remove()
    }
    console.log(`✅ 已清空 ${questions.data.length} 条题目数据`)

    // 清空题库
    const banks = await db.collection('question_banks').get()
    for (const doc of banks.data) {
      await db.collection('question_banks').doc(doc._id).remove()
    }
    console.log(`✅ 已清空 ${banks.data.length} 条题库数据`)

    console.log('\n✅ 练习题库数据清空完成！')

  } catch (error) {
    console.error('❌ 清空失败:', error)
  }
}

// 检查数据函数
async function checkPracticeData() {
  try {
    console.log('📊 检查练习题库数据...')

    const db = tcb.database()

    const [banks, questions, records] = await Promise.all([
      db.collection('question_banks').get(),
      db.collection('questions').get(),
      db.collection('practice_records').get(),
    ])

    console.log('\n📊 数据统计:')
    console.log(`   - 题库数量: ${banks.data.length}`)
    console.log(`   - 题目数量: ${questions.data.length}`)
    console.log(`   - 练习记录: ${records.data.length}`)

    if (banks.data.length > 0) {
      console.log('\n📝 题库列表:')
      banks.data.forEach((bank, index) => {
        console.log(`   ${index + 1}. ${bank.title} (${bank.courseTitle})`)
      })
    }

  } catch (error) {
    console.error('❌ 检查失败:', error)
  }
}

// 导出函数供浏览器控制台使用
window.initPracticeData = initPracticeData
window.clearPracticeData = clearPracticeData
window.checkPracticeData = checkPracticeData

console.log('✅ 练习题库数据管理工具已加载！')
console.log('📖 使用方法:')
console.log('   - initPracticeData()   // 初始化示例数据')
console.log('   - clearPracticeData()   // 清空所有数据')
console.log('   - checkPracticeData()   // 检查数据状态')
