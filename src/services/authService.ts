/**
 * 统一认证服务 - 生产级版本
 * 基于 CloudBase Web SDK 实现多种登录方式
 * 使用 app.auth() 自动处理 SDK 初始化
 */

// 统一从 utils/cloudbase 导入 app 实例
import { app, checkLogin } from '@/utils/cloudbase'

// 获取 AuthWrapper 实例（延迟初始化）
const getAuth = () => app.auth();

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
      const { data, error } = await getAuth().signInAnonymously()
      if (error) throw error
      const user = transformUser(data.user)
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
      const { data, error } = await getAuth().signInWithOtp({ phone })
      if (error) throw error
      
      return {
        verify: async (code: string) => {
          try {
            const { data: loginData, error: loginError } = await data.verifyOtp({ token: code })
            if (loginError) throw loginError
            const user = transformUser(loginData.user)
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
      const { data, error } = await getAuth().signInWithOtp({ email })
      if (error) throw error

      return {
        verify: async (code: string) => {
          try {
            const { data: loginData, error: loginError } = await data.verifyOtp({ token: code })
            if (loginError) throw loginError
            const user = transformUser(loginData.user)
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
      const { data, error } = await getAuth().signInWithPassword(params)
      if (error) throw error
      const user = transformUser(data.user)
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
      const { data, error } = await getAuth().signUp(params)
      if (error) throw error

      return {
        verify: async (code: string) => {
          try {
            const { data: loginData, error: loginError } = await data.verifyOtp({ token: code })
            if (loginError) throw loginError
            const user = transformUser(loginData.user)
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
      const { data, error } = await getAuth().getUser()
      if (error || !data.user) {
        cachedUser = null
        return null
      }
      const user = transformUser(data.user)
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
        const { data, error } = await getAuth().getSession()
        if (error || !data.session) {
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
      const { error } = await getAuth().signOut()
      if (error) throw error
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
      const { data, error } = await getAuth().updateUser(metadata)
      if (error) throw error
      const user = transformUser(data.user)
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
      const { error } = await getAuth().resetPasswordForOld({
        old_password: oldPassword,
        new_password: newPassword
      })
      if (error) throw error
      return { error: null }
    } catch (error: any) {
      console.error('修改密码失败:', error)
      return { error: new Error(handleRateLimitError(error)) }
    }
  },

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (event: string, session: any, user: AuthUser | null) => void): () => void {
    // 返回一个取消订阅函数
    let unsubscribe: (() => void) | null = null;
    
    // 立即初始化并设置监听
    getAuth().getLoginState().then(() => {
      // 重新获取 auth 实例来设置监听
      app.auth().onAuthStateChange?.((event: any, session: any) => {
        if (session) {
          setTimeout(() => {
            this.getCurrentUser().then(user => {
              callback(event, session, user)
            })
          }, 100)
        } else {
          cachedUser = null
          callback(event, session, null)
        }
      }).then((result: any) => {
        if (result?.subscription) {
          unsubscribe = () => result.subscription.unsubscribe();
        }
      }).catch((err: any) => {
        console.error('设置 auth 状态监听失败:', err);
      });
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
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
      const { data, error } = await getAuth().getSession()
      if (error || !data.session) return null
      return data.session.access_token
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
    id: user.id,
    email: user.email,
    phone: user.phone,
    nickname: user.user_metadata?.nickname || user.user_metadata?.nickName,
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl,
    gender: user.user_metadata?.gender,
    is_anonymous: user.is_anonymous || false,
    created_at: user.created_at,
    updated_at: user.updated_at,
    user_metadata: user.user_metadata
  }
}

// 导出 CloudBase 应用实例
export { app }
export default authService
