// 统一从 utils/cloudbase 导入 app 实例，避免重复初始化
import { app } from '@/utils/cloudbase'

export const db = app.database()
export const auth = app.auth()

// 用户缓存
let cachedUser: any = null
let cachedUserTime = 0
const CACHE_TTL = 60000 // 1分钟

let isCheckingSession = false
let sessionPromise: Promise<any> | null = null

// 限流错误处理
const handleRateLimitError = (error: any): string => {
  if (error?.code === 'TooManyRequests' || 
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit')) {
    return '操作过于频繁，请稍后再试'
  }
  return error?.message || '操作失败'
}

// 认证状态管理
export const authService = {
  // 匿名登录
  async anonymousLogin() {
    try {
      await auth.anonymousAuthProvider().signIn()
      const user = await this.getCurrentUser()
      return user
    } catch (error: any) {
      console.error('匿名登录失败:', error)
      throw new Error(handleRateLimitError(error))
    }
  },

  // 获取当前用户（带缓存）
  async getCurrentUser() {
    // 检查缓存
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return cachedUser
    }
    
    try {
      const user = await auth.getCurrentUser()
      cachedUser = user
      cachedUserTime = Date.now()
      return user
    } catch (error: any) {
      console.error('获取用户信息失败:', error)
      if (error?.message?.includes('rate limit')) {
        console.warn('⚠️ 获取用户信息触发限流，使用缓存数据')
        return cachedUser
      }
      return null
    }
  },

  // 检查会话（带防抖）
  async checkSession() {
    // 使用缓存
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return { isAuthenticated: true }
    }

    // 如果正在检查中，返回等待中的 Promise
    if (isCheckingSession && sessionPromise) {
      return sessionPromise
    }

    isCheckingSession = true
    sessionPromise = (async () => {
      try {
        const user = await this.getCurrentUser()
        return { isAuthenticated: !!user }
      } catch (error) {
        return { isAuthenticated: false }
      } finally {
        isCheckingSession = false
        sessionPromise = null
      }
    })()

    return sessionPromise
  },

  // 获取缓存的用户（同步方法）
  getCachedUser() {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return cachedUser
    }
    return null
  },

  // 清除缓存
  clearCache() {
    cachedUser = null
    cachedUserTime = 0
  },

  // 退出登录
  async logout() {
    try {
      await auth.signOut()
      this.clearCache()
    } catch (error: any) {
      console.error('退出登录失败:', error)
      throw new Error(handleRateLimitError(error))
    }
  }
}

// 数据库操作服务
export const dbService = {
  // 获取集合
  collection(name: string) {
    return db.collection(name)
  },

  // 根据ID获取文档
  async getById(collectionName: string, id: string) {
    try {
      const result = await db.collection(collectionName).doc(id).get()
      if (result.code) {
        console.error(`获取文档 ${id} 失败:`, result.code, result.message)
        return null
      }
      return result.data
    } catch (error) {
      console.error(`获取文档 ${id} 异常:`, error)
      return null
    }
  },

  // 查询所有
  async getAll(collectionName: string) {
    try {
      const result = await db.collection(collectionName).get()
      if (result.code) {
        console.error(`查询集合 ${collectionName} 失败:`, result.code, result.message)
        return []
      }
      return result.data
    } catch (error) {
      console.error(`查询集合 ${collectionName} 异常:`, error)
      return []
    }
  },

  // 条件查询
  async where(collectionName: string, conditions: any) {
    try {
      const result = await db.collection(collectionName).where(conditions).get()
      if (result.code) {
        console.error(`查询集合 ${collectionName} 失败:`, result.code, result.message)
        return []
      }
      return result.data
    } catch (error) {
      console.error(`查询集合 ${collectionName} 异常:`, error)
      return []
    }
  },

  // 添加文档
  async add(collectionName: string, data: any) {
    try {
      const result = await db.collection(collectionName).add({
        ...data,
        _openid: '{openid}', // 会被自动替换为用户的 openid
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      if (result.code) {
        console.error(`添加到集合 ${collectionName} 失败:`, result.code, result.message)
        return null
      }
      return result
    } catch (error) {
      console.error(`添加到集合 ${collectionName} 异常:`, error)
      return null
    }
  },

  // 更新文档
  async update(collectionName: string, docId: string, data: any) {
    try {
      const result = await db.collection(collectionName).doc(docId).update({
        ...data,
        updatedAt: new Date().toISOString()
      })
      if (result.code) {
        console.error(`更新集合 ${collectionName} 失败:`, result.code, result.message)
        return false
      }
      return true
    } catch (error) {
      console.error(`更新集合 ${collectionName} 异常:`, error)
      return false
    }
  },

  // 删除文档
  async delete(collectionName: string, docId: string) {
    try {
      const result = await db.collection(collectionName).doc(docId).remove()
      if (result.code) {
        console.error(`删除集合 ${collectionName} 失败:`, result.code, result.message)
        return false
      }
      return true
    } catch (error) {
      console.error(`删除集合 ${collectionName} 异常:`, error)
      return false
    }
  },

  // 条件删除
  async deleteWhere(collectionName: string, conditions: any) {
    try {
      const result = await db.collection(collectionName).where(conditions).remove()
      if (result.code) {
        console.error(`条件删除集合 ${collectionName} 失败:`, result.code, result.message)
        return false
      }
      return true
    } catch (error) {
      console.error(`条件删除集合 ${collectionName} 异常:`, error)
      return false
    }
  }
}

export default app
