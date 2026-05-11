// ============================================================================
// 拖拽排序 Hook - 生产级实现
// ============================================================================
import { useState, useCallback, useRef } from 'react';

interface DragItem {
  id: string;
  [key: string]: any;
}

interface UseDragSortOptions<T extends DragItem> {
  items: T[];
  onOrderChange?: (items: T[]) => void;
  keyField?: string;
}

interface UseDragSortReturn {
  items: T[];
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragEnter: (index: number) => void;
  handleDragLeave: () => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDrop: () => void;
  handleDragEnd: () => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * 拖拽排序 Hook
 */
export function useDragSort<T extends DragItem>({
  items: initialItems,
  onOrderChange,
  keyField = '_id'
}: UseDragSortOptions<T>): UseDragSortReturn<T> {
  const [items, setItems] = useState<T[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<any>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
    dragNode.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    if (draggedIndex === null) return;
    if (draggedIndex === index) return;
    
    setDragOverIndex(index);
    
    // 实时移动元素
    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    setItems(newItems);
    setDraggedIndex(index);
  }, [draggedIndex, items]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(() => {
    if (onOrderChange) {
      onOrderChange(items);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [items, onOrderChange]);

  const handleDragEnd = useCallback(() => {
    if (onOrderChange) {
      onOrderChange(items);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  }, [items, onOrderChange]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);
    
    setItems(newItems);
    
    if (onOrderChange) {
      onOrderChange(newItems);
    }
  }, [items, onOrderChange]);

  // 同步外部 items 变化
  if (initialItems !== items && JSON.stringify(initialItems) !== JSON.stringify(items)) {
    setItems(initialItems);
  }

  return {
    items,
    setItems,
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    moveItem
  };
}

// ============================================================================
// 批量操作 Hook
// ============================================================================

interface UseBatchOperationOptions<T> {
  items: T[];
  keyField?: string;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onBatchUpdate?: (ids: string[], updates: Partial<T>) => Promise<void>;
}

interface UseBatchOperationReturn<T> {
  selectedIds: Set<string>;
  isSelecting: boolean;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectRange: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
  batchDelete: () => Promise<void>;
  batchUpdate: (updates: Partial<T>) => Promise<void>;
  startSelecting: () => void;
  stopSelecting: () => void;
}

/**
 * 批量操作 Hook
 */
export function useBatchOperation<T extends Record<string, any>>({
  items,
  keyField = '_id',
  onBatchDelete,
  onBatchUpdate
}: UseBatchOperationOptions<T>): UseBatchOperationReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = new Set(items.map(item => String(item[keyField])));
    setSelectedIds(allIds);
  }, [items, keyField]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const batchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!onBatchDelete) return;
    
    const ids = Array.from(selectedIds);
    await onBatchDelete(ids);
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, [selectedIds, onBatchDelete]);

  const batchUpdate = useCallback(async (updates: Partial<T>) => {
    if (selectedIds.size === 0) return;
    if (!onBatchUpdate) return;
    
    const ids = Array.from(selectedIds);
    await onBatchUpdate(ids, updates);
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, [selectedIds, onBatchUpdate]);

  const startSelecting = useCallback(() => {
    setIsSelecting(true);
  }, []);

  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    isSelecting,
    toggleSelect,
    selectAll,
    deselectAll,
    selectRange,
    isSelected,
    selectedCount: selectedIds.size,
    batchDelete,
    batchUpdate,
    startSelecting,
    stopSelecting
  };
}

// ============================================================================
// 配置预览 Hook
// ============================================================================

interface PreviewData {
  type: 'courses' | 'classes' | 'learningPaths' | 'banners';
  items: any[];
  config: {
    visible?: boolean;
    order?: number;
  }[];
}

interface UsePreviewOptions {
  data: PreviewData;
}

interface UsePreviewReturn {
  previewItems: any[];
  visibleCount: number;
  hiddenCount: number;
  getVisibility: (id: string) => boolean;
  getOrder: (id: string) => number;
  toggleVisibility: (id: string) => void;
  setOrder: (id: string, order: number) => void;
}

/**
 * 预览 Hook - 根据配置过滤和排序内容
 */
export function usePreview({ data }: UsePreviewOptions): UsePreviewReturn {
  const { items, config = [] } = data;

  // 获取配置映射
  const configMap = new Map(
    config.map(c => [c.id || c._id, c])
  );

  // 根据配置过滤和排序
  const previewItems = items
    .map(item => {
      const itemId = item._id || item.id;
      const itemConfig = configMap.get(itemId);
      return {
        ...item,
        _visible: itemConfig?.visible !== false,  // 默认可见
        _order: itemConfig?.order || 0
      };
    })
    .filter(item => item._visible)  // 只显示可见项
    .sort((a, b) => a._order - b._order);

  const visibleCount = previewItems.length;
  const hiddenCount = items.length - visibleCount;

  const getVisibility = (id: string) => {
    const itemConfig = configMap.get(id);
    return itemConfig?.visible !== false;
  };

  const getOrder = (id: string) => {
    const itemConfig = configMap.get(id);
    return itemConfig?.order || 0;
  };

  const toggleVisibility = (id: string) => {
    // 外部处理
  };

  const setOrder = (id: string, order: number) => {
    // 外部处理
  };

  return {
    previewItems,
    visibleCount,
    hiddenCount,
    getVisibility,
    getOrder,
    toggleVisibility,
    setOrder
  };
}

// ============================================================================
// 导出工具函数
// ============================================================================

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 比较两个对象是否相等
 */
export function isEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
