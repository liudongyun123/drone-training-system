// ============================================================================
// 课程分类管理页面
// 使用 adminService 云函数访问数据库
// ============================================================================
import { useState, useEffect } from 'react';
import {
  FolderTree, Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight,
  Check, X, AlertTriangle
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { CourseCategory } from '@/services/categoryService';
import { toast } from '@/components/Toast';

// 来源选项（从 sources 表动态加载）
interface Source {
  _id?: string;
  code: string;
  name: string;
  icon?: string;
}

// 修正 adminService.list 返回类型
interface AdminListResult<T = any> {
  code: number;
  data: {
    list: T[];
    total: number;
    skip: number;
    limit: number;
  };
  message?: string;
}

// CRUD 操作返回类型（包含可选的 message）
interface AdminCRUDResult {
  code: number;
  message?: string;
  data?: { id?: string };
}

const DEFAULT_SOURCES: Source[] = [
  { code: 'RENSHE', name: '人社培训' },
  { code: 'CAAC', name: 'CAAC培训' },
];

const DEFAULT_CATEGORY: {
  name: string;
  code: string;
  icon: string;
  description: string;
  sort: number;
  status: 'active' | 'disabled';
  sourceId: string;
} = {
  name: '',
  code: '',
  icon: '',
  description: '',
  sort: 0,
  status: 'active',
  sourceId: '',
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [sources, setSources] = useState<Source[]>(DEFAULT_SOURCES);
  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('');  // 体系筛选
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(DEFAULT_CATEGORY);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 加载体系列表
  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    loadData();
  }, [statusFilter, sourceFilter]);

  const loadSources = async () => {
    try {
      const result = await adminService.listSources({ limit: 100 }) as unknown as AdminListResult<Source>;
      if (result.data?.list && result.data.list.length > 0) {
        setSources(result.data.list);
      }
    } catch (error) {
      console.error('加载体系列表失败:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminService.list('categories', {}, { limit: 100, orderBy: 'sort', order: 'asc' }) as unknown as AdminListResult<CourseCategory>;

      if (res.code === 0 && Array.isArray(res.data?.list)) {
        const list = res.data.list;
        setCategories(list);
        
        // 手动计算统计数据
        setStats({
          total: list.length,
          active: list.filter((c: CourseCategory) => c.status === 'active').length,
          disabled: list.filter((c: CourseCategory) => c.status === 'disabled').length,
        });
      } else {
        console.error('获取分类列表失败:', res);
        toast.error('获取分类列表失败');
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      toast.error('加载分类数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setEditingId(null);
    // 默认排序值为当前最大值+1
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sort || 0), 0);
    setFormData({ ...DEFAULT_CATEGORY, sort: maxSort + 1 });
    setShowModal(true);
  };

  const handleOpenEdit = (category: CourseCategory) => {
    setEditMode(true);
    setEditingId(category._id ?? null);
    setFormData({
      name: category.name,
      code: category.code,
      icon: category.icon || '',
      description: category.description || '',
      sort: category.sort || 0,
      status: category.status,
      sourceId: (category as { sourceId?: string }).sourceId || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.sourceId) {
      toast.error('请选择所属体系');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('请输入分类编码');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(formData.code)) {
      toast.error('编码只能包含小写字母、数字和下划线，且以字母开头');
      return;
    }

    try {
      setSubmitting(true);

      if (editMode && editingId) {
        const result = await adminService.update('categories', editingId, formData) as AdminCRUDResult;
        if (result.code === 0) {
          toast.success('分类更新成功');
        } else {
          toast.error(result.message || '更新失败');
          return;
        }
      } else {
        // 检查编码是否重复
        const exists = categories.some(c => c.code === formData.code.trim());
        if (exists) {
          toast.error('分类编码已存在');
          return;
        }
        const result = await adminService.add('categories', formData) as AdminCRUDResult;
        if (result.code === 0) {
          toast.success('分类创建成功');
        } else {
          toast.error(result.message || '创建失败');
          return;
        }
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('保存分类失败:', error);
      toast.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await adminService.delete('categories', id) as AdminCRUDResult;
      if (result.code === 0) {
        toast.success('分类删除成功');
        setDeleteConfirm(null);
        loadData();
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      toast.error('删除失败');
    }
  };

  const handleToggleStatus = async (category: CourseCategory) => {
    if (!category._id) return;
    const newStatus = category.status === 'active' ? 'disabled' : 'active';
    try {
      const result = await adminService.update('categories', category._id, { status: newStatus }) as AdminCRUDResult;
      if (result.code === 0) {
        toast.success(newStatus === 'active' ? '分类已启用' : '分类已禁用');
        loadData();
      } else {
        toast.error('状态切换失败');
      }
    } catch (error) {
      console.error('切换分类状态失败:', error);
      toast.error('状态切换失败');
    }
  };

  const handleMoveSort = async (category: CourseCategory, direction: 'up' | 'down') => {
    if (!category._id) return;
    const idx = categories.findIndex(c => c._id === category._id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const swapCategory = categories[swapIdx];
    if (!swapCategory._id) return;
    try {
      await Promise.all([
        adminService.update('categories', category._id, { sort: swapCategory.sort || swapIdx }),
        adminService.update('categories', swapCategory._id, { sort: category.sort || idx }),
      ]);
      loadData();
    } catch (error) {
      console.error('调整排序失败:', error);
      toast.error('调整排序失败');
    }
  };

  // 过滤分类
  const filteredCategories = categories.filter(c => {
    const matchSearch = !searchQuery || c.name.includes(searchQuery) || c.code.includes(searchQuery)
    const catSourceId = (c as { sourceId?: string }).sourceId
    const matchSource = !sourceFilter || catSourceId === sourceFilter
    return matchSearch && matchSource
  })

  // 统计卡片
  const statCards = [
    { label: '全部分类', value: stats.total, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
    { label: '已启用', value: stats.active, color: 'bg-green-500', light: 'bg-green-50 text-green-700' },
    { label: '已禁用', value: stats.disabled, color: 'bg-gray-400', light: 'bg-gray-50 text-gray-700' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">课程分类管理</h1>
          <p className="text-gray-500 mt-1">管理课程分类，支持排序和启用/禁用</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          新增分类
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.light} flex items-center justify-center`}>
                <FolderTree size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索分类名称或编码..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          {/* 体系筛选 */}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">全部体系</option>
            {sources.map(opt => (
              <option key={opt._id} value={opt._id}>{opt.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'all', label: '全部' },
              { value: 'active', label: '已启用' },
              { value: 'disabled', label: '已禁用' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setStatusFilter(item.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusFilter === item.value
                    ? 'bg-white text-blue-600 shadow-sm font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 分类列表 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 shadow-sm text-center">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 mt-3">加载中...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 shadow-sm text-center">
          <FolderTree size={40} className="mx-auto text-gray-300" />
          <p className="text-gray-500 mt-3">{searchQuery ? '没有匹配的分类' : '暂无分类数据'}</p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              创建第一个分类
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-12">排序</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">分类信息</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">编码</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">体系</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">状态</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">排序值</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-36">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCategories.map((category, idx) => (
                <tr key={category._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveSort(category, 'up')}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2L10 6H2L6 2Z" fill="currentColor"/></svg>
                      </button>
                      <button
                        onClick={() => handleMoveSort(category, 'down')}
                        disabled={idx === filteredCategories.length - 1}
                        className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 10L2 6H10L6 10Z" fill="currentColor"/></svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/')) ? (
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center overflow-hidden">
                          <img src={category.icon} alt="" className="w-6 h-6 object-cover" />
                        </div>
                      ) : category.icon ? (
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <span className="text-blue-500 text-sm font-medium">{category.icon}</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <FolderTree size={18} className="text-blue-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-mono">{category.code}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      (category as any).sourceId ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {sources.find(s => s._id === (category as any).sourceId)?.name || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleStatus(category)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        category.status === 'active'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {category.status === 'active' ? (
                        <><ToggleRight size={14} /> 启用</>
                      ) : (
                        <><ToggleLeft size={14} /> 禁用</>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500">{category.sort ?? idx}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(category._id || null)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editMode ? '编辑分类' : '新增分类'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 所属体系 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  所属体系 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sourceId}
                  onChange={e => setFormData({ ...formData, sourceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">请选择体系</option>
                  {sources.map(opt => (
                    <option key={opt._id} value={opt._id}>{opt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  分类名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：CAAC执照培训"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  分类编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：caac（小写字母开头，仅含小写字母/数字/下划线）"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  disabled={editMode}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {editMode && <p className="text-xs text-gray-400 mt-1">编码创建后不可修改</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  图标 URL
                </label>
                <input
                  type="text"
                  placeholder="分类图标的图片链接（可选）"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  描述
                </label>
                <textarea
                  placeholder="分类描述（可选）"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">排序值</label>
                  <input
                    type="number"
                    value={formData.sort}
                    onChange={e => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">越小越靠前</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'disabled' })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="active">启用</option>
                    <option value="disabled">禁用</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-500 text-sm mb-6">确定要删除这个分类吗？此操作不可撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
