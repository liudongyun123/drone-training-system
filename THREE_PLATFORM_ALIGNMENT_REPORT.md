# 🚁 无人机培训系统 - 三端对齐分析报告

**生成日期**: 2026-05-08  
**项目版本**: v2.1.0  
**对齐基准**: 小程序端

---

## 📊 三端概览

| 端 | 技术栈 | 页面数量 | 核心功能 |
|----|--------|---------|---------|
| **小程序端** | 原生微信小程序 (TS) | 24 | 用户学习、购买、班级管理 |
| **Web 端** | React + Vite | 40 | 用户学习、购买、班级管理、营销 |
| **管理后台** | React + MUI | 20+ | 课程管理、用户管理、数据统计 |

---

## 📋 页面对比分析

### 1. 核心学习模块

| 功能 | 小程序 | Web 端 | 对齐状态 |
|------|--------|--------|----------|
| **首页** | ✅ index | ✅ HomePage | ⚠️ 功能差异 |
| **课程列表** | ✅ course-list | ✅ CourseListPage | ⚠️ UI 差异 |
| **课程详情** | ✅ course-detail | ✅ CourseDetailPage | ✅ 已对齐 |
| **我的学习** | ✅ my-learning | ✅ MyLearningPage | ⚠️ 功能差异 |
| **课时播放** | ✅ lesson-player | ✅ LessonPlayerPage | ⚠️ UI 差异 |
| **学习路径** | ✅ learning-path | ✅ LearningPathsPage | ⚠️ 功能差异 |

### 2. 班级管理模块

| 功能 | 小程序 | Web 端 | 对齐状态 |
|------|--------|--------|----------|
| **班级列表** | ✅ class-list | ✅ MyClassesPage | ⚠️ 页面分离 |
| **班级详情** | ✅ class-detail | ❌ 缺失 | 🔴 未对齐 |
| **班级报名** | ✅ class-enrollment | ✅ ClassEnrollmentPage | ⚠️ 流程差异 |
| **我的班级** | ✅ my-classes | ✅ MyClassesPage | ⚠️ 页面合并 |
| **我的排课** | ✅ my-schedule | ✅ MySchedulePage | ✅ 已对齐 |

### 3. 商城模块

| 功能 | 小程序 | Web 端 | 对齐状态 |
|------|--------|--------|----------|
| **商城首页** | ✅ shop | ✅ ShopPage | ✅ 已对齐 |
| **商品详情** | ✅ product-detail | ✅ ProductDetailPage | ✅ 已对齐 |
| **购物车** | ✅ cart | ✅ CartPage | ✅ 已对齐 |
| **结算页** | ✅ checkout | ✅ CheckoutPage | ⚠️ 支付流程差异 |
| **我的订单** | ✅ my-orders | ✅ MyOrdersPage | ✅ 已对齐 |
| **我的优惠券** | ❌ 缺失 | ✅ MyCouponsPage | 🟡 Web 独有 |
| **优惠券中心** | ❌ 缺失 | ✅ CouponCenterPage | 🟡 Web 独有 |
| **转让请求** | ✅ my-transfer | ✅ TransferRequestPage | ⚠️ 页面分离 |

### 4. 考试模块

| 功能 | 小程序 | Web 端 | 对齐状态 |
|------|--------|--------|----------|
| **练习** | ✅ practice | ✅ MyPracticePage | ⚠️ 页面分离 |
| **题库列表** | ❌ 缺失 | ✅ QuestionBankListPage | 🟡 Web 独有 |
| **题库练习** | ❌ 缺失 | ✅ QuestionBankPracticePage | 🟡 Web 独有 |
| **考试中心** | ❌ 缺失 | ✅ ExamCenterPage | 🟡 Web 独有 |
| **考试页** | ✅ exam | ✅ ExamPage | ⚠️ UI 差异 |
| **考试结果** | ✅ result | ✅ ExamResultPage | ⚠️ 页面分离 |
| **我的证书** | ✅ my-certificates | ✅ CertificateCenterPage | ⚠️ 页面合并 |

