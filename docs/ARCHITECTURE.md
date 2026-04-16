# 🏗️ 架构文档

## 📋 概述

无人机培训系统采用**前后端分离架构**，前端基于 React + TypeScript，后端使用腾讯云 CloudBase 提供的数据存储、用户认证和文件存储能力。

## 🎨 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户端 (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   首页      │  │   课程      │  │   学习      │             │
│  │  HomePage   │  │  Course*   │  │  Learning*  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   考试      │  │   订单      │  │   个人      │             │
│  │   Exam*     │  │   Order*    │  │   Profile   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                      React Router (Hash Mode)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     状态管理层 (Zustand)                  │   │
│  │   authStore  │  cartStore  │  courseStore  │  orderStore  │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      服务层 (Services)                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ BaseService│ │ ApiClient  │ │SecuritySvc  │ │Performance │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   CloudBase JS SDK (@cloudbase/js-sdk)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      腾讯云 CloudBase                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   身份认证    │  │  NoSQL 数据库  │  │   云存储      │          │
│  │  (Auth)      │  │ (Database)    │  │  (Storage)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   云函数      │  │  静态托管     │                            │
│  │  (SCF)       │  │ (Hosting)    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## 🗂️ 目录结构

### 前端结构

```
src/
├── api/                    # API 请求配置
│   └── request.ts          # Axios 实例封装
├── assets/                 # 静态资源
│   ├── images/            # 图片资源
│   └── styles/            # 全局样式
├── components/             # 公共组件
│   ├── admin/             # 管理后台组件
│   │   ├── AdminLayout.tsx      # 管理后台布局
│   │   ├── AdminSidebar.tsx     # 侧边栏
│   │   ├── AdminHeader.tsx      # 顶部导航
│   │   ├── AdminDashboard.tsx   # 仪表板
│   │   ├── CourseManagement.tsx  # 课程管理
│   │   ├── StudentManagement.tsx # 学员管理
│   │   ├── TeacherManagement.tsx# 教师管理
│   │   ├── OrderManagement.tsx  # 订单管理
│   │   ├── FinanceManagement.tsx # 财务管理
│   │   ├── ScheduleManagement.tsx# 排课管理
│   │   ├── AttendanceManagement.tsx # 出勤管理
│   │   ├── ExamManagement.tsx   # 考试管理
│   │   ├── QuestionBankManagement.tsx # 题库管理
│   │   ├── CertificateManagement.tsx # 证书管理
│   │   ├── BannerManagement.tsx  # 轮播图管理
│   │   └── PageConfigManagement.tsx # 页面配置
│   ├── Layout.tsx          # 前台布局
│   ├── Loading.tsx         # 加载组件
│   ├── Navbar.tsx          # 导航栏
│   ├── Footer.tsx          # 页脚
│   ├── ErrorBoundary.tsx   # 错误边界
│   ├── Skeleton.tsx        # 骨架屏
│   ├── LazyLoad.tsx        # 懒加载工具
│   └── Toast.tsx           # 消息提示
├── config/                 # 配置文件
│   └── cloudbase.ts        # CloudBase 配置
├── contexts/               # React Context
│   └── AuthContext.tsx     # 认证上下文
├── hooks/                  # 自定义 Hooks
│   ├── useCommonHooks.ts   # 通用 Hooks
│   │   ├── useDebounce()   # 防抖
│   │   ├── useThrottle()  # 节流
│   │   ├── useLocalStorage()  # 本地存储
│   │   ├── useMediaQuery()    # 媒体查询
│   │   └── ...
│   ├── useAuthHook.ts      # 认证 Hooks
│   └── index.ts
├── pages/                  # 页面组件
│   ├── HomePage.tsx
│   ├── CourseListPage.tsx
│   ├── CourseDetailPage.tsx
│   └── ...
├── router/                 # 路由配置
│   ├── index.tsx           # 路由定义
│   └── lazyRoutes.ts      # 懒加载路由
├── routes/                 # 路由组件 (懒加载)
├── services/               # 数据服务层
│   ├── core/               # 核心服务模块
│   │   ├── BaseService.ts  # 统一服务基类
│   │   ├── ApiClient.ts    # API 客户端
│   │   │   ├── RateLimiter     # 限流器
│   │   │   ├── RequestDedupe   # 请求去重
│   │   │   └── Interceptors    # 拦截器
│   │   ├── SecurityService.ts  # 安全服务
│   │   │   ├── XSS 防护
│   │   │   ├── 输入验证
│   │   │   └── CSRF 令牌
│   │   ├── DatabaseIndexes.ts  # 数据库索引建议
│   │   ├── PerformanceMonitor.tsx # 性能监控
│   │   └── index.ts
│   ├── database.ts         # 数据库基础操作
│   ├── authService.ts      # 认证服务
│   ├── courseService.ts    # 课程服务
│   ├── orderService.ts     # 订单服务
│   ├── teacherService.ts   # 教师服务
│   ├── scheduleService.ts  # 排课服务
│   ├── attendanceService.ts# 出勤服务
│   ├── examService.ts      # 考试服务
│   ├── certificateService.ts # 证书服务
│   ├── couponService.ts    # 优惠券服务
│   ├── groupBuyService.ts  # 拼团服务
│   ├── financeService.ts   # 财务服务
│   ├── bannerService.ts    # 轮播图服务
│   ├── pageConfigService.ts# 页面配置服务
│   ├── storageService.ts   # 存储服务
│   └── index.ts            # 服务导出
├── store/                  # 状态管理
│   ├── authStore.ts        # 认证状态
│   ├── cartStore.ts        # 购物车状态
│   ├── courseStore.ts      # 课程状态
│   └── index.ts
├── types/                  # 类型定义
│   └── index.ts            # 全局类型
└── utils/                  # 工具函数
    ├── cloudbase.ts        # CloudBase 工具
    ├── format.ts           # 格式化工具
    ├── validation.ts       # 验证工具
    └── index.ts
```

