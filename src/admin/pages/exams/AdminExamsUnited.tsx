// ============================================================================
// 管理后台 - 考试和题库管理(整合版)
// 功能：试卷管理(从题库抽题)、题库管理、题目管理
// ============================================================================
import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Search, FileText, Database,
  ChevronLeft, ChevronRight, X, Layers,
  BookOpen, AlertCircle, Upload
} from 'lucide-react';
import { examService, questionBankService } from '@/services/database';
import { examService as examServiceDirect } from '@/services/examService';
import QuestionImport from '@/components/admin/QuestionImport';
import { safeGetList, safeGetTotal } from '@/utils/safeData';
import type { Exam, QuestionBank, BankQuestion } from '@/types';

// ==================== 类型定义 ====================

interface ExamFormData {
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
  // 新增：题库配置
  bankConfigs: Array<{
    bankId: string;
    bankName: string;
    questionCount: number;
  }>;
}

interface BankFormData {
  name: string;
  description: string;
  category: string;
  courseIds: string[];
  status: 'active' | 'inactive';
}

// ==================== 试卷管理 ====================

interface ExamModalProps {
  exam?: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Exam>) => void;
}

function ExamModal({ exam, isOpen, onClose, onSave }: ExamModalProps) {
  const [formData, setFormData] = useState<ExamFormData>({
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
  });

  const [banks, setBanks] = useState<QuestionBank[]>([]);

  useEffect(() => {
    if (exam) {
      setFormData({
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
        bankConfigs: [], // 编辑时清空题库配置，重新生成
      });
    } else {
      setFormData({
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
        bankConfigs: [], // 新建时初始化为空数组
      });
    }
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

  // 添加题库配置
  const addBankConfig = () => {
    const availableBanks = banks.filter(
      bank => !formData.bankConfigs.some(config => config.bankId === bank._id)
    );
    if (availableBanks.length > 0) {
      const bank = availableBanks[0];
      setFormData(prev => ({
        ...prev,
        bankConfigs: [...prev.bankConfigs, {
          bankId: bank._id,
          bankName: bank.name,
          questionCount: 0,
        }],
      }));
    }
  };

  // 删除题库配置
  const removeBankConfig = (bankId: string) => {
    setFormData(prev => ({
      ...prev,
      bankConfigs: prev.bankConfigs.filter(config => config.bankId !== bankId),
    }));
  };

  // 更新题库题目数量
  const updateBankQuestionCount = (bankId: string, count: number) => {
    setFormData(prev => ({
      ...prev,
      bankConfigs: prev.bankConfigs.map(config =>
        config.bankId === bankId ? { ...config, questionCount: count } : config
      ),
    }));
  };

  // 从题库随机抽题
  const generateQuestionsFromBanks = async () => {
    if (formData.bankConfigs.length === 0) {
      alert('请先添加题库');
      return;
    }

    const totalCount = formData.bankConfigs.reduce((sum, config) => sum + config.questionCount, 0);
    if (totalCount === 0) {
      alert('请设置每个题库的抽题数量');
      return;
    }

    let allSelectedQuestions: BankQuestion[] = [];

    for (const config of formData.bankConfigs) {
      if (config.questionCount === 0) continue;

      try {
        const questions = await questionBankService.getQuestions(config.bankId);
        if (questions.length === 0) {
          alert(`题库 "${config.bankName}" 中没有题目`);
          return;
        }

        if (config.questionCount > questions.length) {
          alert(`题库 "${config.bankName}" 只有 ${questions.length} 道题目，无法抽取 ${config.questionCount} 道`);
          return;
        }

        // 随机打乱并抽取指定数量
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, config.questionCount);
        allSelectedQuestions = [...allSelectedQuestions, ...selected];
      } catch (error) {
        console.error(`从题库 ${config.bankName} 抽题失败:`, error);
        alert(`从题库 "${config.bankName}" 抽题失败`);
        return;
      }
    }

    // 如果需要再次随机打乱整体顺序
    if (formData.shuffleQuestions) {
      allSelectedQuestions = allSelectedQuestions.sort(() => Math.random() - 0.5);
    }

    // 更新表单
    setFormData(prev => ({
      ...prev,
      selectedQuestions: allSelectedQuestions,
      questionCount: allSelectedQuestions.length,
    }));

    alert(`✅ 成功从题库中随机抽取 ${allSelectedQuestions.length} 道题目`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const examData = {
      ...formData,
      questions: formData.selectedQuestions.map(q => q._id),
    };
    onSave(examData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
          <h2 className="text-xl font-bold text-gray-800">
            {exam ? '编辑试卷' : '创建试卷'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-purple-500" />
              基本信息
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">试卷标题 *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="请输入试卷标题"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属课程 *</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={e => setFormData(prev => ({ ...prev, courseId: e.target.value, courseName: e.target.options[e.target.selectedIndex].text.split(' (')[0] || '' }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white"
                >
                  <option value="">请选择课程</option>
                  <option value="course1">无人机基础操作</option>
                  <option value="course2">飞行原理</option>
                  <option value="course3">法规知识</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">考试时长(分钟) *</label>
                <input
                  type="number"
                  required
                  min={10}
                  max={180}
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">试卷描述</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                placeholder="请输入试卷描述"
              />
            </div>
          </div>

          {/* 分数设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-blue-500" />
              分数设置
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">及格分数</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={formData.passScore}
                  onChange={e => setFormData(prev => ({ ...prev, passScore: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">总分</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.totalScore}
                  onChange={e => setFormData(prev => ({ ...prev, totalScore: parseInt(e.target.value) || 100 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">考试次数</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.attempts}
                  onChange={e => setFormData(prev => ({ ...prev, attempts: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="shuffle"
                checked={formData.shuffleQuestions}
                onChange={e => setFormData(prev => ({ ...prev, shuffleQuestions: e.target.checked }))}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <label htmlFor="shuffle" className="text-sm text-gray-700">随机排列题目顺序</label>
            </div>
          </div>

          {/* 题库配置 - 随机抽题 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Database size={16} className="text-green-500" />
                题库配置
                <span className="text-sm text-gray-500">已选 {formData.questionCount} 题</span>
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addBankConfig}
                  disabled={!banks || formData.bankConfigs.length >= banks.length}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  添加题库
                </button>
                {formData.bankConfigs.length > 0 && (
                  <button
                    type="button"
                    onClick={generateQuestionsFromBanks}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Layers size={16} />
                    随机抽题
                  </button>
                )}
              </div>
            </div>

            {/* 题库配置列表 */}
            {formData.bankConfigs.length > 0 ? (
              <div className="space-y-3">
                {formData.bankConfigs.map((config) => {
                  const bank = banks?.find(b => b._id === config.bankId);
                  const availableCount = bank?.questionCount || 0;

                  return (
                    <div key={config.bankId} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">选择题库</label>
                          <select
                            value={config.bankId}
                            onChange={(e) => {
                              const newBankId = e.target.value;
                              const newBank = banks.find(b => b._id === newBankId);
                              setFormData(prev => ({
                                ...prev,
                                bankConfigs: prev.bankConfigs.map(c =>
                                  c.bankId === config.bankId
                                    ? { ...c, bankId: newBankId, bankName: newBank?.name || '' }
                                    : c
                                ),
                              }));
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white"
                          >
                            {banks && banks
                              .filter(b => !formData.bankConfigs.some(c => c.bankId !== config.bankId && c.bankId === b._id))
                              .map(bank => (
                                <option key={bank._id} value={bank._id}>
                                  {bank.name} ({bank.questionCount || 0} 题)
                                </option>
                              ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBankConfig(config.bankId)}
                          className="ml-4 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          抽题数量 (最多 {availableCount} 题)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={availableCount}
                          value={config.questionCount}
                          onChange={(e) => updateBankQuestionCount(config.bankId, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          placeholder={`0-${availableCount}`}
                        />
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
                  <h4 className="text-sm font-medium text-gray-700">
                    已生成题目 ({formData.selectedQuestions.length} 题)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, selectedQuestions: [], questionCount: 0 }))}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    清空题目
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {formData.selectedQuestions.map((question, index) => (
                    <div
                      key={String(question._id || `q-${index}`)}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex-1">
                        <span className="text-sm text-gray-800 font-medium">
                          {index + 1}. {(question.content || question.question || '').substring(0, 50)}...
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难'}
                          </span>
                          <span className="text-xs text-gray-500">{question.score || 1} 分</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {question.type === 'single' ? '单选' :
                         question.type === 'multiple' ? '多选' :
                         question.type === 'judge' ? '判断' :
                         question.type === 'fill' ? '填空' : '问答'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== 题库弹窗 ====================

interface BankModalProps {
  bank?: QuestionBank | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<QuestionBank>) => void;
}

function BankModal({ bank, isOpen, onClose, onSave }: BankModalProps) {
  const [formData, setFormData] = useState<BankFormData>({
    name: '',
    description: '',
    category: '综合练习',
    courseIds: [],
    status: 'active',
  });

  useEffect(() => {
    if (bank) {
      setFormData({
        name: bank.name || '',
        description: bank.description || '',
        category: bank.category || '综合练习',
        courseIds: bank.courseIds || [],
        status: bank.status || 'active',
      });
    }
  }, [bank, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
          <h2 className="text-xl font-bold text-gray-800">
            {bank ? '编辑题库' : '创建题库'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题库名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="请输入题库名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题库分类</label>
            <select
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
            >
              <option value="无人机法规">无人机法规</option>
              <option value="飞行原理">飞行原理</option>
              <option value="安全操作">安全操作</option>
              <option value="气象知识">气象知识</option>
              <option value="应急处理">应急处理</option>
              <option value="综合练习">综合练习</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题库描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
              placeholder="请输入题库描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={formData.status}
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
            >
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function AdminExamsUnited() {
  const [activeTab, setActiveTab] = useState<'exams' | 'questionBanks' | 'questions'>('exams');
  
  // 试卷管理状态
  const [exams, setExams] = useState<Exam[]>([]);
  const [examLoading, setExamLoading] = useState(true);
  const [examTotal, setExamTotal] = useState(0);
  const [examPage, setExamPage] = useState(1);
  const [examKeyword, setExamKeyword] = useState('');
  const [examStatus, setExamStatus] = useState<'all' | 'draft' | 'published'>('all');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  
  // 题库管理状态
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankPage, setBankPage] = useState(1);
  const [bankKeyword, setBankKeyword] = useState('');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  
  // 题目管理状态
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsKeyword, setQuestionsKeyword] = useState('');
  const [selectedBankForQuestions, setSelectedBankForQuestions] = useState('');
  
  // 题目弹窗状态
  const [_isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [_editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [questionDifficulty, setQuestionDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');

  // 加载题目列表
  const loadQuestions = async () => {
    if (!selectedBankForQuestions) {
      setQuestions([]);
      setQuestionsTotal(0);
      return;
    }
    
    setQuestionsLoading(true);
    try {
      const result = await examServiceDirect.getQuestions(selectedBankForQuestions);
      setQuestions(safeGetList(result));
      setQuestionsTotal(safeGetTotal(result));
    } catch (error) {
      console.error('加载题目列表失败:', error);
      setQuestions([]);
      setQuestionsTotal(0);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // 加载试卷列表
  const loadExams = async () => {
    setExamLoading(true);
    try {
      const query: any = {};
      if (examStatus !== 'all') {
        query.status = examStatus;
      }
      if (examKeyword) {
        query.title = new RegExp(examKeyword, 'i');
      }

      const result = await examService.getList({
        keyword: examKeyword,
        status: examStatus,
        page: examPage,
        pageSize: 10,
      } as any);

      setExams(safeGetList(result));
      setExamTotal(safeGetTotal(result));
    } catch (error) {
      console.error('加载试卷列表失败:', error);
      setExams([]);
      setExamTotal(0);
    } finally {
      setExamLoading(false);
    }
  };

  // 加载题库列表
  const loadBanks = async () => {
    setBankLoading(true);
    try {
      console.log('📚 开始加载题库列表...');
      
      const query: any = {};
      if (bankKeyword) {
        query.name = new RegExp(bankKeyword, 'i');
      }

      const result = await questionBankService.getList({
        keyword: query,
        page: bankPage,
        pageSize: 10,
      });

      console.log('✅ 题库列表加载成功:', {
        list: safeGetList(result),
        total: safeGetTotal(result)
      });

      setBanks(safeGetList(result));
      setBankTotal(safeGetTotal(result));
    } catch (error) {
      console.error('❌ 加载题库失败:', error);
      setBanks([]);
      setBankTotal(0);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'exams') {
      loadExams();
    } else if (activeTab === 'questionBanks') {
      loadBanks();
    } else if (activeTab === 'questions' && selectedBankForQuestions) {
      loadQuestions();
    }
  }, [activeTab, examPage, bankPage, questionsPage, selectedBankForQuestions]);

  // 试卷操作
  const handleExamSave = async (data: Partial<Exam>) => {
    try {
      // 表单验证
      if (!data.title || data.title.trim() === '') {
        alert('请输入试卷标题');
        return;
      }
      
      if (!data.courseId || data.courseId.trim() === '') {
        alert('请选择课程');
        return;
      }
      
      // 准备保存数据
      const saveData = {
        ...data,
        // 确保数组字段不为undefined
        questions: (data as any).selectedQuestions || [],
        // 确保总分等于题目分数之和
        totalScore: data.totalScore || 100,
        // 确保题目数量正确
        questionCount: ((data as any).selectedQuestions || []).length,
      };

      let result;

      if (editingExam) {
        // 更新现有试卷
        const success = await examService.update(editingExam._id, saveData);
        result = { code: success ? 0 : -1, data: editingExam };
      } else {
        // 创建新试卷
        const newExam = await examService.create(saveData);
        if (newExam && newExam._id) {
          result = { code: 0, data: newExam };
        } else {
          result = { code: -1, message: '创建失败，未返回有效的ID' };
        }
      }

      // 检查操作结果
      if (result && result.code === 0) {
        setIsExamModalOpen(false);
        setEditingExam(null);
        await loadExams();

        // 显示成功提示
        alert(editingExam ? '更新成功' : '创建成功');
      } else {
        alert(result?.message || '操作失败，请重试');
      }
    } catch (error) {
      console.error('保存试卷失败:', error);

      // 详细错误提示
      let errorMsg = '保存失败，请重试';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMsg = '网络错误，请检查网络连接';
        } else if (error.message.includes('permission')) {
          errorMsg = '权限不足，无法保存数据';
        } else if (error.message.includes('duplicate')) {
          errorMsg = '该试卷已存在';
        } else {
          errorMsg = `保存失败: ${error.message}`;
        }
      }

      alert(errorMsg);
    }
  };

  const handleExamDelete = async (exam: Exam) => {
    if (!confirm(`确定要删除试卷「${exam.title}」吗?此操作不可撤销。`)) {
      return;
    }
    try {
      const result = await examService.delete(exam._id);
      
      if (result) {
        await loadExams();
        alert('删除成功');
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除试卷失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 题库操作
  const handleBankSave = async (data: Partial<QuestionBank>) => {
    try {
      // 表单验证
      if (!data.name || data.name.trim() === '') {
        alert('请输入题库名称');
        return;
      }
      
      // 准备保存数据
      const saveData = {
        ...data,
        // 确保数组字段不为undefined
        courseIds: data.courseIds || [],
        // 确保状态有默认值
        status: data.status || 'active',
        // 初始化题库关联的题目列表
        questions: (editingBank as any)?.questions || [],
      };

      let result;

      if (editingBank) {
        // 更新现有题库
        const success = await questionBankService.update(editingBank._id, saveData);
        result = { code: success ? 0 : -1, data: editingBank };
      } else {
        // 创建新题库
        const newBank = await questionBankService.create(saveData);
        // 检查返回值是否有效
        if (newBank && newBank._id) {
          result = { code: 0, data: newBank };
        } else {
          result = { code: -1, message: '创建失败，未返回有效的ID' };
        }
      }

      // 检查操作结果
      if (result && result.code === 0) {
        setIsBankModalOpen(false);
        setEditingBank(null);
        await loadBanks();
        
        // 显示成功提示
        alert(editingBank ? '更新成功' : '创建成功');
      } else {
        alert(result?.message || '操作失败，请重试');
      }
    } catch (error) {
      console.error('保存题库失败:', error);
      
      // 详细错误提示
      let errorMsg = '保存失败，请重试';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMsg = '网络错误，请检查网络连接';
        } else if (error.message.includes('permission')) {
          errorMsg = '权限不足，无法保存数据';
        } else if (error.message.includes('duplicate')) {
          errorMsg = '该题库已存在';
        } else {
          errorMsg = `保存失败: ${error.message}`;
        }
      }

      alert(errorMsg);
    }
  };

  const handleBankDelete = async (bank: QuestionBank) => {
    if (!confirm(`确定要删除题库「${bank.name}」吗?此操作不可撤销。`)) {
      return;
    }
    try {
      const result = await questionBankService.delete(bank._id);
      
      if (result) {
        await loadBanks();
        alert('删除成功');
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除题库失败:', error);
      alert('删除失败，请重试');
    }
  };
  
  // 题目管理操作
  // handleQuestionSave 已移除 - 使用内联逻辑
  
  const handleQuestionDelete = async (question: BankQuestion) => {
    if (!confirm('确定要删除此题目吗?此操作不可撤销。')) {
      return;
    }
    try {
      // 从题库中移除题目
      if (selectedBankForQuestions) {
        const bank = banks.find(b => b._id === selectedBankForQuestions);
        if (bank && (bank as any).questions) {
          const updatedQuestions = (bank as any).questions.filter((q: any) => q._id !== question._id);
          await questionBankService.update(bank._id, {
            questions: updatedQuestions
          } as any);
        }
      }
      
      await loadQuestions();
      alert('删除成功');
    } catch (error) {
      console.error('删除题目失败:', error);
      alert('删除失败，请重试');
    }
  };
  
  const handleImportQuestions = async (questions: any[]) => {
    try {
      if (!selectedBankForQuestions) {
        alert('请先选择题库');
        return;
      }

      setImporting(true);
      setImportProgress({ current: 0, total: questions.length, success: 0, failed: 0 });

      let successCount = 0;
      let failedCount = 0;
      const errorMessages: string[] = [];

      for (let i = 0; i < questions.length; i++) {
        try {
          const question = questions[i];

          // 转换题目格式以匹配 BankQuestion 接口
          const questionData: any = {
            bankId: selectedBankForQuestions,
            type: question.type,
            content: question.content || question.question,
            options: question.options,
            answer: question.answer,
            difficulty: question.difficulty || 'medium',
            score: question.score || 1,
            explanation: question.explanation || '',
            category: question.category || '',
          };

          // 使用 questionBankService.createQuestion 添加题目
          await questionBankService.createQuestion(questionData);
          successCount++;
        } catch (error: any) {
          failedCount++;
          const errorMsg = `第 ${i + 1} 题导入失败: ${error.message || '未知错误'}`;
          console.error(errorMsg, error);
          errorMessages.push(errorMsg);
        }

        // 更新进度
        setImportProgress({
          current: i + 1,
          total: questions.length,
          success: successCount,
          failed: failedCount,
        });
      }

      // 刷新题库的题目列表
      await loadQuestions();

      setImporting(false);
      setShowImportModal(false);

      // 显示导入结果
      if (failedCount === 0) {
        alert(`🎉 成功导入 ${successCount} 道题目！`);
      } else if (successCount === 0) {
        alert(`❌ 导入失败，${failedCount} 道题目全部导入失败。\n\n错误详情：\n${errorMessages.slice(0, 3).join('\n')}${errorMessages.length > 3 ? '\n...' : ''}`);
      } else {
        alert(`⚠️ 导入完成：成功 ${successCount} 道题目，失败 ${failedCount} 道题目。\n\n失败详情：\n${errorMessages.slice(0, 3).join('\n')}${errorMessages.length > 3 ? '\n...' : ''}`);
      }
    } catch (error: any) {
      console.error('导入题目失败:', error);
      setImporting(false);
      alert(`❌ 导入过程中发生错误：${error.message || '未知错误'}`);
    }
  };

  const getExamStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      draft: { text: '草稿', class: 'bg-gray-100 text-gray-700' },
      published: { text: '已发布', class: 'bg-green-100 text-green-700' },
    };
    const s = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.class}`}>{s.text}</span>;
  };

  const getBankStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      active: { text: '启用', class: 'bg-green-100 text-green-700' },
      inactive: { text: '禁用', class: 'bg-gray-100 text-gray-700' },
    };
    const s = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.class}`}>{s.text}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 面包屑 */}
        <nav className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center gap-2">
            <li><a href="/admin" className="hover:text-blue-600 transition-colors">管理后台</a></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">考试和题库管理</li>
          </ol>
        </nav>

        {/* 标题区域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">考试和题库管理</h1>
          <p className="text-gray-500">管理试卷、从题库抽选题目、题库维护</p>
        </div>

        {/* 标签页 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
          <div className="border-b">
            <div className="flex">
              {[
                { key: 'exams', label: '试卷管理', icon: FileText },
                { key: 'questionBanks', label: '题库管理', icon: Database },
                { key: 'questions', label: '题目管理', icon: BookOpen },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 试卷管理内容 */}
        {activeTab === 'exams' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* 搜索和操作栏 */}
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); setExamPage(1); loadExams(); }} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="搜索试卷标题..."
                      value={examKeyword}
                      onChange={e => setExamKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                </form>

                <select
                  value={examStatus}
                  onChange={e => { setExamStatus(e.target.value as any); setExamPage(1); }}
                  className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="all">全部状态</option>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                </select>

                <button
                  onClick={() => { setEditingExam(null); setIsExamModalOpen(true); }}
                  className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  创建试卷
                </button>
              </div>
            </div>

            {/* 试卷列表 */}
            {examLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FileText className="mx-auto mb-4 text-gray-300" size={64} />
                <p className="text-lg font-medium text-gray-600 mb-1">暂无试卷数据</p>
                <p className="text-gray-400">点击上方按钮创建新试卷</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">试卷信息</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">考试设置</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">题目统计</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {exams.map((exam, idx) => (
                        <tr key={String(exam._id || `exam-${idx}`)} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-800">{exam.title}</p>
                              <p className="text-sm text-gray-500">{(exam as any).courseName || exam.courseId}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="space-y-1">
                              <p>时长: {exam.duration} 分钟</p>
                              <p>及格: {exam.passScore} 分</p>
                              <p>考试次数: {exam.attempts} 次</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p>总题数: {exam.questionCount} 题</p>
                              <p>总分: {exam.totalScore} 分</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getExamStatusBadge(exam.status)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingExam(exam); setIsExamModalOpen(true); }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleExamDelete(exam)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                {examTotal > 10 && (
                  <div className="px-6 py-4 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      共 {examTotal} 条记录，第 {examPage} / {Math.ceil(examTotal / 10)} 页
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExamPage(p => Math.max(1, p - 1))}
                        disabled={examPage === 1}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft size={16} />
                        上一页
                      </button>
                      <button
                        onClick={() => setExamPage(p => p + 1)}
                        disabled={examPage >= Math.ceil(examTotal / 10)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        下一页
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 题库管理内容 */}
        {activeTab === 'questionBanks' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* 搜索和操作栏 */}
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); setBankPage(1); loadBanks(); }} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="搜索题库名称..."
                      value={bankKeyword}
                      onChange={e => setBankKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    />
                  </div>
                </form>

                <button
                  onClick={() => { setEditingBank(null); setIsBankModalOpen(true); }}
                  className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  创建题库
                </button>

                <button
                  onClick={loadBanks}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="刷新列表"
                >
                  <Layers size={20} />
                  刷新
                </button>
              </div>
            </div>

            {/* 题库列表 */}
            {bankLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            ) : banks.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Database className="mx-auto mb-4 text-gray-300" size={64} />
                <p className="text-lg font-medium text-gray-600 mb-1">暂无题库数据</p>
                <p className="text-gray-400">点击上方按钮创建新题库</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">题库名称</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">分类</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">题目数量</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {banks.map((bank, idx) => (
                        <tr key={String(bank._id || `bank-${idx}`)} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-800">{bank.name}</p>
                              <p className="text-sm text-gray-500">{bank.category}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800 font-bold">
                            {(bank as any).questions?.length || bank.questionCount || 0} 题
                          </td>
                          <td className="px-6 py-4">
                            {getBankStatusBadge(bank.status)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingBank(bank); setIsBankModalOpen(true); }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleBankDelete(bank)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                {bankTotal > 10 && (
                  <div className="px-6 py-4 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      共 {bankTotal} 条记录，第 {bankPage} / {Math.ceil(bankTotal / 10)} 页
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBankPage(p => Math.max(1, p - 1))}
                        disabled={bankPage === 1}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft size={16} />
                        上一页
                      </button>
                      <button
                        onClick={() => setBankPage(p => p + 1)}
                        disabled={bankPage >= Math.ceil(bankTotal / 10)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        下一页
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 题目管理内容 */}
        {activeTab === 'questions' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* 搜索和操作栏 */}
            <div className="p-6 border-b">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* 题库选择器 */}
                <div className="w-full md:w-64">
                  <select
                    value={selectedBankForQuestions}
                    onChange={e => { setSelectedBankForQuestions(e.target.value); setQuestionsPage(1); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  >
                    <option value="">请选择题库</option>
                    {banks.map(bank => (
                      <option key={bank._id} value={bank._id}>
                        {bank.name} ({(bank as any).questions?.length || bank.questionCount || 0} 题)
                      </option>
                    ))}
                  </select>
                </div>

                <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); setQuestionsPage(1); loadQuestions(); }} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="搜索题目内容..."
                      value={questionsKeyword}
                      onChange={e => setQuestionsKeyword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      disabled={!selectedBankForQuestions}
                    />
                  </div>
                </form>

                <select
                  value={questionDifficulty}
                  onChange={(e) => { setQuestionDifficulty(e.target.value as any); setQuestionsPage(1); }}
                  className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  disabled={!selectedBankForQuestions}
                >
                  <option value="all">全部难度</option>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>

                <button
                  onClick={() => setShowImportModal(true)}
                  disabled={!selectedBankForQuestions}
                  className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload size={20} />
                  批量导入
                </button>
              </div>
            </div>

            {/* 题库未选择提示 */}
            {!selectedBankForQuestions ? (
              <div className="text-center py-16 text-gray-500">
                <Database className="mx-auto mb-4 text-gray-300" size={64} />
                <p className="text-lg font-medium text-gray-600 mb-1">请先选择题库</p>
                <p className="text-gray-400">选择题库后即可管理题目</p>
              </div>
            ) : questionsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <BookOpen className="mx-auto mb-4 text-gray-300" size={64} />
                <p className="text-lg font-medium text-gray-600 mb-1">该题库暂无题目</p>
                <p className="text-gray-400">使用批量导入功能添加题目</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">题目内容</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">难度</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">分值</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {questions.map((question, idx) => (
                        <tr key={String(question._id || `q-${idx}`)} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <p className="text-gray-800 font-medium">{question.question}</p>
                              {question.options && question.options.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600 space-y-1">
                                  {question.options.map((option, idx) => (
                                    <div key={idx}>
                                      {String.fromCharCode(65 + idx)}. {option}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              question.type === 'single' ? 'bg-blue-100 text-blue-700' :
                              question.type === 'multiple' ? 'bg-purple-100 text-purple-700' :
                              question.type === 'judge' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {question.type === 'single' ? '单选' :
                               question.type === 'multiple' ? '多选' :
                               question.type === 'judge' ? '判断' : '填空'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {question.difficulty === 'easy' ? '简单' :
                               question.difficulty === 'medium' ? '中等' : '困难'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                            {question.score} 分
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setEditingQuestion(question); setIsQuestionModalOpen(true); }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleQuestionDelete(question)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                {questionsTotal > 10 && (
                  <div className="px-6 py-4 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      共 {questionsTotal} 条记录，第 {questionsPage} / {Math.ceil(questionsTotal / 10)} 页
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setQuestionsPage(p => Math.max(1, p - 1))}
                        disabled={questionsPage === 1}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft size={16} />
                        上一页
                      </button>
                      <button
                        onClick={() => setQuestionsPage(p => p + 1)}
                        disabled={questionsPage >= Math.ceil(questionsTotal / 10)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        下一页
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 弹窗组件 */}
        <ExamModal
          exam={editingExam}
          isOpen={isExamModalOpen}
          onClose={() => { setIsExamModalOpen(false); setEditingExam(null); }}
          onSave={handleExamSave}
        />

        <BankModal
          bank={editingBank}
          isOpen={isBankModalOpen}
          onClose={() => { setIsBankModalOpen(false); setEditingBank(null); }}
          onSave={handleBankSave}
        />

        {/* 题目导入弹窗 */}
        {showImportModal && (
          <QuestionImport
            onImport={handleImportQuestions}
            onClose={() => {
              if (!importing) {
                setShowImportModal(false);
              }
            }}
            isImporting={importing}
            importProgress={importProgress}
          />
        )}
      </div>
    </div>
  );
}
