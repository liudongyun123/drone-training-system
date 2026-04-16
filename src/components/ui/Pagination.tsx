import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  className?: string;
}

/**
 * 统一的分页组件
 */
export default function Pagination({
  currentPage,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showSizeChanger = true,
  showQuickJumper = true,
  showTotal,
  className = ''
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // 页数少于等于7，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 页数大于7，智能显示
      pages.push(1); // 第一页

      if (currentPage <= 4) {
        // 当前页靠近开头
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 当前页靠近结尾
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  const handleQuickJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      const page = parseInt(target.value);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        handlePageChange(page);
        target.value = '';
      }
    }
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* 左侧：总数和每页条数 */}
      <div className="flex items-center gap-4">
        {showTotal && (
          <span className="text-sm text-gray-600">
            {showTotal(total, [startItem, endItem])}
          </span>
        )}

        {showSizeChanger && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size} 条/页
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 右侧：页码导航 */}
      <div className="flex items-center gap-2">
        {/* 首页 */}
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="首页"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* 上一页 */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="上一页"
        >
          <ChevronLeft size={16} />
        </button>

        {/* 页码 */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-1.5 text-gray-400">
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page as number)}
                className={`min-w-[40px] px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* 下一页 */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="下一页"
        >
          <ChevronRight size={16} />
        </button>

        {/* 末页 */}
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="末页"
        >
          <ChevronsRight size={16} />
        </button>

        {/* 快速跳转 */}
        {showQuickJumper && totalPages > 7 && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-sm text-gray-600">跳至</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              placeholder="页码"
              onKeyDown={handleQuickJump}
              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">页</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 简化版分页组件（仅显示页码）
 */
export function SimplePagination({
  currentPage,
  total,
  pageSize,
  onPageChange
}: {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Pagination
      currentPage={currentPage}
      total={total}
      pageSize={pageSize}
      onPageChange={onPageChange}
      showSizeChanger={false}
      showQuickJumper={false}
      showTotal={(total) => `共 ${total} 条`}
    />
  );
}

/**
 * 卡片式分页组件
 */
export function CardPagination({
  currentPage,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange
}: {
  currentPage: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-2">
        {/* 上一页按钮 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
          上一页
        </button>

        {/* 页码显示 */}
        <div className="flex items-center gap-1">
          {[...Array(totalPages)].slice(Math.max(0, currentPage - 2), currentPage + 1).map((_, i) => {
            const page = Math.max(0, currentPage - 2) + i + 1;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[40px] px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                {page}
              </button>
            );
          })}
          {totalPages > currentPage + 1 && <span className="px-2">...</span>}
          {totalPages > currentPage + 1 && (
            <button
              onClick={() => onPageChange(totalPages)}
              className="min-w-[40px] px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm text-gray-700"
            >
              {totalPages}
            </button>
          )}
        </div>

        {/* 下一页按钮 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 每页条数选择 */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>每页显示</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>条</span>
        </div>
      )}

      {/* 页码信息 */}
      <div className="text-sm text-gray-600">
        第 {currentPage} / {totalPages} 页，共 {total} 条
      </div>
    </div>
  );
}