## 🔌 服务层设计

### 核心服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                       Service Layer                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   BaseService                        │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 智能缓存 (TTL)    │ 自动重试 (指数退避)   │    │    │
│  │  │ 请求去重          │ 性能监控              │    │    │
│  │  │ 统一 CRUD         │ 分页查询              │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│        ┌─────────────────────┼─────────────────────┐       │
│        ▼                     ▼                     ▼       │
│  ┌───────────┐        ┌───────────┐        ┌───────────┐    │
│  │  Course   │        │  Order    │        │  Teacher  │    │
│  │  Service  │        │  Service  │        │  Service  │    │
│  └───────────┘        └───────────┘        └───────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### BaseService 核心能力

```typescript
// 智能缓存
await baseService.query('courses', queryFn, { ttl: 30000 });

// 请求去重
await baseService.deduplicate('get-course-123', fetchCourse);

// 分页查询
await baseService.paginatedQuery('orders', { page: 1, pageSize: 20 });

// 自动重试
await baseService.withRetry(fetchData, 3);
```

### ApiClient 限流机制

```typescript
// 限流配置
const client = new ApiClient({
  rateLimit: {
    maxRequests: 100,      // 最大请求数
    windowMs: 60000,       // 时间窗口 (1分钟)
  }
});

// 请求拦截器
client.addInterceptor('request', (config) => {
  // 添加认证令牌
  config.headers['Authorization'] = `Bearer ${getToken()}`;
  return config;
});
```

## 💾 数据模型

### 核心实体关系

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │   Course    │       │   Order     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ _id         │◄──────│ teacherId   │       │ userId      │
│ openid      │       │ _id         │       │ _id         │
│ name        │       │ title       │       │ courseId    │
│ phone       │       │ price       │       │ amount      │
│ role        │       │ category    │       │ status      │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       │                     ▼                     │
       │              ┌─────────────┐              │
       │              │  Chapter    │              │
       │              ├─────────────┤              │
       │              │ courseId   │◄─────────────┤
       │              │ _id        │              │
       │              │ title      │              │
       │              └─────────────┘              │
       │                     │                     │
       │                     ▼                     │
       │              ┌─────────────┐              │
       │              │   Lesson    │              │
       │              ├─────────────┤              │
       │              │ chapterId  │              │
       └──────────────►│ _id        │              │
                       │ videoUrl   │              │
                       │ duration   │              │
                       └─────────────┘              │
                                                      │
       ┌─────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│Enrollment   │       │   Exam      │       │Certificate  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ userId      │       │ courseId    │       │ userId      │
