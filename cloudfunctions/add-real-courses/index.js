/**
 * 添加真实无人机培训课程数据
 * 支持：多旋翼基础、多旋翼进阶、AOPA考证、植保应用等课程
 */

const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

// 课程分类映射：将课程内容映射到 categories 集合中的分类名称
const categoryMapping = {
  '基础入门': '植保无人机',
  '进阶提升': '航拍无人机',
  '行业应用': '安防无人机',
  '专业认证': '电力巡检无人机',
}

// 真实课程数据
const realCourses = [
  {
    title: '多旋翼无人机基础入门',
    description: '本课程为零基础学员量身打造，系统讲解多旋翼无人机的基础知识、飞行原理、安全操作规范。通过理论学习与模拟训练相结合的方式，帮助学员快速掌握无人机基本操控技能，为后续进阶学习打下坚实基础。课程涵盖无人机发展历史、系统组成、飞行原理、气象知识、法律法规等核心内容。',
    category: '基础入门',
    level: '初级工',
    price: 999,
    originalPrice: 1999,
    duration: 480, // 8小时
    lessons: 12,
    instructor: '张教员',
    teacherId: '',
    coverImage: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
    status: 'published',
    maxStudents: 50,
    salesCount: 156,
    rating: 4.8,
    reviewCount: 42,
    tags: ['多旋翼', '入门', '零基础'],
    lessonsData: [
      { title: '第一章：无人机概述与发展历史', description: '了解无人机的发展历程、分类及应用领域', duration: 1800, isFree: true },
      { title: '第二章：多旋翼无人机系统组成', description: '详细讲解飞行器、遥控器、地面站等组成部分', duration: 2400, isFree: true },
      { title: '第三章：飞行原理与空气动力学基础', description: '深入浅出讲解多旋翼飞行原理', duration: 2700, isFree: false },
      { title: '第四章：气象知识与飞行环境', description: '学习气象要素对飞行的影响', duration: 2100, isFree: false },
      { title: '第五章：民航法规与飞行规范', description: '民用无人机飞行管理规定解读', duration: 1800, isFree: false },
      { title: '第六章：安全操作规范', description: '起飞、飞行、降落的正确操作流程', duration: 2400, isFree: false },
      { title: '第七章：模拟飞行训练（一）', description: '基础飞行动作模拟练习', duration: 3600, isFree: false },
      { title: '第八章：模拟飞行训练（二）', description: '进阶飞行动作与应急处理', duration: 3600, isFree: false },
      { title: '第九章：飞行前检查与维护保养', description: '全面检查与日常维护知识', duration: 1800, isFree: false },
      { title: '第十章：地面站软件操作', description: '飞行计划创建与监控', duration: 2400, isFree: false },
      { title: '第十一章：典型事故案例分析', description: '从事故中学习安全飞行', duration: 1800, isFree: false },
      { title: '第十二章：课程总结与考核', description: '知识回顾与能力评估', duration: 1200, isFree: false }
    ]
  },
  {
    title: '多旋翼无人机飞行进阶',
    description: '本课程面向已掌握基础飞行的学员，进一步提升飞行技能与安全意识。课程涵盖复杂环境飞行、FPV第一人称视角飞行、智能飞行模式应用、高级航拍技巧等内容。通过大量实战训练，培养学员应对各种飞行场景的能力。',
    category: '进阶提升',
    level: '中级工',
    price: 2999,
    originalPrice: 4999,
    duration: 960, // 16小时
    lessons: 16,
    instructor: '李教员',
    teacherId: '',
    coverImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    status: 'published',
    maxStudents: 30,
    salesCount: 89,
    rating: 4.9,
    reviewCount: 28,
    tags: ['多旋翼', '进阶', 'FPV', '航拍'],
    lessonsData: [
      { title: '第一章：复杂环境飞行技术', description: '低空、狭窄空间、障碍物环境飞行', duration: 2700, isFree: true },
      { title: '第二章：FPV第一人称视角飞行', description: 'FPV设备组装与飞行技巧', duration: 3600, isFree: true },
      { title: '第三章：智能飞行模式详解', description: '指点飞行、环绕飞行、航点规划', duration: 3000, isFree: false },
      { title: '第四章：高级航拍技巧（一）', description: '航线规划与镜头运动设计', duration: 3600, isFree: false },
      { title: '第五章：高级航拍技巧（二）', description: '全景、延时、慢动作拍摄', duration: 3600, isFree: false },
      { title: '第六章：夜间飞行与特殊场景', description: '灯光配置与安全措施', duration: 2400, isFree: false },
      { title: '第七章：多机编队飞行基础', description: '编队飞行原理与注意事项', duration: 3000, isFree: false },
      { title: '第八章：应急处置与故障排除', description: '飞行中突发情况的正确处理', duration: 2700, isFree: false },
      { title: '第九章：复杂气象条件飞行', description: '大风、雨雪、高温等环境应对', duration: 2400, isFree: false },
      { title: '第十章：飞行区域评估与风险管控', description: '现场评估与安全预案制定', duration: 2100, isFree: false },
      { title: '第十一章：实战训练（一）- 航拍任务', description: '完整航拍任务执行', duration: 5400, isFree: false },
      { title: '第十二章：实战训练（二）- 精准飞行', description: '精准定位与定点降落', duration: 5400, isFree: false },
      { title: '第十三章：实战训练（三）- 复杂地形', description: '山地、建筑密集区飞行', duration: 5400, isFree: false },
      { title: '第十四章：行业应用案例分析', description: '航拍、测绘、巡检等行业应用', duration: 2400, isFree: false },
      { title: '第十五章：飞行数据记录与分析', description: '日志分析优化飞行技能', duration: 1800, isFree: false },
      { title: '第十六章：进阶考核与能力认证', description: '综合能力评估', duration: 1800, isFree: false }
    ]
  },
  {
    title: 'AOPA无人机驾驶员认证培训',
    description: '本课程严格按照中国航空器拥有者及驾驶员协会（AOPA）认证标准设置，全面覆盖理论考试与实践考试内容。学员完成培训并通过考核后，可获得AOPA颁发的无人机驾驶员合格证。课程包含法规、气象、飞行原理、地面站操作、实践飞行等全部考试科目。',
    category: '专业认证',
    level: '中级工',
    price: 8800,
    originalPrice: 12800,
    duration: 1800, // 30小时
    lessons: 24,
    instructor: '王教员',
    teacherId: '',
    coverImage: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800',
    status: 'published',
    maxStudents: 20,
    salesCount: 67,
    rating: 4.7,
    reviewCount: 35,
    tags: ['AOPA', '考证', '驾驶员证', '认证'],
    lessonsData: [
      { title: '模块一：民用无人机法规概述', description: '民航法规、飞行规则、空域管理', duration: 3600, isFree: true },
      { title: '模块二：飞行原理与性能', description: '空气动力学、飞行性能分析', duration: 3600, isFree: true },
      { title: '模块三：气象学基础', description: '气象要素、天气影响、气象预报解读', duration: 3600, isFree: false },
      { title: '模块四：无人机系统组成', description: '飞控、动力、链路、地面站详解', duration: 3600, isFree: false },
      { title: '模块五：起降操纵技术', description: '起飞降落标准操作程序', duration: 3600, isFree: false },
      { title: '模块六：平飞与转弯', description: '水平飞行、转弯机动操作', duration: 3600, isFree: false },
      { title: '模块七：应急操作与特情处置', description: '失联、失控、电机停转等处置', duration: 3600, isFree: false },
      { title: '模块八：地面站操作', description: '任务规划、数据链路、监控', duration: 3600, isFree: false },
      { title: '实践一：模拟飞行基础', description: '模拟器操作熟悉', duration: 3600, isFree: false },
      { title: '实践二：起飞降落训练', description: '规范起飞降落动作', duration: 3600, isFree: false },
      { title: '实践三：平飞悬停训练', description: '定点悬停与高度控制', duration: 3600, isFree: false },
      { title: '实践四：航线飞行训练', description: '矩形、圆形、三角航线', duration: 3600, isFree: false },
      { title: '实践五：机动飞行训练', description: '八字飞行、应急开关操作', duration: 3600, isFree: false },
      { title: '实践六：地面站飞行', description: '程序飞行与监控', duration: 3600, isFree: false },
      { title: '理论复习（一）- 法规与空域', description: '重点法规知识梳理', duration: 1800, isFree: false },
      { title: '理论复习（二）- 飞行原理', description: '核心原理知识串讲', duration: 1800, isFree: false },
      { title: '理论复习（三）- 气象与设备', description: '气象设备知识要点', duration: 1800, isFree: false },
      { title: '理论模拟考试（一）', description: '全真模拟测试', duration: 3600, isFree: false },
      { title: '理论模拟考试（二）', description: '错题分析与讲解', duration: 1800, isFree: false },
      { title: '实践考核训练（一）', description: '考核流程熟悉', duration: 3600, isFree: false },
      { title: '实践考核训练（二）', description: '考核项目强化', duration: 3600, isFree: false },
      { title: '实践考核训练（三）', description: '模拟考核', duration: 3600, isFree: false },
      { title: '综合答疑与考前指导', description: '问题解答与注意事项', duration: 1800, isFree: false },
      { title: '正式考核', description: 'AOPA认证考核', duration: 3600, isFree: false }
    ]
  },
  {
    title: '无人机农业植保应用技术',
    description: '本课程专注于农业植保无人机应用技术，培养学员掌握植保无人机操作、药剂配比、作业规划、故障处理等专业技能。课程结合实际农田作业场景，涵盖水稻、小麦、玉米、果树等多种作物的植保作业技术。',
    category: '行业应用',
    level: '中级工',
    price: 4999,
    originalPrice: 6999,
    duration: 960, // 16小时
    lessons: 14,
    instructor: '赵教员',
    teacherId: '',
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    status: 'published',
    maxStudents: 25,
    salesCount: 45,
    rating: 4.6,
    reviewCount: 18,
    tags: ['农业', '植保', '应用', '喷雾'],
    lessonsData: [
      { title: '第一章：农业航空植保概述', description: '植保无人机发展现状与应用前景', duration: 1800, isFree: true },
      { title: '第二章：植保无人机系统', description: '专用植保机结构与喷雾系统', duration: 2400, isFree: true },
      { title: '第三章：农药基础知识', description: '常用农药类型、作用机理', duration: 2400, isFree: false },
      { title: '第四章：药剂配比与稀释计算', description: '科学配药方法与计算', duration: 2400, isFree: false },
      { title: '第五章：作业参数设置', description: '飞行高度、速度、喷幅确定', duration: 2100, isFree: false },
      { title: '第六章：作业区域规划', description: '地块测量、航线规划软件使用', duration: 3000, isFree: false },
      { title: '第七章：水稻田作业技术', description: '水稻全生育期植保作业要点', duration: 3000, isFree: false },
      { title: '第八章：小麦玉米作业技术', description: '旱田作物植保作业特点', duration: 2700, isFree: false },
      { title: '第九章：果树作业技术', description: '果树飞行与喷洒技巧', duration: 2700, isFree: false },
      { title: '第十章：作业后维护保养', description: '设备清洗与存放', duration: 1800, isFree: false },
      { title: '第十一章：常见故障与维修', description: '故障诊断与快速修复', duration: 2400, isFree: false },
      { title: '第十二章：作业安全与防护', description: '农药安全操作规范', duration: 1800, isFree: false },
      { title: '第十三章：实战训练', description: '模拟农田作业', duration: 5400, isFree: false },
      { title: '第十四章：考核与认证', description: '技能考核与证书颁发', duration: 1800, isFree: false }
    ]
  },
  {
    title: '无人机电力巡检技术培训',
    description: '本课程面向电力行业从业人员，系统讲解无人机电力巡检技术。课程涵盖输电线路巡检、杆塔巡检、变电站巡检、红外热成像检测等内容，培养学员掌握电力巡检无人机的专业操作技能与数据分析能力。',
    category: '行业应用',
    level: '高级工',
    price: 6800,
    originalPrice: 9800,
    duration: 1200, // 20小时
    lessons: 18,
    instructor: '陈教员',
    teacherId: '',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    status: 'published',
    maxStudents: 20,
    salesCount: 38,
    rating: 4.8,
    reviewCount: 15,
    tags: ['电力', '巡检', '行业应用', '高级'],
    lessonsData: [
      { title: '第一章：电力巡检概述', description: '电力巡检需求与发展', duration: 1800, isFree: true },
      { title: '第二章：输电线路基础知识', description: '线路结构与常见缺陷', duration: 2400, isFree: true },
      { title: '第三章：巡检无人机选型', description: '巡检机型特点与选择', duration: 2100, isFree: false },
      { title: '第四章：可见光巡检技术', description: '拍照要点与缺陷识别', duration: 3000, isFree: false },
      { title: '第五章：红外热成像检测', description: '红外设备使用与图像分析', duration: 3000, isFree: false },
      { title: '第六章：激光雷达扫描', description: 'LIDAR技术与点云数据', duration: 2400, isFree: false },
      { title: '第七章：杆塔精细化巡检', description: '杆塔各部件检查要点', duration: 3000, isFree: false },
      { title: '第八章：线路通道巡检', description: '通道隐患识别与记录', duration: 2400, isFree: false },
      { title: '第九章：变电站巡检', description: '变电站设备检查要点', duration: 2700, isFree: false },
      { title: '第十章：自动巡检技术', description: '航线规划与自主飞行', duration: 3000, isFree: false },
      { title: '第十一章：数据处理与分析', description: '图像处理与缺陷标注', duration: 3000, isFree: false },
      { title: '第十二章：巡检报告编写', description: '规范报告格式与内容', duration: 1800, isFree: false },
      { title: '第十三章：飞行安全规范', description: '电力环境飞行注意事项', duration: 2100, isFree: false },
      { title: '第十四章：模拟巡检训练', description: '仿真环境操作练习', duration: 5400, isFree: false },
      { title: '第十五章：实战巡检训练（一）', description: '杆塔精细化巡检', duration: 5400, isFree: false },
      { title: '第十六章：实战巡检训练（二）', description: '线路通道巡检', duration: 5400, isFree: false },
      { title: '第十七章：数据处理实战', description: '实际数据处理与分析', duration: 3600, isFree: false },
      { title: '第十八章：考核与认证', description: '综合能力考核', duration: 1800, isFree: false }
    ]
  },
  {
    title: '无人机测绘技术实战班',
    description: '本课程系统教授无人机测绘技术，包括航空摄影测量原理、像控点布设、航飞作业、数据处理、正射影像制作、数字高程模型生成等内容。学员将掌握完整的无人机测绘作业流程，能够独立完成中小型测绘项目。',
    category: '行业应用',
    level: '高级工',
    price: 7800,
    originalPrice: 10800,
    duration: 1440, // 24小时
    lessons: 20,
    instructor: '刘教员',
    teacherId: '',
    coverImage: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800',
    status: 'published',
    maxStudents: 18,
    salesCount: 52,
    rating: 4.9,
    reviewCount: 22,
    tags: ['测绘', '航测', 'GIS', '正射影像'],
    lessonsData: [
      { title: '第一章：航空摄影测量基础', description: '摄影测量原理与分类', duration: 2400, isFree: true },
      { title: '第二章：测绘坐标系与投影', description: '坐标系统与高程基准', duration: 2400, isFree: true },
      { title: '第三章：测绘无人机系统', description: '测绘专用无人机与载荷', duration: 2400, isFree: false },
      { title: '第四章：像控点布设方案', description: '像控点选择与测量方法', duration: 2700, isFree: false },
      { title: '第五章：航飞任务规划', description: '航线设计、分辨率、重叠率', duration: 3000, isFree: false },
      { title: '第六章：航飞作业实施', description: '外业操作流程与记录', duration: 3600, isFree: false },
      { title: '第七章：无人机数据处理概述', description: '航测软件介绍与工作流程', duration: 1800, isFree: false },
      { title: '第八章：影像预处理', description: '匀光匀色、畸变校正', duration: 2400, isFree: false },
      { title: '第九章：空中三角测量', description: 'POS解算与平差', duration: 3000, isFree: false },
      { title: '第十章：三维模型重建', description: '密集匹配与三维建模', duration: 3600, isFree: false },
      { title: '第十一章：DOM正射影像制作', description: '数字正射影像拼接与输出', duration: 3000, isFree: false },
      { title: '第十二章：DEM数字高程模型', description: '高程数据提取与处理', duration: 2700, isFree: false },
      { title: '第十三章：三维测图技术', description: '裸眼三维测图方法', duration: 3000, isFree: false },
      { title: '第十四章：精度评定', description: '精度指标与质量控制', duration: 2400, isFree: false },
      { title: '第十五章：测绘成果输出', description: '多种格式输出与展示', duration: 1800, isFree: false },
      { title: '第十六章：地形图绘制', description: '等高线处理与地形图制作', duration: 3000, isFree: false },
      { title: '第十七章：实操训练（一）- 像控测量', description: '外业像控点测量', duration: 5400, isFree: false },
      { title: '第十八章：实操训练（二）- 航飞作业', description: '实际航飞任务', duration: 5400, isFree: false },
      { title: '第十九章：实操训练（三）- 数据处理', description: '完整数据处理流程', duration: 7200, isFree: false },
      { title: '第二十章：考核与项目实战', description: '综合能力考核', duration: 3600, isFree: false }
    ]
  }
]

