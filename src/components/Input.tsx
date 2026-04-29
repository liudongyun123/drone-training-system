/**
 * Input 输入框组件
 * 统一风格的表单输入组件 - Retro-futuristic 航空美学
 */

import { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** 标签 */
  label?: string
  /** 错误信息 */
  error?: string
  /** 提示文本 */
  hint?: string
  /** 前缀图标 */
  prefix?: ReactNode
  /** 后缀图标 */
  suffix?: ReactNode
  /** 自定义类名 */
  wrapperClassName?: string
}

/**
 * 输入框组件
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className = '', wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={`w-full ${wrapperClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {prefix && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-400">{prefix}</span>
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              block w-full rounded-lg border-slate-300 bg-white
              focus:border-blue-500 focus:ring-blue-500 focus:ring-1
              hover:border-slate-400
              disabled:bg-slate-100 disabled:cursor-not-allowed
              ${prefix ? 'pl-10' : 'pl-3'}
              ${suffix ? 'pr-10' : 'pr-3'}
              ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
              py-2.5 text-base text-slate-900 placeholder:text-slate-400
              transition-colors duration-200
              ${className}
            `}
            {...props}
          />
          
          {suffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-slate-400">{suffix}</span>
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        
        {hint && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

/**
 * 文本域组件
 */
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          className={`
            block w-full rounded-lg border-slate-300 bg-white
            focus:border-blue-500 focus:ring-blue-500 focus:ring-1
            hover:border-slate-400
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
            py-2.5 px-3 text-base text-slate-900 placeholder:text-slate-400
            transition-colors duration-200 resize-y min-h-[100px]
            ${className}
          `}
          {...props}
        />
        
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        
        {hint && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
        )}
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

/**
 * 选择框组件
 */
export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <select
          ref={ref}
          className={`
            block w-full rounded-lg border-slate-300 bg-white
            focus:border-blue-500 focus:ring-blue-500 focus:ring-1
            hover:border-slate-400
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}
            py-2.5 px-3 text-base text-slate-900
            transition-colors duration-200 cursor-pointer
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
        
        {hint && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

/**
 * 表单分组标签
 */
export function FormGroup({ 
  children, 
  className = '' 
}: { 
  children: ReactNode
  className?: string 
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${className}`}>
      {children}
    </div>
  )
}

export default Input