│ courseId    │       │ _id         │       │ courseId    │
│ _id         │       │ title       │       │ examId      │
│ status      │       │ duration    │       │ _id         │
│ enrollDate  │       │ passScore   │       │ status      │
└─────────────┘       └─────────────┘       └─────────────┘
```

### 数据库集合说明

| 集合名 | 用途 | 主要字段 |
|--------|------|----------|
| `users` | 用户信息 | openid, name, phone, role |
| `courses` | 课程信息 | title, price, teacherId, category |
| `chapters` | 课程章节 | courseId, title, order |
| `lessons` | 课时信息 | chapterId, videoUrl, duration |
| `orders` | 订单记录 | userId, courseId, amount, status |
| `enrollments` | 报名记录 | userId, courseId, status |
| `learning_progress` | 学习进度 | userId, lessonId, completed |
| `schedules` | 排课信息 | courseId, teacherId, startTime |
| `attendance` | 出勤记录 | scheduleId, studentId, status |
| `exams` | 考试信息 | courseId, title, duration |
| `exam_attempts` | 考试记录 | examId, userId, score |
| `question_banks` | 题库信息 | name, category, questionCount |
| `bank_questions` | 题目内容 | bankId, type, content, answer |
| `certificates` | 证书信息 | userId, courseId, status |
| `coupons` | 优惠券 | code, type, value, validTo |
| `group_buys` | 拼团活动 | courseId, price, requiredCount |
| `live_streams` | 直播课程 | courseId, streamUrl, startTime |
| `practice_records` | 练习记录 | userId, bankId, score |
| `wrong_questions` | 错题本 | userId, questionId |
| `favorite_questions` | 收藏题目 | userId, questionId |
| `banners` | 轮播图 | title, image, link, order |
| `page_configs` | 页面配置 | pageKey, config |
| `categories` | 分类管理 | name, parentId, order |
| `admin_users` | 管理员 | username, password, role |

## 🛡️ 安全设计

### XSS 防护

```typescript
// SecurityService.ts
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (c) => escapeMap[c]);
}
```

### 输入验证

```typescript
// 验证规则
export const VALIDATION_RULES = {
  required: (value) => !!value || '此字段必填',
  minLength: (min) => (value) => 
    value.length >= min || `至少 ${min} 个字符`,
  email: (value) => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || '邮箱格式不正确',
  phone: (value) => 
    /^1[3-9]\d{9}$/.test(value) || '手机号格式不正确',
};
```

### CSRF 令牌

```typescript
// 生成令牌
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 验证令牌
export function verifyCsrfToken(token: string, stored: string): boolean {
  return timingSafeEqual(token, stored);
}
```

## 📊 性能优化

### Bundle 分析

| 分块 | Gzip 大小 | 优化策略 |
|------|----------|----------|
| app.js | ~3 KB | 代码分割，按需加载 |
| chunk-react | ~180 KB | 框架代码，长期缓存 |
| chunk-mui | ~98 KB | UI 组件懒加载 |
| chunk-vendor | ~111 KB | 第三方库分离 |
| CSS | ~29 KB | Tailwind 清理 |

### 性能监控

```tsx
// PerformanceMonitor 组件
<PerformanceMonitor 
  enabled={import.meta.env.DEV}
  position="bottom-right"
  expanded={false}
/>
```

监控指标：
- 页面加载时间 (LCP)
- 首次输入延迟 (FID)
- 累计布局偏移 (CLS)
- API 请求耗时
- 缓存命中率

## 🔄 部署架构

### CI/CD 流程

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───►│  Build  │───►│  Test   │───►│ Deploy  │
│  Code   │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                    │                           │
                    ▼                           ▼
              ┌─────────┐                 ┌─────────┐
              │  dist/  │                 │CloudBase│
              │         │                 │ Hosting │
              └─────────┘                 └─────────┘
```

### 环境配置

| 环境 | 用途 | 部署地址 |
|------|------|----------|
| 开发 | 本地开发 | localhost:5173 |
| 测试 | 功能测试 | - |
| 生产 | 正式运营 | tcloudbaseapp.com |

## 📝 扩展指南

### 添加新模块

1. **定义类型** (`src/types/index.ts`)
2. **创建服务** (`src/services/xxxService.ts`)
3. **添加状态** (`src/store/xxxStore.ts`)
4. **创建页面** (`src/routes/xxxPage.tsx`)
5. **配置路由** (`src/router/index.tsx`)
6. **添加组件** (`src/components/admin/XxxManagement.tsx`)

### 数据库迁移

1. 在 CloudBase 控制台创建新集合
2. 设置安全规则
3. 添加必要索引
4. 更新 `database.ts` 中的集合名称常量

---

**文档版本**: v1.0  
**最后更新**: 2026-04-05
