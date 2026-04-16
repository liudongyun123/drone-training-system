/**
 * 主题上下文 - 支持深色/浅色模式切换
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
  CssBaseline,
  PaletteMode,
} from '@mui/material'

interface ThemeContextType {
  mode: PaletteMode
  toggleMode: () => void
  setMode: (mode: PaletteMode) => void
  isAdminMode?: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleMode: () => {},
  setMode: () => {},
  isAdminMode: false,
})

export const useThemeMode = () => useContext(ThemeContext)

interface ThemeProviderProps {
  children: React.ReactNode
  forceLightMode?: boolean
}

export function ThemeProvider({ children, forceLightMode = false }: ThemeProviderProps) {
  // 从localStorage读取保存的主题设置
  // 如果是管理后台(forceLightMode=true)或首次访问，默认使用浅色模式
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-mode') as PaletteMode
      if (saved) return saved
      // 管理后台强制使用浅色模式，避免系统深色模式干扰
      if (forceLightMode || window.location.pathname.startsWith('/admin')) {
        return 'light'
      }
    }
    return 'light'
  })

  // 保存主题设置
  useEffect(() => {
    localStorage.setItem('theme-mode', mode)
  }, [mode])

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  // 确定最终模式 - 管理后台始终使用浅色模式
  const finalMode = (forceLightMode || typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) 
    ? 'light' 
    : mode

  // 创建主题
  const theme = createTheme({
    palette: {
      mode: finalMode,
      primary: {
        main: finalMode === 'light' ? '#1976d2' : '#90caf9',
      },
      secondary: {
        main: finalMode === 'light' ? '#dc004e' : '#f48fb1',
      },
      background: {
        default: finalMode === 'light' ? '#f5f5f5' : '#121212',
        paper: finalMode === 'light' ? '#ffffff' : '#1e1e1e',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: finalMode === 'dark' ? '#6b6b6b #2b2b2b' : '#959595 #f5f5f5',
            '&::-webkit-scrollbar': {
              width: 8,
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              background: finalMode === 'dark' ? '#2b2b2b' : '#f5f5f5',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: finalMode === 'dark' ? '#6b6b6b' : '#959595',
              borderRadius: 4,
            },
          },
        },
      },
    },
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
  })

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, setMode, isAdminMode: forceLightMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
