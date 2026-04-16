---
name: 添加 CloudBase 连接测试页面并部署
overview: 将 ConnectionTest 测试页面添加到项目路由，构建并部署到 CloudBase 静态托管，使用户可以通过线上地址测试前端与 CloudBase 的连接
todos:
  - id: export-component
    content: 在 routes/index.ts 中导出 ConnectionTest 组件
    status: completed
  - id: add-route
    content: 在 router/index.tsx 中添加 /connection-test 路由
    status: completed
    dependencies:
      - export-component
  - id: build-project
    content: 执行 npm run build 构建项目
    status: completed
    dependencies:
      - add-route
  - id: deploy-hosting
    content: 部署 dist 目录到 CloudBase 静态托管
    status: in_progress
    dependencies:
      - build-project
---

## 产品概述

由于浏览器 CORS 限制，外部 CDN 的 CloudBase SDK 被阻止加载，导致 test-frontend-backend.html 无法正常工作。需要将已创建的 ConnectionTest.tsx 测试页面集成到项目中，通过项目自身的 CloudBase 配置来测试前端与后端的连接。

## 核心功能

- 将测试页面添加到项目路由
- 构建项目并部署到 CloudBase 静态托管
- 通过部署后的 URL 访问测试页面，验证前端能否正确调用 CloudBase 数据库服务

## 技术栈

- 前端框架: React + TypeScript + Vite
- 路由: React Router (HashRouter)
- 部署目标: CloudBase 静态托管

## 架构设计

利用项目已有的 CloudBase SDK 配置（src/utils/cloudbase.ts），将测试页面作为独立路由添加到项目中，通过构建后的应用来测试前端与 CloudBase 数据库的连接。

## 目录结构变更

```
src/
├── pages/
│   └── ConnectionTest.tsx      # [已存在] 测试页面组件
├── routes/
│   └── index.ts                # [MODIFY] 添加 ConnectionTest 导出
├── router/
│   └── index.tsx               # [MODIFY] 添加 /connection-test 路由
└── ...
```

## 实现方案

1. 在 routes/index.ts 中导出 ConnectionTest 组件
2. 在 router/index.tsx 中添加独立路由 /connection-test
3. 执行 npm run build 构建项目
4. 使用 uploadFiles 工具部署 dist 目录到 CloudBase 静态托管
5. 提供访问链接供用户测试