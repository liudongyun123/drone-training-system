import React, { useState } from 'react';
import { Check, Trash2, MoreVertical } from 'lucide-react';

export interface BatchOperationItem {
  id: string;
  [key: string]: any;
}

export interface BatchOperationConfig {
  label: string;
  icon: React.ReactNode;
  action: (items: BatchOperationItem[]) => Promise<void>;
  confirm?: boolean;
  confirmMessage?: (count: number) => string;
  danger?: boolean;
}

interface BatchOperationPanelProps {
  items: BatchOperationItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  operations: BatchOperationConfig[];
  onOperationComplete?: (operation: string, success: number, failed: number) => void;
}

/**
 * 批量操作面板组件
 * 提供批量选择、删除、修改状态等功能
 */
export default function BatchOperationPanel({
  items,
  selectedIds,
  onSelectionChange,
  operations,
  onOperationComplete
}: BatchOperationPanelProps) {
  const [isOperationMenuOpen, setIsOperationMenuOpen] = useState(false);

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(items.map(item => item.id));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  // 单个选择
  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    onSelectionChange(newSelectedIds);
  };

  // 执行批量操作
  const handleBatchOperation = async (operation: BatchOperationConfig) => {
    if (selectedIds.size === 0) {
      alert('请先选择要操作的项目');
      return;
    }

    const selectedItems = items.filter(item => selectedIds.has(item.id));

    // 确认操作
    if (operation.confirm) {
      const message = operation.confirmMessage
        ? operation.confirmMessage(selectedIds.size)
        : `确定要对选中的 ${selectedIds.size} 项执行此操作吗？`;

      if (!confirm(message)) {
        return;
      }
    }

    try {
      await operation.action(selectedItems);
      alert('操作成功');
      onSelectionChange(new Set()); // 清空选择

      if (onOperationComplete) {
        onOperationComplete(operation.label, selectedItems.length, 0);
      }
    } catch (error) {
      console.error('批量操作失败:', error);
      alert('操作失败，请重试');

      if (onOperationComplete) {
        onOperationComplete(operation.label, 0, selectedItems.length);
      }
    }

    setIsOperationMenuOpen(false);
  };

  return (
    <div className="bg-white border-b p-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 全选复选框 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span className="text-sm text-gray-600">
              {selectedIds.size > 0
                ? `已选择 ${selectedIds.size} 项`
                : '全选'}
            </span>
          </label>

          {/* 已选择项目数量 */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => onSelectionChange(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              清除选择
            </button>
          )}
        </div>

        {/* 批量操作按钮 */}
        <div className="relative">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setIsOperationMenuOpen(!isOperationMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>批量操作</span>
                <MoreVertical size={16} />
              </button>

              {isOperationMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border overflow-hidden z-20">
                  {operations.map((op, index) => (
                    <button
                      key={index}
                      onClick={() => handleBatchOperation(op)}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        op.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                      }`}
                    >
                      {op.icon}
                      <span>{op.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 带复选框的表格行组件
 */
export function SelectableTableRow({
  item,
  selected,
  onSelect,
  children,
  className = ''
}: {
  item: BatchOperationItem;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={`hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''} ${className}`}>
      <td className="px-4 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>
      {children}
    </tr>
  );
}

/**
 * 带复选框的卡片组件
 */
export function SelectableCard({
  item,
  selected,
  onSelect,
  children,
  className = ''
}: {
  item: BatchOperationItem;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
        />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
