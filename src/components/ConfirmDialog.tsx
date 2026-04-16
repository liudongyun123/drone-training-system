/**
 * ConfirmDialog 确认对话框组件
 * 用于确认操作、提示信息等
 */

import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'
import { useEffect, useCallback } from 'react'

export interface ConfirmDialogProps {
  /** 是否显示 */
  isOpen: boolean
  /** 标题 */
  title: string
  /** 内容 */
  message: string
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 确认按钮类型 */
  type?: 'info' | 'success' | 'warning' | 'danger'
  /** 确认回调 */
  onConfirm: () => void
  /** 取消回调 */
  onCancel: () => void
  /** 是否加载中 */
  loading?: boolean
  /** 是否显示关闭按钮 */
  showClose?: boolean
}

const typeConfig = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    confirmButton: 'bg-blue-500 hover:bg-blue-600'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-50',
    confirmButton: 'bg-green-500 hover:bg-green-600'
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    confirmButton: 'bg-yellow-500 hover:bg-yellow-600'
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    confirmButton: 'bg-red-500 hover:bg-red-600'
  }
}

/**
 * 确认对话框组件
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  onConfirm,
  onCancel,
  loading = false,
  showClose = true
}: ConfirmDialogProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  // 处理 ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* 对话框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* 关闭按钮 */}
          {showClose && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          {/* 内容 */}
          <div className="flex items-start gap-4">
            <div className={`${config.bgColor} rounded-full p-3 flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-gray-500">
                {message}
              </p>
            </div>
          </div>
          
          {/* 按钮 */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${config.confirmButton}`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 使用 hook 管理对话框状态
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean
    title: string
    message: string
    type: ConfirmDialogProps['type']
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {}
  })

  const open = useCallback((options: {
    title: string
    message: string
    type?: ConfirmDialogProps['type']
    onConfirm: () => void
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      onConfirm: options.onConfirm
    })
  }, [])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const ConfirmDialogComponent = useCallback(() => (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      type={state.type}
      onConfirm={() => {
        state.onConfirm()
        close()
      }}
      onCancel={close}
    />
  ), [state, close])

  return { open, close, ConfirmDialog: ConfirmDialogComponent }
}

// 导入 React
import React from 'react'
