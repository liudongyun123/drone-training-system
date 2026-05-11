// ============================================================================
// useExams Hook - 考试与题库管理的核心数据逻辑
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { examService, questionBankService } from '@/services/database';
import { examService as examServiceDirect } from '@/services/examService';
import { safeGetList, safeGetTotal } from '@/utils/safeData';
import type { Exam, QuestionBank, BankQuestion } from '@/types';

// ==================== 试卷管理 ====================
export function useExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await examService.getList({
        keyword,
        status: statusFilter,
        page,
        pageSize: 10,
      } as any);
      setExams(safeGetList(result));
      setTotal(safeGetTotal(result));
    } catch (error) {
      console.error('加载试卷列表失败:', error);
      setExams([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<Exam>, editingExam: Exam | null) => {
    if (!data.title?.trim()) throw new Error('请输入试卷标题');
    if (!data.courseId?.trim()) throw new Error('请选择课程');

    const saveData = {
      ...data,
      questions: (data as any).selectedQuestions || [],
      totalScore: data.totalScore || 100,
      questionCount: ((data as any).selectedQuestions || []).length,
    };

    if (editingExam) {
      await examService.update(editingExam._id, saveData);
    } else {
      const newExam = await examService.create(saveData);
      if (!newExam?._id) throw new Error('创建失败，未返回有效的ID');
    }
  };

  const remove = async (exam: Exam) => {
    await examService.delete(exam._id);
  };

  return {
    exams, loading, total, page, setPage,
    keyword, setKeyword, statusFilter, setStatusFilter,
    load, save, remove,
  };
}

// ==================== 题库管理 ====================
export function useBankList() {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: any = {};
      if (keyword) {
        query.name = new RegExp(keyword, 'i');
      }
      const result = await questionBankService.getList({
        keyword: query,
        page,
        pageSize: 10,
      });
      setBanks(safeGetList(result));
      setTotal(safeGetTotal(result));
    } catch (error) {
      console.error('加载题库失败:', error);
      setBanks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, page]);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Partial<QuestionBank>, editingBank: QuestionBank | null) => {
    if (!data.name?.trim()) throw new Error('请输入题库名称');

    const saveData = {
      ...data,
      courseIds: data.courseIds || [],
      status: data.status || 'active',
      questions: (editingBank as any)?.questions || [],
    };

    if (editingBank) {
      await questionBankService.update(editingBank._id, saveData);
    } else {
      const newBank = await questionBankService.create(saveData);
      if (!newBank?._id) throw new Error('创建失败，未返回有效的ID');
    }
  };

  const remove = async (bank: QuestionBank) => {
    await questionBankService.delete(bank._id);
  };

  return {
    banks, loading, total, page, setPage,
    keyword, setKeyword,
    load, save, remove,
  };
}

// ==================== 题目管理 ====================
export function useQuestionList(bankId: string) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');

  const load = useCallback(async () => {
    if (!bankId) {
      setQuestions([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const result = await examServiceDirect.getQuestions(bankId);
      const allQuestions = safeGetList(result);

      // 客户端过滤
      let filtered = allQuestions;
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter((q: BankQuestion) =>
          (q.question || '').toLowerCase().includes(kw)
        );
      }
      if (difficultyFilter !== 'all') {
        filtered = filtered.filter((q: BankQuestion) => q.difficulty === difficultyFilter);
      }

      // 客户端分页
      const pageSize = 10;
      const start = (page - 1) * pageSize;
      setQuestions(filtered.slice(start, start + pageSize));
      setTotal(filtered.length);
    } catch (error) {
      console.error('加载题目列表失败:', error);
      setQuestions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [bankId, keyword, difficultyFilter, page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (question: BankQuestion) => {
    // 从题库中移除题目
    const result = await questionBankService.getList({ page: 1, pageSize: 1000 });
    const allBanks = safeGetList(result);
    const bank = allBanks.find((b: QuestionBank) => b._id === bankId);
    if (bank && (bank as any).questions) {
      const updatedQuestions = (bank as any).questions.filter((q: any) => q._id !== question._id);
      await questionBankService.update(bankId, { questions: updatedQuestions } as any);
    }
  };

  const importQuestions = async (
    questionsData: any[],
    onProgress: (progress: { current: number; total: number; success: number; failed: number }) => void,
  ) => {
    if (!bankId) throw new Error('请先选择题库');

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < questionsData.length; i++) {
      try {
        const q = questionsData[i];
        await questionBankService.createQuestion({
          bankId,
          type: q.type,
          content: q.content || q.question,
          options: q.options,
          answer: q.answer,
          difficulty: q.difficulty || 'medium',
          score: q.score || 1,
          explanation: q.explanation || '',
          category: q.category || '',
        } as any);
        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`第 ${i + 1} 题导入失败: ${error.message || '未知错误'}`);
      }
      onProgress({ current: i + 1, total: questionsData.length, success: successCount, failed: failedCount });
    }

    return { successCount, failedCount, errors };
  };

  return {
    questions, loading, total, page, setPage,
    keyword, setKeyword, difficultyFilter, setDifficultyFilter,
    load, remove, importQuestions,
  };
}

// ==================== 导入状态 ====================
export function useImportState() {
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  return { showModal, setShowModal, importing, setImporting, progress, setProgress };
}

// ==================== 弹窗状态 ====================
export function useModalState<T>() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const open = (item?: T) => {
    setEditing(item || null);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setEditing(null);
  };

  return { isOpen, editing, open, close };
}
