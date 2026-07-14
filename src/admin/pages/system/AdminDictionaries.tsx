// ============================================================================
// 字典管理页面 - 可视化编辑所有状态标签、等级分类、类型配置
// ============================================================================
import { useState, useEffect } from 'react';
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

// 状态标签预设样式（可视化选择）。tailwind 供 Web 使用，
// bgHex/textHex 供小程序端使用（小程序无法解析 Tailwind 类名，需 hex）
const TAG_PRESETS = [
  { name: '灰', tailwind: 'bg-gray-100 text-gray-700', bgHex: '#f3f4f6', textHex: '#374151' },
  { name: '绿', tailwind: 'bg-green-100 text-green-700', bgHex: '#dcfce7', textHex: '#15803d' },
  { name: '蓝', tailwind: 'bg-blue-100 text-blue-700', bgHex: '#dbeafe', textHex: '#1d4ed8' },
  { name: '黄', tailwind: 'bg-yellow-100 text-yellow-700', bgHex: '#fef9c3', textHex: '#a16207' },
  { name: '红', tailwind: 'bg-red-100 text-red-700', bgHex: '#fee2e2', textHex: '#b91c1c' },
  { name: '紫', tailwind: 'bg-purple-100 text-purple-700', bgHex: '#f3e8ff', textHex: '#7e22ce' },
  { name: '橙', tailwind: 'bg-orange-100 text-orange-700', bgHex: '#ffedd5', textHex: '#c2410c' },
  { name: '青', tailwind: 'bg-cyan-100 text-cyan-700', bgHex: '#cffafe', textHex: '#0e7490' },
];

