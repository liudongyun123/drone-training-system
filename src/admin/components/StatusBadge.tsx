// ============================================================================
// StatusBadge - 统一状态标签组件，从字典配置读取样式
// ============================================================================
import { useDictionary } from '../hooks/useDictionary';

export interface StatusBadgeProps {
  /** 字典分组 key */
  groupKey: string;
  /** 状态值（如 'paid', 'active'） */
  statusKey: string;
  /** 兜底显示文本 */
  fallbackText?: string;
  /** 兜底样式类 */
  fallbackColor?: string;
  /** 自定义尺寸：'sm' | 'md' | 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义样式类 */
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

/**
 * 从字典配置渲染状态标签
 *
 * @example
 * // 基本用法
 * <StatusBadge groupKey="orderStatus" statusKey={order.status} />
 *
 * @example
 * // 带兜底
 * <StatusBadge
 *   groupKey="orderStatus"
 *   statusKey={order.status}
 *   fallbackText="未知"
 * />
 *
 * @example
 * // Array 类型字典（如课程等级）
 * <StatusBadge groupKey="courseLevels" statusKey="advanced" />
 */
export function StatusBadge({
  groupKey,
  statusKey,
  fallbackText,
  fallbackColor = 'bg-gray-100 text-gray-700',
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const { getBadge, loading } = useDictionary({ groupKey });

  if (loading) {
    return (
      <span className={`inline-flex items-center rounded-full ${sizeClasses[size]} ${fallbackColor} ${className}`}>
        ...
      </span>
    );
  }

  const badge = getBadge(statusKey, {
    text: fallbackText || statusKey,
    color: fallbackColor,
  });

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${badge.color} ${className}`}>
      {badge.text}
    </span>
  );
}

export default StatusBadge;
