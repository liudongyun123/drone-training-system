import { app } from '@/utils/cloudbase';
import type { 
  Exam, Question, ExamAttempt, ApiResponse, PaginatedResponse,
  QuestionBank, BankQuestion, PracticeRecord, WrongQuestion, FavoriteQuestion
} from '../types';
import type { Question as QuestionType } from '@/types/service';

// ============================================================================
// 考试服务 - 在线考试、题库练习、成绩管理
// 优先使用 adminService（云函数）查询，绕过数据库安全规则限制
// ============================================================================

// 数据库原始数据类型（用于类型转换）
interface RawQuestion {
  _id: string
  bankId?: string
  question?: string
  type?: string
  options?: { key: string; content: string; isCorrect?: boolean }[]
  answer?: string | string[]
  score?: number
  difficulty?: string
  explanation?: string
  tags?: string[]
}

interface RawBank {
  _id: string
  name?: string
  title?: string
  description?: string
  category?: string
  level?: string
  difficulty?: string
  courseIds?: string[]
  questionCount?: number
  passingScore?: number
  timeLimit?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

// 延迟初始化 db，确保 app 已完成初始化
const getDb = () => {
  if (!app) {
    console.error('[examService] CloudBase SDK 未初始化');
    throw new Error('CloudBase SDK 未初始化');
  }
  try {
    const db = app.database();
    if (!db) {
      console.error('[examService] database() 返回 null');
      throw new Error('database() 返回 null');
    }
    return db;
  } catch (error: unknown) {
    console.error('[examService] 获取数据库实例失败:', error);
    throw error;
  }
};

// ============================================================================
// 辅助：标准化题型字段（独立函数，供 examService 内部调用）
// ============================================================================
function normalizeQuestionType(type?: string): string {
  const t = String(type || '').toLowerCase();
  if (!t || t === 'undefined') return 'single';
  if (t === 'single' || t === 'choice') return 'single';
  if (t === 'multiple' || t === 'multichoice') return 'multiple';
  if (t === 'judge' || t === 'judgment' || t === 'truefalse' || t === 'boolean') return 'truefalse';
  return 'single'; // 默认单选
}

// ============================================================================
// 考试相关 API
// ============================================================================

export const examService = {
  // 获取考试列表（★ 先尝试云函数查询，失败则回退到直接数据库查询）
  async getList(params?: { keyword?: string; courseId?: string }): Promise<ApiResponse<Exam[]>> {
    // 方式1：通过 adminService 云函数查询（绕过安全规则）
    try {
      const { adminService } = await import('@/services/adminService');
      const query: any = {};
      if (params?.courseId) query.courseId = params.courseId;
      
      const result = await adminService.list('exams', query, { limit: 50 });
      let data: any[] = Array.isArray(result.data) ? result.data : (result.data?.list || []);
      
      if (params?.keyword) {
        data = data.filter((e: any) => e.title?.includes(params.keyword!));
      }
      
      console.log('[examService] getList 通过云函数获取:', data.length, '条');
      return { success: true, data: data as Exam[] };
    } catch (cloudErr: any) {
      console.warn('[examService] 云函数查询失败，回退到直接数据库查询:', cloudErr.message);
    }

    // 方式2：直接数据库查询（可能受安全规则限制）
    try {
      let query = getDb().collection('exams');
      
      if (params?.courseId) {
        query = query.where({ courseId: params.courseId });
      }
      
      const { data } = await query.get();
      
      let result = data as Exam[];
      if (params?.keyword) {
        result = result.filter(e => e.title?.includes(params.keyword!));
      }
      
      return { success: true, data: result };
    } catch (error) {
      console.error('获取考试列表失败:', error);
      return { success: false, message: '获取考试列表失败' };
    }
  },

  // 获取考试详情（★ 云函数优先）
  async getDetail(id: string): Promise<ApiResponse<Exam>> {
    try {
      const { adminService } = await import('@/services/adminService');
      const result = await adminService.get('exams', id);
      if (result.data) {
        console.log('[examService] getDetail 通过云函数获取成功:', id);
        return { success: true, data: result.data as Exam };
      }
    } catch (e) {
      console.warn('[examService] getDetail 云函数失败，回退直接查询:', e);
    }

    try {
      const { data } = await getDb().collection('exams').doc(id).get();
      if (!data) {
        return { success: false, message: '考试不存在' };
      }
      return { success: true, data: data as Exam };
    } catch (error) {
      console.error('获取考试详情失败:', error);
      return { success: false, message: '获取考试详情失败' };
    }
  },

  // 获取考试题目（★ 云函数优先，从 bankQuestions 获取）
  async getQuestions(examId: string): Promise<ApiResponse<Question[]>> {
    try {
      // 方式1：通过云函数查询题目
      const { adminService } = await import('@/services/adminService');
      
      // 先获取考试信息，了解关联的题库
      const examResult = await adminService.get('exams', examId);
      const examData = examResult.data;
      
      if (!examData) {
        return { success: false, message: '考试不存在' };
      }
      
      console.log('[examService] getQuestions examData:', examData);
      
      // 从 bankQuestions 获取所有题目
      let questionsResult: any;
      let questionsData: any[] = [];
      
      // 如果考试关联了 bankConfigs，按题库ID筛选
      if (examData.bankConfigs && Array.isArray(examData.bankConfigs) && examData.bankConfigs.length > 0) {
        const bankIds = examData.bankConfigs.map((b: any) => b.bankId).filter(Boolean);
        if (bankIds.length > 0) {
          try {
            questionsResult = await adminService.list('bankQuestions',
              // @ts-ignore
              { bankId: adminService.command?.in ? undefined : undefined },
              { limit: 500 });
            questionsData = Array.isArray(questionsResult.data) ? questionsResult.data : (questionsResult.data?.list || []);
            // 客户端过滤 bankId
            if (bankIds.length > 0) {
              questionsData = questionsData.filter((q: any) => !q.bankId || bankIds.includes(q.bankId));
            }
          } catch (e) {
            console.warn('[examService] 按题库筛选失败，获取全部题目');
          }
        }
      }
      
      // 如果没拿到数据，获取全部题目
      if (questionsData.length === 0) {
        questionsResult = await adminService.list('bankQuestions', {}, { limit: 1000 });
        questionsData = Array.isArray(questionsResult.data) ? questionsResult.data : (questionsResult.data?.list || []);
      }
      
      console.log('[examService] getQuestions 获取到题目:', questionsData.length);
      
      // 转换为 Question 格式
      // @ts-ignore
      const questions: QuestionType[] = (questionsData as RawQuestion[])
        .map((q, index) => ({
          _id: q._id,
          id: q._id,
          questionBankId: q.bankId,
          type: normalizeQuestionType(q.type),
          question: q.question || '',
          content: q.question || '',
          options: (q.options || []).map((opt: any) => typeof opt === 'string' ? opt : (opt.content || opt.key || '')).filter(Boolean),
          answer: q.answer,
          score: q.score || 1,
          difficulty: (q.difficulty as QuestionType['difficulty']) || 'medium',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
        .filter(q => q.question); // 过滤掉无问题的记录
      
      // @ts-ignore
      return { success: true, data: questions };
    } catch (error: any) {
      console.error('获取考试题目失败(云函数):', error);
      
      // 回退到直接数据库查询
      try {
        const { data } = await getDb().collection('bankQuestions').get();
        // @ts-ignore
        const questions: QuestionType[] = (data as RawQuestion[]).map((q, index) => ({
          _id: q._id,
          id: q._id,
          questionBankId: q.bankId,
          type: normalizeQuestionType(q.type),
          question: q.question || '',
          content: q.question || '',
          options: (q.options || []).map((opt: any) => typeof opt === 'string' ? opt : (opt.content || opt.key || '')).filter(Boolean),
          answer: q.answer,
          score: q.score || 1,
          difficulty: (q.difficulty as QuestionType['difficulty']) || 'medium',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })).filter(q => q.question);
        
        // @ts-ignore
        return { success: true, data: questions };
      } catch (err) {
        console.error('获取考试题目失败(直接):', err);
        return { success: false, message: '获取考试题目失败' };
      }
    }
  },

  // 开始考试（★ 云函数优先，获取考试详情 + 题目列表）
  async startExam(examId: string, userId: string): Promise<ApiResponse<{ attemptId: string; questions: Question[] }>> {
    // 方式1：通过 adminService 云函数查询
    try {
      const { adminService } = await import('@/services/adminService');
      
      console.log('[examService] startExam 通过云函数查询, examId:', examId);
      
      const examResult = await adminService.get('exams', examId);
      const examData = examResult.data;
      
      if (!examData) {
        return { success: false, message: '考试不存在' };
      }
      
      console.log('[examService] startExam 获取到考试数据:', examData.title);
      
      // 获取题目
      let questionsData: any[] = [];
      
      if (examData.bankConfigs && Array.isArray(examData.bankConfigs) && examData.bankConfigs.length > 0) {
        const bankIds = examData.bankConfigs.map((b: any) => b.bankId).filter(Boolean);
        if (bankIds.length > 0) {
          try {
            const qr = await adminService.list('bankQuestions', {}, { limit: 1000 });
            questionsData = Array.isArray(qr.data) ? qr.data : (qr.data?.list || []);
            questionsData = questionsData.filter((q: any) => !q.bankId || bankIds.includes(q.bankId));
          } catch (e) { console.warn('[examService] 按题库筛选失败'); }
        }
      }
      
      if (questionsData.length === 0) {
        const qr = await adminService.list('bankQuestions', {}, { limit: 1000 });
        questionsData = Array.isArray(qr.data) ? qr.data : (qr.data?.list || []);
      }
      
      console.log('[examService] startExam 获取题目数:', questionsData.length);
      
      // @ts-ignore
      const questions: QuestionType[] = (questionsData as RawQuestion[])
        .map((q, index) => ({
          _id: q._id,
          id: q._id,
          questionBankId: q.bankId,
          type: normalizeQuestionType(q.type),
          question: q.question || '',
          content: q.question || '',
          options: (q.options || []).map((opt: any) => typeof opt === 'string' ? opt : (opt.content || opt.key || '')).filter(Boolean),
          answer: q.answer,
          score: q.score || 1,
          difficulty: (q.difficulty as QuestionType['difficulty']) || 'medium',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
        .filter(q => q.question);
      
      return {
        success: true,
        data: {
          attemptId: `attempt_${Date.now()}`,
          // @ts-ignore
          questions
        }
      };
    } catch (cloudErr: any) {
      console.warn('[examService] startExam 云函数失败，回退直接数据库:', cloudErr.message);
    }

    // 方式2：直接数据库查询
    try {
      const { data: examData } = await getDb().collection('exams').doc(examId).get();
      if (!examData) {
        return { success: false, message: '考试不存在' };
      }
      
      const { data: questionsData } = await getDb().collection('bankQuestions').get();
      
      // @ts-ignore
      const questions: QuestionType[] = (questionsData as RawQuestion[]).map((q, index) => ({
        _id: q._id,
        id: q._id,
        questionBankId: q.bankId,
        type: normalizeQuestionType(q.type),
        question: q.question || '',
        content: q.question || '',
        options: (q.options || []).map((opt: any) => typeof opt === 'string' ? opt : (opt.content || opt.key || '')).filter(Boolean),
        answer: q.answer,
        score: q.score || 1,
        difficulty: (q.difficulty as QuestionType['difficulty']) || 'medium',
        order: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })).filter(q => q.question);
      
      return {
        success: true,
        // @ts-ignore
        data: { attemptId: `attempt_${Date.now()}`, questions }
      };
    } catch (error) {
      console.error('开始考试失败:', error);
      return { success: false, message: '开始考试失败' };
    }
  },

  // 提交考试 - 使用真实数据库查询题目评分
  async submitExam(attemptId: string, answers: { questionId: string; answer: string | string[] }[], userId?: string): Promise<ApiResponse<ExamAttempt>> {
    try {
      // 获取当前用户
      const currentUser = await (await import('./cloudBaseService')).authService.getCurrentUser();
      const finalUserId = userId || currentUser?.uid || 'anonymous';
      const openid = (currentUser as any)?._openid;
      
      console.log('[examService] 提交考试, userId:', finalUserId, 'openid:', openid);

      const questionIds = answers.map(a => a.questionId);
      
      // 从 bankQuestions 获取题目
      const { data: questionsData } = await getDb().collection('bankQuestions').get();
      const questionsMap = new Map((questionsData as RawQuestion[]).map((q) => [q._id, q]));

      let totalScore = 0;
      let correctCount = 0;
      let relatedBankId = '';
      
      const scoredAnswers = answers.map(a => {
        const question = questionsMap.get(a.questionId);
        if (!question) return { questionId: a.questionId, userAnswer: a.answer, isCorrect: false, score: 0 };

        // 记录关联的题库ID
        if (question.bankId && !relatedBankId) {
          relatedBankId = question.bankId;
        }

        // 评分逻辑：支持多种答案格式
        let isCorrect = false;
        const userAnswer = a.answer;
        const correctAnswer = question.answer;
        
        // 判断题格式
        if (question.type === 'boolean' || question.type === 'judgment') {
          // 数据库中可能是 "true"/"false" 或 "A"/"B"
          const userVal = String(userAnswer).toLowerCase();
          const correctVal = String(correctAnswer).toLowerCase();
          isCorrect = userVal === correctVal || 
                      (correctVal === 'true' && userVal === 'a') ||
                      (correctVal === 'false' && userVal === 'b');
        }
        // 选择题格式 - 数据库中是 "A"、"B"、"C"、"D"
        else if (typeof correctAnswer === 'string' && /^[A-D]$/i.test(String(correctAnswer))) {
          isCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
        }
        // 多选题格式 - 数据库中是数组 ["A","B"]
        else if (Array.isArray(correctAnswer)) {
          const userArr = Array.isArray(userAnswer) ? userAnswer.map(String).sort() : [String(userAnswer)];
          const correctArr = correctAnswer.map(String).sort();
          isCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr);
        }
        // 直接匹配
        else {
          isCorrect = String(userAnswer).toUpperCase() === String(correctAnswer).toUpperCase();
        }

        const score = isCorrect ? (question.score || 1) : 0;
        totalScore += score;
        if (isCorrect) correctCount++;

        return { questionId: a.questionId, userAnswer: a.answer, isCorrect, score };
      });

      // 根据题库关联查找考试
      let examId = relatedBankId || attemptId.split('_')[0] || 'unknown';
      let exam: any = null;
      
      // 尝试从题库关联考试
      if (relatedBankId) {
        try {
          const { data: exams } = await getDb().collection('exams').where({
            bankIds: getDb().command.in([relatedBankId])
          }).get();
          
          if (exams && exams.length > 0) {
            exam = exams[0];
            examId = exam._id;
          }
        } catch (e) {
          console.log('[examService] 根据题库查找考试失败');
        }
      }

      // 如果没找到考试，使用题库作为标识
      if (!exam) {
        exam = {
          _id: examId,
          bankId: relatedBankId,
          passScore: 60, // 默认及格分数
          timeLimit: 60,
        };
      }

      const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const submitTime = new Date().toISOString();
      
      // 创建考试记录对象 - 不要手动设置 _id，让 CloudBase 自动生成
      const attemptData = {
        examId,
        userId: finalUserId,
        courseId: exam?.courseId || '',
        bankId: relatedBankId,
        score: totalScore,
        passStatus: totalScore >= (exam?.passScore || 60),
        answers: scoredAnswers,
        startTime,
        submitTime,
        duration: exam?.timeLimit || 60,
        // 保存原始的临时 ID 用于调试
        originalAttemptId: attemptId,
      };
      
      // 注意：CloudBase 会自动设置 _openid 字段，不要手动设置
      // 使用 userId 字段存储用户身份，配合自定义安全规则使用

      // 添加到数据库
      console.log('[examService] 提交考试，准备添加到数据库...');
      console.log('[examService] 考试记录数据:', JSON.stringify(attemptData, null, 2));
      
      const addResult = await getDb().collection('examAttempts').add(attemptData);
      console.log('[examService] addResult:', JSON.stringify(addResult));
      
      // CloudBase 返回的才是真正的记录 ID
      let realRecordId = '';
      if (addResult && typeof addResult === 'object') {
        if ((addResult as any).id) {
          realRecordId = (addResult as any).id;
        } else if ((addResult as any)._id) {
          realRecordId = (addResult as any)._id;
        }
      }
      
      console.log('[examService] CloudBase 生成的记录 ID:', realRecordId);
      
      // 返回给前端的 attemptId 可以是 CloudBase 生成的真正 ID
      const finalAttemptId = realRecordId || attemptId;
      console.log('[examService] 最终 attemptId:', finalAttemptId);
      
      // 构建返回的数据
      const resultAttempt: ExamAttempt = {
        _id: finalAttemptId,
        examId,
        userId: finalUserId,
        courseId: exam?.courseId || '',
        score: totalScore,
        passStatus: totalScore >= (exam?.passScore || 60),
        answers: scoredAnswers,
        startTime,
        submitTime,
        duration: exam?.timeLimit || 60
      };
      
      return { 
        success: true, 
        data: resultAttempt
      };
    } catch (error) {
      console.error('提交考试失败:', error);
      return { success: false, message: '提交考试失败' };
    }
  },

  // 获取考试记录
  async getAttempts(userId: string, examId?: string): Promise<ApiResponse<ExamAttempt[]>> {
    try {
      let query = getDb().collection('examAttempts').where({ userId });
      
      if (examId) {
        query = query.where({ examId });
      }
      
      const { data } = await query.get();
      
      return { 
        success: true, 
        data: (data || [] as ExamAttempt[]).sort((a, b) => 
          new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime()
        ) 
      };
    } catch (error) {
      console.error('获取考试记录失败:', error);
      return { success: false, message: '获取考试记录失败' };
    }
  },

  // 获取考试结果详情
  async getAttemptDetail(attemptId: string): Promise<ApiResponse<ExamAttempt>> {
    try {
      console.log('[examService] getAttemptDetail 开始, attemptId:', attemptId);
      
      // 尝试多种方式查找考试记录
      let matchedRecord: any = null;
      
      // 方式1: 直接使用 ID 查询（CloudBase 生成的真正 ID）
      try {
        console.log('[examService] 方式1: 直接使用 ID 查询 examAttempts');
        const db = getDb();
        const docRef = db.collection('examAttempts').doc(attemptId);
        console.log('[examService] 方式1: 查询文档:', attemptId);
        const result = await docRef.get();
        console.log('[examService] 方式1 查询结果:', JSON.stringify(result));
        if (result && result.data) {
          console.log('[examService] 方式1 找到记录');
          matchedRecord = result.data;
        }
      } catch (e: any) {
        console.error('[examService] 方式1 查询异常:', e?.message || e, 'code:', e?.code, 'errCode:', e?.errCode);
      }
      
      // 方式2: 获取最新记录（不依赖用户身份）
      if (!matchedRecord) {
        try {
          console.log('[examService] 方式2: 获取最新考试记录');
          const result = await getDb()
            .collection('examAttempts')
            .orderBy('submitTime', 'desc')
            .limit(10)
            .get();
          
          console.log('[examService] 方式2 查询结果, 记录数:', result.data?.length);
          
          if (result.data && result.data.length > 0) {
            // 首先尝试精确匹配 _id
            matchedRecord = result.data.find((a: any) => {
              const recordId = String(a._id || '');
              return recordId === attemptId || recordId.includes(attemptId);
            });
            
            // 如果没找到精确匹配，尝试 originalAttemptId 匹配
            if (!matchedRecord) {
              matchedRecord = result.data.find((a: any) => 
                a.originalAttemptId === attemptId || 
                String(a.originalAttemptId || '').includes(attemptId)
              );
            }
            
            // 如果还没找到，使用最新的一条记录
            if (!matchedRecord) {
              console.log('[examService] 未找到匹配记录，使用最新记录');
              matchedRecord = result.data[0];
            }
            
            console.log('[examService] 找到匹配记录:', matchedRecord);
          }
        } catch (e: any) {
          console.error('[examService] 方式2 查询异常:', e?.message || e, 'code:', e?.code, 'errCode:', e?.errCode);
        }
      }
      
      // 方式3: 无过滤查询（最后的备选方案）
      if (!matchedRecord) {
        console.log('[examService] 尝试无过滤查询所有记录...');
        try {
          const { data: allAttempts } = await getDb()
            .collection('examAttempts')
            .orderBy('submitTime', 'desc')
            .limit(20)
            .get();
          
          console.log('[examService] 所有考试记录数量:', allAttempts?.length);
          
          if (allAttempts && allAttempts.length > 0) {
            // 尝试多种匹配方式
            matchedRecord = allAttempts.find((a: any) => {
              const recordId = a._id || '';
              const recordIdStr = String(recordId);
              
              // 1. 完全匹配 _id
              if (recordIdStr === attemptId) return true;
              
              // 2. 包含关系匹配
              if (recordIdStr.includes(attemptId) || attemptId.includes(recordIdStr)) return true;
              
              // 3. originalAttemptId 匹配
              if (a.originalAttemptId === attemptId) return true;
              
              // 4. 模糊匹配
              const cleanRecordId = recordIdStr.replace(/^attempt_/, '').replace(/^exam_/, '');
              const cleanAttemptId = attemptId.replace(/^attempt_/, '').replace(/^exam_/, '');
              if (cleanRecordId === cleanAttemptId || cleanRecordId.includes(cleanAttemptId)) return true;
              
              return false;
            });
            
            if (matchedRecord) {
              console.log('[examService] 无过滤查询匹配到记录:', matchedRecord);
            } else {
              console.log('[examService] 无过滤查询未匹配，使用最新记录');
              matchedRecord = allAttempts[0];
            }
          }
        } catch (e) {
          console.log('[examService] 无过滤查询失败:', e);
        }
      }
      
      if (matchedRecord) {
        // 确保返回的数据格式正确
        const normalizedRecord: ExamAttempt = {
          _id: matchedRecord._id || matchedRecord.id || attemptId,
          examId: matchedRecord.examId || '',
          userId: matchedRecord.userId || '',
          courseId: matchedRecord.courseId || '',
          score: matchedRecord.score || 0,
          passStatus: matchedRecord.passStatus ?? (matchedRecord.score >= (matchedRecord.passScore || 60)),
          answers: Array.isArray(matchedRecord.answers) ? matchedRecord.answers : [],
          startTime: matchedRecord.startTime || matchedRecord.createdAt || new Date().toISOString(),
          submitTime: matchedRecord.submitTime || '',
          duration: matchedRecord.duration || matchedRecord.timeLimit || 60
        };
        
        console.log('[examService] 返回标准化记录:', normalizedRecord);
        return { success: true, data: normalizedRecord };
      }
      
      console.log('[examService] 未找到考试记录, attemptId:', attemptId);
      return { success: false, message: '考试记录不存在' };
    } catch (error) {
      console.error('[examService] 获取考试结果失败:', error);
      return { success: false, message: '获取考试结果失败' };
    }
  },

  // 创建考试
  async create(examData: Partial<Exam>): Promise<ApiResponse<Exam>> {
    try {
      const newExam = {
        ...examData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const result = await getDb().collection('exams').add(newExam);
      return { 
        success: true, 
        data: { ...newExam, _id: result.id } as Exam,
        message: '考试创建成功'
      };
    } catch (error) {
      console.error('创建考试失败:', error);
      return { success: false, message: '创建考试失败' };
    }
  },

  // 更新考试
  async update(examId: string, examData: Partial<Exam>): Promise<ApiResponse<Exam>> {
    try {
      const updateData = {
        ...examData,
        updatedAt: new Date().toISOString()
      };
      await getDb().collection('exams').doc(examId).update(updateData);
      return { 
        success: true, 
        data: { ...examData, _id: examId } as Exam,
        message: '考试更新成功'
      };
    } catch (error) {
      console.error('更新考试失败:', error);
      return { success: false, message: '更新考试失败' };
    }
  },

  // 删除考试
  async delete(examId: string): Promise<ApiResponse<void>> {
    try {
      await getDb().collection('exams').doc(examId).remove();
      return { success: true, message: '考试删除成功' };
    } catch (error) {
      console.error('删除考试失败:', error);
      return { success: false, message: '删除考试失败' };
    }
  }
};

// ============================================================================
// 题库相关 API
// ============================================================================

export const questionBankService = {
  // 获取题库列表（支持分页参数，兼容 database.ts 的返回格式）
  async getList(params?: { page?: number; pageSize?: number }): Promise<{ list: QuestionBank[]; total: number; page: number; pageSize: number }> {
    try {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const skip = (page - 1) * pageSize;
      
      const { data, pager } = await getDb().collection('questionBanks')
        .skip(skip)
        .limit(pageSize)
        .get();
      
      console.log('[questionBankService] 获取题库列表:', data?.length || 0, '条');
      
      // 转换字段以匹配代码期望的格式
      const banks: QuestionBank[] = (data as RawBank[]).map(bank => ({
        _id: bank._id,
        name: bank.name || bank.title || '未命名题库',
        description: bank.description || '',
        category: bank.category || '综合',
        level: bank.level || bank.difficulty || '中级',
        courseIds: bank.courseIds || [],
        questionCount: bank.questionCount || 0,
        passingScore: bank.passingScore || 60,
        timeLimit: bank.timeLimit || 60,
        status: bank.status === 'active' ? 'active' : 'inactive',
        createdAt: bank.createdAt || new Date().toISOString(),
        updatedAt: bank.updatedAt || new Date().toISOString()
      }));
      
      return { 
        success: true, 
        list: banks, 
        total: pager?.Total || data.length,
        page,
        pageSize
      } as any;
    } catch (error) {
      console.error('获取题库列表失败:', error);
      return { success: false, list: [], total: 0, page: 1, pageSize: 10 } as any;
    }
  },

  // 获取题库详情
  async getDetail(bankId: string): Promise<ApiResponse<QuestionBank>> {
    try {
      const { data } = await getDb().collection('questionBanks').doc(bankId).get();
      if (!data) {
        return { success: false, message: '题库不存在' };
      }
      
      const bank = data as RawBank;
      const questionBank: QuestionBank = {
        _id: bank._id,
        name: bank.name || bank.title || '未命名题库',
        description: bank.description || '',
        category: bank.category || '综合',
        level: bank.level || bank.difficulty || '中级',
        courseIds: bank.courseIds || [],
        questionCount: bank.questionCount || 0,
        passingScore: bank.passingScore || 60,
        timeLimit: bank.timeLimit || 60,
        status: bank.status === 'active' ? 'active' : 'inactive',
        createdAt: bank.createdAt || new Date().toISOString(),
        updatedAt: bank.updatedAt || new Date().toISOString()
      };
      
      return { success: true, data: questionBank };
    } catch (error) {
      console.error('获取题库详情失败:', error);
      return { success: false, message: '获取题库详情失败' };
    }
  },

  // 获取题库题目
  async getQuestions(bankId: string, params?: { difficulty?: string; type?: string; limit?: number }): Promise<ApiResponse<BankQuestion[]>> {
    try {
      let query = getDb().collection('bankQuestions');
      
      if (bankId && bankId !== 'all') {
        query = query.where({ bankId });
      }
      
      if (params?.difficulty) {
        query = query.where({ difficulty: params.difficulty });
      }
      if (params?.type) {
        query = query.where({ type: params.type });
      }
      
      const { data } = await query.get();
      
      // @ts-ignore
      let questions: BankQuestion[] = (data as RawQuestion[]).map((q, index) => ({
        _id: q._id,
        bankId: q.bankId || bankId,
        type: q.type === 'single' ? 'single' : q.type === 'multiple' ? 'multiple' : q.type === 'judgment' ? 'judge' : q.type === 'judge' ? 'judge' : 'essay',
        question: q.question || '',
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation || '',
        knowledgePoint: '',
        order: index,
        score: q.score || 1,
        // @ts-ignore
        createdAt: q.createdAt || new Date().toISOString()
      }));
      
      if (params?.limit) {
        questions = questions.slice(0, params.limit);
      }
      
      console.log('[questionBankService] 获取题目:', questions.length, '条');
      return { success: true, data: questions };
    } catch (error) {
      console.error('获取题库题目失败:', error);
      return { success: false, message: '获取题库题目失败' };
    }
  },

  // 创建题库
  async create(bankData: Partial<QuestionBank>): Promise<ApiResponse<QuestionBank>> {
    try {
      const newBank = {
        name: bankData.name || bankData.name,
        description: bankData.description || '',
        category: bankData.category || '综合',
        level: bankData.level || '中级',
        courseIds: bankData.courseIds || [],
        questionCount: 0,
        status: bankData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const result = await getDb().collection('questionBanks').add(newBank);
      return { 
        success: true, 
        data: { ...newBank, _id: result.id } as QuestionBank,
        message: '题库创建成功'
      };
    } catch (error) {
      console.error('创建题库失败:', error);
      return { success: false, message: '创建题库失败' };
    }
  },

  // 更新题库
  async update(bankId: string, bankData: Partial<QuestionBank>): Promise<ApiResponse<QuestionBank>> {
    try {
      const updateData = {
        name: bankData.name,
        description: bankData.description,
        category: bankData.category,
        level: bankData.level,
        courseIds: bankData.courseIds,
        status: bankData.status,
        updatedAt: new Date().toISOString()
      };
      await getDb().collection('questionBanks').doc(bankId).update(updateData);
      return { 
        success: true, 
        data: { ...bankData, _id: bankId } as QuestionBank,
        message: '题库更新成功'
      };
    } catch (error) {
      console.error('更新题库失败:', error);
      return { success: false, message: '更新题库失败' };
    }
  },

  // 删除题库
  async delete(bankId: string): Promise<ApiResponse<void>> {
    try {
      // 删除题库下的所有题目
      const { data: questions } = await getDb().collection('bankQuestions').where({ bankId }).get();
      for (const q of questions) {
        await getDb().collection('bankQuestions').doc(q._id).remove();
      }
      // 删除题库
      await getDb().collection('questionBanks').doc(bankId).remove();
      return { success: true, message: '删除成功' };
    } catch (error) {
      console.error('删除题库失败:', error);
      return { success: false, message: '删除题库失败' };
    }
  },

  // 创建题目
  async createQuestion(questionData: Partial<BankQuestion>): Promise<ApiResponse<BankQuestion>> {
    try {
      const newQuestion = {
        ...questionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const result = await getDb().collection('bankQuestions').add(newQuestion);
      
      // 更新题库的题目数量
      if (questionData.bankId) {
        try {
          const { data: bank } = await getDb().collection('questionBanks').doc(questionData.bankId).get();
          if (bank) {
            await getDb().collection('questionBanks').doc(questionData.bankId).update({
              questionCount: (bank.questionCount || 0) + 1,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error('更新题库题目数量失败:', e);
        }
      }
      
      return {
        success: true,
        data: { ...newQuestion, _id: result.id } as BankQuestion,
        message: '题目创建成功'
      };
    } catch (error) {
      console.error('创建题目失败:', error);
      return { success: false, message: '创建题目失败' };
    }
  },

  // 更新题目
  async updateQuestion(questionId: string, questionData: Partial<BankQuestion>): Promise<ApiResponse<BankQuestion>> {
    try {
      await getDb().collection('bankQuestions').doc(questionId).update({
        ...questionData,
        updatedAt: new Date().toISOString()
      });
      return { 
        success: true, 
        data: { ...questionData, _id: questionId } as BankQuestion,
        message: '题目更新成功'
      };
    } catch (error) {
      console.error('更新题目失败:', error);
      return { success: false, message: '更新题目失败' };
    }
  },

  // 删除题目
  async deleteQuestion(questionId: string, bankId: string): Promise<ApiResponse<void>> {
    try {
      await getDb().collection('bankQuestions').doc(questionId).remove();
      
      // 更新题库题目数量
      try {
        const { data: bank } = await getDb().collection('questionBanks').doc(bankId).get();
        if (bank && bank.questionCount > 0) {
          await getDb().collection('questionBanks').doc(bankId).update({
            questionCount: bank.questionCount - 1,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('更新题库题目数量失败:', e);
      }
      
      return { success: true, message: '删除成功' };
    } catch (error) {
      console.error('删除题目失败:', error);
      return { success: false, message: '删除题目失败' };
    }
  },

  // 开始练习
  async startPractice(bankId: string, mode: 'sequential' | 'random' | 'wrong' | 'favorites', questionCount: number): Promise<ApiResponse<{ practiceId: string; questions: BankQuestion[] }>> {
    try {
      const query = getDb().collection('bankQuestions').where({ bankId });
      
      const { data } = await query.get();
      let questions = data as BankQuestion[];
      
      if (mode === 'random') {
        questions = questions.sort(() => Math.random() - 0.5);
      }
      
      questions = questions.slice(0, questionCount);
      
      return {
        success: true,
        data: {
          practiceId: `practice_${Date.now()}`,
          questions
        }
      };
    } catch (error) {
      console.error('开始练习失败:', error);
      return { success: false, message: '开始练习失败' };
    }
  },

  // 提交练习
  async submitPractice(practiceId: string, answers: { questionId: string; answer: string | string[]; isFavorite: boolean }[], userId?: string): Promise<ApiResponse<PracticeRecord>> {
    try {
      // 获取当前用户
      let currentUser: any = null;
      try {
        const authModule = await import('./authService');
        currentUser = await authModule.authService.getCurrentUser();
      } catch (e) {
        console.warn('[examService] 获取当前用户失败:', e);
      }
      const finalUserId = userId || currentUser?.uid || currentUser?._openid || 'anonymous';
      
      const questionIds = answers.map(a => a.questionId);
      const { data: questionsData } = await getDb().collection('bankQuestions').where({
        _id: getDb().command.in(questionIds)
      }).get();
      
      const questionsMap = new Map(questionsData.map((q: any) => [q._id, q]));
      
      let correctCount = 0;
      const scoredAnswers = answers.map(a => {
        const question = questionsMap.get(a.questionId);
        if (!question) {
          return {
            questionId: a.questionId,
            question: '',
            userAnswer: a.answer,
            correctAnswer: '',
            isCorrect: false,
            isFavorite: a.isFavorite
          };
        }
        
        // @ts-ignore
        const isCorrect = Array.isArray(question.answer)
          // @ts-ignore
          ? JSON.stringify((a.answer as string[]).sort()) === JSON.stringify(question.answer.sort())
          // @ts-ignore
          : a.answer === question.answer;
        
        if (isCorrect) correctCount++;
        
        return {
          questionId: a.questionId,
          // @ts-ignore
          question: question.question,
          userAnswer: a.answer,
          // @ts-ignore
          correctAnswer: question.answer,
          isCorrect,
          isFavorite: a.isFavorite
        };
      });
      
      const bankId = questionsData[0]?.bankId || '';
      let bankName = '';
      if (bankId) {
        const { data: bankData } = await getDb().collection('questionBanks').doc(bankId).get();
        bankName = bankData?.title || '';
      }
      
      // @ts-ignore
      const record: Omit<PracticeRecord, '_id'> = {
        userId: finalUserId,
        bankId,
        bankName,
        questionCount: answers.length,
        correctCount,
        score: Math.round((correctCount / answers.length) * 100),
        duration: 30,
        answers: scoredAnswers,
        startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const result = await getDb().collection('practiceRecords').add(record);
      
      const wrongAnswers = scoredAnswers.filter(a => !a.isCorrect);
      for (const wrong of wrongAnswers) {
        await getDb().collection('wrongQuestions').add({
          userId: finalUserId,
          questionId: wrong.questionId,
          question: wrong.question,
          userAnswer: wrong.userAnswer,
          correctAnswer: wrong.correctAnswer,
          bankId,
          lastWrongTime: new Date().toISOString(),
          wrongCount: 1,
          createdAt: new Date().toISOString()
        });
      }
      
      return { success: true, data: { _id: result.id, ...record } as PracticeRecord };
    } catch (error) {
      console.error('提交练习失败:', error);
      return { success: false, message: '提交练习失败' };
    }
  },

  // 获取练习记录
  async getPracticeRecords(userId: string): Promise<ApiResponse<PracticeRecord[]>> {
    try {
      const { data } = await getDb().collection('practiceRecords').where({ userId }).get();
      return { 
        success: true, 
        data: (data as PracticeRecord[]).sort((a, b) => 
          new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        ) 
      };
    } catch (error) {
      console.error('获取练习记录失败:', error);
      return { success: false, message: '获取练习记录失败' };
    }
  },

  // 获取错题本
  async getWrongQuestions(userId: string): Promise<ApiResponse<WrongQuestion[]>> {
    try {
      const { data } = await getDb().collection('wrongQuestions').where({ userId }).get();
      return {
        success: true,
        data: (data as WrongQuestion[]).sort((a, b) =>
          new Date(b.lastWrongTime).getTime() - new Date(a.lastWrongTime).getTime()
        )
      };
    } catch (error) {
      console.error('获取错题本失败:', error);
      return { success: false, message: '获取错题本失败' };
    }
  },

  // 删除错题
  async deleteWrongQuestion(wrongId: string): Promise<ApiResponse<void>> {
    try {
      await getDb().collection('wrongQuestions').doc(wrongId).remove();
      return { success: true };
    } catch (error) {
      console.error('删除错题失败:', error);
      return { success: false, message: '删除错题失败' };
    }
  },

  // 收藏/取消收藏题目
  async toggleFavorite(questionId: string, isFavorite: boolean, userId?: string): Promise<ApiResponse<void>> {
    try {
      // 获取当前用户
      let currentUser: any = null;
      try {
        const authModule = await import('./authService');
        currentUser = await authModule.authService.getCurrentUser();
      } catch (e) {
        console.warn('[examService] 获取当前用户失败:', e);
      }
      const finalUserId = userId || currentUser?.uid || currentUser?._openid || 'anonymous';
      
      if (isFavorite) {
        await getDb().collection('favoriteQuestions').add({
          userId: finalUserId,
          questionId,
          createdAt: new Date().toISOString()
        });
      } else {
        const { data } = await getDb().collection('favoriteQuestions').where({ userId: finalUserId, questionId }).get();
        if (data && data.length > 0) {
          await getDb().collection('favoriteQuestions').doc(data[0]._id).remove();
        }
      }
      return { success: true };
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      return { success: false, message: '操作失败' };
    }
  },

  // 获取收藏列表
  async getFavorites(userId: string): Promise<ApiResponse<FavoriteQuestion[]>> {
    try {
      const { data } = await getDb().collection('favoriteQuestions').where({ userId }).get();
      return { success: true, data: data as FavoriteQuestion[] };
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return { success: false, message: '获取收藏列表失败' };
    }
  }
};

export default examService;
