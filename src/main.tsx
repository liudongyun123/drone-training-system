import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import { initAuth } from "./store/authStore";
import { initSentry } from "./utils/sentry";

// 初始化认证状态
initAuth();

// 初始化 Sentry 监控（生产环境）
initSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
