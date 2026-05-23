/**
 * 考试服务 - 在线考试、题库练习、成绩管理
 * 统一通过 adminService (HTTP → db-init 云函数) 访问数据库
 */

import { adminService } from './adminService';
import type { 
  Exam, ExamAttempt, ApiResponse, PaginatedResponse,
  QuestionBank, BankQuestion, PracticeRecord, WrongQuestion, FavoriteQuestion
} from '../types';
import type { Question as ServiceQuestion } from '@/types/service';

// ============================================================================
// 辅助：从 adminService 响应中提取数据
// ============================================================================
function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

function extractTotal(result: any): number {
  if (result?.data?.total !== undefined) return result.data.total;
  if (result?.total !== undefined) return result.total;
  return 0;
}

function extractSingle(result: any): any | null {
  if (!result) return null;
  if (result.data && !Array.isArray(result.data) && typeof result.data === 'object' && (result.data._id || result.data.id)) {
    return result.data;
  }
  if (Array.isArray(result.data) && result.data.length > 0) return result.data[0];
  return result.data || null;
}

// ============================================================================
// 数据库原始数据类型（用于类型转换）
// ============================================================================
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

// ============================================================================
// 辅助：标准化题型字段
// ============================================================================
function normalizeQuestionType(type?: string): string {
  const t = String(type || '').toLowerCase();
  if (!t || t === 'undefined') return 'single';
  if (t === 'single' || t === 'choice') return 'single';
  if (t === 'multiple' || t === 'multichoice') return 'multiple';
  if (t === 'judge' || t === 'judgment' || t === 'truefalse' || t === 'boolean') return 'truefalse';
  return 'single';
}

// ============================================================================
// 考试相关 API
// ============================================================================

