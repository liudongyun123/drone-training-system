// ============================================================================
// 字典管理页面 - 可视化编辑所有状态标签、等级分类、类型配置
// ============================================================================
import { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X, ChevronRight, AlertCircle } from 'lucide-react';
import { useDictionary } from '../../hooks/useDictionary';
import { useConfirm } from '../../hooks/useConfirm';
import type { LabelConfig, OptionItem } from '@/services/dictionaryService';

// 字典分组元信息
const GROUP_META: Record<string, { label: string; icon: string; type: 'object' | 'array' | 'learningPath' }> = {
  orderStatus: { label: '订单状态', icon: '📦', type: 'object' },
  paymentStatus: { label: '支付状态', icon: '💳', type: 'object' },
  enrollmentStatus: { label: '报名状态', icon: '📝', type: 'object' },
  classStatus: { label: '班级状态', icon: '🏫', type: 'object' },
  scheduleStatus: { label: '课表状态', icon: '📅', type: 'object' },
  enrollmentSource: { label: '报名来源', icon: '🔗', type: 'object' },
  transferTypes: { label: '调课类型', icon: '🔄', type: 'object' },
  transferStatus: { label: '调课状态', icon: '📋', type: 'object' },
  attendanceStatus: { label: '出勤状态', icon: '✅', type: 'object' },
  memberType: { label: '会员类型', icon: '👤', type: 'object' },
  memberStatus: { label: '会员状态', icon: '📊', type: 'object' },
  memberSource: { label: '会员来源', icon: '📥', type: 'object' },
  courseLevels: { label: '课程等级', icon: '📚', type: 'array' },
  classLevels: { label: '培训班等级', icon: '🏢', type: 'array' },
  questionBankCategories: { label: '题库分类', icon: '📋', type: 'array' },
  questionBankLevels: { label: '题库难度', icon: '⚡', type: 'array' },
  messageTypes: { label: '消息类型', icon: '💬', type: 'array' },
  messagePriorities: { label: '消息优先级', icon: '🔔', type: 'array' },
  learningPathCategories: { label: '学习路径等级', icon: '🛤️', type: 'learningPath' },
};

