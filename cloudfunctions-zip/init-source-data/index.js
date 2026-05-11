/**
 * 数据重新初始化云函数
 * 
 * 用途：清空并重新创建 sources、categories、courses、classes 数据
 * 使用统一的短代码格式
 * 
 * ID 格式规范：
 * - source._id: CAAC, RENSHE, NATIONAL_DEFENSE
 * - category._id: SOURCE:CODE (如 CAAC:MULTI_ROTOR)
 * - 所有数据都包含 sourceId 和 categoryId 字段
 */

let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ============================================
// 统一 ID 格式定义
// ============================================

const SOURCES = [
  {
    _id: 'CAAC',
    name: 'CAAC民航局',
    code: 'CAAC',
    description: '中国民用航空局无人机驾驶员执照培训',
    icon: '📜',
    status: 'active',
    sortOrder: 1
  },
  {
    _id: 'RENSHE',
    name: '人社培训',
    code: 'RENSHE',
    description: '人力资源和社会保障部职业技能培训',
    icon: '📋',
    status: 'active',
    sortOrder: 2
  }
]

const CATEGORIES = [
  // CAAC 分类
  { _id: 'CAAC:MULTI_ROTOR', sourceId: 'CAAC', name: '多旋翼', code: 'MULTI_ROTOR', icon: '🚁', sortOrder: 1, status: 'active' },
  { _id: 'CAAC:FIXED_WING', sourceId: 'CAAC', name: '固定翼', code: 'FIXED_WING', icon: '✈️', sortOrder: 2, status: 'active' },
  { _id: 'CAAC:ROTARY_WING', sourceId: 'CAAC', name: '直升机', code: 'ROTARY_WING', icon: '🚁', sortOrder: 3, status: 'active' },
  { _id: 'CAAC:VTOL', sourceId: 'CAAC', name: '垂直起降固定翼', code: 'VTOL', icon: '🛫', sortOrder: 4, status: 'active' },
  // RENSHE 分类
  { _id: 'RENSHE:PLANT_PROTECTION', sourceId: 'RENSHE', name: '植保无人机', code: 'PLANT_PROTECTION', icon: '🌾', sortOrder: 1, status: 'active' },
  { _id: 'RENSHE:AERIAL_PHOTOGRAPHY', sourceId: 'RENSHE', name: '航拍无人机', code: 'AERIAL_PHOTOGRAPHY', icon: '📷', sortOrder: 2, status: 'active' },
  { _id: 'RENSHE:LOGISTICS', sourceId: 'RENSHE', name: '物流无人机', code: 'LOGISTICS', icon: '📦', sortOrder: 3, status: 'active' },
  { _id: 'RENSHE:SECURITY', sourceId: 'RENSHE', name: '安防无人机', code: 'SECURITY', icon: '🛡️', sortOrder: 4, status: 'active' },
  { _id: 'RENSHE:MAPPING', sourceId: 'RENSHE', name: '测绘无人机', code: 'MAPPING', icon: '🗺️', sortOrder: 5, status: 'active' },
  { _id: 'RENSHE:INSPECTION', sourceId: 'RENSHE', name: '巡检无人机', code: 'INSPECTION', icon: '🔧', sortOrder: 6, status: 'active' },
  { _id: 'RENSHE:MAINTENANCE', sourceId: 'RENSHE', name: '装调检修工', code: 'MAINTENANCE', icon: '🔩', sortOrder: 7, status: 'active' },
]

// ============================================
// 课程数据
// ============================================

