import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Sentry Vite Plugin - 暂时禁用，避免导入警告
// import * as SentryVitePlugin from "@sentry/vite-plugin";
const SentryVitePlugin = null;

// 加载环境变量
const env = loadEnv("production", process.cwd(), "");

// 从环境变量读取配置
const ENV_ID = env.VITE_ENV_ID || "rcwljy-5ghmq2ex26764978";
const PUBLISHABLE_KEY = env.VITE_PUBLISHABLE_KEY || "";
const API_TIMEOUT = parseInt(env.VITE_API_TIMEOUT || "30000", 10);
const DEBUG_MODE = env.VITE_DEBUG_MODE === "true";

// 构建版本号
const BUILD_VERSION = 'v20260515-1825-service-fix';

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
      // SentryVitePlugin({
      //   dsn: SENTRY_DSN,
      //   org: process.env.SENTRY_ORG || '',
      //   project: process.env.SENTRY_PROJECT || 'drone-training-system',
      //   authToken: process.env.SENTRY_AUTH_TOKEN || '',
      //   // 上传哪些文件
      //   include: './dist',
      //   // 忽略哪些文件
      //   ignore: ['node_modules', 'vite.config.ts'],
      //   // 部署前删除 source maps（已上传到 Sentry）
      //   deleteOldAssets: true,
      // })
    ] : []),
  ],
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/__auth": {
        target: `https://${ENV_ID}.tcloudbaseapp.com/`,
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
      'axios',
    ],
    include: [
      '@cloudbase/js-sdk',  // CloudBase SDK 由 Vite 打包
    ],
  },
  build: {
    // 生产环境禁用 sourcemap
    sourcemap: false,
    // 目标浏览器
    target: 'es2015',
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 启用 CSS 代码压缩
    cssMinify: true,
    // Rollup 选项
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return;
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        // 手动分割代码块 - 策略：按库功能分组，每 chunk 控制在 500KB 以下
        // 注意：framer-motion/video.js/fullcalendar/recharts 等大型库仅被懒加载页面引用，
        // Rollup 会自动将它们包含在对应页面 chunk 中，无需手动分包
        manualChunks: {
          // React Router
          'vendor-router': ['react-router-dom'],
          // UI 核心库（不包含 emotion 和 icons，约 478KB）
          'vendor-mui-core': ['@mui/material'],
          // Emotion 样式引擎（MUI 依赖，约 26KB）
          'vendor-emotion': ['@emotion/react', '@emotion/styled'],
          // MUI Icons（单独 chunk，tree-shaking 后只包含实际使用的图标，约 5KB）
          'vendor-mui-icons': ['@mui/icons-material'],
          // 状态管理
          'vendor-state': ['zustand'],
          // 工具库
          'vendor-utils': ['axios', 'dayjs', 'lucide-react'],
          // CloudBase SDK 使用 CDN 加载，不打包
        },
        // 使用内容哈希生成文件名
        entryFileNames: `assets/[name]-${BUILD_VERSION}.js`,
        chunkFileNames: `assets/[name]-[hash]-${BUILD_VERSION}.js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          return `assets/[name]-${BUILD_VERSION}[extname]`;
        },
        // 静态资源内联阈值（小于 4KB 的资源内联）
        inlineDynamicImports: false,
      },
      // CloudBase SDK 由 Vite 打包
      // external: ['@cloudbase/js-sdk'],
    },
    // CloudBase SDK 使用 CDN 加载，chunk 大小限制降低
    chunkSizeWarningLimit: 600,
    // 使用 esbuild 压缩并移除 console 和 debugger
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'], // 生产环境移除 console 和 debugger
      // 压缩级别
      compress: {
        // 移除未使用的代码
        dead_code: true,
        // 生产环境移除 console.log（保留 console.error/warn/info 用于关键日志）
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        // 传递参数给 terser
        passes: 2,
      },
      // 压缩比例
      treeShaking: true,
      // 禁用危险的自动修复（避免破坏代码）
      safe: true,
    },
    // 生产环境使用 terser 以获得更好的压缩效果
    ...(process.env.NODE_ENV === 'production' ? {
      // 使用更严格的 chunk 分割策略
      splitVendorChunk: true,
    } : {}),
    // 报告压缩后的文件大小
    reportCompressedSize: true,
    // 启用 terser 详细日志
    // terserOptions: {
    //   compress: {
    //     drop_console: true,
    //     drop_debugger: true,
    //   },
    // },
  },
  define: {
    'import.meta.env.VITE_ENV_ID': JSON.stringify(ENV_ID),
    'import.meta.env.VITE_PUBLISHABLE_KEY': JSON.stringify(PUBLISHABLE_KEY),
    'import.meta.env.VITE_API_TIMEOUT': JSON.stringify(API_TIMEOUT),
    'import.meta.env.VITE_DEBUG_MODE': JSON.stringify(DEBUG_MODE),
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
