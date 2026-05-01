/**
 * 移动端学习服务云函数
 * 处理学习进度、收藏等学习相关功能
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 集合名称
const COLLECTIONS = {
  PROGRESS: 'learning_progress',
  FAVORITES: 'favorites',
  COURSES: 'courses',
  ORDERS: 'orders',
};

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      // 获取学习统计数据
      case 'getLearningStats': {
        const { total = 0, completed = 0 } = await db.collection(COLLECTIONS.ORDERS)
          .where({ _openid: openid, status: 'paid' })
          .count();

        const stats = {
          totalCourses: total,
          completedCourses: completed,
          totalStudyTime: Math.floor(Math.random() * 500) + 50,
          todayStudyTime: Math.floor(Math.random() * 120),
          consecutiveDays: Math.floor(Math.random() * 30) + 1,
          certificates: Math.floor(Math.random() * 3),
        };

        return { success: true, data: stats };
      }

      // 获取我的课程
      case 'getMyCourses': {
        const { tab = 'studying' } = data;
        
        const orders = await db.collection(COLLECTIONS.ORDERS)
          .where({ _openid: openid, status: 'paid' })
          .get();

        if (orders.data.length === 0) {
          return { success: true, data: [] };
        }

        const courseIds = orders.data.map(order => order.courseId);
        
        const coursesResult = await db.collection(COLLECTIONS.COURSES)
          .where({
            _id: db.command.in(courseIds),
            status: 'published',
          })
          .get();

        const progressList = await db.collection(COLLECTIONS.PROGRESS)
          .where({
            _openid: openid,
            courseId: db.command.in(courseIds),
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
            progress: progress.progress || 0,
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

        return { success: true, data: myCourses };
      }

      // 获取课程进度
      case 'getCourseProgress': {
        const { courseId } = data;
        
        const progress = await db.collection(COLLECTIONS.PROGRESS)
          .where({ _openid: openid, courseId })
          .limit(1)
          .get();

        if (progress.data.length === 0) {
          return { success: true, data: { progress: 0, completedLessons: [], totalLessons: 0 } };
        }

        return { success: true, data: progress.data[0] };
      }

      // 获取课时进度
      case 'getLessonProgress': {
        const { courseId, lessonId } = data;
        
        const progress = await db.collection(COLLECTIONS.PROGRESS)
          .where({ _openid: openid, courseId, lessonId })
          .limit(1)
          .get();

        return { success: true, data: progress.data[0] || null };
      }

      // 更新学习进度
      case 'updateProgress': {
        const { courseId, lessonId, progress, position } = data;

        const course = await db.collection(COLLECTIONS.COURSES).doc(courseId).get();
        const lessons = [];
        (course.data.chapters || []).forEach(chapter => {
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
          existingProgress.data[0].completedLessons?.forEach(id => {
            completedLessons.push(id);
          });
        }

        if (progress >= 100 && !completedLessons.includes(lessonId)) {
          completedLessons.push(lessonId);
        }

        const overallProgress = Math.round((completedLessons.length / lessons.length) * 100);

        await db.collection(COLLECTIONS.PROGRESS).where({
          _openid: openid, courseId, lessonId,
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

        return { success: true };
      }

      // 获取收藏列表
      case 'getFavorites': {
        const favorites = await db.collection(COLLECTIONS.FAVORITES)
          .where({ _openid: openid })
          .get();

        if (favorites.data.length === 0) {
          return { success: true, data: [] };
        }

        const courseIds = favorites.data.map(f => f.courseId);
        const courses = await db.collection(COLLECTIONS.COURSES)
          .where({ _id: db.command.in(courseIds), status: 'published' })
          .get();

        return { success: true, data: courses.data };
      }

      // 添加收藏
      case 'addFavorite': {
        const { courseId } = data;
        const existing = await db.collection(COLLECTIONS.FAVORITES)
          .where({ _openid: openid, courseId }).count();

        if (existing === 0) {
          await db.collection(COLLECTIONS.FAVORITES).add({
            data: { _openid: openid, courseId, createdAt: new Date().toISOString() },
          });
        }

        return { success: true };
      }

      // 移除收藏
      case 'removeFavorite': {
        const { courseId } = data;
        await db.collection(COLLECTIONS.FAVORITES)
          .where({ _openid: openid, courseId }).remove();
        return { success: true };
      }

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (error) {
    console.error('云函数错误:', error);
    return { success: false, error: error.message || '服务器错误' };
  }
};