/**
 * 查找教师并返回ID
 */
async function findTeacher(name) {
  try {
    const result = await db.collection('teacher_profiles').limit(100).get()
    const teachers = result.data || []
    const teacher = teachers.find(t => 
      (t.name && t.name.includes(name.replace('教员', ''))) ||
      (t.realName && t.realName.includes(name.replace('教员', '')))
    )
    return teacher?._id || ''
  } catch (error) {
    console.log('查找教师失败:', error.message)
    return ''
  }
}

/**
 * 获取 categories 集合中的分类
 */
async function getCategories() {
  try {
    const result = await db.collection('categories').orderBy('sort', 'asc').get()
    return result.data || []
  } catch (error) {
    console.log('获取分类失败:', error.message)
    return []
  }
}

/**
 * 根据课程分类获取分类ID
 */
async function getCategoryInfo(categoryKey) {
  const mappedCategory = categoryMapping[categoryKey] || categoryKey
  const categories = await getCategories()
  const cat = categories.find(c => c.name === mappedCategory)
  return {
    categoryId: cat?._id || '',
    category: cat?.name || mappedCategory
  }
}

/**
 * 添加课程数据
 */
async function addCourses() {
  console.log('='.repeat(60))
  console.log('开始添加真实无人机培训课程数据...')
  console.log('='.repeat(60))

  const results = []
  
  for (const course of realCourses) {
    try {
      console.log(`\n添加课程: ${course.title}`)
      
      // 查找对应教师
      const teacherId = await findTeacher(course.instructor)
      
      // 获取分类信息
      const { categoryId, category } = await getCategoryInfo(course.category)
      console.log(`  分类映射: ${course.category} -> ${category} (ID: ${categoryId})`)
      
      // 构建课程数据
      const courseData = {
        title: course.title,
        description: course.description,
        category: category, // 使用 categories 集合中的分类名称
        categoryId: categoryId,
        level: course.level,
        price: course.price,
        originalPrice: course.originalPrice,
        duration: course.duration,
        lessons: course.lessons,
        instructor: course.instructor,
        teacherId: teacherId,
        coverImage: course.coverImage,
        status: course.status,
        maxStudents: course.maxStudents,
        salesCount: course.salesCount,
        rating: course.rating,
        reviewCount: course.reviewCount,
        tags: course.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // 添加课程
      const addResult = await db.collection('courses').add(courseData)
      const courseId = addResult.id
      console.log(`✓ 课程添加成功，ID: ${courseId}`)

      // 添加章节
      if (course.lessonsData && course.lessonsData.length > 0) {
        console.log(`  添加 ${course.lessonsData.length} 个章节...`)
        
        for (let i = 0; i < course.lessonsData.length; i++) {
          const lesson = course.lessonsData[i]
          await db.collection('lessons').add({
            courseId: courseId,
            title: lesson.title,
            description: lesson.description,
            videoUrl: '', // 视频URL暂时为空
            videoDuration: lesson.duration,
            order: i + 1,
            isFree: lesson.isFree,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
        console.log(`  ✓ 章节添加完成`)
      }

      results.push({
        courseId,
        title: course.title,
        status: 'success'
      })
    } catch (error) {
      console.error(`✗ 添加课程失败: ${error.message}`)
      results.push({
        title: course.title,
        status: 'failed',
        error: error.message
      })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('添加完成！')
  console.log('='.repeat(60))

  const successCount = results.filter(r => r.status === 'success').length
  const failCount = results.filter(r => r.status === 'failed').length

  console.log(`成功: ${successCount} 个课程`)
  console.log(`失败: ${failCount} 个课程`)

  return {
    code: 0,
    message: '课程数据添加完成',
    data: {
      total: results.length,
      success: successCount,
      failed: failCount,
      results
    }
  }
}

/**
 * 清空旧课程数据
 */
async function clearCourses() {
  console.log('清空现有课程数据...')
  
  try {
    // 获取所有课程
    const courses = await db.collection('courses').limit(1000).get()
    const lessons = await db.collection('lessons').limit(1000).get()
    
    // 删除课程
    for (const course of courses.data || []) {
      await db.collection('courses').doc(course._id).remove()
    }
    console.log(`已删除 ${courses.data?.length || 0} 个课程`)
    
    // 删除章节
    for (const lesson of lessons.data || []) {
      await db.collection('lessons').doc(lesson._id).remove()
    }
    console.log(`已删除 ${lessons.data?.length || 0} 个章节`)
    
    return { code: 0, message: '清空完成' }
  } catch (error) {
    console.error('清空失败:', error)
    return { code: 500, message: error.message }
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event

  console.log('执行操作:', action)

  try {
    switch (action) {
      case 'add':
        return await addCourses()
      
      case 'clear':
        return await clearCourses()
      
      case 'reset':
        await clearCourses()
        return await addCourses()
      
      default:
        return {
          code: 400,
          message: `未知的操作: ${action}，支持: add(添加)、clear(清空)、reset(重置)`
        }
    }
  } catch (error) {
    console.error('执行失败:', error)
    return {
      code: 500,
      message: error.message || '执行失败',
      error: error
    }
  }
}
