# 🚁 无人机培训系统

基于 React + CloudBase 的在线无人机培训平台。

[![Deploy with CloudBase](https://img.shields.io/badge/Deploy-CloudBase-blue)](https://cloud.tencent.com/product/tcb)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## 🚀 功能特性

| 模块 | 功能 |
|------|------|
| 📚 **课程管理** | 课程创建、编辑、分类管理 |
| 🎓 **在线学习** | 视频课程、章节练习 |
| 📝 **在线考试** | 随机组卷、自动评分 |
| 💳 **支付系统** | 微信支付、线下报名 |
| 👥 **会员管理** | 权限管理、会员等级 |
| 📊 **数据统计** | 仪表盘、营收分析 |
| 📱 **管理后台** | 全面的后台管理系统 |

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | 前端框架 |
| React Router | 路由管理 |
| Zustand | 状态管理 |
| MUI + Tailwind CSS | UI 框架 |
| CloudBase | 云开发后端 |
| Vite | 构建工具 |
| Vitest | 单元测试 |
| Playwright | E2E 测试 |

## 📦 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆项目
git clone https://github.com/liudongyun123/drone-training-system.git
cd drone-training-system/Claw

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 🌐 部署

### 部署到 CloudBase

```bash
# 1. 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 2. 登录
tcb login

# 3. 部署到静态托管
npx @cloudbase/cli surestatic --env-id 你的环境ID --upload-path ./dist
```

### 环境变量

在 `vite.config.ts` 中配置：

```typescript
const ENV_ID = "你的环境ID";
const PUBLISHABLE_KEY = "你的发布密钥";
```

## 📁 项目结构

```
Claw/
├── src/                      # 源代码
│   ├── components/            # 公共组件
│   ├── pages/                 # 页面组件
│   ├── routes/                # 路由配置
│   ├── services/              # API 服务 (38个)
│   ├── store/                 # Zustand 状态管理
│   ├── utils/                 # 工具函数
│   └── types/                 # TypeScript 类型定义
├── cloudfunctions/            # 云函数 (89个)
├── tests/                     # 测试文件
│   ├── unit/                  # 单元测试
│   └── e2e/                   # E2E 测试
├── docs/                      # 文档
└── dist/                      # 构建输出
```

## 🧪 测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行 E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

## 📊 数据库集合

| 集合名 | 说明 |
|--------|------|
| `courses` | 课程信息 |
| `courseSections` | 课程章节 |
| `courseLessons` | 课时内容 |
| `members` | 会员信息 |
| `orders` | 订单记录 |
| `exams` | 考试试卷 |
| `examQuestions` | 考题题库 |
| `examResults` | 考试成绩 |
| `teachers` | 教练信息 |

## 📝 License

MIT License - 详见 [LICENSE](LICENSE) 文件
