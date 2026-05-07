import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

/**
 * 统一的加载动画组件
 */
export default function LoadingSpinner({
  size = 'medium',
  color = '#3B82F6',
  text,
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: { width: 16, height: 16, border: 2 },
    medium: { width: 40, height: 40, border: 3 },
    large: { width: 60, height: 60, border: 4 }
  };

  const { width, height, border } = sizeMap[size];

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="rounded-full animate-spin"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: `${border}px solid #e5e7eb`,
          borderTopColor: color,
          borderLeftColor: color
        }}
      />
      {text && (
        <p className="text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * 按钮加载状态包装器
 */
export function ButtonWithLoading({
  loading,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      className={props.className}
      {...props}
    >
      {loading && (
        <LoadingSpinner
          size="small"
          color="#ffffff"
          // @ts-ignore
          className="mr-2"
        />
      )}
      {children}
    </button>
  );
}

/**
 * 卡片加载状态
 */
export function CardLoading({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-gray-100 rounded-lg animate-pulse"
          style={{ height: '120px' }}
        />
      ))}
    </div>
  );
}

/**
 * 表格加载状态
 */
export function TableLoading({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <div className="bg-gray-50 border rounded-lg overflow-hidden">
        {/* 表头 */}
        <div className="flex border-b">
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={index}
              className="flex-1 p-4 bg-gray-100 animate-pulse"
              style={{ height: '48px' }}
            />
          ))}
        </div>
        {/* 表格内容 */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex border-b last:border-b-0">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="flex-1 p-4 bg-white animate-pulse"
                style={{ height: '56px' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
