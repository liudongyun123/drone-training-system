// @ts-ignore
import cloudbase from "@cloudbase/js-sdk";

// 显式导入子模块并触发副作用 - 防止 tree-shaking 删除
// 这些导入会执行模块注册操作
import "@cloudbase/auth";
import "@cloudbase/js-sdk/database";

// 确保副作用不被删除
void (window as any).__cloudbase_registerAuth;

// 从环境变量读取配置
const ENV_ID = import.meta.env.VITE_ENV_ID || "rcwljy-5ghmq2ex26764978";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cloudbaseAppInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;
let initPromise: Promise<any> | null = null;

// 异步初始化
async function initCloudbaseApp(): Promise<any> {
  // 如果已经有实例，直接返回
  if (cloudbaseAppInstance) {
    return cloudbaseAppInstance;
  }
  
  // 如果正在初始化，等待完成
  if (initPromise) {
    return initPromise;
  }
  
  // 开始初始化
  initPromise = (async () => {
    console.log("🔧 初始化 CloudBase SDK...");
    console.log("   环境ID:", ENV_ID);
    
    // @ts-ignore
    cloudbaseAppInstance = cloudbase.init({
      env: ENV_ID,
    });
    
    console.log("✅ CloudBase SDK 初始化完成");
    
    // 获取 auth 实例
    authInstance = cloudbaseAppInstance.auth({ persistence: "local" });
    
    // 尝试匿名登录
    try {
      const loginState = await authInstance.getLoginState();
      if (loginState) {
        console.log("✅ 已存在登录状态");
      } else {
        console.log("🔑 正在使用匿名登录...");
        await authInstance.signInAnonymously();
        console.log("✅ 匿名登录成功");
      }
    } catch (error) {
      console.error("匿名登录失败:", error);
    }
    
    return cloudbaseAppInstance;
  })();
  
  return initPromise;
}

// 同步获取 app 实例（可能未初始化）
export function getCloudbaseApp(): any {
  return cloudbaseAppInstance;
}

// 异步确保初始化完成
export async function ensureInit(): Promise<any> {
  return initCloudbaseApp();
}

// 获取 auth 实例
export function getAuth(): any {
  return authInstance;
}

// 获取 database 实例
export function getDatabase(): any {
  return cloudbaseAppInstance?.database();
}

// 检查登录状态
export async function checkLogin(): Promise<boolean> {
  try {
    await initCloudbaseApp();
    const loginState = await authInstance?.getLoginState();
    return !!loginState;
  } catch (error) {
    console.error("检查登录状态失败:", error);
    return false;
  }
}

// 登出
export async function logout(): Promise<void> {
  try {
    await initCloudbaseApp();
    await authInstance?.signOut();
    console.log("已退出登录");
  } catch (error) {
    console.error("退出登录失败:", error);
  }
}

// authLogout 是 logout 的别名
export const authLogout = logout;

// 确保用户已认证
export async function ensureAuthenticated(): Promise<boolean> {
  await initCloudbaseApp();
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    console.warn("用户未登录");
    return false;
  }
  return true;
}

// 兼容旧的确保认证函数
export const ensureAuth = ensureAuthenticated;

// 导出 app 实例（注意：可能是 undefined，需要先调用 ensureInit）
export const app = {
  get database() {
    return cloudbaseAppInstance?.database();
  },
  get auth() {
    return cloudbaseAppInstance?.auth();
  },
  async callFunction(params: any) {
    await initCloudbaseApp();
    return cloudbaseAppInstance?.callFunction(params);
  }
};

export const cloudbaseApp = app;
export { ENV_ID };

// 立即开始初始化（在模块加载时）
initCloudbaseApp();
