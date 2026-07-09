/**
 * 统一认证服务 - HTTP 版本
 * 通过 adminService.callFunction('api-auth') 实现认证
 * 不再依赖 @cloudbase/js-sdk
 */

import { adminService } from './adminService'

// 用户类型定义
export interface AuthUser {
  id: string
  email?: string
  phone?: string
  nickname?: string
  avatar_url?: string
  gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'
  is_anonymous: boolean
  created_at: string
  updated_at: string
  user_metadata?: Record<string, any>
}

// 登录方式枚举
export enum LoginMethod {
  ANONYMOUS = 'anonymous',
  PHONE_OTP = 'phone_otp',
  EMAIL_OTP = 'email_otp',
  PASSWORD = 'password',
  WECHAT = 'wechat'
}

// ============ 缓存机制 ============
let cachedUser: AuthUser | null = null
let cachedUserTime = 0
const CACHE_TTL = 60000 // 1分钟缓存

let isCheckingSession = false
let sessionPromise: Promise<any> | null = null

// 限流错误处理
const handleRateLimitError = (error: any): string => {
  if (error?.code === 'TooManyRequests' || 
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit')) {
    return '操作过于频繁，请稍后再试'
  }
  return error?.message || '操作失败，请重试'
}

// 认证服务
export const authService = {
  /**
   * 匿名登录
   */
  async signInAnonymously(): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'wxMiniappLogin',
        data: { type: 'anonymous' }
      })
      const user = transformUser(result?.data?.user || result?.data)
      cachedUser = user
      cachedUserTime = Date.now()
      return { user, error: null }
    } catch (error: any) {
      console.error('匿名登录失败:', error)
      return { user: null, error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 匿名登录（简化版）
   */
  async anonymousLogin(): Promise<{ user: AuthUser | null; error: Error | null }> {
    return this.signInAnonymously()
  },

  /**
   * 发送手机验证码
   */
  async sendPhoneCode(phone: string): Promise<{ 
    verify: (code: string) => Promise<{ user: AuthUser | null; error: Error | null }>
    error: Error | null 
  }> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'sendSmsCode',
        data: { phone }
      })
      if (!result?.success && result?.code !== 0) {
        throw new Error(result?.error || result?.message || '发送验证码失败')
      }

      return {
        verify: async (code: string) => {
          try {
            const loginResult = await adminService.callFunction('api-auth', {
              action: 'loginBySms',
              data: { phone, code }
            })
            const user = transformUser(loginResult?.data?.user || loginResult?.data)
            cachedUser = user
            cachedUserTime = Date.now()
            return { user, error: null }
          } catch (err: any) {
            return { user: null, error: new Error(handleRateLimitError(err)) }
          }
        },
        error: null
      }
    } catch (error: any) {
      console.error('发送验证码失败:', error)
      return { 
        verify: async () => ({ user: null, error: new Error(handleRateLimitError(error)) }), 
        error: new Error(handleRateLimitError(error)) 
      }
    }
  },

  /**
   * 发送邮箱验证码
   */
  async sendEmailCode(email: string): Promise<{
    verify: (code: string) => Promise<{ user: AuthUser | null; error: Error | null }>
    error: Error | null
  }> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'sendSmsCode',
        data: { email }
      })
      if (!result?.success && result?.code !== 0) {
        throw new Error(result?.error || result?.message || '发送验证码失败')
      }

      return {
        verify: async (code: string) => {
          try {
            const loginResult = await adminService.callFunction('api-auth', {
              action: 'loginBySms',
              data: { email, code }
            })
            const user = transformUser(loginResult?.data?.user || loginResult?.data)
            cachedUser = user
            cachedUserTime = Date.now()
            return { user, error: null }
          } catch (err: any) {
            return { user: null, error: new Error(handleRateLimitError(err)) }
          }
        },
        error: null
      }
    } catch (error: any) {
      console.error('发送邮箱验证码失败:', error)
      return { 
        verify: async () => ({ user: null, error: new Error(handleRateLimitError(error)) }), 
        error: new Error(handleRateLimitError(error)) 
      }
    }
  },

  /**
   * 用户名/密码登录
   */
  async signInWithPassword(params: { 
    username?: string
    email?: string
    phone?: string
    password: string 
  }): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'adminLogin',
        data: params
      })
      const user = transformUser(result?.data?.user || result?.data)
      cachedUser = user
      cachedUserTime = Date.now()
      return { user, error: null }
    } catch (error: any) {
      console.error('密码登录失败:', error)
      return { user: null, error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 注册新用户
   */
  async signUp(params: {
    email?: string
    phone?: string
    nickname?: string
    password?: string
  }): Promise<{
    verify: (code: string) => Promise<{ user: AuthUser | null; error: Error | null }>
    error: Error | null
  }> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'register',
        data: params
      })
      if (!result?.success && result?.code !== 0) {
        throw new Error(result?.error || result?.message || '注册失败')
      }

      return {
        verify: async (code: string) => {
          try {
            const loginResult = await adminService.callFunction('api-auth', {
              action: 'loginBySms',
              data: { phone: params.phone, code }
            })
            const user = transformUser(loginResult?.data?.user || loginResult?.data)
            cachedUser = user
            cachedUserTime = Date.now()
            return { user, error: null }
          } catch (err: any) {
            return { user: null, error: new Error(handleRateLimitError(err)) }
          }
        },
        error: null
      }
    } catch (error: any) {
      console.error('注册失败:', error)
      return { 
        verify: async () => ({ user: null, error: new Error(handleRateLimitError(error)) }), 
        error: new Error(handleRateLimitError(error)) 
      }
    }
  },

  /**
   * 获取当前登录用户（带缓存）
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return cachedUser
    }
    
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'verifyToken',
        data: {}
      })
      const user = transformUser(result?.data?.user || result?.data)
      cachedUser = user
      cachedUserTime = Date.now()
      return user
    } catch (error: any) {
      console.error('获取用户信息失败:', error)
      if (error?.message?.includes('rate limit')) {
        return cachedUser
      }
      return null
    }
  },

  /**
   * 检查登录状态（带防抖）
   */
  async checkSession(): Promise<{ isAuthenticated: boolean; user: AuthUser | null }> {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return { isAuthenticated: true, user: cachedUser }
    }

    if (isCheckingSession && sessionPromise) {
      return sessionPromise
    }

    isCheckingSession = true
    sessionPromise = (async () => {
      try {
        const result = await adminService.callFunction('api-auth', {
          action: 'verifyToken',
          data: {}
        })
        if (!result?.success && !result?.data) {
          return { isAuthenticated: false, user: null }
        }
        const user = await this.getCurrentUser()
        return { isAuthenticated: !!user, user }
      } catch (error: any) {
        console.error('检查会话失败:', error)
        if (error?.message?.includes('rate limit')) {
          return { isAuthenticated: !!cachedUser, user: cachedUser }
        }
        return { isAuthenticated: false, user: null }
      } finally {
        isCheckingSession = false
        sessionPromise = null
      }
    })()

    return sessionPromise
  },

  /**
   * 退出登录
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await adminService.callFunction('api-auth', {
        action: 'logout',
        data: {}
      })
      cachedUser = null
      cachedUserTime = 0
      return { error: null }
    } catch (error: any) {
      console.error('退出登录失败:', error)
      return { error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 更新用户信息
   */
  async updateUser(metadata: {
    nickname?: string
    avatar_url?: string
    gender?: 'MALE' | 'FEMALE' | 'UNKNOWN'
  }): Promise<{ user: AuthUser | null; error: Error | null }> {
    try {
      const result = await adminService.callFunction('api-user', {
        action: 'updateProfile',
        data: metadata
      })
      const user = transformUser(result?.data?.user || result?.data)
      cachedUser = user
      cachedUserTime = Date.now()
      return { user, error: null }
    } catch (error: any) {
      console.error('更新用户信息失败:', error)
      return { user: null, error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ error: Error | null }> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'changePassword',
        data: { phone: cachedUser?.phone, oldPassword, newPassword }
      })
      if (!result?.success && result?.code !== 0) {
        throw new Error(result?.error || result?.message || '修改密码失败')
      }
      return { error: null }
    } catch (error: any) {
      console.error('修改密码失败:', error)
      return { error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 监听认证状态变化（简化版，基于轮询）
   */
  onAuthStateChange(callback: (event: string, session: any, user: AuthUser | null) => void): () => void {
    let intervalId: NodeJS.Timeout | null = null;
    let lastState: boolean | null = null;
    
    // 每30秒检查一次认证状态
    intervalId = setInterval(async () => {
      try {
        const { isAuthenticated, user } = await this.checkSession();
        if (lastState !== isAuthenticated) {
          lastState = isAuthenticated;
          callback(isAuthenticated ? 'SIGNED_IN' : 'SIGNED_OUT', null, user);
        }
      } catch {
        // 忽略检查错误
      }
    }, 30000);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  },

  /**
   * 刷新用户信息
   */
  async refreshUser(): Promise<{ user: AuthUser | null; error: Error | null }> {
    cachedUserTime = 0
    try {
      const user = await this.getCurrentUser()
      return { user, error: null }
    } catch (error: any) {
      return { user: null, error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 获取访问令牌
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const result = await adminService.callFunction('api-auth', {
        action: 'verifyToken',
        data: {}
      })
      return result?.data?.access_token || result?.data?.token || null
    } catch (error: any) {
      console.error('获取访问令牌失败:', error)
      return null
    }
  },

  /**
   * 获取缓存的用户（同步方法）
   */
  getCachedUser(): AuthUser | null {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return cachedUser
    }
    return null
  },

  /**
   * 清除用户缓存
   */
  clearCache(): void {
    cachedUser = null
    cachedUserTime = 0
  },

  /**
   * 转换用户数据
   */
  getTransformUser(): typeof transformUser {
    return transformUser;
  }
}

// 内部函数：转换用户数据
function transformUser(user: any): AuthUser | null {
  if (!user) return null
  return {
    id: user.id || user.uid || user._id || '',
    email: user.email,
    phone: user.phone,
    nickname: user.nickname || user.user_metadata?.nickname || user.user_metadata?.nickName,
    avatar_url: user.avatar_url || user.avatar || user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl,
    gender: user.gender || user.user_metadata?.gender,
    is_anonymous: user.is_anonymous || user.isAnonymous || false,
    created_at: user.created_at || user.createdAt || '',
    updated_at: user.updated_at || user.updatedAt || '',
    user_metadata: user.user_metadata
  }
}

export default authService
