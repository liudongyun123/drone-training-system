// ============================================================================
// ExamList.tsx - 试卷列表管理
// ============================================================================
import {
  Plus, Edit, Trash2, Search, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '@/admin/components/StatusBadge';
import { useConfirm } from '@/admin/hooks/useConfirm';
import type { Exam } from '@/types';

interface ExamListProps {
  exams: Exam[];
  loading: boolean;
  total: number;
  page: number;
  keyword: string;
  statusFilter: 'all' | 'draft' | 'published';
  onPageChange: (page: number) => void;
  onKeywordChange: (keyword: string) => void;
  onStatusFilterChange: (filter: 'all' | 'draft' | 'published') => void;
  onCreate: () => void;
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => Promise<void>;
}

export default function ExamList({
  exams, loading, total, page, keyword, statusFilter,
  onPageChange, onKeywordChange, onStatusFilterChange,
  onCreate, onEdit, onDelete,
}: ExamListProps) {
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDelete = async (exam: Exam) => {
    const ok = await confirm({
      title: '删除确认',
      message: `确定要删除试卷「${exam.title}」吗？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (ok) {
      await onDelete(exam);
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* 搜索和操作栏 */}
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <form onSubmit={e => { e.preventDefault(); onPageChange(1); }} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="搜索试卷标题..." value={keyword}
                onChange={e => onKeywordChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
            </div>
          </form>

          <select value={statusFilter}
            onChange={e => { onStatusFilterChange(e.target.value as any); onPageChange(1); }}
            className="px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white">
            <option value="all">全部状态</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
          </select>

          <button onClick={onCreate}
            className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <Plus size={20} />创建试卷
          </button>
        </div>
      </div>

      {/* 试卷列表 */}
      {loading ? (
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
                      <StatusBadge groupKey="examStatus" statusKey={exam.status}
                        fallbackText={exam.status === 'published' ? '已发布' : '草稿'} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onEdit(exam)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="编辑">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(exam)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
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

      <ConfirmDialog />
    </div>
  );
}