const COURSES = [
  // CAAC 多旋翼
  {
    _id: 'CAAC_MULTI_VLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:MULTI_ROTOR',
    title: '多旋翼视距内驾驶员培训',
    description: 'CAAC认证视距内驾驶员培训，飞行原理、操作技能、安全规范全覆盖',
    price: 6800,
    originalPrice: 8800,
    level: '视距内驾驶员',
    duration: 80,
    coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    status: 'published',
    instructor: '张教官',
    salesCount: 156,
    rating: 4.8,
    maxStudents: 50
  },
  {
    _id: 'CAAC_MULTI_BVLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:MULTI_ROTOR',
    title: '多旋翼超视距驾驶员（机长）培训',
    description: 'CAAC认证超视距驾驶员培训，航路规划、任务执行、应急处理专业训练',
    price: 9800,
    originalPrice: 12800,
    level: '超视距驾驶员',
    duration: 120,
    coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    status: 'published',
    instructor: '张教官',
    salesCount: 89,
    rating: 4.9,
    maxStudents: 30
  },
  {
    _id: 'CAAC_MULTI_INSTRUCTOR',
    sourceId: 'CAAC',
    categoryId: 'CAAC:MULTI_ROTOR',
    title: '多旋翼飞行教员培训',
    description: 'CAAC认证飞行教员培训，教学法、评估技能、带飞技巧全面培养',
    price: 15800,
    originalPrice: 19800,
    level: '教员',
    duration: 160,
    coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    status: 'published',
    instructor: '张教官',
    salesCount: 23,
    rating: 5.0,
    maxStudents: 15
  },
  // CAAC 固定翼
  {
    _id: 'CAAC_FIXED_VLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:FIXED_WING',
    title: '固定翼视距内驾驶员培训',
    description: '固定翼无人机飞行基础，专业教官指导',
    price: 7800,
    originalPrice: 9800,
    level: '视距内驾驶员',
    duration: 100,
    coverImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    status: 'published',
    instructor: '王教官',
    salesCount: 67,
    rating: 4.7,
    maxStudents: 20
  },
  {
    _id: 'CAAC_FIXED_BVLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:FIXED_WING',
    title: '固定翼超视距驾驶员（机长）培训',
    description: '固定翼无人机高级飞行技能培训',
    price: 11800,
    originalPrice: 14800,
    level: '超视距驾驶员',
    duration: 140,
    coverImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    status: 'published',
    instructor: '王教官',
    salesCount: 34,
    rating: 4.8,
    maxStudents: 15
  },
  // CAAC 直升机
  {
    _id: 'CAAC_ROTARY_VLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:ROTARY_WING',
    title: '直升机视距内驾驶员培训',
    description: '直升机无人机飞行技能培训',
    price: 8800,
    originalPrice: 10800,
    level: '视距内驾驶员',
    duration: 100,
    coverImage: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800',
    status: 'published',
    instructor: '李教官',
    salesCount: 45,
    rating: 4.6,
    maxStudents: 15
  },
  // CAAC 垂直起降
  {
    _id: 'CAAC_VTOL_BVLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:VTOL',
    title: '垂直起降固定翼超视距驾驶员培训',
    description: '复合翼无人机专业培训，结合多旋翼和固定翼优势',
    price: 12800,
    originalPrice: 15800,
    level: '超视距驾驶员',
    duration: 150,
    coverImage: 'https://images.unsplash.com/photo-1507226983735-a8386151935d?w=800',
    status: 'published',
    instructor: '张教官',
    salesCount: 28,
    rating: 4.9,
    maxStudents: 12
  },
  // RENSHE 植保
  {
    _id: 'RENSHE_PLANT_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:PLANT_PROTECTION',
    title: '植保无人机操作基础培训',
    description: '农业植保无人机操作技能，零基础入门',
    price: 3500,
    originalPrice: 4500,
    level: '初级',
    duration: 48,
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    status: 'published',
    instructor: '陈教员',
    salesCount: 234,
    rating: 4.7,
    maxStudents: 30
  },
  {
    _id: 'RENSHE_PLANT_ADVANCED',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:PLANT_PROTECTION',
    title: '植保无人机高级技能培训',
    description: '植保无人机高级操作，复杂地形作业技能',
    price: 5500,
    originalPrice: 7000,
    level: '中级',
    duration: 72,
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    status: 'published',
    instructor: '陈教员',
    salesCount: 156,
    rating: 4.8,
    maxStudents: 25
  },
  // RENSHE 航拍
  {
    _id: 'RENSHE_PHOTO_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:AERIAL_PHOTOGRAPHY',
    title: '航拍无人机操作基础培训',
    description: '航拍摄影入门，构图技巧、基础飞行',
    price: 4500,
    originalPrice: 5500,
    level: '初级',
    duration: 56,
    coverImage: 'https://images.unsplash.com/photo-1473741049104-5d自治000bec?w=800',
    status: 'published',
    instructor: '林教员',
    salesCount: 189,
    rating: 4.9,
    maxStudents: 25
  },
  {
    _id: 'RENSHE_PHOTO_ADVANCED',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:AERIAL_PHOTOGRAPHY',
    title: '航拍无人机高级技能培训',
    description: '专业航拍摄影，运镜技巧、后期处理',
    price: 6800,
    originalPrice: 8800,
    level: '中级',
    duration: 80,
    coverImage: 'https://images.unsplash.com/photo-1473741049104-5d000000bec?w=800',
    status: 'published',
    instructor: '林教员',
    salesCount: 98,
    rating: 4.8,
    maxStudents: 20
  },
  // RENSHE 测绘
  {
    _id: 'RENSHE_MAPPING_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:MAPPING',
    title: '测绘无人机操作基础培训',
    description: '测绘无人机入门，正射影像、基础测量',
    price: 5800,
    originalPrice: 7500,
    level: '初级',
    duration: 64,
    coverImage: 'https://images.unsplash.com/photo-149下6208066495-0908d6e0ae9a?w=800',
    status: 'published',
    instructor: '赵教员',
    salesCount: 76,
    rating: 4.6,
    maxStudents: 20
  },
  // RENSHE 巡检
  {
    _id: 'RENSHE_INSPECTION_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:INSPECTION',
    title: '巡检无人机操作基础培训',
    description: '电力巡检、基础设施巡检技能',
    price: 6000,
    originalPrice: 7800,
    level: '初级',
    duration: 72,
    coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    status: 'published',
    instructor: '周教员',
    salesCount: 54,
    rating: 4.7,
    maxStudents: 20
  },
  // RENSHE 物流
  {
    _id: 'RENSHE_LOGISTICS_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:LOGISTICS',
    title: '物流无人机操作基础培训',
    description: '物流配送无人机操作技能',
    price: 5500,
    originalPrice: 7000,
    level: '初级',
    duration: 64,
    coverImage: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800',
    status: 'published',
    instructor: '吴教员',
    salesCount: 43,
    rating: 4.5,
    maxStudents: 20
  },
  // RENSHE 安防
  {
    _id: 'RENSHE_SECURITY_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:SECURITY',
    title: '安防无人机操作基础培训',
    description: '安防监控无人机操作技能',
    price: 5800,
    originalPrice: 7200,
    level: '初级',
    duration: 64,
    coverImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    status: 'published',
    instructor: '郑教员',
    salesCount: 38,
    rating: 4.6,
    maxStudents: 20
  },
  // RENSHE 装调检修
  {
    _id: 'RENSHE_MAINTENANCE_BASIC',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:MAINTENANCE',
    title: '无人机装调检修工培训（初级）',
    description: '无人机组装、调试、基础维修技能',
    price: 4800,
    originalPrice: 6000,
    level: '初级',
    duration: 80,
    coverImage: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800',
    status: 'published',
    instructor: '王技师',
    salesCount: 67,
    rating: 4.7,
    maxStudents: 25
  },
]

