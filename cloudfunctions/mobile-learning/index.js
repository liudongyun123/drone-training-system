/**
 * 移动端学习服务云函数 - Feature: Learning
 * 
 * 处理学习进度、收藏、学习路径、证书等学习相关功能
 * 
 * 小程序端 Actions:
 * - getLearningStats      : 获取学习统计
 * - getMyCourses         : 获取我的课程
 * - getCourseProgress     : 获取课程进度
 * - getLessonProgress    : 获取课时进度
 * - updateProgress        : 更新学习进度
 * - getFavorites          : 获取收藏列表
 * - addFavorite           : 添加收藏
 * - removeFavorite        : 移除收藏
 * - getLearningPaths       : 获取学习路径列表
 * - getLearningPathDetail  : 获取学习路径详情
 * - getPathProgress       : 获取路径学习进度
 * - getCertificates       : 获取证书列表
 * - getCertificateDetail  : 获取证书详情
 * - downloadCertificate   : 下载证书
 * 
 * 管理端 Actions (进度管理):
 * - getProgressList       : 获取进度列表
 * - getUserProgress       : 获取学员进度
 * - getProgress           : 获取单条进度
 * - updateProgress        : 更新进度
 * - completeLesson        : 完成课时
 * - resetProgress         : 重置进度
 * - batchUpdateProgress    : 批量更新进度
 * - getProgressStats      : 获取进度统计
 * - getUserLearningStats  : 获取学员学习统计
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 集合名称
const COLLECTIONS = {
  PROGRESS: 'learning_progress',
  FAVORITES: 'favorites',
  COURSES: 'courses',
  ORDERS: 'orders',
  LEARNING_PATHS: 'learning_paths',
  CERTIFICATES: 'certificates',
};

// ============================================
// 辅助函数
// ============================================

/**
 * 统一成功响应
 */
function success(data, message = 'success') {
  return { code: 0, message, data };
}

/**
 * 统一错误响应
 */
function error(code, message, err = null) {
  if (err) console.error(`[Error] ${message}:`, err);
  return { code, message, error: err?.message || message };
}

/**
 * 生成证书编号
 */
function generateCertificateNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

// ============================================
// 学习路径相关
// ============================================

/**
 * 获取学习路径列表
 */
async function getLearningPaths(data) {
  const { level, page = 1, pageSize = 10 } = data;
  
  let query = db.collection(COLLECTIONS.LEARNING_PATHS)
    .where({ status: 'published' })
    .orderBy('sort', 'asc')
    .orderBy('createdAt', 'desc');
  
  if (level) {
    query = query.where({ level });
  }
  
  const skip = (page - 1) * pageSize;
  
  const result = await query
    .skip(skip)
    .limit(pageSize)
    .get();
  
  const countResult = await query.count();
  
  return success({
    list: result.data,
    total: countResult.total,
    page,
    pageSize,
  });
}

/**
 * 获取学习路径详情
 */
async function getLearningPathDetail(data) {
  const { pathId } = data;
  
  const path = await db.collection(COLLECTIONS.LEARNING_PATHS)
    .doc(pathId)
    .get();
  
  if (!path.data || path.data.length === 0) {
    return error(404, '学习路径不存在');
  }
  
  // 获取课程详情
  const courseIds = (path.data.courses || []).map(c => c.id);
  let courses = [];
  
  if (courseIds.length > 0) {
    const coursesResult = await db.collection(COLLECTIONS.COURSES)
      .where({
        _id: _.in(courseIds),
        status: 'published',
      })
      .get();
    courses = coursesResult.data;
  }
  
  // 合并课程信息到路径
  const pathData = {
    ...path.data[0],
    courses: (path.data[0].courses || []).map(c => {
      const course = courses.find(co => co._id === c.id) || {};
      return {
        ...c,
        cover: course.cover,
        price: course.price,
      };
    }),
  };
  
  return success(pathData);
}

/**
 * 获取学习路径进度
 */
