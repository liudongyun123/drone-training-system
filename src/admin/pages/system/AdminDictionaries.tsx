// ============================================================================
// 字典管理页面 - 可视化编辑所有状态标签、等级分类、类型配置
// ============================================================================
import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, Save, X, ChevronRight, AlertCircle } from 'lucide-react';
import { useDictionary } from '../../hooks/useDictionary';
import { useConfirm } from '../../hooks/useConfirm';
import { DEFAULT_DICTIONARIES } from '@/services/dictionaryService';
import type { LabelConfig, OptionItem } from '@/services/dictionaryService';

// 字典分组元信息
const GROUP_META: Record<string, { label: string; icon: string; type: 'object' | 'array' }> = {
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
  questionBankCategories: { label: '题库分类', icon: '📋', type: 'array' },
  questionBankLevels: { label: '题库难度', icon: '⚡', type: 'array' },
  messageTypes: { label: '消息类型', icon: '💬', type: 'array' },
  messagePriorities: { label: '消息优先级', icon: '🔔', type: 'array' },
};

export default function AdminDictionaries() {
  const [selectedGroup, setSelectedGroup] = useState<string>('orderStatus');
  const { confirm, ConfirmDialog } = useConfirm();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { raw, loading, refresh } = useDictionary({ groupKey: selectedGroup });
  const meta = GROUP_META[selectedGroup];

  const groups = Object.keys(GROUP_META);

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      // TODO: 调用 API 更新
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
    // TODO: 实现删除
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
                  <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
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
}: {
  data: Record<string, LabelConfig>;
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editForm: any;
  setEditForm: (f: any) => void;
  setHasChanges: (v: boolean) => void;
  onDelete: (k: string) => void;
}) {
  if (!data) return <div className="text-slate-400">暂无数据</div>;
  const entries = Object.entries(data);

  return (
    <div className="space-y-2">
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
}: {
  data: OptionItem[];
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
  editForm: any;
  setEditForm: (f: any) => void;
  setHasChanges: (v: boolean) => void;
  onDelete: (k: string) => void;
}) {
  if (!data || data.length === 0) return <div className="text-slate-400">暂无数据</div>;

  return (
    <div className="space-y-2">
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
