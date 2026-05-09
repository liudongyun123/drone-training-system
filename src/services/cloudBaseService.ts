// 统一从 utils/cloudbase 导入 app 实例
import { app, ensureInit, getAuth, getDatabase, initCloudbaseApp } from '@/utils/cloudbase'

// 获取数据库实例（异步，确保初始化）
export async function getDb() {
  await ensureInit();
  return app.database();
}

// 获取 auth 实例（异步）
export async function getAuthInstance() {
  await ensureInit();
  return app.auth();
}

// 同步获取 auth 实例（仅在确保初始化后才能使用）
function getAuthSync() {
  return app.auth();
}

// 数据库操作 - 修改为异步
export const db = {
  async collection(name: string) {
    await ensureInit();
    return app.database().collection(name);
  }
}

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
}

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

// 认证状态管理
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

// 数据库操作服务
export const dbService = {
  async collection(name: string) {
    await ensureInit();
    return app.database().collection(name);
  },

  async getById(collectionName: string, id: string) {
    try {
      const db = await this.collection(collectionName);
      const result = await db.doc(id).get();
      if (result.code) {
        console.error(`获取文档 ${id} 失败:`, result.code, result.message);
        return null;
      }
      return result.data;
    } catch (error) {
      console.error(`获取文档 ${id} 异常:`, error);
      return null;
    }
  },

  async getAll(collectionName: string) {
    try {
      const db = await this.collection(collectionName);
      const result = await db.get();
      if (result.code) {
        console.error(`查询集合 ${collectionName} 失败:`, result.code, result.message);
        return [];
      }
      return result.data;
    } catch (error) {
      console.error(`查询集合 ${collectionName} 异常:`, error);
      return [];
    }
  },

  async where(collectionName: string, conditions: any) {
    try {
      const db = await this.collection(collectionName);
      const result = await db.where(conditions).get();
      if (result.code) {
        console.error(`查询集合 ${collectionName} 失败:`, result.code, result.message);
        return [];
      }
      return result.data;
    } catch (error) {
      console.error(`查询集合 ${collectionName} 异常:`, error);
      return [];
    }
  },

  async add(collectionName: string, data: any) {
    try {
      const db = await this.collection(collectionName);
      const result = await db.add({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (result.code) {
        console.error(`添加到集合 ${collectionName} 失败:`, result.code, result.message);
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
      const db = await this.collection(collectionName);
      const result = await db.doc(docId).update({
        ...data,
        updatedAt: new Date().toISOString()
      });
      if (result.code) {
        console.error(`更新集合 ${collectionName} 失败:`, result.code, result.message);
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
      const db = await this.collection(collectionName);
      const result = await db.doc(docId).remove();
      if (result.code) {
        console.error(`删除集合 ${collectionName} 失败:`, result.code, result.message);
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
      const db = await this.collection(collectionName);
      const result = await db.where(conditions).remove();
      if (result.code) {
        console.error(`条件删除集合 ${collectionName} 失败:`, result.code, result.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`条件删除集合 ${collectionName} 异常:`, error);
      return false;
    }
  }
}

export default { db, auth, dbService, authService };