// 可视化标签样式选择器：点击预设色块即可，也可手填自定义 Tailwind 类
function TagPresetPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (preset: { tailwind: string; bgHex: string; textHex: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TAG_PRESETS.map((p) => {
        const active = value === p.tailwind;
        return (
          <button
            type="button"
            key={p.tailwind}
            onClick={() => onChange(p)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${p.tailwind} ${
              active ? 'ring-2 ring-offset-1 ring-blue-500' : 'opacity-80 hover:opacity-100'
            }`}
          >
            {p.name}
          </button>
        );
      })}
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange({ tailwind: e.target.value, bgHex: '', textHex: '' })}
        className="flex-1 min-w-[8rem] px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="或输入自定义 Tailwind 类"
      />
    </div>
  );
}

export default function AdminDictionaries() {
  const [selectedGroup, setSelectedGroup] = useState<string>('orderStatus');
  const { confirm, ConfirmDialog } = useConfirm();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<any>(null);
  // 本地工作副本：所有编辑/新增/删除先作用于 working，保存时写回服务器
  const [working, setWorking] = useState<any>(null);

  const { raw, loading, refresh } = useDictionary({ groupKey: selectedGroup });
  const meta = GROUP_META[selectedGroup];

  // 服务器数据加载完成（或切换分组）后，同步到本地工作副本
  useEffect(() => {
    setWorking(raw);
  }, [raw]);

  const groups = Object.keys(GROUP_META);

  // 将本地工作副本写回数据库
  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const { adminService } = await import('@/services/adminService');
      const configRes = await adminService.list('systemConfig', { type: 'dictionaries' }, { limit: 1 });
      const data = configRes?.data?.list || [];
      const payload = working;

      if (data.length > 0) {
        const currentDicts = data[0].dictionaries || {};
        const updated = { ...currentDicts, [selectedGroup]: payload };
        await adminService.update('systemConfig', data[0]._id, {
          dictionaries: updated,
          updatedAt: new Date(),
        });
      } else {
        // 配置文档不存在时兜底新建
        await adminService.add('systemConfig', {
          type: 'dictionaries',
          dictionaries: { [selectedGroup]: payload },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setHasChanges(false);
      setEditingKey(null);
      setEditForm(null);
      setIsAdding(false);
      setNewItem(null);
      await refresh(); // 清空缓存并重新拉取，确保 working 与服务器一致
      await confirm({ title: '保存成功', message: '字典配置已更新', variant: 'info' });
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

    if (meta?.type === 'object') {
      setWorking((prev: Record<string, LabelConfig>) => {
        const newData = { ...(prev || {}) };
        delete newData[key];
        return newData;
      });
    } else if (meta?.type === 'array') {
      setWorking((prev: OptionItem[]) => ((prev || []) as OptionItem[]).filter(item => item.value !== key));
    }
    setHasChanges(true);
  };

  // 开始新增
  const handleStartAdd = () => {
    if (meta?.type === 'object') {
      // object 类型：需要键名 + 显示文本 + 样式类
      setNewItem({ key: '', text: '', color: 'bg-gray-100 text-gray-700' });
      setIsAdding(true);
    } else if (meta?.type === 'array') {
      setNewItem({ label: '', value: '' });
      setIsAdding(true);
    }
  };

  // 应用 object 新增（写入 working）
  const applyObjectAdd = async () => {
    if (!newItem?.key?.trim()) {
      await confirm({ title: '缺少键名', message: '请填写配置项键名（英文标识）', variant: 'warning' });
      return;
    }
    const key = newItem.key.trim();
    setWorking((prev: Record<string, LabelConfig>) => ({
      ...(prev || {}),
      [key]: {
        text: newItem.text || key,
        color: newItem.color || 'bg-gray-100 text-gray-700',
        ...(newItem.colorHex ? { colorHex: newItem.colorHex, textHex: newItem.textHex } : {}),
      },
    }));
    setHasChanges(true);
    setIsAdding(false);
    setNewItem(null);
  };

  // 应用 array 新增（写入 working）
  const applyArrayAdd = async () => {
    if (!newItem?.value?.trim()) {
      await confirm({ title: '缺少值', message: '请填写 value 值', variant: 'warning' });
      return;
    }
    const value = newItem.value.trim();
    setWorking((prev: OptionItem[]) => [
      ...(prev || []),
      { value, label: newItem.label || value },
    ]);
    setHasChanges(true);
    setIsAdding(false);
    setNewItem(null);
  };

  // 取消新增
  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewItem(null);
  };

  // 应用 object 编辑（写入 working，保留 bg 等附加字段避免丢失背景）
  const applyObjectEdit = (key: string, form: any) => {
    setWorking((prev: Record<string, LabelConfig>) => ({
      ...(prev || {}),
      [key]: { ...form, text: form.text, color: form.color },
    }));
    setHasChanges(true);
    setEditingKey(null);
    setEditForm(null);
  };

  // 应用 array 编辑（写入 working，保留 value 等其它字段）
  const applyArrayEdit = (value: string, form: any) => {
    setWorking((prev: OptionItem[]) =>
      ((prev || []) as OptionItem[]).map(item =>
        item.value === value ? { ...item, label: form.label } : item
      )
    );
    setHasChanges(true);
    setEditingKey(null);
    setEditForm(null);
  };

  // 应用学习路径等级编辑（写入 working）
  const applyLearningPath = (source: string, category: string, levels: string[]) => {
    setWorking((prev: any) => {
      const next = { ...(prev || {}) };
      next[source] = { ...(next[source] || {}), [category]: levels };
      return next;
    });
    setHasChanges(true);
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
                        // 切换分组后立即清空工作副本，避免 meta.type 已变为新类型、
                        // 但 working 仍是旧分组数据导致的「数组列表拿到对象」瞬态崩溃
                        setWorking(null);
                        setEditingKey(null);
                        setEditForm(null);
                        setHasChanges(false);
                        setIsAdding(false);
                        setNewItem(null);
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
                    类型：{meta?.type === 'array' ? '列表选项' : meta?.type === 'learningPath' ? '学习路径' : '状态标签'}
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
                    data={working as Record<string, LabelConfig>}
                    editingKey={editingKey}
                    setEditingKey={setEditingKey}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onDelete={handleDelete}
                    isAdding={isAdding}
                    newItem={newItem}
                    setNewItem={setNewItem}
                    onSaveNew={applyObjectAdd}
                    onSaveEdit={applyObjectEdit}
                    onCancelAdd={handleCancelAdd}
                  />
                ) : meta?.type === 'learningPath' ? (
                  <LearningPathConfigList
                    data={working}
                    onApplyLearningPath={applyLearningPath}
                  />
                ) : (
                  <ArrayConfigList
                    data={working as OptionItem[]}
                    editingKey={editingKey}
                    setEditingKey={setEditingKey}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    onDelete={handleDelete}
                    isAdding={isAdding}
                    newItem={newItem}
                    setNewItem={setNewItem}
                    onSaveNew={applyArrayAdd}
                    onSaveEdit={applyArrayEdit}
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
              字典配置会影响全局状态显示和下拉选项。修改后需点击「保存更改」才会生效，
              建议修改后刷新相关页面以查看最新效果。建议在非业务高峰期进行修改。
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
  onDelete,
  isAdding,
  newItem,
  setNewItem,
  onSaveNew,
  onSaveEdit,
  onCancelAdd,
}: {
  data: Record<string, LabelConfig>;
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editForm: any;
  setEditForm: (f: any) => void;
  onDelete: (k: string) => void;
  isAdding: boolean;
  newItem: any;
  setNewItem: (f: any) => void;
  onSaveNew: () => void;
  onSaveEdit: (k: string, f: any) => void;
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
              value={newItem?.key || ''}
              onChange={(e) => setNewItem({ ...newItem, key: e.target.value })}
              className="w-40 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="键名(英文)"
            />
            <input
              type="text"
              value={newItem?.text || ''}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="显示文本"
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
          <TagPresetPicker
            value={newItem?.color || ''}
            onChange={(p) => setNewItem({ ...newItem, color: p.tailwind, colorHex: p.bgHex, textHex: p.textHex })}
          />
        </div>
      )}
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <code className="text-sm text-slate-600 font-mono bg-white px-2 py-1 rounded">{key}</code>
          {editingKey === key ? (
            <>
            <div className="flex-1 flex gap-3">
              <input
                type="text"
                value={editForm?.text || ''}
                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="显示文本"
              />
              <button
                onClick={() => onSaveEdit(key, editForm)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
              >
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingKey(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <TagPresetPicker
              value={editForm?.color || ''}
                onChange={(p) => setEditForm({ ...editForm, color: p.tailwind, colorHex: p.bgHex, textHex: p.textHex })}
            />
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${val.color} ${val.bg || ''}`}
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
  onDelete,
  isAdding,
  newItem,
  setNewItem,
  onSaveNew,
  onSaveEdit,
  onCancelAdd,
}: {
  data: OptionItem[];
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editForm: any;
  setEditForm: (f: any) => void;
  onDelete: (k: string) => void;
  isAdding: boolean;
  newItem: any;
  setNewItem: (f: any) => void;
  onSaveNew: () => void;
  onSaveEdit: (k: string, f: any) => void;
  onCancelAdd: () => void;
}) {
  if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-slate-400">暂无数据</div>;

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
                onClick={() => onSaveEdit(item.value, editForm)}
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
  onApplyLearningPath,
}: {
  data: any;
  onApplyLearningPath: (source: string, category: string, levels: string[]) => void;
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

  const saveEdit = () => {
    if (!editingCategory) return;
    const [source, category] = editingCategory.split(':');
    onApplyLearningPath(source, category, editLevels);
    setEditingCategory(null);
    setEditLevels([]);
  };

  const handleLevelChange = (index: number, value: string) => {
    const newLevels = [...editLevels];
    newLevels[index] = value;
    setEditLevels(newLevels);
  };

  const addLevel = () => {
    setEditLevels([...editLevels, '']);
  };

  const removeLevel = (index: number) => {
    const newLevels = editLevels.filter((_, i) => i !== index);
    setEditLevels(newLevels);
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
                              {(Array.isArray(levels) ? levels : []).map((level, idx) => (
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
