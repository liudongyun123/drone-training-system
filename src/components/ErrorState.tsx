/**
 * ErrorState 错误状态组件
 * 用于显示错误信息和重试按钮
 */

import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ErrorStateProps {
  /** 错误标题 */
  title?: string
  /** 错误描述 */
  message?: string
  /** 重试回调 */
  onRetry?: () => void
  /** 是否显示返回首页按钮 */
  showHome?: boolean
  /** 是否显示返回按钮 */
  showBack?: boolean
  /** 自定义类名 */
  className?: string
  /** 错误类型 */
  type?: 'error' | 'warning' | 'info'
}

/**
 * 错误状态组件
 */
export default function ErrorState({
  title = '出错了',
  message = '加载数据时出现问题，请稍后重试',
  onRetry,
  showHome = false,
  showBack = false,
  className = '',
  type = 'error'
}: ErrorStateProps) {
  const navigate = useNavigate()

  const typeStyles = {
    error: {
      icon: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-200',
      button: 'bg-red-500 hover:bg-red-600'
    },
    warning: {
      icon: 'text-yellow-500',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      button: 'bg-yellow-500 hover:bg-yellow-600'
    },
    info: {
      icon: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      button: 'bg-blue-500 hover:bg-blue-600'
    }
  }

  const styles = typeStyles[type]

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className={`${styles.bg} ${styles.border} border rounded-full p-6 mb-6`}>
        <AlertCircle className={`w-12 h-12 ${styles.icon}`} />
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 text-center max-w-md mb-6">
        {message}
      </p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className={`inline-flex items-center px-4 py-2 ${styles.button} text-white rounded-lg transition-colors`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </button>
        )}
        
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </button>
        )}
        
        {showHome && (
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            返回首页
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 404 页面未找到
 */
export function NotFoundState({ 
  message = '页面不存在或已被移除',
  showHome = true 
}: { 
  message?: string
  showHome?: boolean 
}) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="text-9xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">页面未找到</h1>
        <p className="text-gray-500 mb-8">{message}</p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </button>
          
          {showHome && (
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 网络错误状态
 */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="网络连接失败"
      message="请检查您的网络连接，或稍后重试"
      type="warning"
      onRetry={onRetry}
      showBack
    />
  )
}