// ============================================
// 培训班数据
// ============================================

const CLASSES = [
  // CAAC 多旋翼
  {
    _id: 'CAAC_MULTI_CLASS_VLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:MULTI_ROTOR',
    name: '多旋翼视距内驾驶员取证班',
    description: 'CAAC视距内驾驶员取证培训，系统学习飞行技能',
    level: '视距内驾驶员',
    price: 9800,
    maxStudents: 20,
    startDate: '2026-06-01',
    endDate: '2026-06-15',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '张教官',
    enrolledStudents: 12
  },
  {
    _id: 'CAAC_MULTI_CLASS_BVLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:MULTI_ROTOR',
    name: '多旋翼超视距驾驶员（机长）取证班',
    description: 'CAAC超视距驾驶员取证培训，成就机长梦想',
    level: '超视距驾驶员',
    price: 15800,
    maxStudents: 15,
    startDate: '2026-06-16',
    endDate: '2026-07-01',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '张教官',
    enrolledStudents: 8
  },
  // CAAC 固定翼
  {
    _id: 'CAAC_FIXED_CLASS_VLOS',
    sourceId: 'CAAC',
    categoryId: 'CAAC:FIXED_WING',
    name: '固定翼视距内驾驶员取证班',
    description: '固定翼无人机飞行基础培训',
    level: '视距内驾驶员',
    price: 10800,
    maxStudents: 15,
    startDate: '2026-06-05',
    endDate: '2026-06-20',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '王教官',
    enrolledStudents: 6
  },
  // RENSHE 植保
  {
    _id: 'RENSHE_PLANT_CLASS_001',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:PLANT_PROTECTION',
    name: '植保无人机操作培训班',
    description: '农业植保无人机操作技能培训',
    level: '初级',
    price: 4500,
    maxStudents: 30,
    startDate: '2026-05-20',
    endDate: '2026-05-25',
    location: '各地合作基地',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '陈教员',
    enrolledStudents: 18
  },
  {
    _id: 'RENSHE_PLANT_CLASS_002',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:PLANT_PROTECTION',
    name: '植保无人机高级技能班',
    description: '植保无人机高级操作，复杂地形作业',
    level: '中级',
    price: 6500,
    maxStudents: 20,
    startDate: '2026-06-10',
    endDate: '2026-06-18',
    location: '各地合作基地',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '陈教员',
    enrolledStudents: 10
  },
  // RENSHE 航拍
  {
    _id: 'RENSHE_PHOTO_CLASS_001',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:AERIAL_PHOTOGRAPHY',
    name: '航拍无人机操作培训班',
    description: '航拍摄影入门，构图技巧、基础飞行',
    level: '初级',
    price: 5500,
    maxStudents: 25,
    startDate: '2026-05-25',
    endDate: '2026-05-30',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '林教员',
    enrolledStudents: 15
  },
  // RENSHE 测绘
  {
    _id: 'RENSHE_MAPPING_CLASS_001',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:MAPPING',
    name: '测绘无人机操作培训班',
    description: '测绘无人机入门，正射影像、基础测量',
    level: '初级',
    price: 6800,
    maxStudents: 20,
    startDate: '2026-06-05',
    endDate: '2026-06-12',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '赵教员',
    enrolledStudents: 8
  },
  // RENSHE 巡检
  {
    _id: 'RENSHE_INSPECTION_CLASS_001',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:INSPECTION',
    name: '巡检无人机操作培训班',
    description: '电力巡检、基础设施巡检技能',
    level: '初级',
    price: 7000,
    maxStudents: 20,
    startDate: '2026-06-15',
    endDate: '2026-06-22',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '周教员',
    enrolledStudents: 5
  },
  // RENSHE 装调检修
  {
    _id: 'RENSHE_MAINTENANCE_CLASS_001',
    sourceId: 'RENSHE',
    categoryId: 'RENSHE:MAINTENANCE',
    name: '无人机装调检修工培训班（初级）',
    description: '无人机组装、调试、基础维修技能',
    level: '初级',
    price: 5800,
    maxStudents: 25,
    startDate: '2026-05-28',
    endDate: '2026-06-05',
    location: '深圳总部',
    schedule: '全日制',
    status: 'enrolling',
    instructor: '王技师',
    enrolledStudents: 12
  },
]

