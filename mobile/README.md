# 无人机培训系统 - 移动应用开发文档

## 📱 项目概述

本项目为无人机培训系统开发跨平台移动应用，采用 **React Native 0.74.0** 技术栈，通过 **CloudBase HTTP API** 与后端服务通信。

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                   React Native App                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Screens │  │  Store  │  │  Hooks  │  │ Services│         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                          │                                   │
│                    HTTP API Client                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    CloudBase 云函数                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │mobile-auth   │  │mobile-course │  │mobile-order  │       │
│  │mobile-exam   │  │mobile-learning                       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────┬──────────────────────────────────┘
                           │ SDK
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    CloudBase 资源                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ NoSQL   │  │ 云存储   │  │  认证    │  │ 云函数   │         │
│  │ 数据库   │  │         │  │         │  │         │         │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘         │
└──────────────────────────────────────────────────────────────┘
```

## ☁️ CloudBase 云函数服务

### 已部署的云函数

| 函数名称 | 路径 | 功能 |
|---------|------|------|
| mobile-auth | `/mobile-auth` | 认证服务（登录/注册/Token验证） |
| mobile-course | `/mobile-course` | 课程服务（列表/详情/章节） |
| mobile-order | `/mobile-order` | 订单服务（创建/支付/查询） |
| mobile-exam | `/mobile-exam` | 考试服务（列表/答题/成绩） |
| mobile-learning | `/mobile-learning` | 学习进度服务 |

### API 调用方式

```
POST https://{envId}.service.{region}.tcloudbase.com/{functionName}
Headers:
  Content-Type: application/json
  X-Env-Id: {envId}
  Authorization: Bearer {token}  // 需要认证的接口

Body:
{
  "action": "actionName",
  "data": { ... }
}
```

### API 端点

- **环境ID**: `rcwljy-5ghmq2ex26764978`
- **区域**: `ap-shanghai`
- **网关地址**: `https://rcwljy-5ghmq2ex26764978.service.ap-shanghai.tcloudbase.com`

## 📦 项目结构

```
mobile/DroneTrainingMobile/
├── src/
│   ├── assets/          # 静态资源
│   ├── components/      # 公共组件
│   ├── config/          # 应用配置
│   │   └── index.ts     # CloudBase配置
│   ├── hooks/           # 自定义Hooks
│   ├── navigation/      # 导航配置
│   ├── screens/         # 页面组件
│   │   ├── auth/        # 认证页面
│   │   ├── course/      # 课程页面
│   │   ├── exam/        # 考试页面
│   │   ├── home/        # 首页
│   │   ├── learning/    # 学习页面
│   │   └── profile/     # 个人中心
│   ├── services/        # 服务层
│   │   └── api/         # API服务
│   │       ├── auth.ts  # 认证API
│   │       ├── course.ts # 课程API
│   │       ├── client.ts # API客户端
│   │       └── index.ts
│   ├── store/           # 状态管理
│   │   └── userStore.ts # 用户状态
│   ├── types/           # 类型定义
│   │   └── index.ts
│   └── utils/           # 工具函数
├── package.json
└── tsconfig.json
```

## 🎨 设计规范

### 美学方向
**Retro-futuristic（复古未来主义）** - 结合航空仪表盘美学与现代数字界面

### 色彩方案
```css
--primary: #FF8C00;        /* 琥珀橙色 */
--secondary: #00D4AA;       /* 航空绿 */
--accent: #00A8E8;          /* 天空蓝 */
--bg-primary: #0A0E14;      /* 深夜背景 */
--bg-secondary: #1A1F29;    /* 卡片背景 */
--text-primary: #FFFFFF;     /* 主文字 */
--text-secondary: #A0AEC0;   /* 次要文字 */
```

### 字体方案
- 标题: Orbitron / Rajdhani
- 正文: Source Sans Pro / Noto Sans SC
- 数字: JetBrains Mono / Roboto Mono

## 🚀 开发指南

### 安装依赖

```bash
cd mobile/DroneTrainingMobile
npm install
```

### iOS 开发

```bash
# 启动Metro
npm start

# 运行iOS模拟器
npm run ios

# 或使用Xcode打开ios/DroneTrainingMobile.xcworkspace
```

### Android 开发

```bash
# 启动Metro
npm start

# 运行Android模拟器
npm run android
```

### 构建发布

```bash
# iOS Debug
npm run build:ios:debug

# iOS Release
npm run build:ios:release

# Android Debug
npm run build:android:debug

# Android Release
npm run build:android:release
```

## 🔐 认证流程

### 短信登录
```
1. 用户输入手机号
2. 调用 sendSmsCode 发送验证码
3. 用户输入6位验证码
4. 调用 loginBySms 完成登录
5. 保存 token 和 userId
```

### 密码登录
```
1. 用户输入手机号和密码
2. 调用 loginByPassword
3. 验证通过后保存认证信息
```

### Token 验证
```
1. 应用启动时从 AsyncStorage 恢复 token
2. 调用 verifyToken 验证有效性
3. 有效则恢复登录状态，无效则清除
```

## 📊 数据库集合

| 集合名称 | 说明 |
|---------|------|
| users | 用户信息 |
| sessions | 登录会话 |
| courses | 课程信息 |
| lessons | 课时信息 |
| teachers | 教师信息 |
| orders | 订单信息 |
| exams | 考试信息 |
| questions | 题目信息 |
| examResults | 考试成绩 |
| examSessions | 考试会话 |
| learningProgress | 学习进度 |
| courseProgress | 课程进度 |
| favorites | 收藏夹 |
| coupons | 优惠券 |

## 🛠️ 维护指南

### 更新云函数

1. 修改 `cloudfunctions/{function-name}/index.js`
2. 使用以下命令更新：

```bash
# 使用CloudBase CLI
cloudbase functions:update {function-name}
```

### 添加新API

1. 在对应云函数中添加新 action
2. 在移动端添加对应的 API 调用方法
3. 更新类型定义

## 📝 控制台链接

- [云函数管理](https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/scf)
- [NoSQL数据库](https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/db/doc)
- [云存储](https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/storage)
- [身份认证](https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/identity)

## 📅 更新日志

### v1.0.0 (2026-04-02)
- ✅ 创建移动端项目结构
- ✅ 部署5个云函数服务
- ✅ 配置HTTP网关访问
- ✅ 实现认证服务
- ✅ 实现课程服务
- ✅ 实现订单服务
- ✅ 实现考试服务
- ✅ 实现学习进度服务
- ✅ 配置Zustand状态管理
- ✅ 设计UI规范（Retro-futuristic）

## 👥 开发团队

- **前端**: React Native
- **后端**: CloudBase 云函数
- **数据库**: CloudBase NoSQL

## 📄 许可证

MIT License
