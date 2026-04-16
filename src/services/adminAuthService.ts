/**
 * 管理员认证服务
 * 处理管理员登录、权限验证
 */

import { adminService } from './adminService'
import bcrypt from 'bcryptjs'

// 管理员用户接口
export interface AdminUser {
  id: string
  username: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  createdAt: string
}

// 认证状态
interface AuthState {
  isAuthenticated: boolean
  user: AdminUser | null
  loading: boolean
}

// 本地存储键
const STORAGE_KEY = 'admin_auth'

/**
 * 管理员认证服务
 */
export const adminAuthService = {
  // 当前认证状态
  state: {
    isAuthenticated: false,
    user: null,
    loading: false,
  } as AuthState,

  // 认证状态变化监听器
  listeners: ((() => []) as () => Array<(state: AuthState) => void>)(),

  /**
   * 订阅认证状态变化
   */
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener)
    // 立即调用一次，返回当前状态
    listener(this.state)
    
    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  },

  /**
   * 通知所有监听器
   */
  notify() {
    this.listeners.forEach(listener => listener(this.state))
  },

  /**
   * 初始化认证状态
   */
  async init() {
    this.state.loading = true
    this.notify()

    try {
      // 从本地存储恢复认证状态
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const authData = JSON.parse(stored)
        
        // 验证管理员权限
        const result = await adminService.list('users', { 
          _id: authData.userId,
          role: { $in: ['admin', 'super_admin'] }
        })

        if (result.data && result.data.length > 0) {
          this.state.isAuthenticated = true
          this.state.user = result.data[0]
        } else {
          // 用户不是管理员，清除认证状态
          this.clearAuth()
        }
      }
    } catch (error) {
      console.error('初始化认证状态失败:', error)
      this.clearAuth()
    } finally {
      this.state.loading = false
      this.notify()
    }
  },

  /**
   * 管理员登录
   */
  async login(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    this.state.loading = true
    this.notify()

    try {
      // 查询管理员用户
      const result = await adminService.list('users', {
        username,
        role: { $in: ['admin', 'super_admin'] }
      })

      if (!result.data || result.data.length === 0) {
        return {
          success: false,
          message: '用户名或密码错误'
        }
      }

      const user = result.data[0]

      // 验证密码 - 支持明文和加密密码
      let isPasswordValid = false
      
      // 检查密码是否已加密（bcrypt哈希以$2a$、$2b$或$2y$开头）
      if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'))) {
        // 使用bcrypt验证加密密码
        isPasswordValid = bcrypt.compareSync(password, user.password)
      } else {
        // 明文密码验证（兼容旧数据）
        isPasswordValid = user.password === password
      }
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: '用户名或密码错误'
        }
      }

      // 登录成功
      const authData = {
        userId: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions || [],
        loginTime: new Date().toISOString()
      }

      // 保存到本地存储
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))

      // 更新认证状态
      this.state.isAuthenticated = true
      this.state.user = {
        id: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions || [],
        createdAt: user.createdAt
      }

      this.notify()

      // 记录登录日志
      await adminService.add('system_logs', {
        level: 'info',
        module: 'auth',
        operation: 'login',
        message: `管理员 ${username} 登录成功`,
        userId: user._id,
        username: user.username
      })

      return { success: true }
    } catch (error) {
      console.error('登录失败:', error)
      return {
        success: false,
        message: '登录失败，请稍后重试'
      }
    } finally {
      this.state.loading = false
      this.notify()
    }
  },

  /**
   * 管理员登出
   */
  async logout(): Promise<void> {
    try {
      // 记录登出日志
      if (this.state.user) {
        await adminService.add('system_logs', {
          level: 'info',
          module: 'auth',
          operation: 'logout',
          message: `管理员 ${this.state.user.username} 登出`,
          userId: this.state.user.id,
          username: this.state.user.username
        })
      }
    } catch (error) {
      console.error('记录登出日志失败:', error)
    }

    // 清除认证状态
    this.clearAuth()
  },

  /**
   * 检查权限
   */
  hasPermission(permission: string): boolean {
    if (!this.state.isAuthenticated || !this.state.user) {
      return false
    }

    // 超级管理员拥有所有权限
    if (this.state.user.role === 'super_admin') {
      return true
    }

    // 检查是否有指定权限
    return this.state.user.permissions.includes(permission)
  },

  /**
   * 检查是否是超级管理员
   */
  isSuperAdmin(): boolean {
    return this.state.user?.role === 'super_admin'
  },

  /**
   * 清除认证状态
   */
  clearAuth() {
    localStorage.removeItem(STORAGE_KEY)
    this.state.isAuthenticated = false
    this.state.user = null
    this.notify()
  },

  /**
   * 获取当前管理员信息
   */
  getCurrentAdmin(): AdminUser | null {
    return this.state.user
  },

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  },

  /**
   * 加密密码
   * @param password 明文密码
   * @returns 加密后的密码哈希
   */
  hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10)
    return bcrypt.hashSync(password, salt)
  },

  /**
   * 验证密码
   * @param password 明文密码
   * @param hashedPassword 加密后的密码
   * @returns 是否匹配
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    // 检查是否是bcrypt哈希
    if (hashedPassword && (hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2y$'))) {
      return bcrypt.compareSync(password, hashedPassword)
    }
    // 明文密码兼容
    return password === hashedPassword
  }
}

export default adminAuthService
