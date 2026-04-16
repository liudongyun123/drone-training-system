/**
 * 统一认证状态管理 - 优化版（带限流保护）
 */

import { create } from 'zustand'
import { authService } from '../services/cloudBaseService'

interface User {
  uid: string
  name: string
  email: string
  nickName?: string
  avatar?: string
  level: 'beginner' | 'intermediate' | 'advanced'
  progress: {
    completedCourses: string[]
    currentCourseId?: string
    totalHours: number
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  updateProgress: (courseId: string, hours: number) => void
  initAuth: () => Promise<void>
  clearError: () => void
}

// 初始化标记，防止重复初始化
let isInitializing = false

export const useCloudAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // 初始化认证状态
  initAuth: async () => {
    // 防止重复初始化
    if (isInitializing) {
      console.log('⏳ 认证初始化正在进行中，跳过重复调用')
      return
    }

    // 先检查缓存
    const cachedUser = authService.getCachedUser?.()
    if (cachedUser) {
      console.log('✅ 使用缓存的用户信息')
      set({
        user: {
          uid: cachedUser.id,
          name: cachedUser.nickname || '匿名用户',
          email: cachedUser.email || '',
          nickName: cachedUser.nickname,
          avatar: cachedUser.avatar_url,
          level: 'beginner',
          progress: {
            completedCourses: [],
            totalHours: 0,
          },
        },
        isAuthenticated: true,
        isLoading: false,
      })
      return
    }

    isInitializing = true
    set({ isLoading: true, error: null })

    try {
      // 先检查会话状态，避免重复登录
      const { isAuthenticated } = await authService.checkSession()
      if (isAuthenticated) {
        const cloudUser = await authService.getCurrentUser()
        if (cloudUser) {
          const user: User = {
            uid: cloudUser.id,
            name: cloudUser.nickname || '匿名用户',
            email: cloudUser.email || '',
            nickName: cloudUser.nickname,
            avatar: cloudUser.avatar_url,
            level: 'beginner',
            progress: {
              completedCourses: [],
              totalHours: 0,
            },
          }
          set({ user, isAuthenticated: true, isLoading: false })
          console.log('✅ 用户已登录，无需重复登录')
        }
      } else {
        console.log('ℹ️ 用户未登录，需要登录')
        set({ isLoading: false })
      }
    } catch (error: any) {
      console.error('初始化认证失败:', error)
      const errorMessage = error?.message || '初始化失败'
      set({ error: errorMessage, isLoading: false })
    } finally {
      isInitializing = false
    }
  },

  // 登录
  login: async () => {
    set({ isLoading: true, error: null })
    
    try {
      // 检查是否已登录
      const { isAuthenticated } = await authService.checkSession()
      if (isAuthenticated) {
        console.log('✅ 用户已登录，无需重复登录')
        set({ isLoading: false })
        return
      }

      await authService.signInAnonymously()
      const cloudUser = await authService.getCurrentUser()

      if (cloudUser) {
        const user: User = {
          uid: cloudUser.id,
          name: cloudUser.nickname || '匿名用户',
          email: cloudUser.email || '',
          nickName: cloudUser.nickname,
          avatar: cloudUser.avatar_url,
          level: 'beginner',
          progress: {
            completedCourses: [],
            totalHours: 0,
          },
        }
        set({ user, isAuthenticated: true, isLoading: false })
        console.log('✅ 匿名登录成功')
      }
    } catch (error: any) {
      console.error('登录失败:', error)
      const errorMessage = error?.message || '登录失败'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 退出登录
  logout: async () => {
    set({ isLoading: true })
    try {
      await authService.logout()
      authService.clearCache?.()
      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch (error: any) {
      console.error('退出登录失败:', error)
      set({ error: error?.message || '退出失败', isLoading: false })
      throw error
    }
  },

  // 清除错误
  clearError: () => set({ error: null }),

  // 更新学习进度
  updateProgress: (courseId: string, hours: number) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            progress: {
              ...state.user.progress,
              completedCourses: [...state.user.progress.completedCourses, courseId],
              totalHours: state.user.progress.totalHours + hours,
            },
          }
        : null,
    })),
}))

export default useCloudAuthStore
