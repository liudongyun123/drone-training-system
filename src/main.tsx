import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { initAuth } from "./store/authStore";
import { initSentry } from "./utils/sentry";

// 初始化应用（已移除 CloudBase SDK 依赖，改用 HTTP API）
const initApp = async () => {
  console.log('[Main] 开始初始化...');
  
  // 初始化认证状态
  try {
    await initAuth();
    console.log('[Main] 认证状态初始化完成');
  } catch (error) {
    console.error('[Main] 认证状态初始化失败:', error);
  }
  
  // 初始化 Sentry 监控（生产环境）
  try {
    initSentry();
  } catch (error) {
    console.error('[Main] Sentry 初始化失败:', error);
  }
  
  // 渲染应用
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  );
};

// 启动应用
initApp();
