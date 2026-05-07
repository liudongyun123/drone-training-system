// 统一从 utils/cloudbase 导入 app 实例，避免重复初始化
import { ensureInit, getAuth } from '@/utils/cloudbase'

// 懒加载的数据库实例
let _db: any = null
let _auth: any = null

// 获取数据库实例（确保初始化）
async function getDb() {
  await ensureInit()
  const { getCloudbaseApp } = await import('@/utils/cloudbase')
  const app = getCloudbaseApp()
  if (app && !_db) {
    _db = app.database()
  }
  return _db
}

// 获取 auth 实例（确保初始化）
async function getAuthInstance() {
  await ensureInit()
  const { getCloudbaseApp } = await import('@/utils/cloudbase')
  const app = getCloudbaseApp()
  if (app && !_auth) {
    _auth = app.auth()
  }
  return _auth
}

// 同步获取（可能在初始化前调用）
export const db = {
  collection(name: string) {
    // 返回一个代理对象，延迟获取 collection
    return {
      get: async () => {
        const database = await getDb()
        return database.collection(name).get()
      },
      doc: (id: string) => ({
        get: async () => {
          const database = await getDb()
          return database.collection(name).doc(id).get()
        },
        update: async (params: any) => {
          const database = await getDb()
          return database.collection(name).doc(id).update(params)
        },
        remove: async () => {
          const database = await getDb()
          return database.collection(name).doc(id).remove()
        }
      }),
      add: async (params: any) => {
        const database = await getDb()
        return database.collection(name).add(params)
      },
      where: (query: any) => ({
        get: async () => {
          const database = await getDb()
          return database.collection(name).where(query).get()
        },
        update: async (params: any) => {
          const database = await getDb()
          return database.collection(name).where(query).update(params)
        },
        remove: async () => {
          const database = await getDb()
          return database.collection(name).where(query).remove()
        },
        limit: (n: number) => ({
          get: async () => {
            const database = await getDb()
            return database.collection(name).where(query).limit(n).get()
          }
        })
      }),
      orderBy: (field: string, order: string) => ({
        limit: (n: number) => ({
          get: async () => {
            const database = await getDb()
            return database.collection(name).orderBy(field, order).limit(n).get()
          }
        })
      }),
      limit: (n: number) => ({
        get: async () => {
          const database = await getDb()
          return database.collection(name).limit(n).get()
        },
        skip: (n: number) => ({
          get: async () => {
            const database = await getDb()
            return database.collection(name).limit(n).skip(n).get()
          }
        })
      }),
      count: async () => {
        const database = await getDb()
        return database.collection(name).count()
      }
    }
  }
}

export const auth = {
  get currentUser() {
    return _auth?.currentUser
  },
  async getCurrentUser() {
    await getAuthInstance()
    return _auth?.getCurrentUser()
  },
  async signOut() {
    await getAuthInstance()
    return _auth?.signOut()
  },
  anonymousAuthProvider() {
    return _auth?.anonymousAuthProvider()
  }
}

// 用户缓存
let cachedUser: any = null
let cachedUserTime = 0
const CACHE_TTL = 60000 // 1分钟

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
      const authIns = await getAuthInstance()
      await authIns.anonymousAuthProvider().signIn()
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
      const authIns = await getAuthInstance()
      const user = await authIns?.getCurrentUser()
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

    try {
      const user = await this.getCurrentUser()
      return { isAuthenticated: !!user }
    } catch (error) {
      return { isAuthenticated: false }
    }
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
      const authIns = await getAuthInstance()
      await authIns?.signOut()
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

// 确保模块初始化
ensureInit()

export default { db, auth, dbService, authService }
