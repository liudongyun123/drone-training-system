# 无人机培训系统

基于 React + CloudBase 的在线无人机培训平台。

## 🚀 功能特性

- 📚 课程管理 - 课程创建、编辑、分类管理
- 🎓 在线学习 - 视频课程、章节练习
- 📝 在线考试 - 随机组卷、自动评分
- 💳 支付系统 - 微信支付、线下报名
- 👥 会员管理 - 权限管理、会员等级
- 📊 数据统计 - 仪表盘、营收分析
- 📱 管理后台 - 全面的后台管理系统

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | 前端框架 |
| React Router | 路由管理 |
| Zustand | 状态管理 |
| Tailwind CSS + daisyUI | UI 框架 |
| CloudBase | 云开发后端 |
| Vite | 构建工具 |

## 📦 安装部署

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 🌐 部署到 CloudBase

```bash
# 1. 构建项目
npm run build

# 2. 上传 dist 目录到 CloudBase 静态托管
```

## 📁 项目结构

```
Claw/
├── src/                    # 源代码
│   ├── components/         # 组件
│   ├── pages/             # 页面
│   ├── routes/            # 路由配置
│   ├── services/          # API 服务
│   ├── store/             # 状态管理
│   └── utils/             # 工具函数
├── cloudfunctions/        # 云函数
├── e2e/                   # E2E 测试
├── docs/                  # 文档
└── dist/                  # 构建输出
```

## 🔧 环境变量

复制 `.env.example` 为 `.env.local` 并配置：

```env
VITE_SENTRY_DSN=          # Sentry DSN (可选)
VITE_ENV_ID=              # CloudBase 环境 ID
VITE_PUBLISHABLE_KEY=     # CloudBase 可发布密钥
```

## 📝 配置指南

- [腾讯云短信配置](./docs/SMS_CONFIG_GUIDE.md)
- [微信支付配置](./docs/WECHAT_PAY_NATIVE_GUIDE.md)
- [Sentry监控配置](./docs/SENTRY_CONFIG_GUIDE.md)

## 🧪 测试

```bash
# E2E 测试
npm run test:e2e

# UI 模式
npm run test:e2e:ui
```

## 📄 License

MIT
