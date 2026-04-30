import cloudbase, { Auth } from "@cloudbase/js-sdk";

// 从环境变量读取配置
const ENV_ID = import.meta.env.VITE_ENV_ID || "rcwljy-5ghmq2ex26764978";
const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cloudbaseAppInstance: any = null;

function initCloudbaseApp() {
  if (!cloudbaseAppInstance) {
    console.log("🔧 初始化 CloudBase SDK...");
    console.log("   环境ID:", ENV_ID);
    console.log("   Publishable Key:", PUBLISHABLE_KEY ? PUBLISHABLE_KEY.substring(0, 20) + "..." : "未设置");
    
    cloudbaseAppInstance = cloudbase.initialize({
      env: ENV_ID,
      appAccessKeyId: PUBLISHABLE_KEY,
    });
    
    console.log("✅ CloudBase SDK 初始化完成");
  }
  return cloudbaseAppInstance;
}

export function getCloudbaseApp() {
  return initCloudbaseApp();
}

export function getAuth(): Auth {
  return initCloudbaseApp().auth({
    persistence: "local"
  });
}

// 检查登录状态
export async function checkLogin(): Promise<boolean> {
  try {
    const auth = getAuth();
    const loginState = await auth.getLoginState();
    return !!loginState;
  } catch (error) {
    console.error("检查登录状态失败:", error);
    return false;
  }
}

// 登出
export async function logout(): Promise<void> {
  try {
    const auth = getAuth();
    await auth.signOut();
    console.log("已退出登录");
  } catch (error) {
    console.error("退出登录失败:", error);
  }
}

// authLogout 是 logout 的别名
export const authLogout = logout;

// 确保用户已认证
export async function ensureAuthenticated(): Promise<boolean> {
  const isLoggedIn = await checkLogin();
  if (!isLoggedIn) {
    console.warn("用户未登录");
    return false;
  }
  return true;
}

// 导出 app 实例供其他模块使用（向后兼容）
export const app = initCloudbaseApp();
export const cloudbaseApp = initCloudbaseApp();
export { ENV_ID };
