/**
 * 移动端考试服务云函数
 * 处理考试相关功能
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 集合名称
const COLLECTIONS = {
  EXAMS: 'exams',
  QUESTIONS: 'questions',
  EXAM_RESULTS: 'exam_results',
  ORDERS: 'orders',
  COURSES: 'courses',
};

exports.main = async (event, context) => {
  const { action, data } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      // 获取可参加的考试
      case 'getAvailableExams': {
        // 获取用户已购课程
        const orders = await db.collection(COLLECTIONS.ORDERS)
          .where({
            _openid: openid,
            status: 'paid',
          })
          .get();

        const courseIds = orders.data.map(o => o.courseId);

        // 获取这些课程关联的考试
        const exams = await db.collection(COLLECTIONS.EXAMS)
          .where({
            status: 'published',
            $or: [
              { courseId: _.in(courseIds) },
              { courseId: _.eq(null) }, // 通用考试
            ],
          })
          .get();

        // 过滤掉已完成的考试（可以重复考试，暂不限制）
        return {
          success: true,
          data: exams.data.map(exam => ({
            _id: exam._id,
            title: exam.title,
            courseId: exam.courseId,
            duration: exam.duration,
            questionCount: exam.questionCount || 0,
            totalScore: exam.totalScore || 100,
            passingScore: exam.passingScore || 60,
          })),
        };
      }

      // 获取考试详情
      case 'getExamDetail': {
        const { examId } = data;

        const exam = await db.collection(COLLECTIONS.EXAMS)
          .doc(examId)
          .get();

        if (!exam.data) {
          return { success: false, error: '考试不存在' };
        }

        // 获取题目列表
        const questions = await db.collection(COLLECTIONS.QUESTIONS)
          .where({
            examId,
            status: 'active',
          })
          .get();

        return {
          success: true,
          data: {
            _id: exam.data._id,
            title: exam.data.title,
            courseId: exam.data.courseId,
            duration: exam.data.duration || 60,
            questionCount: questions.data.length,
            totalScore: exam.data.totalScore || 100,
            passingScore: exam.data.passingScore || 60,
            questions: questions.data.map(q => ({
              _id: q._id,
              type: q.type,
              content: q.content,
              options: q.options,
              score: q.score || 5,
            })),
          },
        };
      }

      // 开始考试
      case 'startExam': {
        const { examId } = data;

        // 验证考试是否存在
        const exam = await db.collection(COLLECTIONS.EXAMS)
          .doc(examId)
          .get();

        if (!exam.data) {
          return { success: false, error: '考试不存在' };
        }

        // 生成考试Token（简化版，实际应加密存储）
        const examToken = `exam_${examId}_${openid}_${Date.now()}`;

        return {
          success: true,
          data: { examToken },
        };
      }

      // 提交考试
      case 'submitExam': {
        const { examId, examToken, answers } = data;

        // 验证Token
        if (!examToken || !examToken.startsWith(`exam_${examId}_`)) {
          return { success: false, error: '无效的考试Token' };
        }

        // 获取考试和题目
        const exam = await db.collection(COLLECTIONS.EXAMS)
          .doc(examId)
          .get();

        if (!exam.data) {
          return { success: false, error: '考试不存在' };
        }

        const questions = await db.collection(COLLECTIONS.QUESTIONS)
          .where({ examId, status: 'active' })
          .get();

        // 计算得分
        let totalScore = 0;
        const questionResults: Record<string, { correct: boolean; score: number }> = {};

        for (const question of questions.data) {
          const userAnswer = answers[question._id];
          let isCorrect = false;

          if (question.type === 'single' || question.type === 'judge') {
            isCorrect = userAnswer === question.correctAnswer;
          } else if (question.type === 'multiple') {
            const correct = question.correctAnswer || [];
            const user = userAnswer || [];
            isCorrect = correct.length === user.length &&
              correct.every((c: number) => user.includes(c));
          }

          const questionScore = isCorrect ? (question.score || 5) : 0;
          totalScore += questionScore;
          questionResults[question._id] = { correct: isCorrect, score: questionScore };
        }

        const passed = totalScore >= (exam.data.passingScore || 60);

        // 保存考试结果
        const result = {
          _openid: openid,
          examId,
          answers,
          score: totalScore,
          passed,
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        await db.collection(COLLECTIONS.EXAM_RESULTS).add({ data: result });

        return {
          success: true,
          data: {
            score: totalScore,
            passed,
            answers,
          },
        };
      }

      // 获取考试结果
      case 'getExamResult': {
        const { examId } = data;

        const results = await db.collection(COLLECTIONS.EXAM_RESULTS)
          .where({
            _openid: openid,
            examId,
          })
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        if (results.data.length === 0) {
          return { success: false, error: '暂无考试记录' };
        }

        return {
          success: true,
          data: results.data[0],
        };
      }

      // 获取历史考试记录
      case 'getExamHistory': {
        const results = await db.collection(COLLECTIONS.EXAM_RESULTS)
          .where({
            _openid: openid,
          })
          .orderBy('completedAt', 'desc')
          .get();

        if (results.data.length === 0) {
          return { success: true, data: [] };
        }

        // 获取考试信息
        const examIds = [...new Set(results.data.map(r => r.examId))];
        const exams = await db.collection(COLLECTIONS.EXAMS)
          .where({
            _id: _.in(examIds),
          })
          .get();

        const examMap = {};
        exams.data.forEach(e => {
          examMap[e._id] = e;
        });

        // 合并数据
        const history = results.data.map(result => ({
          _id: result.examId,
          title: examMap[result.examId]?.title || '考试',
          latestResult: {
            score: result.score,
            passed: result.passed,
            completedAt: result.completedAt,
          },
        }));

        // 按考试ID去重（只保留最新成绩）
        const uniqueMap = {};
        history.forEach(h => {
          if (!uniqueMap[h._id] ||
              new Date(h.latestResult.completedAt) > new Date(uniqueMap[h._id].latestResult.completedAt)) {
            uniqueMap[h._id] = h;
          }
        });

        return {
          success: true,
          data: Object.values(uniqueMap),
        };
      }

      default:
        return { success: false, error: '未知操作' };
    }
  } catch (error) {
    console.error('云函数错误:', error);
    return { success: false, error: error.message || '服务器错误' };
  }
};
