import { create } from 'zustand'
import { callCloudFunction } from '../config/tcb'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

interface CloudAuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (code: string) => Promise<void>
  logout: () => void
}

export const useCloudAuthStore = create<CloudAuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async (code: string) => {
    try {
      const result = await callCloudFunction('api/auth-login', { code })
      if (result.code === 0) {
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        set({
          user: result.data.user,
          token: result.data.token,
          isAuthenticated: true
        })
      }
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  }
}))

// 初始化时从 localStorage 恢复状态
const savedToken = localStorage.getItem('token')
const savedUser = localStorage.getItem('user')
if (savedToken && savedUser) {
  useCloudAuthStore.setState({
    token: savedToken,
    user: JSON.parse(savedUser),
    isAuthenticated: true
  })
}
