/**
 * Loading 加载组件 - 统一UI风格
 */

import { Loader2 } from 'lucide-react'

interface LoadingProps {
  /** 加载文本 */
  text?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 是否全屏 */
  fullScreen?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否显示遮罩 */
  overlay?: boolean
  /** 颜色 */
  color?: 'blue' | 'white' | 'slate'
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
}

const colorMap = {
  blue: 'text-blue-500',
  white: 'text-white',
  slate: 'text-slate-500'
}

/**
 * 加载组件
 */
export default function Loading({
  text = '加载中...',
  size = 'lg',
  fullScreen = false,
  className = '',
  overlay = false,
  color = 'blue'
}: LoadingProps) {
  const content = (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Loader2 className={`${sizeMap[size]} ${colorMap[color]} animate-spin`} />
      {text && (
        <span className={`${textSizeMap[size]} text-slate-500`}>{text}</span>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 ${
        overlay ? 'bg-black/50 backdrop-blur-sm' : 'bg-slate-100'
      }`}>
        {content}
      </div>
    )
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10 rounded-xl">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  )
}

/**
 * 骨架屏组件
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
  )
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-6 w-3/4 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  )
}

/**
 * 列表骨架屏
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 表格骨架屏
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-24 rounded" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-slate-100 last:border-0">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
