// ============================================================================
// 云服务层 (v2.0 - 统一通过 adminService HTTP 访问数据库)
// - dbService: 数据库操作 → HTTP adminService（绕过安全规则）
// - authService: 认证操作 → CloudBase SDK（保留匿名登录等能力）
// ============================================================================

import { app, ensureInit, getAuth } from '@/utils/cloudbase'
import { adminService } from './adminService'

// ============================================================================
// 认证服务（保留 CloudBase SDK）
// ============================================================================

export async function getAuthInstance() {
  await ensureInit();
  return app.auth();
}

// getAuthSync 已弃用，使用 getAuthInstance()
// function getAuthSync() {
//   return app.auth();
// }

// 用户缓存
let cachedUser: any = null;
let cachedUserTime = 0;
const CACHE_TTL = 60000;

// 限流错误处理
const handleRateLimitError = (error: any): string => {
  if (error?.code === 'TooManyRequests' || 
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit')) {
    return '操作过于频繁，请稍后再试';
  }
  return error?.message || '操作失败';
};

export const authService = {
  async anonymousLogin() {
    try {
      const authInstance = await getAuth();
      await authInstance.anonymousAuthProvider().signIn();
      const user = await this.getCurrentUser();
      return user;
    } catch (error: any) {
      console.error('匿名登录失败:', error);
      throw new Error(handleRateLimitError(error));
    }
  },

  async getCurrentUser() {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return cachedUser;
    }
    
    try {
      const authInstance = await getAuth();
      const { data } = await authInstance.getUser();
      cachedUser = data?.user;
      cachedUserTime = Date.now();
      return cachedUser;
    } catch (error: any) {
      console.error('获取用户信息失败:', error);
      if (error?.message?.includes('rate limit')) {
        return cachedUser;
      }
      return null;
    }
  },

  async checkSession() {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return { isAuthenticated: true };
    }

    try {
      const user = await this.getCurrentUser();
      return { isAuthenticated: !!user };
    } catch (error) {
      return { isAuthenticated: false };
    }
  },

  getCachedUser() {
    if (cachedUser && Date.now() - cachedUserTime < CACHE_TTL) {
      return cachedUser;
    }
    return null;
  },

  clearCache() {
    cachedUser = null;
    cachedUserTime = 0;
  },

  async logout() {
    try {
      const authInstance = await getAuth();
      await authInstance.signOut();
      this.clearCache();
    } catch (error: any) {
      console.error('退出登录失败:', error);
      throw new Error(handleRateLimitError(error));
    }
  }
};

// ============================================================================
// 数据库操作服务（统一通过 adminService HTTP）
// ============================================================================

function extractList(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data?.list) return result.data.list;
  if (result.list) return result.list;
  return [];
}

export const dbService = {
  async getById(collectionName: string, id: string) {
    try {
      const result = await adminService.get(collectionName, id);
      if (result?.code && result.code !== 0) {
        console.error(`获取文档 ${id} 失败:`, result.code);
        return null;
      }
      // adminService.get 返回 { code: 0, data: { ... } }
      if (result?.data && !Array.isArray(result.data)) {
        return result.data;
      }
      if (Array.isArray(result?.data) && result.data.length > 0) {
        return result.data[0];
      }
      return result?.data || null;
    } catch (error) {
      console.error(`获取文档 ${id} 异常:`, error);
      return null;
    }
  },

  async getAll(collectionName: string) {
    try {
      const result = await adminService.list(collectionName, {}, { limit: 1000 });
      if (result?.code && result.code !== 0) {
        console.error(`查询集合 ${collectionName} 失败:`, result.code);
        return [];
      }
      return extractList(result);
    } catch (error) {
      console.error(`查询集合 ${collectionName} 异常:`, error);
      return [];
    }
  },

  async where(collectionName: string, conditions: any) {
    try {
      const result = await adminService.list(collectionName, conditions, { limit: 1000 });
      if (result?.code && result.code !== 0) {
        console.error(`查询集合 ${collectionName} 失败:`, result.code);
        return [];
      }
      return extractList(result);
    } catch (error) {
      console.error(`查询集合 ${collectionName} 异常:`, error);
      return [];
    }
  },

  async add(collectionName: string, data: any) {
    try {
      const result = await adminService.add(collectionName, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (result?.code && result.code !== 0) {
        console.error(`添加到集合 ${collectionName} 失败:`, result.code);
        return null;
      }
      return result;
    } catch (error) {
      console.error(`添加到集合 ${collectionName} 异常:`, error);
      return null;
    }
  },

  async update(collectionName: string, docId: string, data: any) {
    try {
      const result = await adminService.update(collectionName, docId, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      if (result?.code && result.code !== 0) {
        console.error(`更新集合 ${collectionName} 失败:`, result.code);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`更新集合 ${collectionName} 异常:`, error);
      return false;
    }
  },

  async delete(collectionName: string, docId: string) {
    try {
      const result = await adminService.delete(collectionName, docId);
      if (result?.code && result.code !== 0) {
        console.error(`删除集合 ${collectionName} 失败:`, result.code);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`删除集合 ${collectionName} 异常:`, error);
      return false;
    }
  },

  async deleteWhere(collectionName: string, conditions: any) {
    try {
      // 先查询符合条件的文档，再逐个删除
      const docs = await this.where(collectionName, conditions);
      if (docs.length === 0) return true;
      
      for (const doc of docs) {
        await adminService.delete(collectionName, doc._id);
      }
      return true;
    } catch (error) {
      console.error(`条件删除集合 ${collectionName} 异常:`, error);
      return false;
    }
  }
};

// ============================================================================
// 兼容旧代码的导出
// ============================================================================

// 简易 auth 对象（兼容旧导入）
export const auth = {
  async getCurrentUser() {
    const authInstance = await getAuth();
    return authInstance.getCurrentUser();
  },
  async signOut() {
    const authInstance = await getAuth();
    return authInstance.signOut();
  },
  async anonymousAuthProvider() {
    const authInstance = await getAuth();
    return authInstance.anonymousAuthProvider();
  },
  async getLoginState() {
    const authInstance = await getAuth();
    return authInstance.getLoginState();
  }
};

// 简化 db 对象（兼容旧代码，不再包装 app.database()）
export const db = {
  async collection(name: string) {
    // 返回一个兼容接口
    return {
      name,
      doc: (id: string) => ({
        get: async () => adminService.get(name, id),
        update: async (data: any) => {
          await adminService.update(name, id, { ...data, updatedAt: new Date().toISOString() });
          return { code: 0 };
        },
        remove: async () => {
          await adminService.delete(name, id);
          return { data: {} };
        }
      }),
      where: (conditions: any) => ({
        get: async () => {
          const result = await adminService.list(name, conditions, { limit: 1000 });
          return { data: extractList(result) };
        },
        remove: async () => {
          const docs = extractList(await adminService.list(name, conditions, { limit: 1000 }));
          for (const doc of docs) {
            await adminService.delete(name, doc._id);
          }
          return { code: 0 };
        }
      }),
      add: async (data: any) => {
        return await adminService.add(name, {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      },
      get: async () => {
        const result = await adminService.list(name, {}, { limit: 1000 });
        return { data: extractList(result) };
      }
    };
  }
};

export default { db, auth, dbService, authService };