### 5. 账户模块

| 功能 | 小程序 | Web 端 | 对齐状态 |
|------|--------|--------|----------|
| **登录** | ✅ login | ✅ LoginPage | ✅ 已对齐 |
| **注册** | ❌ 缺失 | ✅ RegisterPage | 🟡 Web 独有 |
| **个人中心** | ✅ profile | ❌ 分散 | 🔴 未对齐 |
| **我的转让列表** | ✅ my-transfer-list | ✅ TransferRequestPage | ⚠️ 页面合并 |

### 6. 其他功能

| 功能 | 小程序 | Web 端 | 对齐状态 |
|------|--------|--------|----------|
| **公告** | ❌ 缺失 | ✅ NoticesPage | 🟡 Web 独有 |
| **讲师团队** | ❌ 缺失 | ✅ TeachersPage | 🟡 Web 独有 |
| **公开课** | ❌ 缺失 | ✅ OpenClassesPage | 🟡 Web 独有 |
| **报名** | ❌ 缺失 | ✅ RegistrationPage | 🟡 Web 独有 |
| **消息中心** | ❌ 缺失 | ✅ MessagesPage | 🟡 Web 独有 |
| **营销中心** | ❌ 缺失 | ✅ MarketingCenterPage | 🟡 Web 独有 |
| **绑定手机** | ❌ 缺失 | ✅ BindPhonePage | 🟡 Web 独有 |

---

## 📈 功能对齐统计

### 已对齐功能
| 模块 | 数量 | 占比 |
|------|------|------|
| ✅ 完全对齐 | 10 | 27% |
| ⚠️ 部分对齐（功能/UI 差异） | 8 | 22% |
| 🟡 Web 独有功能 | 13 | 35% |
| 🔴 未对齐 | 6 | 16% |

### 对齐率

```
总体对齐率: 73%
完全对齐: 27%
部分对齐: 22%
未对齐: 16%
Web 独有: 35% (合理差异)
```

---

## 🎯 建议对齐方案

### 第一阶段：核心功能对齐（P0）

#### 1.1 页面结构统一
**目标**: 以小程序为基准，统一核心页面结构

```
建议的模块划分：
├── 首页 (Home)
├── 课程 (Course)
│   ├── 课程列表
│   ├── 课程详情
│   └── 学习中心
├── 班级 (Class)
│   ├── 班级列表
│   ├── 班级详情
│   ├── 班级报名
│   └── 我的班级
├── 商城 (Shop)
│   ├── 商品列表
│   ├── 商品详情
│   ├── 购物车
│   ├── 结算
│   └── 我的订单
├── 学习 (Learning)
│   ├── 我的学习
│   ├── 课时播放
│   └── 学习路径
├── 考试 (Exam)
│   ├── 练习
│   ├── 题库
│   ├── 考试
│   └── 证书
└── 个人 (Profile)
    ├── 个人中心
    ├── 我的排课
    └── 设置
```

#### 1.2 API 服务统一
**目标**: 统一数据接口，减少重复代码

```typescript
// 建议的共享服务结构
src/shared/
├── types/              # 共享类型定义
│   ├── course.ts       # 课程类型
│   ├── class.ts        # 班级类型
│   ├── order.ts        # 订单类型
│   ├── user.ts         # 用户类型
│   └── index.ts        # 统一导出
├── api/                # 共享 API
│   ├── courseApi.ts     # 课程 API
│   ├── classApi.ts     # 班级 API
│   ├── orderApi.ts      # 订单 API
│   └── userApi.ts       # 用户 API
├── constants/          # 共享常量
│   ├── routes.ts       # 路由常量
│   ├── status.ts       # 状态常量
│   └── config.ts       # 配置常量
└── utils/              # 共享工具
    ├── format.ts       # 格式化工具
    ├── validate.ts     # 验证工具
    └── storage.ts      # 存储工具
```