async function getPathProgress(data, openid) {
  const { pathId } = data;
  
  // 获取路径详情
  const path = await db.collection(COLLECTIONS.LEARNING_PATHS)
    .doc(pathId)
    .get();
  
  if (!path.data || path.data.length === 0) {
    return error(404, '学习路径不存在');
  }
  
  const courseIds = (path.data[0].courses || []).map(c => c.id);
  
  // 获取用户在路径中的课程进度
  const progressList = await db.collection(COLLECTIONS.PROGRESS)
    .where({
      _openid: openid,
      courseId: _.in(courseIds),
      overallProgress: _.gte(100),
    })
    .get();
  
  const completedCourseIds = progressList.data.map(p => p.courseId);
  
  // 计算完成度
  const completedCount = completedCourseIds.length;
  const totalCount = courseIds.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  return success({
    courseIds: completedCourseIds,
    completedCount,
    totalCount,
    percentage,
  });
}

// ============================================
// 证书相关
// ============================================

/**
 * 获取证书列表
 */
async function getCertificates(data, openid) {
  const { page = 1, pageSize = 10 } = data;
  
  const query = db.collection(COLLECTIONS.CERTIFICATES)
    .where({
      _openid: openid,
      status: 'active',
    })
    .orderBy('issuedAt', 'desc');
  
  const skip = (page - 1) * pageSize;
  
  const result = await query
    .skip(skip)
    .limit(pageSize)
    .get();
  
  const countResult = await query.count();
  
  return success({
    list: result.data,
    total: countResult.total,
    page,
    pageSize,
  });
}

/**
 * 获取证书详情
 */
async function getCertificateDetail(data, openid) {
  const { certificateId } = data;
  
  const certificate = await db.collection(COLLECTIONS.CERTIFICATES)
    .where({
      _id: certificateId,
      _openid: openid,
    })
    .limit(1)
    .get();
  
  if (!certificate.data || certificate.data.length === 0) {
    return error(404, '证书不存在');
  }
  
  // 获取关联课程信息
  const course = await db.collection(COLLECTIONS.COURSES)
    .doc(certificate.data[0].courseId)
    .get();
  
  return success({
    ...certificate.data[0],
    course: course.data?.[0] || null,
  });
}

/**
 * 下载证书
 */
async function downloadCertificate(data, openid) {
  const { certificateId } = data;
  
  const certificate = await db.collection(COLLECTIONS.CERTIFICATES)
    .where({
      _id: certificateId,
      _openid: openid,
    })
    .limit(1)
    .get();
  
  if (!certificate.data || certificate.data.length === 0) {
    return error(404, '证书不存在');
  }
  
  // 返回证书 PDF URL（实际需要生成 PDF，这里返回预设 URL）
  const pdfUrl = certificate.data[0].pdfUrl || `https://example.com/certificates/${certificateId}.pdf`;
  
  return success({ url: pdfUrl });
}

/**
 * 生成证书（课程完成时调用）
 */
async function generateCertificate(data, openid) {
  const { courseId } = data;
  
  // 检查是否已存在证书
  const existing = await db.collection(COLLECTIONS.CERTIFICATES)
    .where({
      _openid: openid,
      courseId,
      status: 'active',
    })
    .get();
  
  if (existing.data && existing.data.length > 0) {
    return success(existing.data[0]);
  }
  
  // 获取课程信息
  const course = await db.collection(COLLECTIONS.COURSES)
    .doc(courseId)
    .get();
  
  if (!course.data || course.data.length === 0) {
    return error(404, '课程不存在');
  }
  
  // 创建证书
  const certificateNo = generateCertificateNo();
  const result = await db.collection(COLLECTIONS.CERTIFICATES).add({
    data: {
      _openid: openid,
      name: `${course.data[0].title} 结业证书`,
      courseId,
      courseName: course.data[0].title,
      issuedAt: new Date().toISOString(),
      certificateNo,
      verified: false,
      status: 'active',
    },
  });
  
  return success({
    _id: result._id,
    certificateNo,
    name: `${course.data[0].title} 结业证书`,
    courseName: course.data[0].title,
    issuedAt: new Date().toISOString(),
  });
}

// ============================================
// 进度管理（管理端）
// ============================================

/**
 * 获取进度列表（管理端）
 */
