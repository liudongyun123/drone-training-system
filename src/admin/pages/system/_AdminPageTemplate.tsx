// ============================================================================
// 管理后台页面模板 - 统一UI风格
// ============================================================================
import { useState, ReactNode } from 'react';
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/Button';
import { Input } from '@/components/Input';

// 通用数据记录类型
export interface DataRecord {
  _id?: string
  id?: string
  [key: string]: unknown
}

interface AdminPageTemplateProps {
  title: string;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  // 表格相关属性（可选，如果不使用表格功能）
  columns?: {
    key: string;
    title: string;
    width?: string;
    render?: <T extends DataRecord = DataRecord>(value: unknown, record: T, index: number) => ReactNode;
  }[];
  dataSource?: DataRecord[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (keyword: string) => void;
  onAdd?: () => void;
  onEdit?: (record: DataRecord) => void;
  onDelete?: (id: string) => void;
  renderActions?: (record: DataRecord) => ReactNode;
  searchPlaceholder?: string;
}

export default function AdminPageTemplate({
  title,
  subtitle,
  description,
  action,
  children,
  columns,
  dataSource,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  renderActions,
  searchPlaceholder = '搜索...',
}: AdminPageTemplateProps) {
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchKeyword);
  };

  const totalPages = Math.ceil((total || 0) / (pageSize || 20));

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题区 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {(subtitle || description) && <p className="text-sm text-slate-500 mt-1">{subtitle || description}</p>}
        </div>

        {/* 搜索和操作栏 */}
        {(onSearch || onAdd || action) && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              {onSearch && (
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      prefix={<Search className="w-4 h-4" />}
                      className="pr-10"
                    />
                  </div>
                </form>
              )}
              <div className="flex gap-2">
                {onAdd && (
                  <Button onClick={onAdd} icon={<Plus className="w-4 h-4" />}>
                    新增
                  </Button>
                )}
                {action}
              </div>
            </div>
          </div>
        )}

        {/* 表格区域 - 仅当有 columns 时渲染 */}
        {columns && columns.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {columns.map((col) => (
                      <th 
                        key={col.key} 
                        className="px-4 py-3 text-left text-sm font-semibold text-slate-700"
                        style={{ width: col.width }}
                      >
                        {col.title}
                      </th>
                    ))}
                    {(onEdit || onDelete || renderActions) && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 w-32">
                        操作
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-3 text-slate-500">加载中...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !dataSource || dataSource.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <Search className="w-8 h-8 text-slate-300" />
                          </div>
                          <p>暂无数据</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dataSource.map((record, idx) => (
                      <tr key={record._id || idx} className="hover:bg-slate-50 transition-colors">
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-sm text-slate-600">
                            // @ts-ignore
                            {col.render ? col.render(record[col.key], record) : record[col.key] as string}
                          </td>
                        ))}
                        {(onEdit || onDelete || renderActions) && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {renderActions ? (
                                renderActions(record)
                              ) : (
                                <>
                                  {onEdit && (
                                    <button
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      onClick={() => onEdit(record)}
                                      title="编辑"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  )}
                                  {onDelete && (
                                    <button
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      onClick={() => onDelete(record._id)}
                                      title="删除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {total && total > (pageSize || 20) && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  共 <span className="font-medium text-slate-700">{total}</span> 条记录，第{' '}
                  <span className="font-medium text-slate-700">{page || 1}</span> /{' '}
                  <span className="font-medium text-slate-700">{totalPages}</span> 页
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange?.((page || 1) - 1)}
                    disabled={(page || 1) === 1}
                    icon={<ChevronLeft className="w-4 h-4" />}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPageChange?.((page || 1) + 1)}
                    disabled={(page || 1) >= totalPages}
                    iconPosition="right"
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 没有 columns 时直接渲染 children */
          <div className="mb-6">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
