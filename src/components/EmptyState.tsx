/**
 * EmptyState 空状态组件
 * 用于显示无数据时的占位内容
 */

import { Box, Search, FileText, Inbox, ShoppingCart, Bell } from 'lucide-react'
import { ReactNode } from 'react'

interface EmptyStateProps {
  /** 图标 */
  icon?: ReactNode
  /** 标题 */
  title?: string
  /** 描述 */
  description?: string
  /** 操作按钮 */
  action?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 预设类型 */
  type?: 'default' | 'search' | 'data' | 'cart' | 'notification'
}

const presetIcons = {
  default: <Box className="w-16 h-16 text-gray-300" />,
  search: <Search className="w-16 h-16 text-gray-300" />,
  data: <FileText className="w-16 h-16 text-gray-300" />,
  cart: <ShoppingCart className="w-16 h-16 text-gray-300" />,
  notification: <Bell className="w-16 h-16 text-gray-300" />
}

const presetTitles = {
  default: '暂无数据',
  search: '未找到结果',
  data: '暂无内容',
  cart: '购物车是空的',
  notification: '暂无通知'
}

const presetDescriptions = {
  default: '这里暂时没有内容',
  search: '请尝试其他关键词搜索',
  data: '快去添加一些内容吧',
  cart: '快去选购心仪的课程吧',
  notification: '暂时没有新的通知消息'
}

/**
 * 空状态组件
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  type = 'default'
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="mb-4">
        {icon || presetIcons[type]}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title || presetTitles[type]}
      </h3>
      
      <p className="text-gray-500 text-center max-w-xs mb-6">
        {description || presetDescriptions[type]}
      </p>
      
      {action && (
        <div className="flex gap-3">
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * 搜索结果为空
 */
export function EmptySearchState({
  keyword,
  onClear
}: {
  keyword?: string
  onClear?: () => void
}) {
  return (
    <EmptyState
      type="search"
      title={keyword ? `未找到 "${keyword}" 相关结果` : '未找到结果'}
      description="请尝试其他关键词或筛选条件"
      action={onClear && (
        <button
          onClick={onClear}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          清除筛选
        </button>
      )}
    />
  )
}

/**
 * 购物车为空
 */
export function EmptyCartState({
  onBrowse
}: {
  onBrowse?: () => void
}) {
  return (
    <EmptyState
      type="cart"
      action={onBrowse && (
        <button
          onClick={onBrowse}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          去逛逛
        </button>
      )}
    />
  )
}

/**
 * 无权限状态
 */
export function NoPermissionState({
  onLogin
}: {
  onLogin?: () => void
}) {
  return (
    <EmptyState
      icon={<Inbox className="w-16 h-16 text-gray-300" />}
      title="暂无权限"
      description="您需要登录后才能查看此内容"
      action={onLogin && (
        <button
          onClick={onLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          立即登录
        </button>
      )}
    />
  )
}
