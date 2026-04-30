// ============================================================================
// ExamForm.tsx - 试卷表单弹窗（含题库配置与随机抽题）
// ============================================================================
import { useState, useEffect } from 'react';
import {
  Plus, Trash2, FileText, Database, X, Layers, AlertCircle,
} from 'lucide-react';
import { questionBankService } from '@/services/database';
import { safeGetList } from '@/utils/safeData';
import type { Exam, QuestionBank, BankQuestion } from '@/types';

export interface ExamFormData {
  title: string;
  description: string;
  courseId: string;
  courseName: string;
  duration: number;
  passScore: number;
  totalScore: number;
  questionCount: number;
  selectedQuestions: BankQuestion[];
  shuffleQuestions: boolean;
  status: 'draft' | 'published';
  attempts: number;
  bankConfigs: Array<{
    bankId: string;
    bankName: string;
    questionCount: number;
  }>;
}

interface ExamFormProps {
  exam?: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExamFormData) => void;
}

const emptyForm: ExamFormData = {
  title: '',
  description: '',
  courseId: '',
  courseName: '',
  duration: 60,
  passScore: 60,
  totalScore: 100,
  questionCount: 0,
  selectedQuestions: [],
  shuffleQuestions: false,
  status: 'draft',
  attempts: 3,
  bankConfigs: [],
};

const DIFFICULTY_MAP: Record<string, { text: string; cls: string }> = {
  easy: { text: '简单', cls: 'bg-green-100 text-green-700' },
  medium: { text: '中等', cls: 'bg-yellow-100 text-yellow-700' },
  hard: { text: '困难', cls: 'bg-red-100 text-red-700' },
};

const TYPE_MAP: Record<string, string> = {
  single: '单选',
  multiple: '多选',
  judge: '判断',
  fill: '填空',
};

