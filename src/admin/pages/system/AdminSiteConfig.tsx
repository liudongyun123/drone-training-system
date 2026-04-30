// ============================================================================
// 站点配置页面 - 管理占位图、默认值、业务参数
// ============================================================================
import { useState, useEffect } from 'react';
import { Globe, Save, RotateCcw, CheckCircle } from 'lucide-react';
import {
  getAllConfigs,
  getConfig,
  updateConfig,
  clearSiteConfigCache,
} from '@/services/siteConfigService';
import type { SiteConfigItem } from '@/services/siteConfigService';
import siteConfigService from '@/services/siteConfigService';
import { useConfirm } from '../../hooks/useConfirm';

const CONFIG_CATEGORIES = [
  { key: 'media', label: '媒体资源', icon: '🖼️', description: '默认图片、Logo 等媒体配置' },
  { key: 'business', label: '业务参数', icon: '⚙️', description: '订单、考试、课程等业务默认值' },
  { key: 'default', label: '默认值', icon: '📝', description: '站点名称、货币符号等通用配置' },
] as const;

// 文件上传字段
const FILE_UPLOAD_KEYS = ['defaultCourseCover', 'defaultUserAvatar', 'defaultHeroImage', 'defaultLogo'];

export default function AdminSiteConfig() {
  const [configs, setConfigs] = useState<SiteConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('default');
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const allConfigs = await getAllConfigs();
      const items = siteConfigService.DEFAULT_SITE_CONFIG.map(defaultItem => {
        const value = allConfigs.get(defaultItem.key);
        if (value !== undefined) {
          return { ...defaultItem, value };
        }
        return { ...defaultItem };
      });
      setConfigs(items);
    } catch (error) {
      setMessage({ type: 'error', text: '加载配置失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const filteredConfigs = configs.filter(c => c.category === activeCategory);

  const handleUpdate = async (key: string, value: any) => {
    setSaving(true);
    try {
      const success = await updateConfig(key, value);
      if (success) {
        setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
        setEditingKey(null);
        setMessage({ type: 'success', text: '配置已更新' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: '更新失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '更新失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    const defaultItem = siteConfigService.DEFAULT_SITE_CONFIG.find(d => d.key === key);
    if (!defaultItem) return;

    const ok = await confirm({
      title: '重置配置',
      message: `确定要将「${defaultItem.description}」重置为默认值吗？`,
      variant: 'warning',
    });
    if (!ok) return;
    await handleUpdate(key, defaultItem.value);
  };

  const handleResetAll = async () => {
    const ok = await confirm({
      title: '重置所有配置',
      message: `确定要将「${CONFIG_CATEGORIES.find(c => c.key === activeCategory)?.label}」下的所有配置重置为默认值吗？`,
      variant: 'danger',
    });
    if (!ok) return;

    setSaving(true);
    try {
      for (const item of filteredConfigs) {
        const defaultItem = siteConfigService.DEFAULT_SITE_CONFIG.find(d => d.key === item.key);
        if (defaultItem) {
          await updateConfig(item.key, defaultItem.value);
        }
      }
      await loadConfigs();
      setMessage({ type: 'success', text: '已重置为默认值' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: '重置失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页头 */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">站点配置</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">管理默认图片、业务参数、站点信息等全局配置</p>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            {message.text}
          </div>
        )}

        {/* 分类标签 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {CONFIG_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setEditingKey(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === cat.key
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleResetAll}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                重置全部
              </button>
            </div>
          </div>

          {/* 配置项列表 */}
          <div className="p-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400">加载中...</div>
            ) : (
              <div className="space-y-3">
                {filteredConfigs.map(item => (
                  <ConfigItemRow
                    key={item.key}
                    item={item}
                    isEditing={editingKey === item.key}
                    editValue={editValue}
                    saving={saving}
                    onStartEdit={(v) => {
                      setEditingKey(item.key);
                      setEditValue(v);
                    }}
                    onCancel={() => setEditingKey(null)}
                    onSave={(v) => handleUpdate(item.key, v)}
                    onReset={() => handleReset(item.key)}
                    isFileUpload={FILE_UPLOAD_KEYS.includes(item.key)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}

// 单行配置项
function ConfigItemRow({
  item,
  isEditing,
  editValue,
  saving,
  onStartEdit,
  onCancel,
  onSave,
  onReset,
  isFileUpload,
}: {
  item: SiteConfigItem;
  isEditing: boolean;
  editValue: any;
  saving: boolean;
  onStartEdit: (currentValue: any) => void;
  onCancel: () => void;
  onSave: (newValue: any) => void;
  onReset: () => void;
  isFileUpload: boolean;
}) {
  const displayValue = (() => {
    if (item.value === '' || item.value === undefined || item.value === null) {
      return <span className="text-slate-400 italic">未设置</span>;
    }
    if (typeof item.value === 'number' || typeof item.value === 'boolean') {
      return <span className="text-slate-900 font-mono">{String(item.value)}</span>;
    }
    if (Array.isArray(item.value)) {
      return <span className="text-slate-900 font-mono text-xs truncate max-w-xs">{JSON.stringify(item.value)}</span>;
    }
    return <span className="text-slate-900">{String(item.value)}</span>;
  })();

  const renderInput = () => {
    if (typeof item.value === 'number') {
      return (
        <input
          type="number"
          value={editValue ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            onStartEdit(val === '' ? '' : Number(val));
          }}
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      );
    }
    if (typeof item.value === 'boolean') {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!editValue}
            onChange={(e) => onStartEdit(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <span className="text-sm text-slate-600">{editValue ? '开启' : '关闭'}</span>
        </label>
      );
    }
    return (
      <input
        type={isFileUpload ? 'url' : 'text'}
        value={editValue ?? ''}
        onChange={(e) => onStartEdit(e.target.value)}
        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder={isFileUpload ? '输入图片 URL' : '输入配置值'}
      />
    );
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-700">{item.description}</div>
        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.key}</div>
      </div>
      <div className="w-64">
        {isEditing ? (
          renderInput()
        ) : (
          <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg min-h-[32px] flex items-center">
            {displayValue}
          </div>
        )}
      </div>
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <button
              onClick={() => {
                // 类型转换
                let val = editValue;
                if (typeof item.value === 'number') {
                  val = val === '' ? 0 : Number(val);
                }
                onSave(val);
              }}
              disabled={saving}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              title="保存"
            >
              <Save className="w-4 h-4" />
            </button>
            <button onClick={onCancel} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded" title="取消">
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onStartEdit(item.value)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="编辑"
            >
              ✏️
            </button>
            <button
              onClick={onReset}
              className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
              title="重置为默认"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
