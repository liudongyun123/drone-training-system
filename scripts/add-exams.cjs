/**
 * 添加考试数据
 */

const https = require('https')
const API_BASE = 'rcwljy-5ghmq2ex26764978.service.tcloudbase.com'

// 考试模板
const EXAMS = [
  {
    _id: 'exam_caac_multi_vlos_theory',
    title: '多旋翼视距内驾驶员理论考试',
    description: 'CAAC多旋翼视距内驾驶员理论考试，涵盖法规、飞行原理、气象等知识',
    category: 'CAAC',
    level: 'VLOS',
    type: 'exam',
    questionCount: 50,
    passingScore: 80,
    duration: 60,
    status: 'published',
    allowedAttempts: 3,
    showAnswer: false,
    randomQuestions: true
  },
  {
    _id: 'exam_caac_multi_bvlos_theory',
    title: '多旋翼超视距驾驶员理论考试',
    description: 'CAAC多旋翼超视距驾驶员（机长）理论考试',
    category: 'CAAC',
    level: 'BVLOS',
    type: 'exam',
    questionCount: 80,
    passingScore: 80,
    duration: 90,
    status: 'published',
    allowedAttempts: 3,
    showAnswer: false,
    randomQuestions: true
  },
  {
    _id: 'exam_caac_instructor_theory',
    title: '飞行教员理论考试',
    description: 'CAAC无人机飞行教员理论考试',
    category: 'CAAC',
    level: 'INSTRUCTOR',
    type: 'exam',
    questionCount: 100,
    passingScore: 85,
    duration: 120,
    status: 'published',
    allowedAttempts: 2,
    showAnswer: false,
    randomQuestions: true
  },
  {
    _id: 'exam_caac_fixed_wing_theory',
    title: '固定翼视距内驾驶员理论考试',
    description: 'CAAC固定翼视距内驾驶员理论考试',
    category: 'CAAC',
    level: 'FIXED_VLOS',
    type: 'exam',
    questionCount: 60,
    passingScore: 80,
    duration: 60,
    status: 'published',
    allowedAttempts: 3,
    showAnswer: false,
    randomQuestions: true
  },
  {
    _id: 'exam_aviation_basic',
    title: '航空理论基础知识考试',
    description: '航空法规、飞行原理、气象等基础知识综合考试',
    category: 'CAAC',
    level: 'BASIC',
    type: 'exam',
    questionCount: 40,
    passingScore: 70,
    duration: 45,
    status: 'published',
    allowedAttempts: 5,
    showAnswer: true,
    randomQuestions: true
  },
  {
    _id: 'exam_plant_spraying',
    title: '植保无人机操作考试',
    description: '植保无人机操作技能考试',
    category: 'RENSHE',
    level: 'PLANT',
    type: 'exam',
    questionCount: 30,
    passingScore: 75,
    duration: 40,
    status: 'published',
    allowedAttempts: 3,
    showAnswer: false,
    randomQuestions: true
  }
]

// 模拟考试模板
const MOCK_EXAMS = [
  {
    _id: 'mock_caac_multi_vlos_1',
    title: '多旋翼视距内 - 模拟测试一',
    description: '包含法规、飞行原理、气象等知识的模拟测试',
    category: 'CAAC',
    level: 'VLOS',
    type: 'mock',
    questionCount: 20,
    passingScore: 60,
    duration: 30,
    status: 'published',
    allowedAttempts: 999,
    showAnswer: true,
    randomQuestions: true
  },
  {
    _id: 'mock_caac_multi_vlos_2',
    title: '多旋翼视距内 - 模拟测试二',
    description: '包含实操知识、应急处置等模拟测试',
    category: 'CAAC',
    level: 'VLOS',
    type: 'mock',
    questionCount: 20,
    passingScore: 60,
    duration: 30,
    status: 'published',
    allowedAttempts: 999,
    showAnswer: true,
    randomQuestions: true
  }
]

async function apiRequest(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data)
    const req = https.request({
      hostname: API_BASE,
      path: '/db-init',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let response = ''
      res.on('data', chunk => response += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(response)) }
        catch (e) { resolve({ error: response }) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function addExam(exam) {
  const data = {
    ...exam,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  return apiRequest({
    action: 'add',
    collection: 'exams',
    data
  })
}

async function main() {
  console.log('=== 添加考试数据 ===\n')

  console.log('1. 正式考试:')
  let count1 = 0
  for (const exam of EXAMS) {
    const result = await addExam(exam)
    if (result.code === 0) {
      count1++
      console.log(`  ✓ ${exam.title}`)
    } else {
      console.log(`  ✗ ${exam.title}: ${result.message || result.error}`)
    }
  }

  console.log('\n2. 模拟考试:')
  let count2 = 0
  for (const exam of MOCK_EXAMS) {
    const result = await addExam(exam)
    if (result.code === 0) {
      count2++
      console.log(`  ✓ ${exam.title}`)
    } else {
      console.log(`  ✗ ${exam.title}: ${result.message || result.error}`)
    }
  }

  console.log(`\n共添加 ${count1 + count2} 个考试`)
  console.log('=== 完成 ===')
}

main().catch(console.error)
