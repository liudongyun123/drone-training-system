// ============================================================================
// QuestionBankList.tsx - 题库列表管理
// ============================================================================
import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Search, Database, ChevronLeft, ChevronRight, X, Layers,
} from 'lucide-react';
import { useDictionary } from '@/admin/hooks/useDictionary';
import { StatusBadge } from '@/admin/components/StatusBadge';
import { useConfirm } from '@/admin/hooks/useConfirm';
import type { QuestionBank } from '@/types';

export interface BankFormData {
  name: string;
  description: string;
  category: string;
  courseIds: string[];
  status: 'active' | 'inactive';
}

// 题库弹窗组件
function BankModal({
  bank,
  isOpen,
  onClose,
  onSave,
  categoryOptions,
}: {
  bank?: QuestionBank | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BankFormData) => void;
  categoryOptions: { value: string; label: string }[];
}) {
  const [formData, setFormData] = useState<BankFormData>({
    name: '',
    description: '',
    category: '',
    courseIds: [],
    status: 'active',
  });
  const [error, setError] = useState<string | null>(null);

  // 当 bank 或 isOpen 变化时初始化表单
  useEffect(() => {
    if (isOpen && bank) {
      setFormData({
        name: bank.name || '',
        description: bank.description || '',
        category: bank.category || categoryOptions[0]?.value || '',
        courseIds: bank.courseIds || [],
        status: bank.status || 'active',
      });
    } else if (isOpen) {
      setFormData({ name: '', description: '', category: categoryOptions[0]?.value || '', courseIds: [], status: 'active' });
    }
    setError(null);
  }, [bank, isOpen, categoryOptions]);

  const set = <K extends keyof BankFormData>(key: K, value: BankFormData[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) { setError('请输入题库名称'); return; }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50">
          <h2 className="text-xl font-bold text-gray-800">{bank ? '编辑题库' : '创建题库'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题库名称 *</label>
            <input type="text" required value={formData.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              placeholder="请输入题库名称" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题库分类</label>
            <select value={formData.category}
              onChange={e => set('category', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white">
              {categoryOptions.length > 0 ? (
                categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
              ) : (
                <>
                  <option value="无人机法规">无人机法规</option>
                  <option value="飞行原理">飞行原理</option>
                  <option value="安全操作">安全操作</option>
                  <option value="气象知识">气象知识</option>
                  <option value="应急处理">应急处理</option>
                  <option value="综合练习">综合练习</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题库描述</label>
            <textarea value={formData.description}
              onChange={e => set('description', e.target.value)} rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
              placeholder="请输入题库描述" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select value={formData.status}
              onChange={e => set('status', e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white">
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 -mx-6 -mb-6">
            <button type="button" onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors">取消</button>
            <button type="submit"
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface QuestionBankListProps {
  banks: QuestionBank[];
  loading: boolean;
  total: number;
  page: number;
  keyword: string;
  onPageChange: (page: number) => void;
  onKeywordChange: (keyword: string) => void;
  onRefresh: () => void;
  onSave: (data: BankFormData, editingBank: QuestionBank | null) => Promise<void>;
  onDelete: (bank: QuestionBank) => Promise<void>;
}

export default function QuestionBankList({
  banks, loading, total, page, keyword,
  onPageChange, onKeywordChange, onRefresh, onSave, onDelete,
}: QuestionBankListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);

  const { confirm, ConfirmDialog } = useConfirm();
  const { options: categoryOptions } = useDictionary({ groupKey: 'questionBankCategories' });

  const handleSave = async (data: BankFormData) => {
    await onSave(data, editingBank);
    setIsModalOpen(false);
    setEditingBank(null);
  };

  const handleDelete = async (bank: QuestionBank) => {
    const ok = await confirm({
      title: '删除确认',
      message: `确定要删除题库「${bank.name}」吗？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (ok) {
      await onDelete(bank);
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
              <input type="text" placeholder="搜索题库名称..." value={keyword}
                onChange={e => onKeywordChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
            </div>
          </form>

          <button onClick={() => { setEditingBank(null); setIsModalOpen(true); }}
            className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
            <Plus size={20} />创建题库
          </button>

          <button onClick={onRefresh}
            className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            title="刷新列表">
            <Layers size={20} />刷新
          </button>
        </div>
      </div>

      {/* 题库列表 */}
      {loading ? (
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
                        <p className="text-sm text-gray-500">{bank.description?.substring(0, 30) || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{bank.category || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-bold">
                      {(bank as any).questions?.length || bank.questionCount || 0} 题
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge groupKey="questionBankStatus" statusKey={bank.status}
                        fallbackText={bank.status === 'active' ? '启用' : '禁用'} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingBank(bank); setIsModalOpen(true); }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="编辑">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(bank)}
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

      {/* 弹窗 */}
      <BankModal
        bank={editingBank} isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBank(null); }}
        onSave={handleSave} categoryOptions={categoryOptions}
      />

      <ConfirmDialog />
    </div>
  );
}