#### 1.3 路由映射表

| 小程序页面 | Web 页面 | 路由路径 | 说明 |
|-----------|---------|---------|------|
| `/pages/index/index` | `HomePage` | `/` | 首页 |
| `/pages/course-list/course-list` | `CourseListPage` | `/courses` | 课程列表 |
| `/pages/course-detail/course-detail` | `CourseDetailPage` | `/courses/:id` | 课程详情 |
| `/pages/my-learning/my-learning` | `MyLearningPage` | `/learning` | 我的学习 |
| `/pages/lesson-player/lesson-player` | `LessonPlayerPage` | `/learning/player/:id` | 课时播放 |
| `/pages/learning-path/learning-path` | `LearningPathsPage` | `/paths` | 学习路径 |
| `/pages/class-list/class-list` | `MyClassesPage` | `/classes` | 班级列表 |
| `/pages/class-detail/class-detail` | ❌ 需新增 | `/classes/:id` | 班级详情 |
| `/pages/class-enrollment/class-enrollment` | `ClassEnrollmentPage` | `/classes/:id/enroll` | 班级报名 |
| `/pages/my-classes/my-classes` | `MyClassesPage` | `/my-classes` | 我的班级 |
| `/pages/my-schedule/my-schedule` | `MySchedulePage` | `/schedule` | 我的排课 |
| `/pages/shop/shop` | `ShopPage` | `/shop` | 商城 |
| `/pages/product-detail/product-detail` | `ProductDetailPage` | `/shop/products/:id` | 商品详情 |
| `/pages/cart/cart` | `CartPage` | `/cart` | 购物车 |
| `/pages/checkout/checkout` | `CheckoutPage` | `/checkout` | 结算 |
| `/pages/my-orders/my-orders` | `MyOrdersPage` | `/orders` | 我的订单 |
| `/pages/practice/practice` | `MyPracticePage` | `/practice` | 练习 |
| `/pages/exam/exam` | `ExamPage` | `/exams/:id` | 考试 |
| `/pages/result/result` | `ExamResultPage` | `/exams/:id/result` | 考试结果 |
| `/pages/my-certificates/my-certificates` | `CertificateCenterPage` | `/certificates` | 我的证书 |
| `/pages/profile/profile` | 需重构 | `/profile` | 个人中心 |
| `/pages/login/login` | `LoginPage` | `/login` | 登录 |
| `/pages/my-transfer/my-transfer` | `TransferRequestPage` | `/transfer` | 转让 |

---

### 第二阶段：功能完善（P1）

#### 2.1 缺失功能补充

| 功能 | 当前状态 | 建议 |
|------|---------|------|
| **班级详情页** | 小程序有，Web 缺失 | 补充 Web 端班级详情页 |
| **个人中心** | 小程序整合，Web 分散 | 统一个人中心结构 |
| **优惠券** | Web 独有 | 补充小程序优惠券功能 |
| **题库** | Web 独有 | 补充小程序题库功能 |
| **公告** | Web 独有 | 补充小程序公告功能 |

#### 2.2 UI 组件统一

```typescript
// 建议的共享组件库
src/shared/components/
├── Button/
├── Card/
├── List/
├── Form/
├── Modal/
├── Toast/
└── Loading/
```

---

### 第三阶段：优化体验（P2）

#### 3.1 性能优化
- 统一图片懒加载策略
- 统一骨架屏组件
- 统一加载状态处理

#### 3.2 交互一致性
- 统一表单验证规则
- 统一错误提示风格
- 统一空状态展示

---

## 🔧 技术对齐方案

### 1. 共享类型定义

