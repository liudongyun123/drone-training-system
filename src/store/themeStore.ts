/**
 * 主题状态管理
 * 支持深色/浅色模式切换和系统偏好检测
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  
  // 操作
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  setLight: () => void;
  setDark: () => void;
  setSystem: () => void;
}

const STORAGE_KEY = 'theme-storage';

// 检测系统偏好
const getSystemPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// 根据模式计算实际是否为深色
const computeIsDark = (mode: ThemeMode): boolean => {
  if (mode === 'system') {
    return getSystemPreference();
  }
  return mode === 'dark';
};

// 应用主题到 DOM
const applyTheme = (isDark: boolean) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: getSystemPreference(),

      setMode: (mode: ThemeMode) => {
        const isDark = computeIsDark(mode);
        set({ mode, isDark });
        applyTheme(isDark);
      },

      toggle: () => {
        const { mode, isDark } = get();
        let newMode: ThemeMode;
        
        // 智能切换逻辑
        if (mode === 'system') {
          newMode = isDark ? 'light' : 'dark';
        } else {
          newMode = mode === 'dark' ? 'light' : 'dark';
        }
        
        const newIsDark = computeIsDark(newMode);
        set({ mode: newMode, isDark: newIsDark });
        applyTheme(newIsDark);
      },

      setLight: () => {
        set({ mode: 'light', isDark: false });
        applyTheme(false);
      },

      setDark: () => {
        set({ mode: 'dark', isDark: true });
        applyTheme(true);
      },

      setSystem: () => {
        const isDark = getSystemPreference();
        set({ mode: 'system', isDark });
        applyTheme(isDark);
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 恢复时应用主题
          const isDark = computeIsDark(state.mode);
          state.isDark = isDark;
          applyTheme(isDark);
        }
      },
    }
  )
);

// 初始化系统偏好监听
export const initThemeListener = () => {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    const { mode } = useThemeStore.getState();
    if (mode === 'system') {
      const isDark = e.matches;
      useThemeStore.setState({ isDark });
      applyTheme(isDark);
    }
  };

  mediaQuery.addEventListener('change', handler);
  
  return () => mediaQuery.removeEventListener('change', handler);
};

// 主题初始化
export const initTheme = () => {
  const { mode } = useThemeStore.getState();
  const isDark = computeIsDark(mode);
  useThemeStore.setState({ isDark });
  applyTheme(isDark);
  
  // 启动监听
  return initThemeListener();
};

export default useThemeStore;
