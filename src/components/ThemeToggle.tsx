/**
 * 主题切换组件
 * 支持深色/浅色/系统三种模式切换
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useThemeStore, ThemeMode } from '../store/themeStore';

interface ThemeToggleProps {
  variant?: 'default' | 'minimal' | 'segmented';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'default',
  size = 'md',
  showLabel = false,
}) => {
  const { mode, isDark, setMode, toggle } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // 切换按钮（简单模式）
  if (variant === 'minimal') {
    return (
      <button
        onClick={toggle}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors ${
          isDark
            ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }`}
        title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 180 : 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isDark ? (
            <Moon size={iconSizes[size]} />
          ) : (
            <Sun size={iconSizes[size]} />
          )}
        </motion.div>
      </button>
    );
  }

  // 分段选择器
  if (variant === 'segmented') {
    return (
      <div className="inline-flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
        {modes.map(({ value, label, icon: Icon }) => {
          const isActive = mode === value;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="theme-segment"
                  className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                {label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // 下拉菜单模式（默认）
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors ${
          isDark
            ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
        }`}
        title="切换主题"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isDark ? 'dark' : 'light'}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? (
              <Moon size={iconSizes[size]} />
            ) : (
              <Sun size={iconSizes[size]} />
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 py-2 min-w-[160px]"
            >
              {modes.map(({ value, label, icon: Icon }) => {
                const isActive = mode === value;
                return (
                  <button
                    key={value}
                    onClick={() => {
                      setMode(value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </span>
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 带标签的主题切换
 */
export const ThemeToggleWithLabel: React.FC = () => {
  const { mode, isDark } = useThemeStore();

  const labels: Record<ThemeMode, string> = {
    light: '浅色模式',
    dark: '深色模式',
    system: '跟随系统',
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isDark ? 'bg-slate-800 text-yellow-400' : 'bg-blue-100 text-blue-600'
        }`}>
          {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            外观
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {labels[mode]}
          </p>
        </div>
      </div>
      <ThemeToggle variant="minimal" size="sm" />
    </div>
  );
};

export default ThemeToggle;
