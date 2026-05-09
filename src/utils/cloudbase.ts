/**
 * CloudBase SDK 管理模块
 * 
 * SDK v3.3.9 使用方式
 */

const ENV_ID = (import.meta.env.VITE_ENV_ID as string) || 'rcwljy-5ghmq2ex26764978';

interface SDKStatus {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  source: string | null;
  loadTime: number | null;
}

let sdkStatus: SDKStatus = {
  isReady: false,
  isLoading: false,
  error: null,
  source: null,
  loadTime: null,
};

const DEBUG = true;
const log = {
  info: (...args: any[]) => DEBUG && console.log('[CloudBase]', ...args),
  warn: (...args: any[]) => DEBUG && console.warn('[CloudBase]', ...args),
  error: (...args: any[]) => console.error('[CloudBase]', ...args),
};

// SDK 模块缓存
let sdkModule: any = null;
let cloudbaseApp: any = null;
let authInstance: any = null;
let initPromise: Promise<any> | null = null;

// 初始化 CloudBase
export async function init(): Promise<any> {
  if (cloudbaseApp) return cloudbaseApp;
  if (initPromise) return initPromise;

  sdkStatus.isLoading = true;
  log.info('初始化 CloudBase SDK...');
  log.info('环境 ID:', ENV_ID);

  initPromise = (async () => {
    try {
      // 动态导入 SDK
      const sdk: any = await import('@cloudbase/js-sdk');
      
      // 调试：打印 SDK 的所有导出键
      log.info('SDK 导出键:', Object.keys(sdk));
      log.info('sdk.default 类型:', typeof sdk.default);
      
      // Vite 预构建后的 SDK 只导出 default，需要使用 sdk.default
      // 而 sdk.default.init 是实际的初始化函数
      if (typeof sdk.default?.init === 'function') {
        log.info('使用 sdk.default.init');
        sdkModule = sdk.default;
      } else if (typeof sdk.init === 'function') {
        // 某些环境直接导出 init
        log.info('使用 sdk.init (直接导出)');
        sdkModule = sdk;
      } else {
        throw new Error(`SDK.init 不可用，sdk.default: ${typeof sdk.default}, sdk.init: ${typeof sdk.init}`);
      }
      
      // 检查 SDK 是否有效
      log.info('sdkModule.init 类型:', typeof sdkModule?.init);
      if (typeof sdkModule?.init !== 'function') {
        throw new Error(`SDK.init 不可用，当前类型: ${typeof sdkModule?.init}`);
      }
      
      // 初始化应用
      cloudbaseApp = sdkModule.init({
        env: ENV_ID
      });

      log.info('应用初始化完成');
      log.info('app.auth:', typeof cloudbaseApp?.auth);
      log.info('app.database:', typeof cloudbaseApp?.database);
      log.info('app.callFunction:', typeof cloudbaseApp?.callFunction);

      // 获取 auth 实例
      if (cloudbaseApp?.auth) {
        authInstance = cloudbaseApp.auth();
        log.info('Auth 实例:', typeof authInstance);
        log.info('auth.getLoginState:', typeof authInstance?.getLoginState);
        log.info('auth.signInAnonymously:', typeof authInstance?.signInAnonymously);
        
        // 尝试匿名登录以获取数据库访问权限
        try {
          const loginResult = await authInstance.signInAnonymously();
          log.info('匿名登录结果:', loginResult);
        } catch (loginError: any) {
          log.warn('匿名登录失败:', loginError?.message);
        }
      } else {
        log.warn('app.auth 不可用');
      }

      sdkStatus = {
        isReady: true,
        isLoading: false,
        error: null,
        source: 'bundled',
        loadTime: 0
      };

      log.info('CloudBase SDK 初始化成功');
      return cloudbaseApp;

    } catch (error: any) {
      sdkStatus = {
        isReady: false,
        isLoading: false,
        error: error?.message || '初始化失败',
        source: 'bundled',
        loadTime: null
      };
      log.error('CloudBase SDK 初始化失败:', error);
      throw error;
    }
  })();

  return initPromise;
}

// 等待初始化
export async function ensureInit(): Promise<any> {
  if (cloudbaseApp) return cloudbaseApp;
  return init();
}

// 获取应用实例
export function getCloudBaseApp() {
  return cloudbaseApp;
}

// 获取 Auth 实例
export function getAuth() {
  if (!authInstance && cloudbaseApp?.auth) {
    authInstance = cloudbaseApp.auth();
  }
  return authInstance;
}

// 获取数据库实例
export function getDatabase() {
  if (!cloudbaseApp?.database) {
    log.warn('Database 不可用');
    return null;
  }
  const db = cloudbaseApp.database();
  log.info('getDatabase() 返回:', db ? 'defined' : 'null');
  return db;
}

// 获取数据库实例（带初始化检查）
export async function getDatabaseAsync() {
  await ensureInit();
  return getDatabase();
}

// 调用云函数
export async function callFunction(name: string, data?: any) {
  await ensureInit();
  if (!cloudbaseApp?.callFunction) {
    throw new Error('callFunction 不可用');
  }
  return cloudbaseApp.callFunction({ name, data });
}

// 检查是否已初始化
export function isReady() {
  return sdkStatus.isReady;
}

// 获取状态
export function getStatus(): SDKStatus {
  return { ...sdkStatus };
}

// 导出 app 对象（兼容旧代码）
export const app = {
  get: () => cloudbaseApp,
  auth: () => {
    if (!cloudbaseApp?.auth) {
      log.warn('app.auth() 调用时 SDK 未初始化');
      return null;
    }
    return cloudbaseApp.auth();
  },
  database: () => {
    if (!cloudbaseApp?.database) {
      log.warn('app.database() 调用时 SDK 未初始化');
      return null;
    }
    return cloudbaseApp.database();
  },
  callFunction: async (nameOrOptions: string | { name?: string; data?: any }, data?: any) => {
    await ensureInit();
    if (!cloudbaseApp?.callFunction) {
      throw new Error('callFunction 不可用');
    }
    // 兼容两种调用方式：callFunction(name, data) 和 callFunction({ name, data })
    let name: string;
    let payload: any;
    if (typeof nameOrOptions === 'object') {
      name = nameOrOptions.name;
      payload = nameOrOptions.data;
    } else {
      name = nameOrOptions;
      payload = data;
    }
    return cloudbaseApp.callFunction({ name, data: payload });
  }
};

// 检查登录状态
export async function checkLogin(): Promise<any> {
  await ensureInit();
  const auth = getAuth();
  if (!auth) return null;
  
  try {
    const loginState = await auth.getLoginState();
    if (!loginState) return null;
    return loginState.getUserInfo?.() || loginState;
  } catch (error: any) {
    log.warn('检查登录状态失败:', error?.message);
    return null;
  }
}

// 确保已认证
export async function ensureAuthenticated(): Promise<any> {
  const user = await checkLogin();
  if (!user) {
    throw new Error('用户未登录');
  }
  return user;
}

// 兼容命名导出
export { cloudbaseApp as cloudbaseAppInstance };
export { cloudbaseApp };

// 启动自动初始化
init().catch((error) => {
  log.error('CloudBase 自动初始化失败:', error);
});

export default {
  init,
  ensureInit,
  getCloudBaseApp,
  getAuth,
  getDatabase,
  getDatabaseAsync,
  callFunction,
  isReady,
  getStatus,
  checkLogin,
  ensureAuthenticated,
  app
};
