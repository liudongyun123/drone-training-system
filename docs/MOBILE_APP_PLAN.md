# 无人机培训系统 - 移动端实施方案

## 项目概述

**项目名称**: DroneTrainingMobile
**项目类型**: 跨平台移动应用 (iOS + Android)
**技术框架**: React Native 0.76+
**目标用户**: 无人机学员、考证人员

## 需求确认

| 需求项 | 确认内容 |
|--------|----------|
| App类型 | 纯原生体验 (React Native) |
| 离线功能 | 不需要但预留接口 |
| 发布平台 | iOS + Android 同时上线 |
| 支付集成 | 微信支付 + 支付宝 |
| 后端服务 | 腾讯云 CloudBase |

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        应用层 (React Native)                 │
├─────────────────────────────────────────────────────────────┤
│  UI层: NativeBase + 自定义组件                                │
│  状态层: Zustand + AsyncStorage                              │
│  路由层: React Navigation 6                                  │
│  网络层: Axios + 腾讯云SDK                                   │
├─────────────────────────────────────────────────────────────┤
│                      平台特性层                              │
│  iOS: Xcode + CocoaPods                                     │
│  Android: Android Studio + Gradle                           │
├─────────────────────────────────────────────────────────────┤
│                      第三方服务                              │
│  支付: 微信支付 + 支付宝                                      │
│  推送: 极光推送 (预留)                                        │
│  统计: 腾讯移动分析 (预留)                                     │
└─────────────────────────────────────────────────────────────┘
```

## 项目结构

```
DroneTrainingMobile/
├── src/
│   ├── components/           # 共享UI组件
│   │   ├── common/           # 通用组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Loading.tsx
│   │   ├── course/           # 课程组件
│   │   │   ├── CourseCard.tsx
│   │   │   ├── CourseList.tsx
│   │   │   └── ChapterItem.tsx
│   │   ├── video/            # 视频组件
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── VideoControls.tsx
│   │   ├── exam/             # 考试组件
│   │   │   ├── QuestionCard.tsx
│   │   │   └── ExamResult.tsx
│   │   └── layout/           # 布局组件
│   │       ├── ScreenContainer.tsx
│   │       ├── Header.tsx
│   │       └── TabBar.tsx
│   │
│   ├── screens/              # 页面
│   │   ├── auth/             # 认证模块
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── home/             # 首页模块
│   │   │   └── HomeScreen.tsx
│   │   ├── course/           # 课程模块
│   │   │   ├── CourseListScreen.tsx
│   │   │   ├── CourseDetailScreen.tsx
│   │   │   └── VideoPlayerScreen.tsx
│   │   ├── learning/         # 学习模块
│   │   │   ├── MyLearningScreen.tsx
│   │   │   └── ProgressScreen.tsx
│   │   ├── exam/             # 考试模块
│   │   │   ├── ExamListScreen.tsx
│   │   │   └── ExamScreen.tsx
│   │   └── profile/          # 个人中心
│   │       ├── ProfileScreen.tsx
│   │       ├── OrderListScreen.tsx
│   │       └── CertificateScreen.tsx
│   │
│   ├── navigation/           # 路由配置
│   │   ├── index.tsx
│   │   ├── MainTabs.tsx
│   │   ├── AuthStack.tsx
│   │   └── types.ts
│   │
│   ├── services/              # 服务层
│   │   ├── api/
│   │   │   ├── client.ts      # Axios封装
│   │   │   ├── auth.ts
│   │   │   ├── course.ts
│   │   │   ├── order.ts
│   │   │   └── exam.ts
│   │   ├── storage/           # 本地存储
│   │   │   ├── index.ts
│   │   │   ├── userStorage.ts
│   │   │   └── cacheStorage.ts
│   │   ├── payment/           # 支付服务 (预留接口)
│   │   │   ├── index.ts
│   │   │   ├── wechat.ts
│   │   │   └── alipay.ts
│   │   └── download/          # 下载服务 (预留接口)
│   │       └── index.ts
│   │
│   ├── store/                 # 状态管理
│   │   ├── index.ts
│   │   ├── userStore.ts
│   │   ├── courseStore.ts
│   │   ├── cartStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── hooks/                 # 自定义Hooks
│   │   ├── useAuth.ts
│   │   ├── useCourses.ts
│   │   ├── usePayment.ts
│   │   └── useNetwork.ts
│   │
│   ├── utils/                 # 工具函数
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── format.ts
│   │
│   ├── types/                 # 类型定义
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── course.ts
│   │   └── order.ts
│   │
│   ├── config/                # 配置文件
│   │   ├── index.ts
│   │   ├── cloudbase.ts
│   │   └── payment.ts
│   │
│   └── assets/                # 静态资源
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── ios/                       # iOS原生代码
├── android/                   # Android原生代码
├── index.js                   # 应用入口
├── App.tsx                    # 根组件
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

