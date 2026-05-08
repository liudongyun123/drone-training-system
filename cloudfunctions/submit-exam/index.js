/**
 * Web端考试提交云函数
 * 绕过客户端权限限制，以管理员权限保存考试记录
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 评分逻辑
 */
function scoreQuestion(question, userAnswer) {
  let isCorrect = false;
  const correctAnswer = question.answer;

  // 判断题格式
  if (question.type === 'boolean' || question.type === 'judgment') {
    const userVal = String(userAnswer).toLowerCase();
    const correctVal = String(correctAnswer).toLowerCase();
    isCorrect = userVal === correctVal ||
      (correctVal === 'true' && userVal === 'a') ||
      (correctVal === 'false' && userVal === 'b');
  }
  // 选择题格式
  else if (typeof correctAnswer === 'string' && /^[A-D]$/i.test(String(correctAnswer))) {
    isCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
  }
  // 多选题格式
  else if (Array.isArray(correctAnswer)) {
    const userArr = Array.isArray(userAnswer) ? userAnswer.map(String).sort() : [String(userAnswer)];
    const correctArr = correctAnswer.map(String).sort();
    isCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr);
  }
  // 直接匹配
  else {
    isCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
  }

  return isCorrect;
}

exports.main = async (event, context) => {
  const { action, data } = event;
  
  console.log('[submitExam] 收到请求:', action);

  try {
    switch (action) {
      case 'submitExam': {
        const { attemptId, answers, userId } = data;
        
        console.log('[submitExam] 提交考试, userId:', userId);

        // 从 bankQuestions 获取所有题目
        const questionsResult = await db.collection('bankQuestions').get();
        const allQuestions = questionsResult.data || [];
        
        const questionsMap = new Map(allQuestions.map(q => [q._id, q]));

        let totalScore = 0;
        let relatedBankId = '';

        const scoredAnswers = answers.map(a => {
          const question = questionsMap.get(a.questionId);
          if (!question) {
            return { questionId: a.questionId, userAnswer: a.answer, isCorrect: false, score: 0 };
          }

          // 记录关联的题库ID
          if (question.bankId && !relatedBankId) {
            relatedBankId = question.bankId;
          }

          const isCorrect = scoreQuestion(question, a.answer);
          const score = isCorrect ? (question.score || 1) : 0;
          totalScore += score;

          return { questionId: a.questionId, userAnswer: a.answer, isCorrect, score };
        });

        // 根据题库关联查找考试
        let examId = relatedBankId || attemptId.split('_')[0] || 'unknown';
        let exam = null;
        
        if (relatedBankId) {
          try {
            const examsResult = await db.collection('exams').where({
              bankIds: _.in([relatedBankId])
            }).get();
            
            if (examsResult.data && examsResult.data.length > 0) {
              exam = examsResult.data[0];
              examId = exam._id;
            }
          } catch (e) {
            console.log('[submitExam] 查找考试失败:', e.message);
          }
        }

        // 创建考试记录
        const attemptData = {
          examId,
          userId: userId || 'anonymous',
          courseId: exam?.courseId || '',
          bankId: relatedBankId,
          score: totalScore,
          passStatus: totalScore >= (exam?.passScore || 60),
          answers: scoredAnswers,
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          submitTime: new Date().toISOString(),
          duration: exam?.timeLimit || 60,
          originalAttemptId: attemptId,
        };

        console.log('[submitExam] 保存考试记录');

        // 添加到数据库
        const addResult = await db.collection('examAttempts').add({
          data: attemptData
        });
        
        console.log('[submitExam] 添加结果:', addResult);

        // 返回 CloudBase 生成的 ID
        let finalId = addResult.id || attemptId;

        return {
          success: true,
          data: {
            _id: finalId,
            examId,
            userId: userId || 'anonymous',
            score: totalScore,
            passStatus: totalScore >= (exam?.passScore || 60),
            answers: scoredAnswers,
            submitTime: attemptData.submitTime,
          }
        };
      }

      case 'getAttemptDetail': {
        const { attemptId, userId } = data;
        
        console.log('[submitExam] 获取考试记录');

        let matchedRecord = null;

        // 直接用 ID 查询
        try {
          const docResult = await db.collection('examAttempts').doc(attemptId).get();
          if (docResult.data) {
            matchedRecord = docResult.data;
          }
        } catch (e) {
          console.log('[submitExam] 直接查询失败');
        }

        // 用 userId 查询
        if (!matchedRecord && userId) {
          try {
            const userAttempts = await db.collection('examAttempts')
              .where({ userId })
              .orderBy('submitTime', 'desc')
              .limit(50)
              .get();

            if (userAttempts.data && userAttempts.data.length > 0) {
              matchedRecord = userAttempts.data.find(a => a._id === attemptId) ||
                userAttempts.data.find(a => a.originalAttemptId === attemptId) ||
                userAttempts.data[0];
            }
          } catch (e) {
            console.log('[submitExam] userId 查询失败');
          }
        }

        // 无过滤查询
        if (!matchedRecord) {
          try {
            const allAttempts = await db.collection('examAttempts')
              .orderBy('submitTime', 'desc')
              .limit(20)
              .get();

            if (allAttempts.data && allAttempts.data.length > 0) {
              matchedRecord = allAttempts.data.find(a => 
                a._id === attemptId || a.originalAttemptId === attemptId
              ) || allAttempts.data[0];
            }
          } catch (e) {
            console.log('[submitExam] 无过滤查询失败');
          }
        }

        if (matchedRecord) {
          return {
            success: true,
            data: {
              _id: matchedRecord._id,
              examId: matchedRecord.examId || '',
              userId: matchedRecord.userId || '',
              courseId: matchedRecord.courseId || '',
              score: matchedRecord.score || 0,
              passStatus: matchedRecord.passStatus,
              answers: matchedRecord.answers || [],
              startTime: matchedRecord.startTime,
              submitTime: matchedRecord.submitTime,
              duration: matchedRecord.duration || 60,
            }
          };
        }

        return { success: false, error: '考试记录不存在' };
      }

      default:
        return { success: false, error: '未知操作: ' + action };
    }
  } catch (error) {
    console.error('[submitExam] 错误:', error);
    return { success: false, error: error.message || '服务器错误' };
  }
};
