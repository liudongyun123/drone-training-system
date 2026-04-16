/**
 * 移动端课程服务
 * 支持：课程列表、详情、章节、搜索、收藏等
 */

const cloud = require('tcb-admin-node');

// 初始化云开发
cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

/**
 * 获取课程列表
 */
async function getCourseList(params = {}) {
  const {
    page = 1,
    pageSize = 10,
    category = '',
    level = '',
    keyword = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;
  
  let where = { status: 'published' };
  
  // 分类筛选
  if (category) {
    where.category = category;
  }
  
  // 难度筛选
  if (level) {
    where.level = level;
  }
  
  // 关键词搜索（标题或描述）
  if (keyword) {
    where = {
      ...where,
      $or: [
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) },
      ],
    };
  }
  
  // 排序
  let order = sortOrder === 'asc' ? _.asc : _.desc;
  let orderField = sortBy === 'rating' ? 'rating' : 
                   sortBy === 'price' ? 'price' : 
                   sortBy === 'studentCount' ? 'studentCount' : 'createdAt';
  
  // 获取总数
  const countResult = await db.collection('courses')
    .where(where)
    .count();
  
  // 获取列表
  const courses = await db.collection('courses')
    .where(where)
    .orderBy(orderField, order)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  
  // 获取教师信息
  const teacherIds = [...new Set(courses.data.map(c => c.teacherId).filter(Boolean))];
  let teachersMap = {};
  
  if (teacherIds.length > 0) {
    const teachers = await db.collection('teachers')
      .where({
        _id: _.in(teacherIds),
      })
      .get();
    
    teachersMap = teachers.data.reduce((acc, t) => {
      acc[t._id] = t;
      return acc;
    }, {});
  }
  
  // 组合数据
  const list = courses.data.map(course => ({
    _id: course._id,
    title: course.title,
    cover: course.cover,
    description: course.description?.slice(0, 100) || '',
    price: course.price || 0,
    originalPrice: course.originalPrice || course.price || 0,
    category: course.category,
    level: course.level,
    duration: course.duration || 0,
    studentCount: course.studentCount || 0,
    rating: course.rating || 4.5,
    tags: course.tags || [],
    isFree: course.isFree || false,
    teacher: teachersMap[course.teacherId] ? {
      _id: teachersMap[course.teacherId]._id,
      name: teachersMap[course.teacherId].name,
      avatar: teachersMap[course.teacherId].avatar,
      title: teachersMap[course.teacherId].title,
    } : null,
    createdAt: course.createdAt,
  }));
  
  return {
    success: true,
    data: {
      list,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize),
    },
  };
}

/**
 * 获取精选课程
 */
async function getFeaturedCourses(limit = 5) {
  const courses = await db.collection('courses')
    .where({ 
      status: 'published',
      isFeatured: true,
    })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return {
    success: true,
    data: courses.data.map(course => ({
      _id: course._id,
      title: course.title,
      cover: course.cover,
      description: course.description?.slice(0, 80) || '',
      price: course.price || 0,
      originalPrice: course.originalPrice || course.price || 0,
      studentCount: course.studentCount || 0,
      rating: course.rating || 4.5,
      isFree: course.isFree || false,
    })),
  };
}

/**
 * 获取课程详情
 */
async function getCourseDetail(courseId) {
  // 获取课程
  const courses = await db.collection('courses')
    .doc(courseId)
    .get();
  
  if (courses.data.length === 0) {
    return { success: false, error: '课程不存在' };
  }
  
  const course = courses.data;
  
  // 获取教师信息
  let teacher = null;
  if (course.teacherId) {
    const teachers = await db.collection('teachers')
      .doc(course.teacherId)
      .get();
    
    if (teachers.data.length > 0) {
      const t = teachers.data;
      teacher = {
        _id: t._id,
        name: t.name,
        avatar: t.avatar,
        title: t.title,
        bio: t.bio,
      };
    }
  }
  
  // 获取章节和课时
  const chapters = await db.collection('lessons')
    .where({ courseId })
    .orderBy('order', 'asc')
    .get();
  
  // 按章节分组
  const chapterMap = {};
  chapters.data.forEach(lesson => {
    const chapterId = lesson.chapterId || 'default';
    if (!chapterMap[chapterId]) {
      chapterMap[chapterId] = {
        _id: chapterId,
        title: lesson.chapterTitle || '课程内容',
        order: lesson.chapterOrder || 0,
        lessons: [],
      };
    }
    chapterMap[chapterId].lessons.push({
      _id: lesson._id,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration || 0,
      order: lesson.order,
      isFree: lesson.isFree || false,
      description: lesson.description,
    });
  });
  
  // 计算总时长
  const totalDuration = chapters.data.reduce((sum, l) => sum + (l.duration || 0), 0);
  
  // 统计课时数
  const lessonCount = chapters.data.length;
  
  return {
    success: true,
    data: {
      _id: course._id,
      title: course.title,
      cover: course.cover,
      description: course.description,
      price: course.price || 0,
      originalPrice: course.originalPrice || course.price || 0,
      category: course.category,
      level: course.level,
      duration: totalDuration,
      lessonCount,
      studentCount: course.studentCount || 0,
      rating: course.rating || 4.5,
      tags: course.tags || [],
      isFree: course.isFree || false,
      status: course.status,
      teacher,
      chapters: Object.values(chapterMap).sort((a, b) => a.order - b.order),
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    },
  };
}