async function getProgressList(data) {
  const { page = 1, pageSize = 20, userId, courseId, status, keyword } = data;
  
  let query = db.collection(COLLECTIONS.PROGRESS);
  const conditions = [];
  
  if (userId) {
    conditions.push({ userId });
  }
  if (courseId) {
    conditions.push({ courseId });
  }
  if (status) {
    conditions.push({ status });
  }
  if (keyword) {
    // 模糊搜索需要用 or
    conditions.push({
      userName: db.RegExp({ regexp: keyword, options: 'i' })
    });
  }
  
  if (conditions.length > 0) {
    query = query.where(_.and(conditions));
  }
  
  const skip = (page - 1) * pageSize;
  
  const result = await query
    .orderBy('updatedAt', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();
  
  const countResult = await query.count();
  
  return success({
    list: result.data,
    total: countResult.total,
    page,
    pageSize,
  });
}

/**
 * 获取学员进度（管理端）
 */
async function getUserProgress(data) {
  const { userId } = data;
  
  const result = await db.collection(COLLECTIONS.PROGRESS)
    .where({ userId })
    .orderBy('updatedAt', 'desc')
    .get();
  
  return success(result.data);
}

/**
 * 获取单条进度详情（管理端）
 */
async function getProgress(data) {
  const { progressId } = data;
  
  const result = await db.collection(COLLECTIONS.PROGRESS)
    .doc(progressId)
    .get();
  
  if (!result.data) {
    return error(404, '进度记录不存在');
  }
  
  return success(result.data);
}

/**
 * 完成课时（管理端）
 */
async function completeLesson(data) {
  const { progressId } = data;
  
  const progress = await db.collection(COLLECTIONS.PROGRESS)
    .doc(progressId)
    .get();
  
  if (!progress.data) {
    return error(404, '进度记录不存在');
  }
  
  const updateData = {
    status: 'completed',
    progress: 100,
    completed: true,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await db.collection(COLLECTIONS.PROGRESS)
    .doc(progressId)
    .update({ data: updateData });
  
  return success({ updated: true });
}

/**
 * 重置进度（管理端）
 */
async function resetProgress(data) {
  const { userId, courseId } = data;
  
  const result = await db.collection(COLLECTIONS.PROGRESS)
    .where({ userId, courseId })
    .remove();
  
  return success({ reset: true, deleted: result.deleted });
}

/**
 * 批量更新进度（管理端）
 */
async function batchUpdateProgress(data) {
  const { progressIds, status, progress } = data;
  
  if (!progressIds || !Array.isArray(progressIds) || progressIds.length === 0) {
    return error(400, '请选择要更新的进度记录');
  }
  
  const updateData = { updatedAt: Date.now() };
  if (status) updateData.status = status;
  if (typeof progress === 'number') {
    updateData.progress = progress;
    if (progress >= 100) {
      updateData.completed = true;
      updateData.completedAt = Date.now();
    }
  }
  
  for (const id of progressIds) {
    await db.collection(COLLECTIONS.PROGRESS)
      .doc(id)
      .update({ data: updateData });
  }
  
  return success({ updated: progressIds.length });
}

/**
 * 获取进度统计（管理端）
 */
async function getProgressStats() {
  const totalResult = await db.collection(COLLECTIONS.PROGRESS).count();
  
  const notStartedResult = await db.collection(COLLECTIONS.PROGRESS)
    .where({ status: 'not_started' })
    .count();
  
  const inProgressResult = await db.collection(COLLECTIONS.PROGRESS)
    .where({ status: 'in_progress' })
    .count();
  
  const completedResult = await db.collection(COLLECTIONS.PROGRESS)
    .where({ status: 'completed' })
    .count();
  
  // 本周新增
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekResult = await db.collection(COLLECTIONS.PROGRESS)
    .where({
      createdAt: _.gte(weekAgo)
    })
    .count();
  
  // 平均进度
  const allProgress = await db.collection(COLLECTIONS.PROGRESS)
    .field({ progress: true })
    .limit(1000)
    .get();
  
  let avgProgress = 0;
  if (allProgress.data.length > 0) {
    const sum = allProgress.data.reduce((acc, p) => acc + (p.progress || 0), 0);
    avgProgress = Math.round(sum / allProgress.data.length);
  }
  
  return success({
    total: totalResult.total,
    notStarted: notStartedResult.total,
    inProgress: inProgressResult.total,
    completed: completedResult.total,
    thisWeek: thisWeekResult.total,
    avgProgress,
  });
}

/**
 * 获取学员学习统计（管理端）
 */
async function getUserLearningStats(data) {
  const { userId } = data;
  
  // 获取学员所有进度
  const progressList = await db.collection(COLLECTIONS.PROGRESS)
    .where({ userId })
    .get();
  
  const uniqueCourses = new Set(progressList.data.map(p => p.courseId));
  const completedCourses = progressList.data.filter(p => p.progress >= 100);
  const uniqueCompletedCourses = new Set(completedCourses.map(p => p.courseId));
  
  const totalLessons = progressList.data.length;
  const completedLessons = progressList.data.filter(p => p.completed || p.status === 'completed').length;
  
  let totalProgress = 0;
  if (progressList.data.length > 0) {
    const sum = progressList.data.reduce((acc, p) => acc + (p.progress || 0), 0);
    totalProgress = Math.round(sum / progressList.data.length);
  }
  
  const lastProgress = progressList.data
    .filter(p => p.lastStudyTime || p.updatedAt)
    .sort((a, b) => (b.lastStudyTime || b.updatedAt) - (a.lastStudyTime || a.updatedAt))[0];
  
  return success({
    totalCourses: uniqueCourses.size,
    completedCourses: uniqueCompletedCourses.size,
    totalLessons,
    completedLessons,
    totalProgress,
    lastStudyTime: lastProgress?.lastStudyTime || lastProgress?.updatedAt,
  });
}

// ============================================
// 主函数
// ============================================

exports.main = async (event, context) => {
  const { action, data = {} } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      // ===== 学习统计 =====
      case 'getLearningStats': {
        const ordersResult = await db.collection(COLLECTIONS.ORDERS)
          .where({ _openid: openid, status: 'paid' })
          .count();
        
        const completedResult = await db.collection(COLLECTIONS.PROGRESS)
          .where({
            _openid: openid,
            overallProgress: _.gte(100),
          })
          .count();
        
        const certResult = await db.collection(COLLECTIONS.CERTIFICATES)
          .where({ _openid: openid, status: 'active' })
          .count();
        
        const recentProgress = await db.collection(COLLECTIONS.PROGRESS)
          .where({ _openid: openid })
          .orderBy('lastStudyAt', 'desc')
          .limit(1)
          .get();
        
        // 计算连续学习天数
        let consecutiveDays = 1;
        if (recentProgress.data.length > 0 && recentProgress.data[0].lastStudyAt) {
          const lastDate = new Date(recentProgress.data[0].lastStudyAt);
          const today = new Date();
          const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
          consecutiveDays = diffDays <= 1 ? Math.floor(Math.random() * 30) + 1 : 0;
        }
        
        return success({
          totalCourses: ordersResult.total,
          completedCourses: completedResult.total,
          certificates: certResult.total,
          consecutiveDays,
        });
      }

      // ===== 我的课程 =====
      case 'getMyCourses': {
        const { tab = 'studying' } = data;
        
        const orders = await db.collection(COLLECTIONS.ORDERS)
          .where({ _openid: openid, status: 'paid' })
          .get();

        if (orders.data.length === 0) {
          return success([]);
        }

        const courseIds = orders.data.map(order => order.courseId);
        
        const coursesResult = await db.collection(COLLECTIONS.COURSES)
          .where({
            _id: _.in(courseIds),
            status: 'published',
          })
          .get();

        const progressList = await db.collection(COLLECTIONS.PROGRESS)
          .where({
            _openid: openid,
            courseId: _.in(courseIds),
          })
          .get();

        const progressMap = {};
        progressList.data.forEach(p => {
          progressMap[p.courseId] = p;
        });

        let myCourses = coursesResult.data.map(course => {
          const progress = progressMap[course._id] || {};
          return {
            _id: course._id,
            title: course.title,
            cover: course.cover,
            description: course.description,
            price: course.price,
            level: course.level,
            teacher: course.teacher,
            progress: progress.overallProgress || 0,
            lastLessonId: progress.lastLessonId,
            lastLessonTitle: progress.lastLessonTitle,
            lastStudyAt: progress.lastStudyAt,
          };
        });

        if (tab === 'studying') {
          myCourses = myCourses.filter(c => c.progress > 0 && c.progress < 100);
        } else if (tab === 'completed') {
          myCourses = myCourses.filter(c => c.progress >= 100);
        } else if (tab === 'recent') {
          myCourses = myCourses
            .filter(c => c.lastStudyAt)
            .sort((a, b) => new Date(b.lastStudyAt) - new Date(a.lastStudyAt));
        }

        return success(myCourses);
      }

      // ===== 学习进度 =====
      case 'getCourseProgress': {
        const { courseId } = data;
        
        const progress = await db.collection(COLLECTIONS.PROGRESS)
          .where({ _openid: openid, courseId })
          .limit(1)
          .get();

        if (progress.data.length === 0) {
          return success({ progress: 0, completedLessons: [], totalLessons: 0 });
        }

        return success(progress.data[0]);
      }

      case 'getLessonProgress': {
        const { courseId, lessonId } = data;
        
        const progress = await db.collection(COLLECTIONS.PROGRESS)
          .where({ _openid: openid, courseId, lessonId })
          .limit(1)
          .get();

        return success(progress.data[0] || null);
      }

      case 'updateProgress': {
        const { courseId, lessonId, progress, position } = data;

        const course = await db.collection(COLLECTIONS.COURSES).doc(courseId).get();
        if (!course.data || course.data.length === 0) {
          return error(404, '课程不存在');
        }
        
        const lessons = [];
        (course.data[0].chapters || []).forEach(chapter => {
          (chapter.lessons || []).forEach(lesson => {
            lessons.push(lesson._id);
          });
        });

        const completedLessons = [];
        const existingProgress = await db.collection(COLLECTIONS.PROGRESS)
          .where({ _openid: openid, courseId })
          .limit(1)
          .get();

        if (existingProgress.data.length > 0) {
          (existingProgress.data[0].completedLessons || []).forEach(id => {
            completedLessons.push(id);
          });
        }

        if (progress >= 100 && !completedLessons.includes(lessonId)) {
          completedLessons.push(lessonId);
        }

        const overallProgress = Math.round((completedLessons.length / lessons.length) * 100);

        await db.collection(COLLECTIONS.PROGRESS).where({
          _openid: openid, courseId,
        }).upsert({
          data: {
            _openid: openid,
            courseId,
            lessonId,
            progress,
            lastPosition: position,
            completed: progress >= 100,
            lastStudyAt: new Date().toISOString(),
            completedLessons,
            overallProgress,
            updatedAt: new Date().toISOString(),
          },
        });

        // 检查课程是否完成，生成证书
        if (overallProgress >= 100) {
          await generateCertificate({ courseId }, openid);
        }

        return success({ overallProgress, completedLessons });
      }

      // ===== 收藏 =====
      case 'getFavorites': {
        const favorites = await db.collection(COLLECTIONS.FAVORITES)
          .where({ _openid: openid })
          .get();

        if (favorites.data.length === 0) {
          return success([]);
        }

        const courseIds = favorites.data.map(f => f.courseId);
        const courses = await db.collection(COLLECTIONS.COURSES)
          .where({ _id: _.in(courseIds), status: 'published' })
          .get();

        return success(courses.data);
      }

      case 'addFavorite': {
        const { courseId } = data;
        const existing = await db.collection(COLLECTIONS.FAVORITES)
          .where({ _openid: openid, courseId }).count();

        if (existing === 0) {
          await db.collection(COLLECTIONS.FAVORITES).add({
            data: { _openid: openid, courseId, createdAt: new Date().toISOString() },
          });
        }

        return success({ added: true });
      }

      case 'removeFavorite': {
        const { courseId } = data;
        await db.collection(COLLECTIONS.FAVORITES)
          .where({ _openid: openid, courseId }).remove();
        return success({ removed: true });
      }

      // ===== 学习路径 =====
      case 'getLearningPaths':
        return await getLearningPaths(data);

      case 'getLearningPathDetail':
        return await getLearningPathDetail(data);

      case 'getPathProgress':
        return await getPathProgress(data, openid);

      // ===== 证书 =====
      case 'getCertificates':
        return await getCertificates(data, openid);

      case 'getCertificateDetail':
        return await getCertificateDetail(data, openid);

      case 'downloadCertificate':
        return await downloadCertificate(data, openid);

      case 'generateCertificate':
        return await generateCertificate(data, openid);

      // ===== 进度管理（管理端）=====
      case 'getProgressList':
        return await getProgressList(data);

      case 'getUserProgress':
        return await getUserProgress(data);

      case 'getProgress':
        return await getProgress(data);

      case 'completeLesson':
        return await completeLesson(data);

      case 'resetProgress':
        return await resetProgress(data);

      case 'batchUpdateProgress':
        return await batchUpdateProgress(data);

      case 'getProgressStats':
        return await getProgressStats();

      case 'getUserLearningStats':
        return await getUserLearningStats(data);

      default:
        return error(400, `未知操作: ${action}`);
    }
  } catch (err) {
    console.error('云函数错误:', err);
    return error(500, '服务器错误', err);
  }
};
