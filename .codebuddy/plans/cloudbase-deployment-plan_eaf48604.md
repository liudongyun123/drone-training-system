---
name: cloudbase-deployment-plan
overview: 完成 CloudBase 环境配置和项目部署，包括登录认证、环境配置、静态托管部署等步骤
todos:
  - id: login-cloudbase
    content: 使用 [mcp:cloudbase] 登录 CloudBase 并绑定环境
    status: completed
  - id: config-auth
    content: 使用 [mcp:cloudbase] 配置认证方式（短信/邮箱/匿名登录）
    status: completed
    dependencies:
      - login-cloudbase
  - id: config-database-rules
    content: 使用 [mcp:cloudbase] 配置数据库安全规则
    status: completed
    dependencies:
      - login-cloudbase
  - id: build-project
    content: 构建生产版本（npm run build）
    status: completed
    dependencies:
      - config-auth
      - config-database-rules
  - id: deploy-hosting
    content: 使用 [mcp:cloudbase] 部署到静态托管
    status: completed
    dependencies:
      - build-project
  - id: verify-deployment
    content: 验证部署结果并配置访问域名
    status: completed
    dependencies:
      - deploy-hosting
---

## 项目概述

无人机培训系统前端开发已完成，现需完成 CloudBase 环境配置和部署工作。

## 核心任务

按照顺序完成以下工作：

### 阶段一：CloudBase 环境配置

1. 登录 CloudBase MCP 工具
2. 绑定云开发环境（envId: rcwljy-5ghmq2ex26764978）
3. 配置认证方式（短信登录、邮箱登录、匿名登录）
4. 配置数据库安全规则

### 阶段二：构建与部署

5. 构建生产版本
6. 部署到 CloudBase 静态托管
7. 配置访问域名

## 技术现状

- 前端：React + TypeScript + Vite + MUI
- 已集成 @cloudbase/js-sdk
- 环境 ID 已配置：rcwljy-5ghmq2ex26764978
- 编译无错误，代码质量良好

## 技术栈

- **前端框架**: React 19 + TypeScript 5.9
- **构建工具**: Vite 6.3
- **UI 组件库**: MUI 5.18 + Tailwind CSS 3.4
- **状态管理**: Zustand 5.0
- **云服务**: CloudBase (@cloudbase/js-sdk)

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CloudBase 静态网站托管                          │
│         (CDN 加速，HTTPS，自定义域名)                         │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   云函数      │   │   数据库      │   │   云存储      │
│  (API 接口)   │   │ (NoSQL/MySQL) │   │  (文件存储)   │
└───────────────┘   └───────────────┘   └───────────────┘
```

## 实施要点

1. **认证配置**: 使用 [mcp:cloudbase] 配置短信、邮箱、匿名登录
2. **安全规则**: 使用 [mcp:cloudbase] 配置数据库读写权限
3. **构建优化**: 使用 Vite 生产模式构建，启用代码分割
4. **部署策略**: 使用 [mcp:cloudbase] uploadFiles 部署到静态托管

## 使用的扩展

### MCP

- **cloudbase**
- 用途：登录认证、环境绑定、认证配置、数据库规则配置、静态托管部署
- 预期结果：完成 CloudBase 环境配置并成功部署项目

### Skill

- **auth-tool-cloudbase**
- 用途：指导认证方式配置流程
- 预期结果：正确启用短信、邮箱、匿名登录

- **web-development**
- 用途：指导静态托管部署最佳实践
- 预期结果：成功部署并配置访问域名