/**
 * 获取课程分类
 */
async function getCategories() {
  // 从现有课程中提取分类
  const courses = await db.collection('courses')
    .where({ status: 'published' })
    .field({ category: true })
    .get();
  
  // 统计各分类数量
  const categoryMap = {};
  courses.data.forEach(c => {
    if (c.category) {
      categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
    }
  });
  
  // 转换为数组并排序
  const categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  return {
    success: true,
    data: [
      { name: '全部', count: courses.data.length },
      ...categories,
    ],
  };
}

/**
 * 获取课时详情
 */
async function getLessonDetail(lessonId) {
  const lessons = await db.collection('lessons')
    .doc(lessonId)
    .get();
  
  if (lessons.data.length === 0) {
    return { success: false, error: '课时不存在' };
  }
  
  const lesson = lessons.data;
  
  // 获取上一课和下一课
  const siblings = await db.collection('lessons')
    .where({ 
      courseId: lesson.courseId,
      chapterId: lesson.chapterId,
    })
    .orderBy('order', 'asc')
    .get();
  
  const currentIndex = siblings.data.findIndex(l => l._id === lessonId);
  const prevLesson = currentIndex > 0 ? siblings.data[currentIndex - 1] : null;
  const nextLesson = currentIndex < siblings.data.length - 1 ? siblings.data[currentIndex + 1] : null;
  
  return {
    success: true,
    data: {
      _id: lesson._id,
      courseId: lesson.courseId,
      title: lesson.title,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration || 0,
      order: lesson.order,
      isFree: lesson.isFree || false,
      description: lesson.description,
      prevLesson: prevLesson ? { _id: prevLesson._id, title: prevLesson.title } : null,
      nextLesson: nextLesson ? { _id: nextLesson._id, title: nextLesson.title } : null,
    },
  };
}

/**
 * 检查用户是否已购买课程
 */
async function checkCoursePurchased(userId, courseId) {
  const orders = await db.collection('orders')
    .where({
      userId,
      courseId,
      status: 'paid',
    })
    .limit(1)
    .get();
  
  return {
    success: true,
    data: {
      purchased: orders.data.length > 0,
    },
  };
}

/**
 * 获取热门课程
 */
async function getHotCourses(limit = 10) {
  const courses = await db.collection('courses')
    .where({ status: 'published' })
    .orderBy('studentCount', 'desc')
    .limit(limit)
    .get();
  
  return {
    success: true,
    data: courses.data.map(course => ({
      _id: course._id,
      title: course.title,
      cover: course.cover,
      price: course.price || 0,
      originalPrice: course.originalPrice || course.price || 0,
      studentCount: course.studentCount || 0,
      rating: course.rating || 4.5,
      isFree: course.isFree || false,
    })),
  };
}

/**
 * 获取推荐课程（同分类或同教师）
 */
async function getRecommendedCourses(courseId, limit = 6) {
  const courses = await db.collection('courses')
    .doc(courseId)
    .get();
  
  if (courses.data.length === 0) {
    return { success: false, error: '课程不存在' };
  }
  
  const currentCourse = courses.data;
  
  // 获取同分类课程
  const recommended = await db.collection('courses')
    .where({
      status: 'published',
      _id: _.neq(courseId),
      $or: [
        { category: currentCourse.category },
        { teacherId: currentCourse.teacherId },
      ],
    })
    .limit(limit)
    .get();
  
  return {
    success: true,
    data: recommended.data.map(course => ({
      _id: course._id,
      title: course.title,
      cover: course.cover,
      price: course.price || 0,
      originalPrice: course.originalPrice || course.price || 0,
      studentCount: course.studentCount || 0,
      rating: course.rating || 4.5,
      isFree: course.isFree || false,
    })),
  };
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event;
  
  try {
    let result;
    
    switch (action) {
      case 'getCourseList':
        result = await getCourseList(data);
        break;
        
      case 'getFeaturedCourses':
        result = await getFeaturedCourses(data.limit);
        break;
        
      case 'getCourseDetail':
        result = await getCourseDetail(data.courseId);
        break;
        
      case 'getCategories':
        result = await getCategories();
        break;
        
      case 'getLessonDetail':
        result = await getLessonDetail(data.lessonId);
        break;
        
      case 'checkCoursePurchased':
        result = await checkCoursePurchased(data.userId, data.courseId);
        break;
        
      case 'getHotCourses':
        result = await getHotCourses(data.limit);
        break;
        
      case 'getRecommendedCourses':
        result = await getRecommendedCourses(data.courseId, data.limit);
        break;
        
      default:
        result = { success: false, error: '未知的操作' };
    }
    
    return result;
  } catch (error) {
    console.error('Mobile Course Error:', error);
    return { success: false, error: error.message };
  }
};
