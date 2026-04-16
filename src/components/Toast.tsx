/**
 * Toast 消息提示组件
 * 用于显示操作反馈消息
 */

import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  /** 消息类型 */
  type: ToastType
  /** 消息内容 */
  message: string
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 自动关闭时间（毫秒） */
  duration?: number
  /** 是否显示关闭按钮 */
  showClose?: boolean
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-500'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500'
  }
}

/**
 * 单个 Toast 组件
 */
export function Toast({
  type,
  message,
  isOpen,
  onClose,
  duration = 3000,
  showClose = true
}: ToastProps) {
  const [progress, setProgress] = useState(100)
  const config = typeConfig[type]
  const Icon = config.icon

  useEffect(() => {
    if (!isOpen) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        onClose()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-right`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.textColor}`}>
            {message}
          </p>
        </div>
        {showClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* 进度条 */}
      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.iconColor.replace('text-', 'bg-')} transition-all duration-100`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// Toast 管理器
interface ToastItem {
  id: string
  type: ToastType
  message: string
}

/**
 * Toast 容器组件
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  // 暴露全局方法
  useEffect(() => {
    ;(window as any).toast = {
      success: (message: string) => addToast('success', message),
      error: (message: string) => addToast('error', message),
      warning: (message: string) => addToast('warning', message),
      info: (message: string) => addToast('info', message)
    }
  }, [addToast])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          isOpen={true}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

// 便捷调用方法
export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      ;(window as any).toast.success(message)
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      ;(window as any).toast.error(message)
    }
  },
  warning: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      ;(window as any).toast.warning(message)
    }
  },
  info: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      ;(window as any).toast.info(message)
    }
  }
}
