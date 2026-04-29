// ============================================================================
// 数据库初始化脚本 - 让项目连接数据库就能用
// ============================================================================
// 
// 使用方法：
// 1. 在 CloudBase 控制台「云函数」页面
// 2. 创建新云函数，粘贴此代码
// 3. 执行云函数，自动创建集合并导入初始数据
//
// ============================================================================

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database;

// ============================================================================
// 课程数据
// ============================================================================
const courses = [
  {
    _id: 'course_001',
    title: '无人机驾驶员初级课程',
    description: '适合零基础学员，了解无人机基础知识和飞行原理',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 199,
    originalPrice: 299,
    level: '初级工',
    category: '基础培训',
    status: 'published',
    salesCount: 156,
    duration: 120, // 分钟
    lessons: 12,
    instructor: '张教官',
    features: ['理论+实操', '小班教学', '颁发结业证书'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'course_002',
    title: '无人机航拍技术进阶',
    description: '学习专业航拍技巧，掌握构图、运镜、后期处理',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 399,
    originalPrice: 599,
    level: '中级工',
    category: '航拍技术',
    status: 'published',
    salesCount: 89,
    duration: 180,
    lessons: 18,
    instructor: '李教官',
    features: ['实操为主', '航拍作品点评', '推荐就业'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'course_003',
    title: '多旋翼无人机维修保养',
    description: '掌握无人机结构原理，学会日常维护和故障排除',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 299,
    originalPrice: 399,
    level: '初级工',
    category: '维修技术',
    status: 'published',
    salesCount: 67,
    duration: 150,
    lessons: 15,
    instructor: '王技师',
    features: ['实物教学', '故障案例库', '维修证书'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'course_004',
    title: '无人机行业应用实战',
    description: '农业植保、电力巡检、测绘航拍等行业应用',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 599,
    originalPrice: 799,
    level: '高级工',
    category: '行业应用',
    status: 'published',
    salesCount: 45,
    duration: 240,
    lessons: 24,
    instructor: '陈专家',
    features: ['行业定制', '实战项目', '推荐上岗'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// ============================================================================
// 培训班数据
// ============================================================================
const classes = [
  {
    _id: 'class_001',
    name: '第十期无人机驾驶员培训班',
    description: '为期两周的系统培训，包含理论课和实操课',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 2999,
    originalPrice: 3999,
    status: 'enrolling',
    startDate: '2026-05-15',
    endDate: '2026-05-28',
    location: '北京市朝阳区航空路88号',
    maxStudents: 30,
    enrolledCount: 18,
    instructor: '张教官',
    includedCourses: ['course_001', 'course_003'],
    schedule: '周一至周五 9:00-17:00',
    facilities: ['理论教室', '模拟飞行室', '实操场地', '住宿'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'class_002',
    name: '航拍专项提升班',
    description: '一周集中训练，掌握专业航拍技能',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 1999,
    originalPrice: 2999,
    status: 'enrolling',
    startDate: '2026-05-20',
    endDate: '2026-05-26',
    location: '北京市朝阳区航空路88号',
    maxStudents: 20,
    enrolledCount: 8,
    instructor: '李教官',
    includedCourses: ['course_002'],
    schedule: '周一至周日 9:00-17:00',
    facilities: ['航拍场地', '后期处理室'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// ============================================================================
// 商品数据
// ============================================================================
const products = [
  {
    _id: 'product_001',
    name: 'DJI Mini 3 Pro 畅飞套装',
    description: '入门级航拍无人机，折叠便携，性价比高',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 4788,
    originalPrice: 5788,
    categoryId: 'cat_001',
    categoryName: '整机',
    status: 'onsale',
    stock: 50,
    salesCount: 123,
    specifications: ['重量249g', '续航34分钟', '4K视频'],
    isRecommend: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'product_002',
    name: 'DJI Mavic 3 Classic',
    description: '专业航拍无人机，哈苏相机，画质旗舰',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 10888,
    originalPrice: 12888,
    categoryId: 'cat_001',
    categoryName: '整机',
    status: 'onsale',
    stock: 30,
    salesCount: 56,
    specifications: ['重量895g', '续航46分钟', '5.1K视频'],
    isRecommend: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'product_003',
    name: '智能飞行电池（MAVIC 3）',
    description: '原装正品，容量5000mAh，续航46分钟',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 999,
    originalPrice: 1299,
    categoryId: 'cat_002',
    categoryName: '配件',
    status: 'onsale',
    stock: 200,
    salesCount: 234,
    specifications: ['5000mAh', '原装正品'],
    isRecommend: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'product_004',
    name: '无人机专用镜头滤镜套装',
    description: 'ND滤镜+偏振镜，提升航拍画质',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 299,
    originalPrice: 399,
    categoryId: 'cat_002',
    categoryName: '配件',
    status: 'onsale',
    stock: 150,
    salesCount: 189,
    specifications: ['ND4/8/16/32', '适配主流机型'],
    isRecommend: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'product_005',
    name: '无人机硬壳运输箱',
    description: '高强度ABS材质，防摔防水，便携设计',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 399,
    originalPrice: 599,
    categoryId: 'cat_002',
    categoryName: '配件',
    status: 'onsale',
    stock: 100,
    salesCount: 145,
    specifications: ['防水IP67', '定制海绵内衬'],
    isRecommend: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'product_006',
    name: '无人机遥控器遮光罩',
    description: '强光下清晰查看屏幕，折叠便携',
    coverImage: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    price: 99,
    originalPrice: 149,
    categoryId: 'cat_002',
    categoryName: '配件',
    status: 'onsale',
    stock: 300,
    salesCount: 567,
    specifications: ['适配主流遥控器', '折叠设计'],
    isRecommend: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// ============================================================================
// 商品分类数据
// ============================================================================
const productCategories = [
  { _id: 'cat_001', name: '整机', sort: 1, icon: '✈️' },
  { _id: 'cat_002', name: '配件', sort: 2, icon: '🔧' },
  { _id: 'cat_003', name: '周边', sort: 3, icon: '👕' }
];

// ============================================================================
// 教师数据
// ============================================================================
const teachers = [
  {
    _id: 'teacher_001',
    name: '张伟',
    title: '首席飞行教官',
    avatar: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    introduction: 'AOPA认证教官，10年飞行经验，培训学员超500人',
    specialties: ['基础飞行', '安全规范', '航拍基础'],
    years: 10,
    students: 500,
    rating: 4.9
  },
  {
    _id: 'teacher_002',
    name: '李明',
    title: '航拍专家',
    avatar: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    introduction: '央视纪录片航拍摄影师，作品多次获奖',
    specialties: ['航拍构图', '运镜技巧', '后期调色'],
    years: 8,
    students: 320,
    rating: 4.8
  },
  {
    _id: 'teacher_003',
    name: '王强',
    title: '维修技师',
    avatar: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg',
    introduction: '大疆授权维修工程师，精通各型号无人机维修',
    specialties: ['故障诊断', '维修保养', '改装升级'],
    years: 6,
    students: 280,
    rating: 4.7
  }
];

// ============================================================================
// 初始化函数
// ============================================================================
async function initData() {
  const results = {
    courses: { total: 0, inserted: 0, error: null },
    classes: { total: 0, inserted: 0, error: null },
    products: { total: 0, inserted: 0, error: null },
    productCategories: { total: 0, inserted: 0, error: null },
    teachers: { total: 0, inserted: 0, error: null }
  };

  // 插入课程
  try {
    const coursesRes = await db.collection('courses').count();
    results.courses.total = coursesRes.total || 0;
    
    for (const course of courses) {
      await db.collection('courses').add({ data: course });
      results.courses.inserted++;
    }
  } catch (e) {
    results.courses.error = e.message;
  }

  // 插入培训班
  try {
    const classesRes = await db.collection('classes').count();
    results.classes.total = classesRes.total || 0;
    
    for (const cls of classes) {
      await db.collection('classes').add({ data: cls });
      results.classes.inserted++;
    }
  } catch (e) {
    results.classes.error = e.message;
  }

  // 插入商品
  try {
    for (const product of products) {
      await db.collection('products').add({ data: product });
      results.products.inserted++;
    }
  } catch (e) {
    results.products.error = e.message;
  }

  // 插入商品分类
  try {
    for (const cat of productCategories) {
      await db.collection('product_categories').add({ data: cat });
      results.productCategories.inserted++;
    }
  } catch (e) {
    results.productCategories.error = e.message;
  }

  // 插入教师
  try {
    for (const teacher of teachers) {
      await db.collection('teachers').add({ data: teacher });
      results.teachers.inserted++;
    }
  } catch (e) {
    results.teachers.error = e.message;
  }

  return results;
}

// ============================================================================
// 云函数入口
// ============================================================================
exports.main = async (event, context) => {
  try {
    const results = await initData();
    
    return {
      success: true,
      message: '数据库初始化完成',
      results,
      summary: {
        courses: `${results.courses.inserted}/${courses.length}`,
        classes: `${results.classes.inserted}/${classes.length}`,
        products: `${results.products.inserted}/${products.length}`,
        categories: `${results.productCategories.inserted}/${productCategories.length}`,
        teachers: `${results.teachers.inserted}/${teachers.length}`
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};