// ============================================
// 教师数据
// ============================================

const TEACHERS = [
  {
    _id: 'TEACHER_ZHANG',
    name: '张教官',
    title: 'CAAC认证飞行教官',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    introduction: 'CAAC认证教官，15年飞行经验，累计培训学员1000+，精通多旋翼和垂直起降固定翼',
    specialties: ['多旋翼飞行', '垂直起降', '超视距飞行'],
    years: 15,
    students: 1000,
    rating: 4.9,
    certifications: ['CAAC飞行教员证', 'AOPA教员证'],
    status: 'active'
  },
  {
    _id: 'TEACHER_WANG',
    name: '王教官',
    title: 'CAAC认证飞行教官',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    introduction: '资深固定翼飞行员，擅长固定翼无人机培训',
    specialties: ['固定翼飞行', '航路规划'],
    years: 10,
    students: 500,
    rating: 4.8,
    certifications: ['CAAC飞行教员证'],
    status: 'active'
  },
  {
    _id: 'TEACHER_CHEN',
    name: '陈教员',
    title: '人社部认证植保专家',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    introduction: '专注农业植保领域，服务农田面积超过50万亩',
    specialties: ['农业植保', '病虫害防治', '农药配比'],
    years: 8,
    students: 300,
    rating: 4.8,
    certifications: ['人社部无人机驾驶员三级', '农业技术员证'],
    status: 'active'
  },
  {
    _id: 'TEACHER_LIN',
    name: '林教员',
    title: '资深航拍摄影师',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
    introduction: '央视纪录片航拍摄影师，作品多次获得国内外奖项',
    specialties: ['航拍摄影', '后期制作', '商业航拍'],
    years: 10,
    students: 400,
    rating: 4.9,
    certifications: ['AOPA航拍师证', '摄影师资格证'],
    status: 'active'
  },
]

// ============================================
// 工具函数
// ============================================

