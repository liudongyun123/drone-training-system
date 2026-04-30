// ============================================================================
// ConfigSelect - 从字典配置动态生成下拉选项
// ============================================================================
import { useState, useEffect, forwardRef } from 'react';
import { useDictionary } from '../hooks/useDictionary';

export interface ConfigSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  /** 字典分组 key，如 'courseLevels', 'orderStatus' */
  groupKey: string;
  /** 当前值 */
  value: string;
  /** 值变更回调 */
  onChange: (value: string) => void;
  /** 占位文本 */
  placeholder?: string;
  /** 是否显示"全部"选项（value 为空字符串） */
  showAll?: boolean;
  /** "全部"选项的文本，默认"全部" */
  allText?: string;
  /** 加载中显示的内容 */
  loadingText?: string;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 从字典配置动态渲染下拉选择框
 *
 * @example
 * <ConfigSelect
 *   groupKey="courseLevels"
 *   value={formData.level}
 *   onChange={(v) => setFormData({ ...formData, level: v })}
 *   placeholder="选择等级"
 * />
 *
 * @example
 * // 带筛选功能
 * <ConfigSelect
 *   groupKey="courseLevels"
 *   value={filterLevel}
 *   onChange={setFilterLevel}
 *   showAll
 * />
 */
export const ConfigSelect = forwardRef<HTMLSelectElement, ConfigSelectProps>(
  (
    {
      groupKey,
      value,
      onChange,
      placeholder,
      showAll = false,
      allText = '全部',
      loadingText = '加载中...',
      className = '',
      disabled,
      ...rest
    },
    ref
  ) => {
    const { options, loading } = useDictionary({ groupKey });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // SSR 防闪烁
    if (!mounted || loading) {
      return (
        <select
          ref={ref}
          disabled
          className={`block w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg ${className}`}
          {...rest}
        >
          <option>{loadingText}</option>
        </select>
      );
    }

    return (
      <select
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {showAll && <option value="">{allText}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);

ConfigSelect.displayName = 'ConfigSelect';

export default ConfigSelect;
