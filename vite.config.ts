import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import * as SentryVitePlugin from "@sentry/vite-plugin";

// 直接读取环境变量
const ENV_ID = "rcwl-d2gu92btga6de8ca1";
const PUBLISHABLE_KEY = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3Jjd2wtZDJndTkyYnRnYTZkZThjYTEuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6InJjd2wtZDJndTkyYnRnYTZkZThjYTEiLCJleHAiOjQwODEwMjY0NTMsImlhdCI6MTc3NzM0MzI1Mywibm9uY2UiOiJDRlhuUUlYclI0V2ZmOVhDMVhvcGRRIiwiYXRfaGFzaCI6IkNGWG5RSVhyUjRXZmY5WEMxWG9wZFEiLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoicmN3bC1kMmd1OTJidGdhNmRlOGNhMSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.qwqnftrE8v3ULRCoV_n_hCmOY5UVeOcTNfi3kmtow8MWehWmX3QXNXyqOkvlnftJKu2q-ErrwpgzujfvR9AUoFG-R3Q28WN5ZvwCD7XbketM3G6-nr6kpZfHcXoyGW-Y5p0PMzULHZgROzzHu456riMtTMdKY6RuDma85CDSnE3C42pjWnfGGOAgytgWtGasC2mR2RgcLa2Y7eWbBE50uVpY8hXIsXjgSPh8wq_sCdL5ZAa231DF_SPNmXGJFwT8HgjRfPm3M_fe9LjBWM4TOSoaAzlqbzthmfY8_Tp1ajaZjLWwCIpzedRT7mzEuZJQArivQNYjAFprsJYfdp0veA";

// 构建版本号
const BUILD_VERSION = 'v20260430-2250-api-v5';

// Sentry 配置
const SENTRY_DSN = process.env.SENTRY_DSN || '';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
    // Sentry 插件（生产环境构建时自动上传 source maps）
    ...(SENTRY_DSN ? [
      SentryVitePlugin({
        dsn: SENTRY_DSN,
        org: process.env.SENTRY_ORG || '',
        project: process.env.SENTRY_PROJECT || 'drone-training-system',
        authToken: process.env.SENTRY_AUTH_TOKEN || '',
        // 上传哪些文件
        include: './dist',
        // 忽略哪些文件
        ignore: ['node_modules', 'vite.config.ts'],
        // 部署前删除 source maps（已上传到 Sentry）
        deleteOldAssets: true,
      })
    ] : []),
  ],
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/__auth": {
        target: "https://envId-appid.tcloudbaseapp.com/",
        changeOrigin: true,
      },
    },
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      '@mui/material', 
      '@mui/icons-material', 
      '@emotion/react', 
      '@emotion/styled',
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'dayjs',
      'axios'
    ],
    exclude: [],
  },
  build: {
    sourcemap: false,
    target: 'es2015',
    cssCodeSplit: true, // 启用 CSS 代码分割
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
      output: {
        // 手动分割代码块 - 策略：按库功能分组，每 chunk 控制在 500KB 以下
        // 注意：framer-motion/video.js/fullcalendar/recharts 等大型库仅被懒加载页面引用，
        // Rollup 会自动将它们包含在对应页面 chunk 中，无需手动分包
        manualChunks: {
          // React Router
          'vendor-router': ['react-router-dom'],
          // MUI 核心库（不包含 emotion 和 icons，约 478KB）
          'vendor-mui-core': ['@mui/material'],
          // Emotion 样式引擎（MUI 依赖，约 26KB）
          'vendor-emotion': ['@emotion/react', '@emotion/styled'],
          // MUI Icons（单独 chunk，tree-shaking 后只包含实际使用的图标，约 5KB）
          'vendor-mui-icons': ['@mui/icons-material'],
          // 状态管理
          'vendor-state': ['zustand'],
          // 工具库
          'vendor-utils': ['axios', 'dayjs', 'lucide-react'],
          // CloudBase SDK（整体不可拆分，约 640KB）
          'vendor-cloudbase': ['@cloudbase/js-sdk'],
        },
        // 使用内容哈希生成文件名
        entryFileNames: `assets/[name]-${BUILD_VERSION}.js`,
        chunkFileNames: `assets/[name]-[hash]-${BUILD_VERSION}.js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          return `assets/[name]-${BUILD_VERSION}[extname]`;
        },
      },
    },
    // CloudBase SDK 整体约 640KB 无法进一步拆分，设为 700 避免误报
    chunkSizeWarningLimit: 700,
    // 使用 esbuild 压缩并移除 console 和 debugger
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'], // 生产环境移除 console 和 debugger
    },
    // 报告压缩后的文件大小
    reportCompressedSize: true,
  },
  define: {
    'import.meta.env.VITE_ENV_ID': JSON.stringify(ENV_ID),
    'import.meta.env.VITE_PUBLISHABLE_KEY': JSON.stringify(PUBLISHABLE_KEY),
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(process.env.VITE_SENTRY_DSN || ''),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(BUILD_VERSION),
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  css: {
    devSourcemap: true,
  },
  logLevel: 'info',
  preview: {
    port: 4173,
    open: false,
  },
});