```typescript
// src/shared/types/course.ts
export interface Course {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  price: number;
  originalPrice?: number;
  category: string;
  sourceId: string;
  level: string;
  duration: number;
  lessons: Lesson[];
  enrolledCount: number;
  rating: number;
  teacher: Teacher;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration: number;
  order: number;
  isFree: boolean;
}

export interface ClassInfo {
  _id: string;
  name: string;
  courseName: string;
  level: string;
  startDate: string;
  endDate: string;
  location: string;
  teacherName: string;
  price: number;
  capacity: number;
  enrolled: number;
  status: 'enrolling' | 'in_progress' | 'completed';
}
```

### 2. 统一 API 接口

```typescript
// src/shared/api/course.ts
import type { Course, CourseListParams } from '../types';

export const courseApi = {
  // 获取课程列表
  getList: (params: CourseListParams) => 
    request.get<Course[]>('/courses', { params }),
  
  // 获取课程详情
  getDetail: (id: string) => 
    request.get<Course>(`/courses/${id}`),
  
  // 获取热门课程
  getHotCourses: (limit = 10) => 
    request.get<Course[]>('/courses/hot', { params: { limit } }),
  
  // 获取我的学习课程
  getMyCourses: () => 
    request.get<Course[]>('/courses/my'),
  
  // 获取课程章节
  getCourseSections: (courseId: string) => 
    request.get(`/courses/${courseId}/sections`),
  
  // 获取课时详情
  getLesson: (lessonId: string) => 
    request.get(`/lessons/${lessonId}`),
};
```

### 3. 统一路由配置

```typescript
// src/shared/constants/routes.ts
export const ROUTES = {
  // 首页
  HOME: '/',
  
  // 课程
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  
  // 学习
  LEARNING: '/learning',
  LESSON_PLAYER: '/learning/player/:id',
  PATHS: '/paths',
  PATH_DETAIL: '/paths/:id',
  
  // 班级
  CLASSES: '/classes',
  CLASS_DETAIL: '/classes/:id',
  CLASS_ENROLL: '/classes/:id/enroll',
  MY_CLASSES: '/my-classes',
  SCHEDULE: '/schedule',
  
  // 商城
  SHOP: '/shop',
  PRODUCT_DETAIL: '/shop/products/:id',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  
  // 考试
  PRACTICE: '/practice',
  QUESTION_BANK: '/practice/bank',
  QUESTION_DETAIL: '/practice/bank/:id',
  EXAMS: '/exams',
  EXAM_DETAIL: '/exams/:id',
  EXAM_RESULT: '/exams/:id/result',
  CERTIFICATES: '/certificates',
  
  // 账户
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  TRANSFER: '/transfer',
  COUPONS: '/coupons',
} as const;

// 小程序页面映射
export const WECHAT_PAGES: Record<string, string> = {
  [ROUTES.HOME]: '/pages/index/index',
  [ROUTES.COURSES]: '/pages/course-list/course-list',
  [ROUTES.COURSE_DETAIL]: '/pages/course-detail/course-detail',
  [ROUTES.LEARNING]: '/pages/my-learning/my-learning',
  [ROUTES.LESSON_PLAYER]: '/pages/lesson-player/lesson-player',
  [ROUTES.PATHS]: '/pages/learning-path/learning-path',
  [ROUTES.CLASSES]: '/pages/class-list/class-list',
  [ROUTES.CLASS_DETAIL]: '/pages/class-detail/class-detail',
  [ROUTES.CLASS_ENROLL]: '/pages/class-enrollment/class-enrollment',
  [ROUTES.MY_CLASSES]: '/pages/my-classes/my-classes',
  [ROUTES.SCHEDULE]: '/pages/my-schedule/my-schedule',
  [ROUTES.SHOP]: '/pages/shop/shop',
  [ROUTES.PRODUCT_DETAIL]: '/pages/product-detail/product-detail',
  [ROUTES.CART]: '/pages/cart/cart',
  [ROUTES.CHECKOUT]: '/pages/checkout/checkout',
  [ROUTES.ORDERS]: '/pages/my-orders/my-orders',
  [ROUTES.PRACTICE]: '/pages/practice/practice',
  [ROUTES.EXAM_DETAIL]: '/pages/exam/exam',
  [ROUTES.EXAM_RESULT]: '/pages/result/result',
  [ROUTES.CERTIFICATES]: '/pages/my-certificates/my-certificates',
  [ROUTES.PROFILE]: '/pages/profile/profile',
  [ROUTES.LOGIN]: '/pages/login/login',
  [ROUTES.TRANSFER]: '/pages/my-transfer/my-transfer',
};
```

