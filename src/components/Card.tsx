/**
 * Card 卡片组件
 * 统一风格的卡片容器 - Retro-futuristic 航空美学
 */

import { ReactNode } from 'react'

export interface CardProps {
  /** 卡片内容 */
  children: ReactNode
  /** 标题 */
  title?: string
  /** 副标题 */
  subtitle?: string
  /** 操作按钮 */
  action?: ReactNode
  /** 自定义类名 */
  className?: string
  /** 是否有阴影 */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** 是否可点击 */
  hover?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 图片 */
  image?: string
  /** 图片高度 */
  imageHeight?: string
  /** 是否带边框 */
  bordered?: boolean
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const shadowMap = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow',
  lg: 'shadow-lg',
  xl: 'shadow-xl'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6'
}

/**
 * 卡片组件
 */
export default function Card({
  children,
  title,
  subtitle,
  action,
  className = '',
  shadow = 'md',
  hover = false,
  onClick,
  image,
  imageHeight = 'h-48',
  bordered = true,
  padding = 'md'
}: CardProps) {
  const baseStyles = bordered 
    ? 'bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-300' 
    : 'bg-white rounded-xl overflow-hidden transition-all duration-300'
  const shadowStyles = shadowMap[shadow]
  const hoverStyles = hover ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''
  const paddingStyle = paddingMap[padding]

  return (
    <div
      className={`${baseStyles} ${shadowStyles} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {/* 图片 */}
      {image && (
        <div className={`${imageHeight} w-full overflow-hidden`}>
          <img
            src={image}
            alt={title || 'Card image'}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}

      {/* 头部 */}
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {/* 内容 */}
      <div className={`${paddingStyle}`}>{children}</div>
    </div>
  )
}

/**
 * 统计卡片
 */
export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'blue',
  className = ''
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'amber'
  className?: string
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    yellow: 'bg-amber-50 text-amber-600 ring-amber-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
    purple: 'bg-purple-50 text-purple-600 ring-purple-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100'
  }

  const changeColor = {
    positive: 'text-emerald-600',
    negative: 'text-red-600',
    neutral: 'text-slate-600'
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 border border-slate-100 hover:shadow transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColor[changeType]}`}>
              {changeType === 'positive' && '↑ '}
              {changeType === 'negative' && '↓ '}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${colorMap[color]} ring-1`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 信息卡片
 */
export function InfoCard({
  title,
  description,
  icon,
  action,
  className = ''
}: {
  title: string
  description: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-5 flex items-start gap-4 border border-slate-100 hover:shadow transition-shadow ${className}`}>
      {icon && (
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/**
 * 简洁卡片（无边框） 
 */
export function SimpleCard({
  children,
  className = '',
  hover = false
}: {
  children: ReactNode
  className?: string
  hover?: boolean
}) {
  const hoverStyles = hover ? 'hover:bg-slate-50' : ''
  return (
    <div className={`bg-white rounded-xl p-5 ${hoverStyles} transition-colors ${className}`}>
      {children}
    </div>
  )
}
