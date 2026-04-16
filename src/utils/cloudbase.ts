import cloudbase from "@cloudbase/js-sdk";

// 云开发环境ID - 从环境变量读取或使用实际环境ID
// 生产环境请确保配置正确的 VITE_ENV_ID
const getEnvId = () => {
  const envFromVar = import.meta.env.VITE_ENV_ID
  if (envFromVar && envFromVar !== 'your-env-id') {
    return envFromVar
  }
  // 默认使用当前环境ID
  return 'rcwljy-5ghmq2ex26764978'
}

export const ENV_ID = getEnvId()

// 防止并发登录请求的全局锁
let isLoggingIn = false;
let loginPromise: Promise<any> | null = null;

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== "your-env-id";

// 客户端Publishable Key, 可前往https://tcb.cloud.tencent.com/dev?envId={env}#/env/apikey获取
const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || "";

// 调试:打印环境变量读取情况
console.log('📋 CloudBase 环境变量:', {
  ENV_ID,
  isValidEnvId,
  hasPublishableKey: !!PUBLISHABLE_KEY,
  keyLength: PUBLISHABLE_KEY.length
});

/**
 * 初始化云开发实例
 * @param {Object} config - 初始化配置
 * @param {string} config.env - 环境ID，默认使用ENV_ID
 * @param {number} config.timeout - 超时时间，默认15000ms
 * @param {number} config.accessKey - 客户端Publishable Key，默认使用PUBLISHABLE_KEY
 */
export const init = (config: { env?: string; timeout?: number; accessKey?: string; } = {}) => {
  const appConfig: any = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
    auth: {
      detectSessionInUrl: false,
      anonymousProvider: true,
      persistence: "local"
    },
  };

  // 只有在有 Publishable Key 时才添加
  if (PUBLISHABLE_KEY) {
    appConfig.accessKey = PUBLISHABLE_KEY;
    console.log("✅ 使用 Publishable Key 初始化 CloudBase");
  } else {
    console.warn("⚠️ 未配置 Publishable Key,使用匿名登录模式");
  }

  console.log('CloudBase 配置:', { env: appConfig.env, hasAccessKey: !!appConfig.accessKey });

  const app = cloudbase.init(appConfig);

  // 注意: onAuthStateChanged 在某些 SDK 版本中可能不可用
  // 如果需要监听认证状态,请使用其他方式

  return app;
};

/**
 * 默认的云开发实例
 */
export const app = init();

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    const message =
      "❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.js 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并刷新页面\n\n获取环境ID：https://console.cloud.tencent.com/tcb";
    console.error(message);
    return false;
  }
  return true;
};

type AuthInstance = ReturnType<typeof app.auth>;
type SignInRes = Awaited<ReturnType<AuthInstance["getSession"]>>;

interface OfflineLoginState {
  isLoggedIn: boolean;
  user: {
    uid: string;
    isAnonymous: boolean;
  };
}

// 用户缓存
let cachedSession: any = null;
let cachedSessionTime = 0;
const SESSION_CACHE_TTL = 60000; // 1分钟

// Build timestamp for cache busting - updated to force new build
const BUILD_TIMESTAMP = '20250321-1052-v2';

// 限流错误处理
const handleRateLimitError = (error: any): string => {
  if (error?.code === 'TooManyRequests' || 
      error?.message?.includes('429') ||
      error?.message?.includes('rate limit')) {
    return '操作过于频繁，请稍后再试';
  }
  return error?.message || '操作失败';
};

/**
 * 检查用户登录态
 * @returns {Promise} 登录状态
 */
export const checkLogin = async (): Promise<
  SignInRes['data']['session'] | OfflineLoginState
> => {
  if (!checkEnvironment()) {
    throw new Error("环境ID未配置");
  }

  // 使用缓存
  if (cachedSession && Date.now() - cachedSessionTime < SESSION_CACHE_TTL) {
    console.log('✅ 使用缓存的会话');
    return cachedSession;
  }

  // 如果正在登录中，返回等待中的 Promise
  if (isLoggingIn && loginPromise) {
    console.log("⏳ 登录请求正在进行中，等待结果...");
    return loginPromise;
  }

  const auth = app.auth();

  try {
    // 尝试获取当前会话
    let { data } = await auth.getSession();

    if (data.session) {
      console.log("✅ 用户已登录");
      cachedSession = data.session;
      cachedSessionTime = Date.now();
      return data.session;
    }
  } catch (error: any) {
    console.log("ℹ️ 未找到登录会话,尝试匿名登录");
    if (error?.message?.includes('rate limit')) {
      console.warn('⚠️ 获取会话触发限流');
    }
  }

  // 设置登录锁
  isLoggingIn = true;
  
  // 创建登录 Promise
  loginPromise = (async () => {
    try {
      // 执行匿名登录
      const { data } = await auth.signInAnonymously();
      console.log("✅ 匿名登录成功");
      cachedSession = data.session;
      cachedSessionTime = Date.now();
      return data.session;
    } catch (error: any) {
      console.error("❌ 匿名登录失败:", error);
      // 如果是限流错误，返回离线状态
      if (error?.code === 'TooManyRequests' || 
          error?.message?.includes('429') ||
          error?.message?.includes('rate limit')) {
        console.warn("⚠️ 请求过于频繁，返回离线状态");
      }
      return {
        isLoggedIn: false,
        user: {
          uid: '',
          isAnonymous: false,
        },
      };
    } finally {
      // 重置登录锁
      isLoggingIn = false;
      loginPromise = null;
    }
  })();

  return loginPromise;
};

/**
 * 退出登录
 */
export const logout = async (): Promise<{ success: boolean; message: string }> => {
  const auth = app.auth();

  try {
    await auth.signOut();
    // 清除缓存
    cachedSession = null;
    cachedSessionTime = 0;
    console.log("✅ 退出登录成功");
    return { success: true, message: "已成功退出登录" };
  } catch (error: any) {
    console.error("❌ 退出登录失败:", error);
    return { success: false, message: handleRateLimitError(error) };
  }
};

/**
 * 清除会话缓存
 */
export const clearSessionCache = () => {
  cachedSession = null;
  cachedSessionTime = 0;
};

/**
 * 确保用户已认证，如果未登录则自动匿名登录
 * 用于在数据库操作前确保用户已登录
 */
export const ensureAuthenticated = async (): Promise<any> => {
  const auth = app.auth();

  try {
    // 尝试获取当前会话
    const { data } = await auth.getSession();

    if (data.session) {
      console.log('✅ ensureAuthenticated: 用户已登录');
      return data.session;
    }
  } catch (error: any) {
    console.log('ℹ️ ensureAuthenticated: 未找到登录会话，将尝试匿名登录');
    // 继续尝试匿名登录
  }

  // 匿名登录
  try {
    const { data } = await auth.signInAnonymously();
    console.log('✅ ensureAuthenticated: 匿名登录成功');
    cachedSession = data.session;
    cachedSessionTime = Date.now();
    return data.session;
  } catch (error: any) {
    console.error('❌ ensureAuthenticated: 匿名登录失败:', error);

    // 如果是限流错误，返回空会话
    if (error?.code === 'TooManyRequests' ||
        error?.message?.includes('429') ||
        error?.message?.includes('rate limit')) {
      console.warn('⚠️ 请求过于频繁，返回离线状态');
      return null;
    }

    throw error;
  }
};

// 默认导出
export default {
  init,
  app,
  checkLogin,
  logout,
  checkEnvironment,
  isValidEnvId,
  clearSessionCache,
  ensureAuthenticated,
};