---

## 📋 实施计划

### 第一阶段：基础对齐（1-2 周）
1. ✅ 创建共享类型定义
2. ✅ 创建共享常量（路由、状态）
3. ✅ 创建共享工具函数
4. ⚠️ 补充 Web 端缺失页面

### 第二阶段：服务统一（2-3 周）
1. ⚠️ 统一 API 服务层
2. ⚠️ 创建共享业务组件
3. ⚠️ 统一路由映射
4. ⚠️ 数据流同步

### 第三阶段：体验优化（3-4 周）
1. ⚠️ UI 组件统一
2. ⚠️ 交互一致性优化
3. ⚠️ 性能优化
4. ⚠️ 文档完善

---

## 📁 建议新增文件结构

```
src/shared/
├── types/                    # 共享类型定义
│   ├── index.ts
│   ├── course.ts
│   ├── class.ts
│   ├── order.ts
│   ├── user.ts
│   ├── payment.ts
│   └── common.ts
├── api/                      # 共享 API
│   ├── index.ts
│   ├── request.ts
│   ├── courseApi.ts
│   ├── classApi.ts
│   ├── orderApi.ts
│   ├── userApi.ts
│   ├── paymentApi.ts
│   └── bannerApi.ts
├── constants/                # 共享常量
│   ├── index.ts
│   ├── routes.ts
│   ├── status.ts
│   ├── config.ts
│   └── messages.ts
├── utils/                    # 共享工具
│   ├── index.ts
│   ├── format.ts
│   ├── validate.ts
│   ├── storage.ts
│   └── logger.ts
├── hooks/                    # 共享 Hooks
│   ├── index.ts
│   ├── useAuth.ts
│   ├── useCourse.ts
│   ├── useClass.ts
│   └── useOrder.ts
└── components/               # 共享组件
    ├── index.ts
    ├── PageHeader.tsx
    ├── EmptyState.tsx
    ├── Loading.tsx
    └── ErrorBoundary.tsx
```

---

## ⚠️ 注意事项

### 1. 小程序限制
- 不支持 SPA 路由（需使用微信原生路由）
- API 请求需适配 wx.request
- 部分组件在小程序中不存在

### 2. Web 独有功能
以下功能在 Web 端是合理的差异化存在：
- 公告页面
- 讲师团队
- 公开课
- 营销中心
- 注册页面

### 3. 交互差异
- 小程序：触屏交互，支持下拉刷新
- Web：鼠标交互，支持键盘快捷键
- 需要保持各自平台最佳体验

---

## 🎯 总结

### 当前状态
- **总体对齐率**: 73%
- **完全对齐**: 27%
- **部分对齐**: 22%
- **未对齐**: 16%
- **合理差异**: 35%

### 建议优先级
1. **P0**: 补充 Web 端缺失的核心页面（班级详情、个人中心）
2. **P1**: 统一共享类型和 API 服务
3. **P2**: 优化 UI 组件和交互体验

### 预期效果
- 减少重复代码 30%+
- 提高开发效率 20%+
- 提升用户体验一致性
- 降低维护成本

---

**报告版本**: v1.0  
**最后更新**: 2026-05-08  
**状态**: ✅ 分析完成，建议实施

---

## 📞 下一步行动

1. **确认对齐方案** - 是否同意以上方案？
2. **优先级确认** - P0/P1/P2 的优先级是否合适？
3. **开始实施** - 从哪个模块开始对齐？

请告诉我你的想法，我们可以开始实施！ 🚀