export const examService = {
  // 获取考试列表
  async getList(params?: { keyword?: string; courseId?: string }): Promise<ApiResponse<Exam[]>> {
    try {
      const query: any = {};
      if (params?.courseId) query.courseId = params.courseId;
      
      const result = await adminService.list('exams', query, { limit: 50 });
      let data = extractList(result);
      
      if (params?.keyword) {
        data = data.filter((e: any) => e.title?.includes(params.keyword!));
      }
      
      console.log('[examService] getList 通过云函数获取:', data.length, '条');
      return { success: true, data: data as Exam[] };
    } catch (error) {
      console.error('获取考试列表失败:', error);
      return { success: false, message: '获取考试列表失败' };
    }
  },

  // 获取考试详情
  async getDetail(id: string): Promise<ApiResponse<Exam>> {
    try {
      const result = await adminService.get('exams', id);
      const examData = extractSingle(result);
      if (!examData) {
        return { success: false, message: '考试不存在' };
      }
      console.log('[examService] getDetail 通过云函数获取成功:', id);
      return { success: true, data: examData as Exam };
    } catch (error) {
      console.error('获取考试详情失败:', error);
      return { success: false, message: '获取考试详情失败' };
    }
  },

  // 获取考试题目（从 questions 集合）
  async getQuestions(examId: string): Promise<ApiResponse<Question[]>> {
    try {
      // 先获取考试信息，了解关联的题库
      const examResult = await adminService.get('exams', examId);
      const examData = extractSingle(examResult);
      
      if (!examData) {
        return { success: false, message: '考试不存在' };
      }
      
      console.log('[examService] getQuestions examData:', examData);
      
      let questionsData: any[] = [];
      
      // 如果考试关联了 bankConfigs，按题库ID筛选
      if (examData.bankConfigs && Array.isArray(examData.bankConfigs) && examData.bankConfigs.length > 0) {
        const bankIds = examData.bankConfigs.map((b: any) => b.bankId).filter(Boolean);
        if (bankIds.length > 0) {
          try {
            const qr = await adminService.list('questions', {}, { limit: 500 });
            questionsData = extractList(qr);
            // 客户端过滤 bankId
            questionsData = questionsData.filter((q: any) => !q.bankId || bankIds.includes(q.bankId));
          } catch (e) {
            console.warn('[examService] 按题库筛选失败，获取全部题目');
          }
        }
      }
      
      // 如果没拿到数据，获取全部题目
      if (questionsData.length === 0) {
        const qr = await adminService.list('questions', {}, { limit: 1000 });
        questionsData = extractList(qr);
      }
      
      console.log('[examService] getQuestions 获取到题目:', questionsData.length);
      
      // 转换为 Question 格式
      const questions = (questionsData as RawQuestion[])
        .map((q, index) => ({
          _id: q._id,
          id: q._id,
          questionBankId: q.bankId,
          type: normalizeQuestionType(q.type) as ServiceQuestion['type'],
          question: q.question || '',
          content: q.question || '',
          options: (q.options || []).map((opt: any) => typeof opt === 'string' ? opt : (opt.content || opt.key || '')).filter(Boolean),
          answer: q.answer,
          score: q.score || 1,
          difficulty: (q.difficulty as ServiceQuestion['difficulty']) || 'medium',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
        .filter(q => q.question);
      
      return { success: true, data: questions as any };
    } catch (error: any) {
      console.error('获取考试题目失败:', error);
      return { success: false, message: '获取考试题目失败' };
    }
  },

  // 开始考试
  async startExam(examId: string, _userId: string): Promise<ApiResponse<{ attemptId: string; questions: Question[] }>> {
    try {
      console.log('[examService] startExam 通过云函数查询, examId:', examId);
      
      const examResult = await adminService.get('exams', examId);
      const examData = extractSingle(examResult);
      
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
            const qr = await adminService.list('questions', {}, { limit: 1000 });
            questionsData = extractList(qr);
            questionsData = questionsData.filter((q: any) => !q.bankId || bankIds.includes(q.bankId));
          } catch (e) { console.warn('[examService] 按题库筛选失败'); }
        }
      }
      
      if (questionsData.length === 0) {
        const qr = await adminService.list('questions', {}, { limit: 1000 });
        questionsData = extractList(qr);
      }
      
      console.log('[examService] startExam 获取题目数:', questionsData.length);
      
      const questions: ServiceQuestion[] = (questionsData as RawQuestion[])
        .map((q, index) => ({
          _id: q._id,
          id: q._id,
          questionBankId: q.bankId,
          type: normalizeQuestionType(q.type) as ServiceQuestion['type'],
          question: q.question || '',
          content: q.question || '',
          options: (q.options || []).map((opt: any) => typeof opt === 'string' ? opt : (opt.content || opt.key || '')).filter(Boolean),
          answer: q.answer,
          score: q.score || 1,
          difficulty: (q.difficulty as ServiceQuestion['difficulty']) || 'medium',
          order: index,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
        .filter(q => q.question);
      
      return {
        success: true,
        data: {
          attemptId: `attempt_${Date.now()}`,
          questions: questions as any
        }
      };
    } catch (error: any) {
      console.error('开始考试失败:', error);
      return { success: false, message: '开始考试失败' };
    }
  },

  // 提交考试 - 使用云函数查询题目并评分
  async submitExam(attemptId: string, answers: { questionId: string; answer: string | string[] }[], userId?: string): Promise<ApiResponse<ExamAttempt>> {
    try {
      // 获取当前用户（认证操作保留 SDK）
      const currentUser = await (await import('./cloudBaseService')).authService.getCurrentUser();
      const finalUserId = userId || currentUser?.uid || 'anonymous';
      
      console.log('[examService] 提交考试, userId:', finalUserId);

      // 使用 $in 查询相关题目（优化：只查询回答涉及的题目）
      const qResult = await adminService.listWithOps('questions', {
        _id: { '$in': answers.map(a => a.questionId) }
      }, { limit: 2000 });
      const questionsData = extractList(qResult) as RawQuestion[];
      const questionsMap = new Map(questionsData.map((q) => [q._id, q]));

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
          const eResult = await adminService.listWithOps('exams', {
            bankIds: { '$in': [relatedBankId] }
          });
          const exams = extractList(eResult);
          
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
          passScore: 60,
          timeLimit: 60,
        };
      }

      const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const submitTime = new Date().toISOString();
      
      // 创建考试记录对象
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
        originalAttemptId: attemptId,
      };
      
      console.log('[examService] 提交考试，准备添加到数据库...');
      
      const addResult = await adminService.add('examAttempts', attemptData);
      console.log('[examService] addResult:', JSON.stringify(addResult));
      
      // CloudBase 返回的才是真正的记录 ID
      const realRecordId = addResult?.data?.id || '';
      
      console.log('[examService] CloudBase 生成的记录 ID:', realRecordId);
      
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
      const query: any = { userId };
      if (examId) {
        query.examId = examId;
      }
      
      const result = await adminService.list('examAttempts', query, { limit: 200, orderBy: 'submitTime', order: 'desc' });
      const data = extractList(result) as ExamAttempt[];
      
      return { 
        success: true, 
        data: data.sort((a, b) => 
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
      
      let matchedRecord: any = null;
      
      // 方式1: 直接使用 ID 查询
      try {
        console.log('[examService] 方式1: 直接使用 ID 查询 examAttempts');
        const result = await adminService.get('examAttempts', attemptId);
        const data = extractSingle(result);
        if (data) {
          console.log('[examService] 方式1 找到记录');
          matchedRecord = data;
        }
      } catch (e: any) {
        console.error('[examService] 方式1 查询异常:', e?.message || e);
      }
      
      // 方式2: 获取最新记录（不依赖用户身份）
      if (!matchedRecord) {
        try {
          console.log('[examService] 方式2: 获取最新考试记录');
          const result = await adminService.list('examAttempts', {}, { 
            orderBy: 'submitTime', 
            order: 'desc', 
            limit: 10 
          });
          const records = extractList(result);
          
          console.log('[examService] 方式2 查询结果, 记录数:', records.length);
          
          if (records.length > 0) {
            // 首先尝试精确匹配 _id
            matchedRecord = records.find((a: any) => {
              const recordId = String(a._id || '');
              return recordId === attemptId || recordId.includes(attemptId);
            });
            
            // 如果没找到精确匹配，尝试 originalAttemptId 匹配
            if (!matchedRecord) {
              matchedRecord = records.find((a: any) => 
                a.originalAttemptId === attemptId || 
                String(a.originalAttemptId || '').includes(attemptId)
              );
            }
            
            // 如果还没找到，使用最新的一条记录
            if (!matchedRecord) {
              console.log('[examService] 未找到匹配记录，使用最新记录');
              matchedRecord = records[0];
            }
            
            console.log('[examService] 找到匹配记录:', matchedRecord);
          }
        } catch (e: any) {
          console.error('[examService] 方式2 查询异常:', e?.message || e);
        }
      }
      
      // 方式3: 无过滤查询（最后的备选方案）
      if (!matchedRecord) {
        console.log('[examService] 尝试无过滤查询所有记录...');
        try {
          const result = await adminService.list('examAttempts', {}, { 
            orderBy: 'submitTime', 
            order: 'desc', 
            limit: 20 
          });
          const allAttempts = extractList(result);
          
          console.log('[examService] 所有考试记录数量:', allAttempts.length);
          
          if (allAttempts.length > 0) {
            // 尝试多种匹配方式
            matchedRecord = allAttempts.find((a: any) => {
              const recordId = a._id || '';
              const recordIdStr = String(recordId);
              
              if (recordIdStr === attemptId) return true;
              if (recordIdStr.includes(attemptId) || attemptId.includes(recordIdStr)) return true;
              if (a.originalAttemptId === attemptId) return true;
              
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
      const result = await adminService.add('exams', newExam);
      return { 
        success: true, 
        data: { ...newExam, _id: result.data?.id || '' } as Exam,
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
      await adminService.update('exams', examId, updateData);
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
      await adminService.delete('exams', examId);
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
  // 获取题库列表
  async getList(params?: { page?: number; pageSize?: number }): Promise<{ list: QuestionBank[]; total: number; page: number; pageSize: number }> {
    try {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      
      const result = await adminService.list('questionBanks', {}, { page, pageSize });
      const data = extractList(result) as RawBank[];
      const total = extractTotal(result);
      
      console.log('[questionBankService] 获取题库列表:', data.length, '条');
      
      const banks: QuestionBank[] = data.map(bank => ({
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
        total,
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
      const result = await adminService.get('questionBanks', bankId);
      const data = extractSingle(result) as RawBank;
      if (!data) {
        return { success: false, message: '题库不存在' };
      }
      
      const questionBank: QuestionBank = {
        _id: data._id,
        name: data.name || data.title || '未命名题库',
        description: data.description || '',
        category: data.category || '综合',
        level: data.level || data.difficulty || '中级',
        courseIds: data.courseIds || [],
        questionCount: data.questionCount || 0,
        passingScore: data.passingScore || 60,
        timeLimit: data.timeLimit || 60,
        status: data.status === 'active' ? 'active' : 'inactive',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
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
      const query: any = {};
      if (bankId && bankId !== 'all') {
        query.bankId = bankId;
      }
      if (params?.difficulty) {
        query.difficulty = params.difficulty;
      }
      if (params?.type) {
        query.type = params.type;
      }
      
      const result = await adminService.list('questions', query, { limit: 500 });
      const data = extractList(result) as RawQuestion[];
      
      let questions: BankQuestion[] = data.map((q, index) => {
        const qType = q.type || 'single';
        const mappedType = (
          qType === 'single' ? 'single' as const : 
          qType === 'multiple' ? 'multiple' as const : 
          qType === 'judgment' || qType === 'judge' ? 'judge' as const : 
          'essay' as const
        );
        return {
          _id: q._id,
          bankId: q.bankId || bankId,
          type: mappedType,
          question: q.question || '',
          content: q.question || '',
          options: q.options || [],
          answer: q.answer,
          explanation: q.explanation || '',
          knowledgePoint: '',
          difficulty: (q.difficulty as BankQuestion['difficulty']) || 'medium',
          order: index,
          score: q.score || 1,
          createdAt: (q as any).createdAt || new Date().toISOString(),
          updatedAt: (q as any).updatedAt || new Date().toISOString()
        } as BankQuestion;
      });
      
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
      const result = await adminService.add('questionBanks', newBank);
      return { 
        success: true, 
        data: { ...newBank, _id: result.data?.id || '' } as QuestionBank,
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
      const updateData: any = {
        name: bankData.name,
        description: bankData.description,
        category: bankData.category,
        level: bankData.level,
        courseIds: bankData.courseIds,
        status: bankData.status,
        updatedAt: new Date().toISOString()
      };
      await adminService.update('questionBanks', bankId, updateData);
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
      const qResult = await adminService.list('questions', { bankId }, { limit: 500 });
      const questions = extractList(qResult);
      for (const q of questions) {
        await adminService.delete('questions', q._id);
      }
      // 删除题库
      await adminService.delete('questionBanks', bankId);
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
      const result = await adminService.add('questions', newQuestion);
      
      // 更新题库的题目数量
      if (questionData.bankId) {
        try {
          const bankResult = await adminService.get('questionBanks', questionData.bankId);
          const bank = extractSingle(bankResult);
          if (bank) {
            await adminService.update('questionBanks', questionData.bankId, {
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
        data: { ...newQuestion, _id: result.data?.id || '' } as BankQuestion,
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
      await adminService.update('questions', questionId, {
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
      await adminService.delete('questions', questionId);
      
      // 更新题库题目数量
      try {
        const bankResult = await adminService.get('questionBanks', bankId);
        const bank = extractSingle(bankResult);
        if (bank && bank.questionCount > 0) {
          await adminService.update('questionBanks', bankId, {
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
      const result = await adminService.list('questions', { bankId }, { limit: 500 });
      let questions = extractList(result) as BankQuestion[];
      
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
  async submitPractice(_practiceId: string, answers: { questionId: string; answer: string | string[]; isFavorite: boolean }[], userId?: string): Promise<ApiResponse<PracticeRecord>> {
    try {
      // 获取当前用户（认证操作保留 SDK）
      let currentUser: any = null;
      try {
        const authModule = await import('./authService');
        currentUser = await authModule.authService.getCurrentUser();
      } catch (e) {
        console.warn('[examService] 获取当前用户失败:', e);
      }
      const finalUserId = userId || currentUser?.uid || currentUser?._openid || 'anonymous';
      
      const questionIds = answers.map(a => a.questionId);
      
      // 使用 $in 查询题目
      const qResult = await adminService.listWithOps('questions', {
        _id: { '$in': questionIds }
      }, { limit: 500 });
      const questionsData = extractList(qResult);
      
      const questionsMap = new Map(questionsData.map((q: any) => [q._id, q as RawQuestion]));
      
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
        
        const isCorrect = Array.isArray(question.answer)
          ? JSON.stringify((Array.isArray(a.answer) ? a.answer : [a.answer]).sort()) === JSON.stringify((question.answer as string[]).sort())
          : String(a.answer) === String(question.answer);
        
        if (isCorrect) correctCount++;
        
        return {
          questionId: a.questionId,
          question: question.question || '',
          userAnswer: a.answer,
          correctAnswer: question.answer || '',
          isCorrect,
          isFavorite: a.isFavorite
        };
      });
      
      const bankId = questionsData[0]?.bankId || '';
      let bankName = '';
      if (bankId) {
        const bankResult = await adminService.get('questionBanks', bankId);
        const bankData = extractSingle(bankResult);
        bankName = bankData?.title || '';
      }
      
      const record: Omit<PracticeRecord, '_id'> = {
        userId: finalUserId,
        bankId,
        bankName,
        mode: 'random' as const,
        courseId: '',
        questionCount: answers.length,
        correctCount,
        score: Math.round((correctCount / answers.length) * 100),
        duration: 30,
        answers: scoredAnswers,
        startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const result = await adminService.add('practiceRecords', record);
      
      // 保存错题
      const wrongAnswers = scoredAnswers.filter(a => !a.isCorrect);
      for (const wrong of wrongAnswers) {
        await adminService.add('wrongQuestions', {
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
      
      return { success: true, data: { _id: result.data?.id || '', ...record } as PracticeRecord };
    } catch (error) {
      console.error('提交练习失败:', error);
      return { success: false, message: '提交练习失败' };
    }
  },

  // 获取练习记录
  async getPracticeRecords(userId: string): Promise<ApiResponse<PracticeRecord[]>> {
    try {
      const result = await adminService.list('practiceRecords', { userId }, { orderBy: 'endTime', order: 'desc', limit: 200 });
      const data = extractList(result) as PracticeRecord[];
      return { 
        success: true, 
        data: data.sort((a, b) => 
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
      const result = await adminService.list('wrongQuestions', { userId }, { orderBy: 'lastWrongTime', order: 'desc', limit: 500 });
      const data = extractList(result) as WrongQuestion[];
      return {
        success: true,
        data: data.sort((a, b) =>
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
      await adminService.delete('wrongQuestions', wrongId);
      return { success: true };
    } catch (error) {
      console.error('删除错题失败:', error);
      return { success: false, message: '删除错题失败' };
    }
  },

  // 收藏/取消收藏题目
  async toggleFavorite(questionId: string, isFavorite: boolean, userId?: string): Promise<ApiResponse<void>> {
    try {
      // 获取当前用户（认证操作保留 SDK）
      let currentUser: any = null;
      try {
        const authModule = await import('./authService');
        currentUser = await authModule.authService.getCurrentUser();
      } catch (e) {
        console.warn('[examService] 获取当前用户失败:', e);
      }
      const finalUserId = userId || currentUser?.uid || currentUser?._openid || 'anonymous';
      
      if (isFavorite) {
        await adminService.add('favoriteQuestions', {
          userId: finalUserId,
          questionId,
          createdAt: new Date().toISOString()
        });
      } else {
        const result = await adminService.list('favoriteQuestions', { userId: finalUserId, questionId });
        const data = extractList(result);
        if (data && data.length > 0) {
          await adminService.delete('favoriteQuestions', data[0]._id);
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
      const result = await adminService.list('favoriteQuestions', { userId }, { limit: 500 });
      const data = extractList(result);
      return { success: true, data: data as FavoriteQuestion[] };
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return { success: false, message: '获取收藏列表失败' };
    }
  }
};

export default examService;
