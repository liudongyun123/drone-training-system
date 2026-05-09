// ============================================================================
// 等级管理页面 - 按体系管理等级（如：人社初级工、CAAC视距内驾驶员）
// ============================================================================
import { useState, useEffect } from 'react';
import { Award, Plus, Edit, Trash2, X, Check, AlertCircle, Filter } from 'lucide-react';
import { useConfirm } from '../../hooks/useConfirm';
import { cloudbaseApp } from '@/utils/cloudbase';

interface Level {
  _id?: string;
  sourceCode: string;      // 体系代码：RENSHE, CAAC
  sourceId?: string;       // 体系ID
  name: string;            // 等级名称
  code: string;            // 等级代码
  description?: string;    // 描述
  sortOrder: number;      // 排序
  status: 'active' | 'disabled';
}

interface Source {
  _id?: string;
  code: string;
  name: string;
  icon: string;
}

export default function AdminLevels() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Level>>({});
  const [saving, setSaving] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>(''); // 体系筛选
  const { confirm, ConfirmDialog } = useConfirm();

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const db = cloudbaseApp.database();
      
      // 加载体系列表
      const sourcesResult = await db.collection('sources')
        .where({ status: 'active' })
        .orderBy('sortOrder', 'asc')
        .get();
      
      if (sourcesResult.data && sourcesResult.data.length > 0) {
        setSources(sourcesResult.data);
      }
      
      // 加载等级列表
      const levelsResult = await db.collection('levels')
        .orderBy('sourceCode', 'asc')
        .orderBy('sortOrder', 'asc')
        .get();
      
      if (levelsResult.data && levelsResult.data.length > 0) {
        setLevels(levelsResult.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 根据筛选获取显示的等级
  const getFilteredLevels = () => {
    if (!sourceFilter) return levels;
    return levels.filter(l => l.sourceCode === sourceFilter);
  };

  // 获取体系名称
  const getSourceName = (sourceCode: string) => {
    const source = sources.find(s => s.code === sourceCode);
    return source ? source.name : sourceCode;
  };

  // 保存修改
  const handleSave = async () => {
    if (!editForm.sourceCode || !editForm.name || !editForm.code) {
      alert('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      const db = cloudbaseApp.database();
      const source = sources.find(s => s.code === editForm.sourceCode);
      
      const levelData = {
        sourceCode: editForm.sourceCode,
        sourceId: source?._id || '',
        name: editForm.name,
        code: editForm.code,
        description: editForm.description || '',
        sortOrder: editForm.sortOrder || 1,
        status: editForm.status || 'active',
        updatedAt: new Date().toISOString()
      };

      if (editingId === 'new') {
        levelData.createdAt = new Date().toISOString();
        await db.collection('levels').add({ data: levelData });
      } else if (editingId) {
        await db.collection('levels').doc(editingId).update({ data: levelData });
      }
      
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
  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: '删除等级',
      message: `确定要删除等级"${name}"吗？删除后相关课程/培训班将失去等级关联。`,
      variant: 'danger'
    });
    if (!ok) return;

    try {
      const db = cloudbaseApp.database();
      await db.collection('levels').doc(id).remove();
      setLevels(levels.filter(l => l._id !== id));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  // 开始编辑
  const handleEdit = (level: Level) => {
    setEditingId(level._id || null);
    setEditForm({ ...level });
  };

  // 新增
  const handleAdd = () => {
    setEditingId('new');
    setEditForm({
      sourceCode: sourceFilter || (sources[0]?.code || ''),
      name: '',
      code: '',
      description: '',
      sortOrder: levels.filter(l => !sourceFilter || l.sourceCode === sourceFilter).length + 1,
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
          <Award className="w-6 h-6 text-slate-600" />
          <h1 className="text-2xl font-bold">等级管理</h1>
        </div>
        <button
          onClick={handleAdd}
          disabled={sources.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          新增等级
        </button>
      </div>

      {/* 提示 */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">关于等级管理</p>
          <p className="mt-1">
            等级是体系下的认证级别，如人社培训有初级工/中级工/高级工等级，
            CAAC培训有视距内驾驶员/超视距驾驶员/教员等级。
            课程和培训班可以关联到相应的等级。
          </p>
        </div>
      </div>

      {/* 体系筛选 */}
      <div className="mb-4 flex items-center gap-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <span className="text-sm text-slate-600">按体系筛选：</span>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm"
        >
          <option value="">全部体系</option>
          {sources.map(source => (
            <option key={source.code} value={source.code}>
              {source.icon} {source.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          共 {getFilteredLevels().length} 个等级
        </span>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">所属体系</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">等级名称</th>
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
            ) : getFilteredLevels().length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  {sourceFilter ? '该体系下暂无等级，请点击"新增等级"添加' : '暂无数据'}
                </td>
              </tr>
            ) : (
              getFilteredLevels().map(level => (
                <tr key={level._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    {editingId === level._id ? (
                      <select
                        value={editForm.sourceCode || ''}
                        onChange={e => {
                          const source = sources.find(s => s.code === e.target.value);
                          setEditForm({ ...editForm, sourceCode: e.target.value, sourceId: source?._id });
                        }}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        {sources.map(source => (
                          <option key={source.code} value={source.code}>
                            {source.icon} {source.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-slate-600">
                        {sources.find(s => s.code === level.sourceCode)?.icon} {getSourceName(level.sourceCode)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === level._id ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-32 px-2 py-1 border rounded"
                        placeholder="等级名称"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{level.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === level._id ? (
                      <input
                        type="text"
                        value={editForm.code || ''}
                        onChange={e => setEditForm({ ...editForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        className="w-24 px-2 py-1 border rounded text-sm"
                        placeholder="如: beginner"
                      />
                    ) : (
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">{level.code}</code>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === level._id ? (
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-40 px-2 py-1 border rounded text-sm"
                        placeholder="描述"
                      />
                    ) : (
                      <span className="text-sm text-slate-500">{level.description || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === level._id ? (
                      <input
                        type="number"
                        value={editForm.sortOrder || 1}
                        onChange={e => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 1 })}
                        className="w-16 px-2 py-1 border rounded text-center"
                        min={1}
                      />
                    ) : (
                      <span className="text-sm text-slate-500">{level.sortOrder}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === level._id ? (
                      <select
                        value={editForm.status || 'active'}
                        onChange={e => setEditForm({ ...editForm, status: e.target.value as 'active' | 'disabled' })}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="active">启用</option>
                        <option value="disabled">禁用</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        level.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {level.status === 'active' ? '启用' : '禁用'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === level._id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(level)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(level._id!, level.name)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog />
    </div>
  );
}
