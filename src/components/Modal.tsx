/**
 * Modal 模态框组件 - 统一UI风格
 */

import { X } from 'lucide-react'
import { useEffect, useCallback, ReactNode } from 'react'
import Button from './Button'

export interface ModalProps {
  /** 是否显示 */
  isOpen: boolean
  /** 标题 */
  title?: string
  /** 内容 */
  children: ReactNode
  /** 关闭回调 */
  onClose: () => void
  /** 自定义类名 */
  className?: string
  /** 是否显示关闭按钮 */
  showClose?: boolean
  /** 点击遮罩是否关闭 */
  closeOnOverlayClick?: boolean
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** 是否显示底部按钮 */
  showFooter?: boolean
  /** 底部自定义内容 */
  footer?: ReactNode
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 确认回调 */
  onConfirm?: () => void
  /** 取消回调 */
  onCancel?: () => void
  /** 是否显示加载状态 */
  loading?: boolean
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl mx-4'
}

/**
 * Modal 模态框组件
 */
export default function Modal({
  isOpen,
  title,
  children,
  onClose,
  className = '',
  showClose = true,
  closeOnOverlayClick = true,
  size = 'md',
  showFooter = false,
  footer,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  loading = false
}: ModalProps) {
  // 处理 ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* 对话框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeMap[size]} transform transition-all animate-in zoom-in-95 duration-200 ${className}`}
        >
          {/* 头部 */}
          {(title || showClose) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              {title && (
                <h3 className="text-lg font-semibold text-slate-900">
                  {title}
                </h3>
              )}
              {showClose && (
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors ml-auto"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* 内容 */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {children}
          </div>

          {/* 底部 */}
          {showFooter && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              {footer || (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onCancel?.()
                      onClose()
                    }}
                    disabled={loading}
                  >
                    {cancelText}
                  </Button>
                  <Button 
                    onClick={onConfirm}
                    loading={loading}
                  >
                    {confirmText}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 抽屉组件
 */
export function Drawer({
  isOpen,
  title,
  children,
  onClose,
  position = 'right',
  size = 'md',
  showFooter = false,
  footer,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  loading = false
}: ModalProps & { position?: 'left' | 'right' }) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

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

  const widthMap = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[40rem]',
    full: 'w-full'
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-50 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        className={`fixed top-0 h-full bg-white shadow-2xl z-50 transition-transform duration-300 ease-out ${widthMap[size]} ${
          position === 'left' ? 'left-0' : 'right-0'
        } ${
          isOpen
            ? 'translate-x-0'
            : position === 'left'
            ? '-translate-x-full'
            : 'translate-x-full'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
          {children}
        </div>

        {/* 底部 */}
        {showFooter && (
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
            {footer || (
              <>
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  {cancelText}
                </Button>
                <Button onClick={onConfirm} loading={loading}>
                  {confirmText}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * 确认对话框
 */
export function ConfirmDialog({
  isOpen,
  title = '确认操作',
  content,
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  loading = false,
  type = 'warning' // warning | danger | info
}: {
  isOpen: boolean
  title?: string
  content: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  loading?: boolean
  type?: 'warning' | 'danger' | 'info'
}) {
  const iconMap = {
    warning: 'text-amber-500',
    danger: 'text-red-500',
    info: 'text-blue-500'
  }

  const buttonVariant = type === 'danger' ? 'danger' : 'primary'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      showFooter
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          type === 'danger' ? 'bg-red-100' : type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
        }`}>
          <span className={`text-lg ${iconMap[type]}`}>!</span>
        </div>
        <div className="flex-1">{content}</div>
      </div>
    </Modal>
  )
}
