// ============================================================================
// 图片拖拽上传组件 - 本地Base64模式
// 支持拖拽上传、点击上传、实时预览、无需云存储
// ============================================================================
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

interface ImageUploaderProps {
  /** 当前图片URL/Base64 */
  value?: string;
  /** 值变化回调 */
  onChange?: (url: string) => void;
  /** 最大文件大小（MB） */
  maxSize?: number;
  /** 接受的文件类型 */
  accept?: string;
  /** 提示文字 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 预览高度 */
  previewHeight?: string;
}

export default function ImageUploader({
  value,
  onChange,
  maxSize = 5,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  placeholder = '拖拽图片到此处，或点击上传',
  disabled = false,
  className = '',
  previewHeight = 'h-48',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件 - 转换为Base64
  const handleFile = useCallback((file: File) => {
    // 验证文件类型
    const allowedTypes = accept.split(',').map(t => t.trim());
    const isValidType = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('/*', '/'));
      }
      return file.type === type;
    });

    if (!isValidType) {
      setError('不支持的文件格式，请上传 JPG、PNG、GIF 或 WebP 格式图片');
      return;
    }

    // 验证文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`文件大小超过限制，最大支持 ${maxSize}MB`);
      return;
    }

    setError(null);

    // 使用FileReader读取文件并转换为Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      onChange?.(base64);
    };
    reader.onerror = () => {
      setError('文件读取失败');
    };
    reader.readAsDataURL(file);
  }, [accept, maxSize, onChange]);

  // 拖拽事件处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // 点击上传
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // 重置input以便选择相同文件
    e.target.value = '';
  };

  // 删除图片
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onChange?.('');
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* 预览模式 */}
      {previewUrl && (
        <div className="relative group rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={previewUrl}
            alt="预览"
            className={`w-full ${previewHeight} object-cover`}
          />
          {/* 悬停遮罩 */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleClick}
              className="px-3 py-1.5 bg-white text-gray-700 rounded-md text-sm hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              更换
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
          {/* 成功图标 */}
          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 上传区域 */}
      {!previewUrl && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-lg cursor-pointer
            transition-all duration-200
            ${disabled ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : ''}
            ${isDragging ? 'bg-blue-50 border-blue-500 scale-[1.02]' : 'bg-gray-50 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
          `}
        >
          <div className="flex flex-col items-center justify-center py-10">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
              isDragging ? 'bg-blue-100' : 'bg-gray-200'
            }`}>
              {isDragging ? (
                <Upload className="w-7 h-7 text-blue-500" />
              ) : (
                <ImageIcon className="w-7 h-7 text-gray-400" />
              )}
            </div>
            <p className={`text-sm mb-1 ${isDragging ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              {isDragging ? '释放以上传' : placeholder}
            </p>
            <p className="text-xs text-gray-400">
              支持 JPG、PNG、GIF、WebP，最大 {maxSize}MB
            </p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
