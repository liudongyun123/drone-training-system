/**
 * 批量操作工具函数
 * 提供通用的批量删除、批量修改状态等功能
 */

export interface BatchOperationItem {
  id: string;
  [key: string]: any;
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: Array<{ item: BatchOperationItem; error: any }>;
}

/**
 * 批量删除操作
 */
export async function batchDelete(
  items: BatchOperationItem[],
  deleteFn: (id: string) => Promise<any>,
  onProgress?: (current: number, total: number) => void
): Promise<BatchOperationResult> {
  const errors: Array<{ item: BatchOperationItem; error: any }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      await deleteFn(items[i].id);
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({ item: items[i], error });
    }

    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  return { success: successCount, failed: failedCount, errors };
}

/**
 * 批量更新操作
 */
export async function batchUpdate(
  items: BatchOperationItem[],
  updateFn: (id: string, data: any) => Promise<any>,
  updateData: any,
  onProgress?: (current: number, total: number) => void
): Promise<BatchOperationResult> {
  const errors: Array<{ item: BatchOperationItem; error: any }> = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    try {
      await updateFn(items[i].id, updateData);
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({ item: items[i], error });
    }

    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  return { success: successCount, failed: failedCount, errors };
}

/**
 * 批量修改状态操作
 */
export async function batchUpdateStatus(
  items: BatchOperationItem[],
  updateFn: (id: string, data: any) => Promise<any>,
  status: string,
  onProgress?: (current: number, total: number) => void
): Promise<BatchOperationResult> {
  return batchUpdate(items, updateFn, { status }, onProgress);
}

/**
 * 批量导出操作（生成Excel/CSV数据）
 */
export function batchExport<T extends Record<string, any>>(
  items: T[],
  fields: Array<{ key: string; label: string }>,
  format: 'csv' | 'json' = 'csv'
): string {
  if (format === 'csv') {
    // 生成CSV
    const headers = fields.map(f => f.label).join(',');
    const rows = items.map(item =>
      fields.map(f => {
        const value = item[f.key];
        // 处理包含逗号的内容
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );

    return [headers, ...rows].join('\n');
  } else {
    // 生成JSON
    const simplifiedItems = items.map(item => {
      const simplified: any = {};
      fields.forEach(f => {
        simplified[f.key] = item[f.key];
      });
      return simplified;
    });
    return JSON.stringify(simplifiedItems, null, 2);
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 批量导出并下载
 */
export function batchExportAndDownload<T extends Record<string, any>>(
  items: T[],
  fields: Array<{ key: string; label: string }>,
  filename: string,
  format: 'csv' | 'json' = 'csv'
) {
  const content = batchExport(items, fields, format);
  const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';
  const extension = format === 'csv' ? 'csv' : 'json';

  // 添加BOM以支持Excel正确显示中文
  if (format === 'csv') {
    const bom = '\uFEFF';
    downloadFile(bom + content, `${filename}.${extension}`, mimeType);
  } else {
    downloadFile(content, `${filename}.${extension}`, mimeType);
  }
}

/**
 * 获取操作结果摘要
 */
export function getOperationSummary(result: BatchOperationResult): string {
  const { success, failed, errors } = result;

  if (failed === 0) {
    return `操作成功！成功处理 ${success} 项`;
  }

  const errorDetails = errors.slice(0, 3).map(e => {
    const itemName = e.item.name || e.item.title || e.item.id;
    return `- ${itemName}: ${(e.error as Error).message || '操作失败'}`;
  }).join('\n');

  const summary = `操作完成！成功 ${success} 项，失败 ${failed} 项`;

  if (errors.length > 0) {
    return `${summary}\n\n失败详情:\n${errorDetails}${errors.length > 3 ? '\n...' : ''}`;
  }

  return summary;
}

/**
 * 批量操作Hook
 */
export function useBatchOperations<T extends BatchOperationItem>(
  items: T[],
  onDelete?: (ids: string[]) => Promise<void>,
  onUpdate?: (ids: string[], data: any) => Promise<void>
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // 切换选择状态
  const toggleSelection = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  // 全选/取消全选
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 清除选择
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // 获取选中的项目
  const getSelectedItems = (): T[] => {
    return items.filter(item => selectedIds.has(item.id));
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要删除的项目');
      return false;
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 项吗？此操作不可撤销。`)) {
      return false;
    }

    if (!onDelete) {
      alert('删除功能未实现');
      return false;
    }

    setIsProcessing(true);
    try {
      await onDelete(Array.from(selectedIds));
      clearSelection();
      alert('删除成功');
      return true;
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('删除失败，请重试');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // 批量更新状态
  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedIds.size === 0) {
      alert('请先选择要更新的项目');
      return false;
    }

    if (!onUpdate) {
      alert('更新功能未实现');
      return false;
    }

    setIsProcessing(true);
    try {
      await onUpdate(Array.from(selectedIds), { status });
      clearSelection();
      alert('更新成功');
      return true;
    } catch (error) {
      console.error('批量更新失败:', error);
      alert('更新失败，请重试');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    selectedIds,
    isProcessing,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    getSelectedItems,
    handleBatchDelete,
    handleBatchUpdateStatus
  };
}

import { useState } from 'react';
