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
 * 获取正在招生的班级
 */
async function enrollingClasses(params = {}) {
  const { page = 1, pageSize = 10 } = params;
  
  // 从 classes 集合获取正在招生的班级
  let where = {
    status: 'open', // 或 'enrolling'
  };
  
  // 获取总数
  const countResult = await db.collection('classes')
    .where(where)
    .count();
  
  // 获取列表
  const classes = await db.collection('classes')
    .where(where)
    .orderBy('startDate', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  
  // 获取关联课程信息
  const courseIds = [...new Set(classes.data.map(c => c.courseId).filter(Boolean))];
  let coursesMap = {};
  
  if (courseIds.length > 0) {
    const courses = await db.collection('courses')
      .where({
        _id: _.in(courseIds),
      })
      .field({ _id: true, title: true })
      .get();
    
    coursesMap = courses.data.reduce((acc, c) => {
      acc[c._id] = c;
      return acc;
    }, {});
  }
  
  // 获取关联教师信息
  const teacherIds = [...new Set(classes.data.map(c => c.teacherId).filter(Boolean))];
  let teachersMap = {};
  
  if (teacherIds.length > 0) {
    const teachers = await db.collection('teachers')
      .where({
        _id: _.in(teacherIds),
      })
      .field({ _id: true, name: true })
      .get();
    
    teachersMap = teachers.data.reduce((acc, t) => {
      acc[t._id] = t;
      return acc;
    }, {});
  }
  
  const list = classes.data.map(cls => ({
    _id: cls._id,
    classId: cls._id,
    name: cls.name || cls.className || '班级名称',
    className: cls.name || cls.className || '班级名称',
    coverImage: cls.coverImage || cls.cover || '',
    price: cls.price || 0,
    startDate: cls.startDate || cls.startTime || '',
    location: cls.location || '',
    maxStudents: cls.maxStudents || cls.capacity?.max || 30,
    enrolledCount: cls.enrolledCount || cls.capacity?.enrolled || 0,
    status: cls.status || 'open',
    courseId: cls.courseId,
    courseName: coursesMap[cls.courseId]?.title || '',
    teacherId: cls.teacherId,
    teacherName: teachersMap[cls.teacherId]?.name || '待分配',
    hasVideoGrant: cls.hasVideoGrant || false,
    videoGrantCourseName: cls.videoGrantCourseName || '',
  }));
  
  return {
    success: true,
    data: list,
    total: countResult.total,
    page,
    pageSize,
  };
}

/**
 * 获取班级详情
 */
async function classDetail(classId) {
  const classes = await db.collection('classes')
    .doc(classId)
    .get();
  
  if (classes.data.length === 0) {
    return { success: false, error: '班级不存在' };
  }
  
  const cls = classes.data;
  
  // 获取关联课程信息
  let course = null;
  if (cls.courseId) {
    const courses = await db.collection('courses')
      .doc(cls.courseId)
      .field({ _id: true, title: true, description: true, cover: true })
      .get();
    
    if (courses.data.length > 0) {
      course = courses.data;
    }
  }
  
  // 获取教师信息
  let teacher = null;
  if (cls.teacherId) {
    const teachers = await db.collection('teachers')
      .doc(cls.teacherId)
      .field({ _id: true, name: true, avatar: true, title: true })
      .get();
    
    if (teachers.data.length > 0) {
      teacher = teachers.data;
    }
  }
  
  return {
    success: true,
    data: {
      _id: cls._id,
      classId: cls._id,
      name: cls.name || cls.className || '班级名称',
      className: cls.name || cls.className || '班级名称',
      coverImage: cls.coverImage || cls.cover || '',
      description: cls.description || course?.description || '',
      price: cls.price || 0,
      originalPrice: cls.originalPrice || cls.price || 0,
      startDate: cls.startDate || cls.startTime || '',
      endDate: cls.endDate || cls.endTime || '',
      location: cls.location || '',
      maxStudents: cls.maxStudents || cls.capacity?.max || 30,
      enrolledCount: cls.enrolledCount || cls.capacity?.enrolled || 0,
      status: cls.status || 'open',
      courseId: cls.courseId,
      courseName: course?.title || '',
      teacherId: cls.teacherId,
      teacherName: teacher?.name || '待分配',
      teacherAvatar: teacher?.avatar || '',
      teacherTitle: teacher?.title || '',
      hasVideoGrant: cls.hasVideoGrant || false,
      videoGrantCourseName: cls.videoGrantCourseName || '',
      videoGrantCourseId: cls.videoGrantCourseId || '',
      contactPhone: cls.contactPhone || '',
      notes: cls.notes || '',
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    },
  };
}

/**
 * 提交报名
 */
async function submitEnrollment(data) {
  const { classId, name, phone, idCard, notes, code } = data;
  
  if (!classId) {
    return { success: false, error: '缺少班级ID' };
  }
  
  if (!name || !phone) {
    return { success: false, error: '姓名和手机号不能为空' };
  }
  
  // 验证手机号
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: '手机号格式不正确' };
  }
  
  // 获取班级信息
  const classes = await db.collection('classes')
    .doc(classId)
    .get();
  
  if (classes.data.length === 0) {
    return { success: false, error: '班级不存在' };
  }
  
  const cls = classes.data;
  
  // 检查是否已满员
  const maxStudents = cls.maxStudents || cls.capacity?.max || 30;
  const enrolledCount = cls.enrolledCount || cls.capacity?.enrolled || 0;
  
  if (enrolledCount >= maxStudents) {
    return { success: false, error: '班级已满员' };
  }
  
  // 检查是否重复报名
  const existEnrollment = await db.collection('enrollments')
    .where({
      classId,
      phone,
      status: _.nin(['cancelled', 'rejected']),
    })
    .limit(1)
    .get();
  
  if (existEnrollment.data.length > 0) {
    return { success: false, error: '您已报名此班级' };
  }
  
  // 创建报名记录
  const enrollmentData = {
    classId,
    className: cls.name || cls.className,
    courseId: cls.courseId,
    name,
    phone,
    idCard: idCard || '',
    notes: notes || '',
    status: 'pending', // pending, confirmed, cancelled
    enrollmentTime: new Date().toISOString(),
    source: 'online', // online, offline
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  };
  
  // 如果有用户ID，关联用户
  if (data.userId) {
    enrollmentData.userId = data.userId;
  }
  
  const result = await db.collection('enrollments')
    .add({
      data: enrollmentData,
    });
  
  // 更新班级已报名人数
  await db.collection('classes')
    .doc(classId)
    .update({
      enrolledCount: _.inc(1),
      updatedAt: db.serverDate(),
    });
  
  return {
    success: true,
    data: {
      enrollmentId: result.id,
      message: '报名成功，请等待审核',
    },
  };
}

