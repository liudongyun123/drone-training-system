import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import * as SentryVitePlugin from "@sentry/vite-plugin";

// 直接读取环境变量
const ENV_ID = "rcwljy-5ghmq2ex26764978";
const PUBLISHABLE_KEY = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3Jjd2xqeS01Z2htcTJleDI2NzY0OTc4LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJyY3dsanktNWdobXEyZXgyNjc2NDk3OCIsImV4cCI6NDA3NzU5NTUxNCwiaWF0IjoxNzczOTEyMzE0LCJub25jZSI6Ik5ta1U4MXRaUTdHTnFvT2kxY3hrOHciLCJhdF9oYXNoIjoiTm1rVTgxdFpRN0dOcW9PaTFjeGs4dyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJyY3dsanktNWdobXEyZXgyNjc2NDk3OCIsInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.QBOkGCaryupFFhFuxDIwDljwC5PRan_zMneIjlaa9_UJLz1ajlBumYCmaFA5IAYQ97yC5fuxmH36HjhBoegA3XY1gE_BNL0aRcD-Gwu5Tmk57IrPzXKKkXN3eSCbJmD3aLVDeHguRyUO1Qc3oSIiUVlVox77BGj7GFw9TdQzJaWnrRWSmhsPaQoiSqI7HjhdDhIpVoMBZfSpAY1kqEjUvZ8r54e6vHgGm6XmeQXFQQ9141SUAt839J45rkhrRWS28Yxt6Rlbrk7nGllYV-q_uuTzdCaBw0aUYdoRJAHoyaPyTz2rIPexk36Ox8Ai9pQpmn9RcrTpm0MXJIoQrrwNLw";

// 构建版本号
const BUILD_VERSION = 'v20260416-1615-sentry';

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
        // 手动分割代码块
        manualChunks: {
          // React 核心
          'vendor-react': ['react', 'react-dom'],
          // React Router
          'vendor-router': ['react-router-dom'],
          // UI 框架
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // 状态管理
          'vendor-state': ['zustand'],
          // 工具库
          'vendor-utils': ['axios', 'dayjs', 'lucide-react'],
          // CloudBase SDK
          'vendor-cloudbase': ['@cloudbase/js-sdk'],
          // 图表库
          'vendor-charts': ['recharts'],
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
    chunkSizeWarningLimit: 500, // 降低警告阈值
    minify: 'esbuild',
    // 报告压缩后的文件大小
    reportCompressedSize: true,
    // 启用 gzip 压缩
    // terserOptions: {
    //   compress: {
    //     drop_console: true, // 生产环境移除 console
    //     drop_debugger: true,
    //   },
    // },
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
