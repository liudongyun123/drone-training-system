// ============================================================================
// QuestionList.tsx - 题目列表管理（含批量导入）
// ============================================================================
import { useState } from 'react';
import {
  Edit, Trash2, Search, BookOpen, Database, ChevronLeft, ChevronRight, Upload,
} from 'lucide-react';
import { useDictionary } from '@/admin/hooks/useDictionary';
import { useConfirm } from '@/admin/hooks/useConfirm';
import QuestionImport from '@/components/admin/QuestionImport';
import type { BankQuestion, QuestionBank } from '@/types';

// 难度映射（用于字典未加载时的兜底）
const DIFFICULTY_FALLBACK: Record<string, { text: string; cls: string }> = {
  easy: { text: '简单', cls: 'bg-green-100 text-green-700' },
  medium: { text: '中等', cls: 'bg-yellow-100 text-yellow-700' },
  hard: { text: '困难', cls: 'bg-red-100 text-red-700' },
};

// 类型映射
const TYPE_MAP: Record<string, { text: string; cls: string }> = {
  single: { text: '单选', cls: 'bg-blue-100 text-blue-700' },
  multiple: { text: '多选', cls: 'bg-purple-100 text-purple-700' },
  judge: { text: '判断', cls: 'bg-green-100 text-green-700' },
  fill: { text: '填空', cls: 'bg-orange-100 text-orange-700' },
};

interface QuestionListProps {
  questions: BankQuestion[];
  loading: boolean;
  total: number;
  page: number;
  selectedBank: string;
  keyword: string;
  difficultyFilter: 'easy' | 'medium' | 'hard' | 'all';
  banks: QuestionBank[];
  onPageChange: (page: number) => void;
  onSelectedBankChange: (bankId: string) => void;
  onKeywordChange: (keyword: string) => void;
  onDifficultyFilterChange: (filter: 'easy' | 'medium' | 'hard' | 'all') => void;
  onEdit: (question: BankQuestion) => void;
  onDelete: (question: BankQuestion) => Promise<void>;
  onImport: (questions: any[]) => Promise<void>;
  importing: boolean;
  importProgress: { current: number; total: number; success: number; failed: number };
}

export default function QuestionList({
  questions, loading, total, page, selectedBank, keyword, difficultyFilter, banks,
  onPageChange, onSelectedBankChange, onKeywordChange, onDifficultyFilterChange,
  onEdit, onDelete, onImport, importing, importProgress,
}: QuestionListProps) {
  const [showImportModal, setShowImportModal] = useState(false);

  const { confirm, ConfirmDialog } = useConfirm();
  const { options: difficultyOptions } = useDictionary({ groupKey: 'questionBankLevels' });

  const handleDelete = async (question: BankQuestion) => {
    const ok = await confirm({
      title: '删除确认',
      message: '确定要删除此题目吗？此操作不可撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (ok) {
      await onDelete(question);
    }
  };

  const handleImport = async (questionsData: any[]) => {
    await onImport(questionsData);
    setShowImportModal(false);
  };

  const totalPages = Math.ceil(total / 10);

  // 获取难度显示
  const getDifficultyBadge = (difficulty: string) => {
    // 尝试从字典获取
    const dictOption = difficultyOptions.find(opt => opt.value === difficulty);
    if (dictOption) {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${dictOption.color || DIFFICULTY_FALLBACK[difficulty]?.cls || 'bg-gray-100 text-gray-700'}`}>
          {dictOption.label}
        </span>
      );
    }
    // 兜底
    const fallback = DIFFICULTY_FALLBACK[difficulty] || { text: difficulty, cls: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${fallback.cls}`}>
        {fallback.text}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* 搜索和操作栏 */}
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* 题库选择器 */}
          <div className="w-full md:w-64">
            <select value={selectedBank}
              onChange={e => { onSelectedBankChange(e.target.value); onPageChange(1); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none">
              <option value="">请选择题库</option>
              {banks.map(bank => (
                <option key={bank._id} value={bank._id}>
                  {bank.name} ({(bank as any).questions?.length || bank.questionCount || 0} 题)
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={e => { e.preventDefault(); onPageChange(1); }} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="搜索题目内容..." value={keyword}
                onChange={e => onKeywordChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                disabled={!selectedBank} />
            </div>
          </form>

          <select value={difficultyFilter}
            onChange={e => { onDifficultyFilterChange(e.target.value as any); onPageChange(1); }}
            className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            disabled={!selectedBank}>
            <option value="all">全部难度</option>
            {difficultyOptions.length > 0 ? (
              difficultyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
            ) : (
              <>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </>
            )}
          </select>

          <button onClick={() => setShowImportModal(true)} disabled={!selectedBank}
            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
            <Upload size={20} />批量导入
          </button>
        </div>
      </div>

      {/* 题库未选择提示 */}
      {!selectedBank ? (
        <div className="text-center py-16 text-gray-500">
          <Database className="mx-auto mb-4 text-gray-300" size={64} />
          <p className="text-lg font-medium text-gray-600 mb-1">请先选择题库</p>
          <p className="text-gray-400">选择题库后即可管理题目</p>
        </div>
      ) : loading ? (
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
                {questions.map((question, idx) => {
                  const typeInfo = TYPE_MAP[question.type || ''] || { text: '问答', cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={String(question._id || `q-${idx}`)} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-md">
                          <p className="text-gray-800 font-medium">{question.question || question.content}</p>
                          {question.options && question.options.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                              {question.options.map((option, optIdx) => (
                                <div key={optIdx}>{String.fromCharCode(65 + optIdx)}. {option}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeInfo.cls}`}>
                          {typeInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getDifficultyBadge(question.difficulty || 'medium')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {question.score || 1} 分
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => onEdit(question)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="编辑">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDelete(question)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {total > 10 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">共 {total} 条记录，第 {page} / {totalPages} 页</span>
              <div className="flex gap-2">
                <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors">
                  <ChevronLeft size={16} />上一页
                </button>
                <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 transition-colors">
                  下一页<ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 题目导入弹窗 */}
      {showImportModal && (
        <QuestionImport
          onImport={handleImport}
          onClose={() => { if (!importing) setShowImportModal(false); }}
          isImporting={importing}
          importProgress={importProgress}
        />
      )}

      {/* 确认弹窗 */}
      <ConfirmDialog />
    </div>
  );
}