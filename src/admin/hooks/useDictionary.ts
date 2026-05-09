// ============================================================================
// useDictionary Hook - 从字典配置服务读取选项/标签/徽章
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import {
  getDictionary,
  clearDictionaryCache,
  type OptionItem,
} from '@/services/dictionaryService';

interface UseDictionaryOptions {
  /** 字典分组key，如 'courseLevels', 'orderStatus' */
  groupKey: string;
  /** 是否自动加载，默认 true */
  autoLoad?: boolean;
}

// 字典数据原始格式（Object 或 Array）
type DictionaryRaw = Record<string, unknown> | OptionItem[] | null;

interface UseDictionaryReturn {
  /** 原始字典数据（可能是 Object 或 Array） */
  raw: DictionaryRaw;
  /** 格式化后的下拉选项列表（统一为 OptionItem[]） */
  options: OptionItem[];
  /** 是否正在加载 */
  loading: boolean;
  /** 根据 value 获取显示文本 */
  getLabel: (value: string, fallback?: string) => string;
  /** 根据 value 获取状态徽章配置 */
  getBadge: (value: string, fallback?: { text: string; color: string }) => { text: string; color: string };
  /** 手动刷新（清除缓存后重新加载） */
  refresh: () => Promise<void>;
}

/**
 * 统一从字典配置读取数据的 Hook
 *
 * @example
 * // 下拉选项（Array 类型字典）
 * const { options: levelOptions } = useDictionary({ groupKey: 'courseLevels' });
 * <select>{levelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
 *
 * @example
 * // 状态标签（Object 类型字典）
 * const { getBadge } = useDictionary({ groupKey: 'orderStatus' });
 * const badge = getBadge('paid'); // { text: '已支付', color: 'bg-green-100 text-green-700' }
 */
export function useDictionary({ groupKey, autoLoad = true }: UseDictionaryOptions): UseDictionaryReturn {
  const [raw, setRaw] = useState<DictionaryRaw>(null);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDictionary(groupKey);
      setRaw(data);

      if (Array.isArray(data)) {
        // Array 类型（如 courseLevels, questionBankCategories）
        setOptions(data as OptionItem[]);
      } else if (data && typeof data === 'object') {
        // Object 类型（如 orderStatus, classStatus）
        const items = Object.entries(data).map(([key, val]) => {
          const item = val as Record<string, unknown>;
          return {
            value: key,
            label: (item.text as string) || (item.label as string) || key,
            color: item.color as string | undefined,
            bg: item.bg as string | undefined,
            ...item,
          } as OptionItem;
        });
        setOptions(items);
      } else {
        setOptions([]);
      }
    } catch (error) {
      console.error(`[useDictionary] 加载字典 ${groupKey} 失败:`, error);
      setRaw(null);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [groupKey]);

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  const getLabel = useCallback(
    (value: string, fallback?: string): string => {
      if (!raw) return fallback || value;
      if (Array.isArray(raw)) {
        const item = (raw as OptionItem[]).find(o => o.value === value);
        return item?.label || fallback || value;
      }
      const config = (raw as Record<string, Record<string, unknown>>)[value];
      if (config) return (config.text as string) || (config.label as string) || value;
      return fallback || value;
    },
    [raw]
  );

  const getBadge = useCallback(
    (value: string, fallback?: { text: string; color: string }): { text: string; color: string } => {
      if (!raw) return fallback || { text: value, color: 'bg-gray-100 text-gray-700' };
      if (Array.isArray(raw)) {
        const item = (raw as OptionItem[]).find(o => o.value === value);
        if (item) {
          return {
            text: item.label || value,
            color: item.color || item.badgeColor || 'bg-gray-100 text-gray-700',
          };
        }
        return fallback || { text: value, color: 'bg-gray-100 text-gray-700' };
      }
      const config = (raw as Record<string, Record<string, unknown>>)[value];
      if (config && config.text) {
        return { text: config.text as string, color: (config.color as string) || 'bg-gray-100 text-gray-700' };
      }
      return fallback || { text: value, color: 'bg-gray-100 text-gray-700' };
    },
    [raw]
  );

  const refresh = useCallback(async () => {
    clearDictionaryCache();
    await load();
  }, [load]);

  return { raw, options, loading, getLabel, getBadge, refresh };
}

export default useDictionary;