## 核心功能模块

### 1. 认证模块

```
流程:
┌──────────┐    ┌──────────┐    ┌──────────┐
│  启动    │───▶│ 检查Token │───▶│ Token有效 │
└──────────┘    └──────────┘    └────┬─────┘
       │           │                │
       │           ▼                ▼
       │    ┌──────────┐      ┌──────────┐
       │    │ Token无效 │      │  首页    │
       │    └────┬─────┘      └──────────┘
       │         │
       ▼         ▼
   ┌──────────┐
   │  登录页  │
   └──────────┘
```

**登录方式**:
- 手机号 + 短信验证码
- 账号密码登录
- 微信一键登录 (预留)

### 2. 课程模块

```
功能:
├── 课程分类浏览
├── 课程搜索
├── 课程详情 (介绍/目录/评价)
├── 视频播放
├── 学习进度同步
└── 离线下载 (预留接口)
```

### 3. 支付模块

```
┌─────────────────────────────────────────┐
│              支付流程                     │
├─────────────────────────────────────────┤
│                                         │
│  1. 选择课程 ──▶ 加入购物车/立即购买      │
│        │                                │
│        ▼                                │
│  2. 确认订单 ──▶ 显示价格/优惠券          │
│        │                                │
│        ▼                                │
│  3. 选择支付方式                         │
│     ├── 微信支付                         │
│     └── 支付宝                           │
│        │                                │
│        ▼                                │
│  4. 调用支付SDK                          │
│        │                                │
│        ▼                                │
│  5. 支付结果回调                         │
│     ├── 成功 ──▶ 跳转学习页              │
│     └── 失败 ──▶ 提示并重试              │
│                                         │
└─────────────────────────────────────────┘
```

### 4. 考试模块

```
├── 考试列表
├── 考试说明
├── 在线答题
│   ├── 单选题
│   ├── 多选题
│   └── 判断题
├── 交卷评分
└── 成绩查询
```

## 第三方集成配置

### 腾讯云 CloudBase

```typescript
// src/config/cloudbase.ts
export const cloudbaseConfig = {
  env: 'rcwljy-5ghmq2ex26764978', // 现有环境ID
  region: 'ap-shanghai',
};
```

### 微信支付

```typescript
// src/config/payment.ts
export const wechatConfig = {
  appId: 'your-wechat-app-id', // 需在微信开放平台申请
  universalLink: 'https://your-domain.com/', // 通用链接
};
```

### 支付宝

```typescript
// src/config/payment.ts
export const alipayConfig = {
  appId: 'your-alipay-app-id', // 需在支付宝开放平台申请
};
```

## 开发计划

### 第一阶段：项目搭建 (3天)

- [ ] React Native 项目初始化
- [ ] TypeScript 配置
- [ ] 路由框架配置 (React Navigation)
- [ ] 状态管理配置 (Zustand)
- [ ] UI组件库配置 (NativeBase)
- [ ] 项目目录结构搭建

### 第二阶段：认证模块 (3天)

- [ ] 腾讯云认证集成
- [ ] 登录/注册页面
- [ ] Token管理
- [ ] 微信登录预留接口

### 第三阶段：课程模块 (5天)

- [ ] 课程列表页
- [ ] 课程详情页
- [ ] 视频播放器
- [ ] 学习进度同步

### 第四阶段：支付模块 (4天)

- [ ] 购物车功能
- [ ] 订单确认页
- [ ] 微信支付集成
- [ ] 支付宝集成
- [ ] 支付结果处理

### 第五阶段：其他模块 (4天)

- [ ] 我的学习页
- [ ] 考试模块
- [ ] 个人中心
- [ ] 订单列表

### 第六阶段：优化与发布 (5天)

- [ ] 性能优化
- [ ] 包体积优化
- [ ] iOS打包发布
- [ ] Android打包发布

**预计总工期**: 约 4-5 周

## 数据库集合映射

沿用现有CloudBase数据库集合:

| 集合名 | 用途 | 移动端权限 |
|--------|------|-----------|
| users | 用户信息 | 读写本人 |
| courses | 课程信息 | 只读 |
| lessons | 课时信息 | 只读 |
| orders | 订单信息 | 读写本人 |
| exams | 考试信息 | 只读 |
| questions | 题目信息 | 只读 |
| certificates | 证书信息 | 读写本人 |

## 注意事项

1. **iOS App Store审核**: 无人机相关内容可能需要相关资质证明
2. **Android应用市场**: 国内Android市场需要软件著作权或ICP备案
3. **微信支付商户号**: 需要企业资质申请
4. **未成年人保护**: 如涉及在线支付需考虑青少年模式

---

**创建时间**: 2026-04-02
**方案版本**: v1.0