export default function ExamForm({ exam, isOpen, onClose, onSave }: ExamFormProps) {
  const [formData, setFormData] = useState<ExamFormData>(emptyForm);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (exam) {
      setFormData({
        ...emptyForm,
        title: exam.title || '',
        description: exam.description || '',
        courseId: exam.courseId || '',
        courseName: (exam as any).courseName || '',
        duration: exam.duration || 60,
        passScore: exam.passScore || 60,
        totalScore: exam.totalScore || 100,
        questionCount: exam.questionCount || 0,
        selectedQuestions: (exam as any).questions || [],
        shuffleQuestions: (exam as any).shuffleQuestions || false,
        status: (exam.status === 'archived' ? 'draft' : exam.status) || 'draft',
        attempts: exam.attempts || 3,
      });
    } else {
      setFormData(emptyForm);
    }
    setError(null);
    loadBanks();
  }, [exam, isOpen]);

  const loadBanks = async () => {
    try {
      const result = await questionBankService.getList({ page: 1, pageSize: 100 });
      setBanks(safeGetList(result));
    } catch (error) {
      console.error('加载题库失败:', error);
    }
  };

  const set = <K extends keyof ExamFormData>(key: K, value: ExamFormData[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const addBankConfig = () => {
    const available = banks.filter(b => !formData.bankConfigs.some(c => c.bankId === b._id));
    if (available.length > 0) {
      const bank = available[0];
      setFormData(prev => ({
        ...prev,
        bankConfigs: [...prev.bankConfigs, { bankId: bank._id, bankName: bank.name, questionCount: 0 }],
      }));
    }
  };

  const removeBankConfig = (bankId: string) =>
    setFormData(prev => ({ ...prev, bankConfigs: prev.bankConfigs.filter(c => c.bankId !== bankId) }));

  const updateBankQuestionCount = (bankId: string, count: number) =>
    setFormData(prev => ({
      ...prev,
      bankConfigs: prev.bankConfigs.map(c => c.bankId === bankId ? { ...c, questionCount: count } : c),
    }));

  const generateQuestionsFromBanks = async () => {
    setError(null);
    if (formData.bankConfigs.length === 0) { setError('请先添加题库'); return; }
    const totalCount = formData.bankConfigs.reduce((s, c) => s + c.questionCount, 0);
    if (totalCount === 0) { setError('请设置每个题库的抽题数量'); return; }

    let allSelected: BankQuestion[] = [];
    for (const config of formData.bankConfigs) {
      if (config.questionCount === 0) continue;
      try {
        const questions = await questionBankService.getQuestions(config.bankId);
        if (questions.length === 0) { setError(`题库 "${config.bankName}" 中没有题目`); return; }
        if (config.questionCount > questions.length) {
          setError(`题库 "${config.bankName}" 只有 ${questions.length} 道题，无法抽取 ${config.questionCount} 道`);
          return;
        }
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        allSelected = [...allSelected, ...shuffled.slice(0, config.questionCount)];
      } catch {
        setError(`从题库 "${config.bankName}" 抽题失败`);
        return;
      }
    }
    if (formData.shuffleQuestions) allSelected = allSelected.sort(() => Math.random() - 0.5);
    setFormData(prev => ({ ...prev, selectedQuestions: allSelected, questionCount: allSelected.length }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.title.trim()) { setError('请输入试卷标题'); return; }
    if (!formData.courseId) { setError('请选择课程'); return; }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-xl font-bold text-gray-800">{exam ? '编辑试卷' : '创建试卷'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-purple-500" />基本信息
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">试卷标题 *</label>
              <input type="text" required value={formData.title}
                onChange={e => set('title', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="请输入试卷标题" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属课程 *</label>
                <select required value={formData.courseId}
                  onChange={e => setFormData(prev => ({ ...prev, courseId: e.target.value, courseName: e.target.options[e.target.selectedIndex].text.split(' (')[0] || '' }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white">
                  <option value="">请选择课程</option>
                  <option value="course1">无人机基础操作</option>
                  <option value="course2">飞行原理</option>
                  <option value="course3">法规知识</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">考试时长(分钟) *</label>
                <input type="number" required min={10} max={180} value={formData.duration}
                  onChange={e => set('duration', parseInt(e.target.value) || 60)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">试卷描述</label>
              <textarea value={formData.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                placeholder="请输入试卷描述" />
            </div>
          </div>

          {/* 分数设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-500" />分数设置
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">及格分数</label>
                <input type="number" required min={0} max={100} value={formData.passScore}
                  onChange={e => set('passScore', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">总分</label>
                <input type="number" required min={0} value={formData.totalScore}
                  onChange={e => set('totalScore', parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">考试次数</label>
                <input type="number" min={1} max={10} value={formData.attempts}
                  onChange={e => set('attempts', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="shuffle" checked={formData.shuffleQuestions}
                onChange={e => set('shuffleQuestions', e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
              <label htmlFor="shuffle" className="text-sm text-gray-700">随机排列题目顺序</label>
            </div>
          </div>

          {/* 题库配置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Database size={16} className="text-green-500" />
                题库配置
                <span className="text-sm text-gray-500">已选 {formData.questionCount} 题</span>
              </h3>
              <div className="flex gap-2">
                <button type="button" onClick={addBankConfig}
                  disabled={!banks || formData.bankConfigs.length >= banks.length}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  <Plus size={16} />添加题库
                </button>
                {formData.bankConfigs.length > 0 && (
                  <button type="button" onClick={generateQuestionsFromBanks}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <Layers size={16} />随机抽题
                  </button>
                )}
              </div>
            </div>

            {formData.bankConfigs.length > 0 ? (
              <div className="space-y-3">
                {formData.bankConfigs.map(config => {
                  const bank = banks?.find(b => b._id === config.bankId);
                  const availableCount = bank?.questionCount || 0;
                  return (
                    <div key={config.bankId} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">选择题库</label>
                          <select value={config.bankId}
                            onChange={e => {
                              const nb = banks.find(b => b._id === e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                bankConfigs: prev.bankConfigs.map(c =>
                                  c.bankId === config.bankId ? { ...c, bankId: e.target.value, bankName: nb?.name || '' } : c
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white">
                            {banks.filter(b => !formData.bankConfigs.some(c => c.bankId !== config.bankId && c.bankId === b._id))
                              .map(b => (
                                <option key={b._id} value={b._id}>{b.name} ({b.questionCount || 0} 题)</option>
                              ))}
                          </select>
                        </div>
                        <button type="button" onClick={() => removeBankConfig(config.bankId)}
                          className="ml-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">抽题数量 (最多 {availableCount} 题)</label>
                        <input type="number" min={0} max={availableCount} value={config.questionCount}
                          onChange={e => updateBankQuestionCount(config.bankId, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          placeholder={`0-${availableCount}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Database className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-2">还没有添加题库</p>
                <p className="text-xs text-gray-400">点击"添加题库"按钮，从多个题库中随机抽取题目</p>
              </div>
            )}

            {/* 已选题目预览 */}
            {formData.selectedQuestions.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">已生成题目 ({formData.selectedQuestions.length} 题)</h4>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, selectedQuestions: [], questionCount: 0 }))}
                    className="text-xs text-red-500 hover:text-red-600">清空题目</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {formData.selectedQuestions.map((question, index) => {
                    const diff = DIFFICULTY_MAP[question.difficulty || ''] || { text: question.difficulty, cls: 'bg-gray-100 text-gray-700' };
                    return (
                      <div key={String(question._id || `q-${index}`)} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex-1">
                          <span className="text-sm text-gray-800 font-medium">
                            {index + 1}. {(question.content || question.question || '').substring(0, 50)}...
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${diff.cls}`}>{diff.text}</span>
                            <span className="text-xs text-gray-500">{question.score || 1} 分</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{TYPE_MAP[question.type || ''] || '问答'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 -mx-6 -mb-6">
            <button type="button" onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors">取消</button>
            <button type="submit"
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}
