/**
 * Button 按钮组件
 * 统一风格的按钮组件 - Retro-futuristic 航空美学
 */

import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber'
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否加载中 */
  loading?: boolean
  /** 加载文本 */
  loadingText?: string
  /** 图标 */
  icon?: ReactNode
  /** 图标位置 */
  iconPosition?: 'left' | 'right'
  /** 是否块级显示 */
  block?: boolean
}

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
  outline: 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 shadow-sm hover:shadow',
  amber: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400 shadow-sm hover:shadow'
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl'
}

/**
 * 按钮组件
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = '加载中...',
  icon,
  iconPosition = 'left',
  block = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${block ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
        </>
      )}
    </button>
  )
}

/**
 * 图标按钮
 */
export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  className = '',
  ...props
}: Omit<ButtonProps, 'icon' | 'iconPosition' | 'children'> & { icon: ReactNode }) {
  const sizeMap = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={`${sizeMap[size]} rounded-lg ${className}`}
      {...props}
    >
      <span className={iconSizeMap[size]}>{icon}</span>
    </Button>
  )
}
