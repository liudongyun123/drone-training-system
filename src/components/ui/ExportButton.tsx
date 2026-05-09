import React, { useState } from 'react';
import { Download as DownloadIcon, FileSpreadsheet, FileJson, FileText, ChevronDown } from 'lucide-react';

export interface ExportField {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportButtonProps {
  data: Record<string, any>[];
  fields: ExportField[];
  filename?: string;
  formats?: ('csv' | 'json' | 'excel' | 'txt')[];
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onExport?: (format: string, content: string) => void;
}

/**
 * 数据导出按钮组件
 * 支持导出为CSV、JSON、Excel（CSV格式）、TXT格式
 */
export default function ExportButton({
  data,
  fields,
  filename = `export_${Date.now()}`,
  formats = ['csv', 'json', 'excel', 'txt'],
  className = '',
  disabled = false,
  loading = false,
  onExport
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  // 格式化数据
  const formatValue = (item: Record<string, any>, field: ExportField): string => {
    const value = item[field.key];

    if (field.format) {
      return field.format(value);
    }

    // 默认格式化
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  // 生成CSV内容
  const generateCSV = (includeBOM = true): string => {
    const headers = fields.map(f => f.label).join(',');
    const rows = data.map(item =>
      fields.map(f => {
        const value = formatValue(item, f);
        // 处理包含逗号、换行符、双引号的内容
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    let content = [headers, ...rows].join('\n');
    // 添加BOM以支持Excel正确显示中文
    if (includeBOM) {
      content = '\uFEFF' + content;
    }
    return content;
  };

  // 生成JSON内容
  const generateJSON = (pretty = true): string => {
    const simplifiedData = data.map(item => {
      const simplified: Record<string, any> = {};
      fields.forEach(f => {
        simplified[f.key] = formatValue(item, f);
      });
      return simplified;
    });

    return pretty ? JSON.stringify(simplifiedData, null, 2) : JSON.stringify(simplifiedData);
  };

  // 生成TXT内容
  const generateTXT = (separator: string = ' | '): string => {
    const headers = fields.map(f => f.label).join(separator);
    const separatorLine = fields.map(() => '-'.repeat(20)).join(separator);
    const rows = data.map(item =>
      fields.map(f => formatValue(item, f)).join(separator)
    );

    return [headers, separatorLine, ...rows].join('\n');
  };

  // 下载文件
  const downloadFile = (content: string, ext: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport(ext, content);
    }
  };

  // 执行导出
  const handleExport = (format: string) => {
    try {
      let content = '';
      let ext = '';
      let mimeType = '';

      switch (format) {
        case 'csv':
          content = generateCSV(true);
          ext = 'csv';
          mimeType = 'text/csv;charset=utf-8;';
          break;

        case 'excel':
          content = generateCSV(true);
          ext = 'xlsx';
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;

        case 'json':
          content = generateJSON(true);
          ext = 'json';
          mimeType = 'application/json;charset=utf-8;';
          break;

        case 'txt':
          content = generateTXT(' | ');
          ext = 'txt';
          mimeType = 'text/plain;charset=utf-8;';
          break;

        default:
          throw new Error(`不支持的导出格式: ${format}`);
      }

      downloadFile(content, ext, mimeType);
      setIsOpen(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  const formatIcons = {
    csv: <FileSpreadsheet size={16} />,
    excel: <FileSpreadsheet size={16} />,
    json: <FileJson size={16} />,
    txt: <FileText size={16} />
  };

  const formatLabels = {
    csv: 'CSV文件',
    excel: 'Excel文件',
    json: 'JSON文件',
    txt: 'TXT文件'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading || data.length === 0}
        className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
        ) : (
          <DownloadIcon size={16} />
        )}
        <span>{loading ? '导出中...' : '导出数据'}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 下拉菜单 */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
            {data.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                暂无数据可导出
              </div>
            ) : (
              <>
                <div className="px-4 py-3 text-sm text-gray-600 border-b">
                  共 {data.length} 条数据
                </div>
                {formats.map(format => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    {formatIcons[format as keyof typeof formatIcons]}
                    <span>{formatLabels[format as keyof typeof formatLabels]}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 简化版导出按钮（默认CSV格式）
 */
export function SimpleExportButton({
  data,
  fields,
  filename,
  onClick
}: {
  data: Record<string, any>[];
  fields: ExportField[];
  filename?: string;
  onClick?: () => void;
}) {
  const handleExport = () => {
    const headers = fields.map(f => f.label).join(',');
    const rows = data.map(item =>
      fields.map(f => {
        const value = item[f.key] ?? '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    const content = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <DownloadIcon size={16} />
      <span>导出CSV</span>
    </button>
  );
}