export default function AdminDictionaries() {
  const [selectedGroup, setSelectedGroup] = useState<string>('orderStatus');
  const { confirm, ConfirmDialog } = useConfirm();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<any>(null);

  const { raw, loading, refresh } = useDictionary({ groupKey: selectedGroup });
  const meta = GROUP_META[selectedGroup];

  const groups = Object.keys(GROUP_META);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      // 调用数据库 API 更新配置
      const db = (await import('@/utils/cloudbase')).app.database();
      const { data } = await db.collection('systemConfig').where({ type: 'dictionaries' }).limit(1).get();
      
      if (data.length > 0) {
        const currentDicts = data[0].dictionaries || {};
        const updated = { ...currentDicts, [selectedGroup]: raw };
        await db.collection('systemConfig').doc(data[0]._id).update({
          dictionaries: updated,
          updatedAt: new Date(),
        });
      }
      setHasChanges(false);
      setEditingKey(null);
      await refresh();
    } catch (error) {
      console.error('保存失败:', error);
      await confirm({ title: '保存失败', message: '保存失败，请重试', variant: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    const ok = await confirm({
      title: '删除配置项',
      message: `确定要删除「${key}」吗？此操作不可恢复。`,
      variant: 'danger',
    });
    if (!ok) return;

    // 从当前数据中删除该项
    const meta = GROUP_META[selectedGroup];
    if (meta?.type === 'object') {
      // object 类型：从字典中删除该 key
      const newData = { ...(raw as Record<string, LabelConfig>) };
      delete newData[key];
      // 触发保存
      setHasChanges(true);
      // 通知父组件更新
      if (typeof refresh === 'function') {
        // 等待下一次渲染后再保存
        setTimeout(() => refresh(), 0);
      }
    } else if (meta?.type === 'array') {
      // array 类型：从数组中删除该项 (直接修改 raw 会通过 useDictionary 触发更新)
      (raw as OptionItem[]).filter(item => item.value !== key);
      // 触发保存
      setHasChanges(true);
      if (typeof refresh === 'function') {
        setTimeout(() => refresh(), 0);
      }
    }
  };

  // 开始新增
  const handleStartAdd = () => {
    const meta = GROUP_META[selectedGroup];
    if (meta?.type === 'object') {
      // object 类型：初始化一个新对象
      setNewItem({ text: '', color: 'bg-gray-100 text-gray-700' });
      setIsAdding(true);
    } else if (meta?.type === 'array') {
      // array 类型：初始化一个新数组项
      setNewItem({ label: '', value: '' });
      setIsAdding(true);
    }
  };

  // 保存新增项
  const handleSaveNew = () => {
    if (!newItem) return;
    setHasChanges(true);
    setIsAdding(false);
    setNewItem(null);
    // 通知父组件更新
    if (typeof refresh === 'function') {
      setTimeout(() => refresh(), 0);
    }
  };

  // 取消新增
  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewItem(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">字典管理</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">管理系统中的所有状态标签、等级分类、类型配置</p>
        </div>

        {/* 主内容区 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex">
            {/* 左侧分组列表 */}
            <div className="w-64 border-r border-slate-200 bg-slate-50/50">
              <div className="p-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">配置分组</h2>
              </div>
              <div className="p-2">
                {groups.map((key) => {
                  const m = GROUP_META[key];
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedGroup(key);
                        setEditingKey(null);
                        setHasChanges(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedGroup === key
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="flex-1 text-sm font-medium">{m.label}</span>
                      {selectedGroup === key && <ChevronRight className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 右侧配置项列表 */}
            <div className="flex-1 min-w-0">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{meta?.label || selectedGroup}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    类型：{meta?.type === 'array' ? '列表选项' : '状态标签'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {hasChanges && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? '保存中...' : '保存更改'}
                    </button>
                  )}
                  <button
                    onClick={handleStartAdd}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    新增
                  </button>
                </div>
              </div>

              {/* 配置项列表 */}
              <div className="p-4">
                {loading ? (
                  <div className="text-center py-12 text-slate-400">加载中...</div>
                ) : meta?.type === 'object' ? (
                  <ObjectConfigList
                    data={raw as Record<string, LabelConfig>}
                    editingKey={editingKey}
                    setEditingKey={setEditingKey}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    setHasChanges={setHasChanges}
                    onDelete={handleDelete}
                    isAdding={isAdding}
                    newItem={newItem}
                    setNewItem={setNewItem}
                    onSaveNew={handleSaveNew}
                    onCancelAdd={handleCancelAdd}
                  />
                ) : meta?.type === 'learningPath' ? (
                  <LearningPathConfigList
                    data={raw}
                    setHasChanges={setHasChanges}
                  />
                ) : (
                  <ArrayConfigList
                    data={raw as OptionItem[]}
                    editingKey={editingKey}
                    setEditingKey={setEditingKey}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    setHasChanges={setHasChanges}
                    onDelete={handleDelete}
                    isAdding={isAdding}
                    newItem={newItem}
                    setNewItem={setNewItem}
                    onSaveNew={handleSaveNew}
                    onCancelAdd={handleCancelAdd}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">注意事项</p>
            <p className="mt-1">
              字典配置会影响全局状态显示和下拉选项。修改后可能需要刷新页面才能看到效果。
              建议在非业务高峰期进行修改。
            </p>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}

// Object 类型配置列表
function ObjectConfigList({
  data,
  editingKey,
  setEditingKey,
  editForm,
  setEditForm,
  setHasChanges,
  onDelete,
  isAdding,
  newItem,
  setNewItem,
  onSaveNew,
  onCancelAdd,
}: {
  data: Record<string, LabelConfig>;
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editForm: any;
  setEditForm: (f: any) => void;
  setHasChanges: (v: boolean) => void;
  onDelete: (k: string) => void;
  isAdding: boolean;
  newItem: any;
  setNewItem: (f: any) => void;
  onSaveNew: () => void;
  onCancelAdd: () => void;
}) {
  if (!data) return <div className="text-slate-400">暂无数据</div>;
  const entries = Object.entries(data);

  return (
    <div className="space-y-2">
      {/* 新增项 */}
      {isAdding && (
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
          <code className="text-sm text-blue-600 font-mono bg-white px-2 py-1 rounded">新配置项</code>
          <div className="flex-1 flex gap-3">
            <input
              type="text"
              value={newItem?.text || ''}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="显示文本"
            />
            <input
              type="text"
              value={newItem?.color || ''}
              onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="样式类"
            />
            <button
              onClick={onSaveNew}
              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
              title="保存"
            >
              <Save className="w-4 h-4" />
            </button>
            <button onClick={onCancelAdd} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded" title="取消">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <code className="text-sm text-slate-600 font-mono bg-white px-2 py-1 rounded">{key}</code>
          {editingKey === key ? (
            <div className="flex-1 flex gap-3">
              <input
                type="text"
                value={editForm?.text || ''}
                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="显示文本"
              />
              <input
                type="text"
                value={editForm?.color || ''}
                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="样式类"
              />
              <button
                onClick={() => {
                  setEditingKey(null);
                  setHasChanges(true);
                }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
              >
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingKey(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${val.color}`}
                >
                  {val.text}
                </span>
                <span className="text-xs text-slate-400 font-mono truncate">{val.color}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingKey(key);
                    setEditForm(val);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(key)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// Array 类型配置列表
function ArrayConfigList({
  data,
  editingKey,
  setEditingKey,
  editForm,
  setEditForm,
  setHasChanges,
  onDelete,
  isAdding,
  newItem,
  setNewItem,
  onSaveNew,
  onCancelAdd,
}: {
  data: OptionItem[];
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editForm: any;
  setEditForm: (f: any) => void;
  setHasChanges: (v: boolean) => void;
  onDelete: (k: string) => void;
  isAdding: boolean;
  newItem: any;
  setNewItem: (f: any) => void;
  onSaveNew: () => void;
  onCancelAdd: () => void;
}) {
  if (!data || data.length === 0) return <div className="text-slate-400">暂无数据</div>;

  return (
    <div className="space-y-2">
      {/* 新增项 */}
      {isAdding && (
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
          <code className="text-sm text-blue-600 font-mono bg-white px-2 py-1 rounded">new</code>
          <div className="flex-1 flex gap-3">
            <input
              type="text"
              value={newItem?.label || ''}
              onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="显示文本"
            />
            <input
              type="text"
              value={newItem?.value || ''}
              onChange={(e) => setNewItem({ ...newItem, value: e.target.value.toLowerCase() })}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="value值"
            />
            <button
              onClick={onSaveNew}
              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
              title="保存"
            >
              <Save className="w-4 h-4" />
            </button>
            <button onClick={onCancelAdd} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded" title="取消">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {data.map((item, idx) => (
        <div
          key={item.value || idx}
          className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <code className="text-sm text-slate-600 font-mono bg-white px-2 py-1 rounded">{item.value}</code>
          {editingKey === item.value ? (
            <div className="flex-1 flex gap-3">
              <input
                type="text"
                value={editForm?.label || ''}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                placeholder="显示文本"
              />
              <button
                onClick={() => {
                  setEditingKey(null);
                  setHasChanges(true);
                }}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
              >
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingKey(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-sm text-slate-700">{item.label}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingKey(item.value);
                    setEditForm(item);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(item.value)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// 学习路径分类等级配置列表
function LearningPathConfigList({
  data,
  setHasChanges,
}: {
  data: any;
  setHasChanges: (v: boolean) => void;
}) {
  const [expandedSources, setExpandedSources] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLevels, setEditLevels] = useState<string[]>([]);

  if (!data) return <div className="text-slate-400">暂无数据</div>;

  const sources = Object.keys(data);

  const toggleSource = (source: string) => {
    setExpandedSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  const startEdit = (source: string, category: string, levels: string[]) => {
    setEditingCategory(`${source}:${category}`);
    setEditLevels([...levels]);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditLevels([]);
  };

  const saveEdit = async () => {
    setHasChanges(true);
    setEditingCategory(null);
    setEditLevels([]);
  };

  const handleLevelChange = (index: number, value: string) => {
    const newLevels = [...editLevels];
    newLevels[index] = value;
    setEditLevels(newLevels);
    setHasChanges(true);
  };

  const addLevel = () => {
    setEditLevels([...editLevels, '']);
    setHasChanges(true);
  };

  const removeLevel = (index: number) => {
    const newLevels = editLevels.filter((_, i) => i !== index);
    setEditLevels(newLevels);
    setHasChanges(true);
  };

  return (
    <div className="space-y-4">
      {sources.map(source => {
        const categories = data[source] || {};
        const categoryList = Object.entries(categories);
        const isExpanded = expandedSources.includes(source);

        return (
          <div key={source} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* 体系头部 */}
            <button
              onClick={() => toggleSource(source)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{source === 'RENSHE' ? '🏛️' : '✈️'}</span>
                <span className="font-semibold text-slate-800">
                  {source === 'RENSHE' ? '人社培训' : source === 'CAAC' ? 'CAAC培训' : source}
                </span>
                <span className="text-sm text-slate-500">({categoryList.length} 个分类)</span>
              </div>
              <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {/* 分类列表 */}
            {isExpanded && (
              <div className="divide-y divide-slate-100">
                {categoryList.map(([category, levels]) => {
                  const editKey = `${source}:${category}`;
                  const isEditing = editingCategory === editKey;

                  return (
                    <div key={category} className="px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-slate-700 mb-2">{category}</div>

                          {isEditing ? (
                            <div className="space-y-2">
                              {editLevels.map((level, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={level}
                                    onChange={(e) => handleLevelChange(idx, e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="输入等级名称"
                                  />
                                  <button
                                    onClick={() => removeLevel(idx)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <button
                                  onClick={addLevel}
                                  className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Plus className="w-4 h-4" /> 添加等级
                                </button>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={saveEdit}
                                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  保存
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {((levels as string[]) || []).map((level, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                                >
                                  {level}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <button
                            onClick={() => startEdit(source, category, levels as string[])}
                            className="ml-3 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* 提示信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-800">
          <strong>配置说明：</strong>学习路径页面的等级显示按分类配置。每个分类可以设置不同的等级序列。
          例如：RENSHE体系下，植保分类可以设置为初级工→高级技师，CAAC体系下，多旋翼分类可以设置为视距内驾驶员→教员。
        </p>
      </div>
    </div>
  );
}