/**
 * 获取班级列表（通用，支持更多筛选）
 */
async function getClassList(params = {}) {
  const {
    page = 1,
    pageSize = 10,
    status = '',
    keyword = '',
  } = params;
  
  let where = {};
  
  // 状态筛选
  if (status) {
    where.status = status;
  }
  
  // 关键词搜索
  if (keyword) {
    where = {
      ...where,
      $or: [
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { className: db.RegExp({ regexp: keyword, options: 'i' }) },
      ],
    };
  }
  
  // 获取总数
  const countResult = await db.collection('classes')
    .where(where)
    .count();
  
  // 获取列表
  const classes = await db.collection('classes')
    .where(where)
    .orderBy('startDate', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();
  
  const list = classes.data.map(cls => ({
    _id: cls._id,
    classId: cls._id,
    name: cls.name || cls.className || '班级名称',
    className: cls.name || cls.className || '班级名称',
    coverImage: cls.coverImage || cls.cover || '',
    price: cls.price || 0,
    startDate: cls.startDate || '',
    location: cls.location || '',
    maxStudents: cls.maxStudents || 30,
    enrolledCount: cls.enrolledCount || 0,
    status: cls.status || 'open',
    teacherName: cls.teacherName || '待分配',
  }));
  
  return {
    success: true,
    data: list,
    total: countResult.total,
    page,
    pageSize,
  };
}

/**
 * 获取通知公告
 */
async function getNotices(limit = 10) {
  const notices = await db.collection('notices')
    .where({
      status: 'published',
    })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return {
    success: true,
    data: notices.data.map(n => ({
      _id: n._id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
    })),
  };
}

/**
 * 获取教师列表
 */
async function getTeachers(params = {}) {
  const { specialty = '' } = params;
  
  let where = {};
  
  if (specialty) {
    where.specialty = specialty;
  }
  
  const teachers = await db.collection('teachers')
    .where(where)
    .field({
      _id: true,
      name: true,
      avatar: true,
      title: true,
      specialty: true,
      bio: true,
    })
    .limit(20)
    .get();
  
  return {
    success: true,
    data: teachers.data,
  };
}

/**
 * 获取学习路径
 */
async function getLearningPaths(params = {}) {
  const { limit = 10, difficulty = '' } = params;
  
  let where = {};
  
  if (difficulty) {
    where.difficulty = difficulty;
  }
  
  const paths = await db.collection('learning_paths')
    .where(where)
    .orderBy('order', 'asc')
    .limit(limit)
    .get();
  
  return {
    success: true,
    data: paths.data.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      difficulty: p.difficulty || 'beginner',
      categoryIds: p.categoryIds || [],
      order: p.order || 0,
    })),
  };
}