async function clearCollection(collectionName) {
  try {
    const result = await db.collection(collectionName).count()
    const total = result.total || 0
    
    if (total === 0) {
      return { cleared: 0, message: '集合为空' }
    }
    
    // 分批删除
    let deleted = 0
    while (deleted < total) {
      const batch = await db.collection(collectionName).limit(100).get()
      if (batch.data.length === 0) break
      
      const ids = batch.data.map(doc => doc._id)
      await db.collection(collectionName).where({
        _id: _.in(ids)
      }).remove()
      
      deleted += ids.length
    }
    
    return { cleared: deleted, message: `已清空 ${deleted} 条记录` }
  } catch (err) {
    return { error: err.message }
  }
}

async function insertData(collectionName, dataList) {
  const results = { total: 0, success: 0, errors: 0 }
  
  for (const data of dataList) {
    try {
      await db.collection(collectionName).add({ data })
      results.success++
    } catch (err) {
      results.errors++
      console.error(`插入失败: ${collectionName}/${data._id}`, err)
    }
    results.total++
  }
  
  return results
}

// ============================================
// 主函数
// ============================================

exports.main = async (event, context) => {
  const { action = 'init' } = event
  
  console.log('=========================================')
  console.log('数据重新初始化开始')
  console.log('操作:', action)
  console.log('时间:', new Date().toISOString())
  console.log('=========================================')
  
  try {
    if (action === 'clear') {
      // 仅清空
      const results = {
        sources: await clearCollection('sources'),
        categories: await clearCollection('categories'),
        courses: await clearCollection('courses'),
        classes: await clearCollection('classes'),
        teachers: await clearCollection('teachers'),
      }
      
      return {
        code: 0,
        message: '清空完成',
        results
      }
    }
    
    if (action === 'init') {
      // 清空所有相关集合
      console.log('【步骤1】清空现有数据...')
      await clearCollection('sources')
      await clearCollection('categories')
      await clearCollection('courses')
      await clearCollection('classes')
      await clearCollection('teachers')
      
      // 插入 Sources
      console.log('【步骤2】插入 Sources...')
      const sourcesResult = await insertData('sources', SOURCES)
      console.log(`  Sources: ${sourcesResult.success}/${sourcesResult.total}`)
      
      // 插入 Categories
      console.log('【步骤3】插入 Categories...')
      const categoriesResult = await insertData('categories', CATEGORIES)
      console.log(`  Categories: ${categoriesResult.success}/${categoriesResult.total}`)
      
      // 插入 Teachers
      console.log('【步骤4】插入 Teachers...')
      const teachersResult = await insertData('teachers', TEACHERS)
      console.log(`  Teachers: ${teachersResult.success}/${teachersResult.total}`)
      
      // 为每个课程/班级添加 createdAt/updatedAt
      const now = new Date().toISOString()
      
      // 插入 Courses
      console.log('【步骤5】插入 Courses...')
      const coursesWithTime = COURSES.map(c => ({
        ...c,
        createdAt: now,
        updatedAt: now
      }))
      const coursesResult = await insertData('courses', coursesWithTime)
      console.log(`  Courses: ${coursesResult.success}/${coursesResult.total}`)
      
      // 插入 Classes
      console.log('【步骤6】插入 Classes...')
      const classesWithTime = CLASSES.map(c => ({
        ...c,
        createdAt: now,
        updatedAt: now
      }))
      const classesResult = await insertData('classes', classesWithTime)
      console.log(`  Classes: ${classesResult.success}/${classesResult.total}`)
      
      // 验证数据
      console.log('【步骤7】验证数据...')
      const verify = {
        sources: await db.collection('sources').count(),
        categories: await db.collection('categories').count(),
        courses: await db.collection('courses').count(),
        classes: await db.collection('classes').count(),
        teachers: await db.collection('teachers').count(),
      }
      
      console.log('\n=========================================')
      console.log('初始化完成!')
      console.log('=========================================')
      console.log('Sources:', verify.sources.total)
      console.log('Categories:', verify.categories.total)
      console.log('Courses:', verify.courses.total)
      console.log('Classes:', verify.classes.total)
      console.log('Teachers:', verify.teachers.total)
      
      return {
        code: 0,
        message: '初始化完成',
        results: {
          sources: sourcesResult,
          categories: categoriesResult,
          courses: coursesResult,
          classes: classesResult,
          teachers: teachersResult
        },
        verify
      }
    }
    
    return { code: -1, message: '未知操作', available: ['clear', 'init'] }
    
  } catch (err) {
    console.error('执行失败:', err)
    return {
      code: -1,
      message: '执行失败',
      error: err.message
    }
  }
}
