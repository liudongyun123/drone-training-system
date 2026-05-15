// ============================================================================
// 体系管理页面 - 管理人社、CAAC等培训体系
// ============================================================================
import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { useConfirm } from '../../hooks/useConfirm';
import { adminService } from '@/services/adminService';

interface Source {
  _id?: string;
  code: string;
  name: string;
  icon: string;
  description?: string;
  sortOrder: number;
  status: 'active' | 'disabled';
}

// 体系配置
const DEFAULT_SOURCES: Source[] = [
  {
    code: 'RENSHE',
    name: '人社培训',
    icon: '🏛️',
    description: '人力资源和社会保障部认证的无人机培训体系',
    sortOrder: 1,
    status: 'active'
  },
  {
    code: 'CAAC',
    name: 'CAAC培训',
    icon: '✈️',
    description: '中国民用航空局认证的无人机驾驶员培训体系',
    sortOrder: 2,
    status: 'active'
  }
];

export default function AdminSources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Source>>({});
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const { confirm, ConfirmDialog } = useConfirm();

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 根据筛选状态构建查询条件
      const query: Record<string, any> = {};
      if (filterStatus !== 'all') {
        query.status = filterStatus;
      }
      const result = await adminService.listSources(query, { limit: 100 }) as unknown as { data: { list: Source[] } };
      if (result.data?.list && result.data.list.length > 0) {
        setSources(result.data.list);
      } else {
        setSources(DEFAULT_SOURCES);
      }
    } catch (error) {
      console.error('加载体系数据失败:', error);
      setSources(DEFAULT_SOURCES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  // 保存修改
  const handleSave = async () => {
    if (!editForm.code || !editForm.name) {
      alert('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      if (editingId === 'new') {
        // 新增
        await adminService.createSource({
          code: editForm.code,
          name: editForm.name,
          icon: editForm.icon || '📚',
          description: editForm.description || '',
          sortOrder: editForm.sortOrder || sources.length + 1,
          status: editForm.status || 'active',
          createdAt: new Date().toISOString()
        });
      } else if (editingId) {
        // 更新
        await adminService.updateSource(editingId, {
          code: editForm.code,
          name: editForm.name,
          icon: editForm.icon || '📚',
          description: editForm.description || '',
          sortOrder: editForm.sortOrder,
          status: editForm.status || 'active',
          updatedAt: new Date().toISOString()
        });
      }
      
      // 重新加载数据
      await loadData();
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '删除体系',
      message: '删除体系会影响该体系下的所有分类和课程，确定要删除吗？',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await adminService.deleteSource(id);
      setSources(sources.filter(s => s._id !== id));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 开始编辑
  const handleEdit = (source: Source) => {
    setEditingId(source._id || null);
    setEditForm({ ...source });
  };

  // 新增
  const handleAdd = () => {
    setEditingId('new');
    setEditForm({
      code: '',
      name: '',
      icon: '📚',
      description: '',
      sortOrder: sources.length + 1,
      status: 'active'
    });
  };

  // 取消编辑
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-slate-600" />
          <h1 className="text-2xl font-bold">体系管理</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* 状态筛选 */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            <option value="active">仅启用</option>
            <option value="disabled">仅停用</option>
          </select>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            新增体系
          </button>
        </div>
      </div>

      {/* 提示 */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">关于体系</p>
          <p className="mt-1">
            体系用于区分不同的培训来源，如人社培训、CAAC培训、国防教育等。每个体系有独立的分类和课程体系。
            新增课程、培训班或分类时需要选择所属体系。
            小程序端会动态从数据库加载所有启用的体系。
          </p>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">图标</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">体系名称</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">代码</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">描述</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">排序</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">状态</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">加载中...</td>
              </tr>
            ) : sources.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">暂无数据</td>
              </tr>
            ) : (
              <>
                {/* 新增行 */}
                {editingId === 'new' && (
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editForm.icon || ''}
                        onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                        className="w-16 px-2 py-1 text-center border rounded"
                        placeholder="图标"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-32 px-2 py-1 border rounded"
                        placeholder="体系名称"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editForm.code || ''}
                        onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                        className="w-24 px-2 py-1 border rounded font-mono text-sm"
                        placeholder="代码"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-48 px-2 py-1 border rounded"
                        placeholder="描述"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={editForm.sortOrder || 0}
                        onChange={e => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) })}
                        className="w-16 px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={editForm.status || 'active'}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="active">启用</option>
                        <option value="disabled">停用</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {/* 现有数据行 */}
                {sources.map(source => (
                  <tr key={source._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {editingId === source._id ? (
                        <input
                          type="text"
                          value={editForm.icon || ''}
                          onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                          className="w-16 px-2 py-1 text-center border rounded"
                          placeholder="图标"
                        />
                      ) : (
                        <span className="text-2xl">{source.icon}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === source._id ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-32 px-2 py-1 border rounded"
                          placeholder="体系名称"
                        />
                      ) : (
                        <span className="font-medium text-slate-900">{source.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === source._id ? (
                        <input
                          type="text"
                          value={editForm.code || ''}
                          onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                          className="w-24 px-2 py-1 border rounded font-mono text-sm"
                          placeholder="代码"
                        />
                      ) : (
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded">{source.code}</code>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === source._id ? (
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-48 px-2 py-1 border rounded"
                          placeholder="描述"
                        />
                      ) : (
                        <span className="text-sm text-slate-500">{source.description}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === source._id ? (
                        <input
                          type="number"
                          value={editForm.sortOrder || 0}
                          onChange={e => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) })}
                          className="w-16 px-2 py-1 border rounded"
                        />
                      ) : (
                        <span className="text-sm text-slate-500">{source.sortOrder}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === source._id ? (
                        <select
                          value={editForm.status || 'active'}
                          onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="active">启用</option>
                          <option value="disabled">停用</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          source.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {source.status === 'active' ? '启用' : '停用'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === source._id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(source)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(source._id!)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog />
    </div>
  );
}