/**
 * 获取轮播图
 */
async function getBanners(limit = 5) {
  const banners = await db.collection('banners')
    .where({
      status: 'active',
    })
    .orderBy('order', 'asc')
    .limit(limit)
    .get();
  
  return {
    success: true,
    data: banners.data.map(b => ({
      _id: b._id,
      image: b.image,
      link: b.link || '',
      courseId: b.courseId || '',
      title: b.title || '',
      order: b.order || 0,
    })),
  };
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  // 调试日志
  console.log('HTTP Event:', JSON.stringify(event));
  
  // HTTP 云函数格式：event 是整个请求体
  // 如果 event 是字符串，尝试解析
  let parsedEvent = event;
  if (typeof event === 'string') {
    try {
      parsedEvent = JSON.parse(event);
    } catch (e) {
      console.error('Parse event error:', e);
    }
  }
  
  // HTTP 云函数中，请求参数在 event 中
  const { action, data = {} } = parsedEvent;
  
  try {
    let result;
    
    switch (action) {
      // 原有 action（兼容）
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
        
      // 新增 action（匹配 services.ts）
      case 'list':
        result = await getCourseList(data);
        break;
        
      case 'detail':
        result = await getCourseDetail(data.courseId);
        break;
        
      case 'chapters':
        // 返回课程章节
        const chaptersResult = await db.collection('lessons')
          .where({ courseId: data.courseId })
          .orderBy('order', 'asc')
          .get();
        result = { success: true, data: chaptersResult.data };
        break;
        
      case 'categories':
        result = await getCategories();
        break;
        
      case 'banners':
        result = await getBanners(data.limit);
        break;
        
      case 'enrollingClasses':
        result = await enrollingClasses(data);
        break;
        
      case 'classDetail':
        result = await classDetail(data.classId);
        break;
        
      case 'enroll':
        result = await submitEnrollment(data);
        break;
        
      case 'learningPaths':
        result = await getLearningPaths(data);
        break;
        
      case 'notices':
        result = await getNotices(data.limit);
        break;
        
      case 'teachers':
        result = await getTeachers(data);
        break;
        
      // 兼容旧格式
      case 'getList':
        result = await getCourseList(data);
        break;
        
      default:
        result = { success: false, error: '未知的操作: ' + action };
    }
    
    return result;
  } catch (error) {
    console.error('Mobile Course Error:', error);
    return { success: false, error: error.message };
  }
};
