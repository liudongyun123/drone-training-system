# 无人机培训系统 - 项目结构说明

> 最后更新：2026-04-29

## 目录结构概览

```
drone-training-system/
├── docs/                    # 文档目录
├── src/                     # Web 端源码
├── miniprogram/             # 小程序源码（原生开发）
├── cloudfunctions/          # 云函数目录
├── public/                  # 静态资源
└── dist/                    # 构建产物
```

## 一、src/ - Web 端源码

### 1. 共用层 `src/shared/`

所有端共享的代码，目标是发布为 npm 包 `@drone/shared`。

```
src/shared/
├── types/                   # 类型定义
│   ├── course.ts            # 课程、章节、筛选条件
│   ├── class.ts             # 培训班、排课、报名、教师
│   ├── shop.ts              # 商品、SKU、购物车、物流
│   ├── unifiedOrder.ts      # 统一订单（课程+商城）
│   ├── order.ts             # 课程订单
│   ├── user.ts              # 用户
│   └── index.ts             # 统一导出
│
├── services/                # API 封装
│   ├── courseApi.ts         # 课程（列表/详情/热门/推荐）
│   ├── orderApi.ts          # 课程订单
│   ├── classApi.ts          # 培训班+排课+报名+教师
│   ├── shopApi.ts           # 商品+商城订单
│   ├── unifiedOrderApi.ts   # 统一订单管理
│   └── index.ts             # 统一导出
│
├── hooks/                   # React Hooks
│   ├── useCourseList.ts     # 课程列表（分页/筛选）
│   ├── useCourseDetail.ts   # 课程详情
│   ├── useClassList.ts      # 培训班列表
│   ├── useClassDetail.ts    # 培训班详情
│   ├── useEnrollment.ts     # 报名操作
│   ├── useShopProducts.ts   # 商品查询
│   ├── useUnifiedOrders.ts  # 订单管理
│   ├── useTeachers.ts       # 教师查询
│   └── index.ts             # 统一导出
│
└── index.ts                 # 统一入口
```

**使用方式**：
```typescript
import { Course, courseApi, useCourseList } from '@/shared'
```

### 2. 前台页面 `src/web/pages/`

按功能模块分组：

```
src/web/pages/
├── learning/                # 线上学习
│   ├── CourseListPage.tsx       # 课程列表（分类筛选）
│   ├── CourseDetailPage.tsx     # 课程详情（目录+购买）
│   ├── LessonPlayerPage.tsx     # 视频播放
│   ├── MyLearningPage.tsx       # 学习中心
│   └── LearningPathsPage.tsx    # 学习路径
│
├── training/                # 线下培训
│   ├── ClassEnrollmentPage.tsx  # 培训班报名
│   ├── MyClassesPage.tsx        # 我的培训班
│   ├── MySchedulePage.tsx       # 我的日程
│   └── MyTrainingPage.tsx       # 培训记录
│
├── practice/                # 练习/考试
│   ├── ExamCenterPage.tsx       # 考试中心
│   ├── ExamPage.tsx            # 答题页
│   ├── ExamResultPage.tsx      # 成绩页
│   ├── QuestionBankListPage.tsx # 题库列表
│   ├── QuestionBankPracticePage.tsx # 练习页
│   ├── CertificateCenterPage.tsx   # 证书中心
│   └── MarketingCenterPage.tsx     # 营销中心
│
├── account/                 # 账户相关
│   ├── LoginPage.tsx            # 登录
│   ├── RegisterPage.tsx         # 注册
│   ├── BindPhonePage.tsx        # 绑定手机号
│   ├── CartPage.tsx             # 购物车
│   ├── CheckoutPage.tsx         # 结算页
│   ├── MyOrdersPage.tsx         # 我的订单
│   ├── MyCouponsPage.tsx        # 我的优惠券
│   ├── CouponCenterPage.tsx     # 优惠券中心
│   ├── MessagesPage.tsx         # 消息
│   └── TransferRequestPage.tsx  # 转让请求
│
└── home/                    # 首页相关
    ├── HomePage.tsx             # 首页
    ├── TeachersPage.tsx         # 教师团队
    ├── NoticesPage.tsx          # 公告
    ├── OpenClassesPage.tsx      # 开放课程（报名入口）
    └── RegistrationPage.tsx     # 报名引导
```

### 3. 后台管理 `src/admin/pages/`

按业务域分组：

```
src/admin/pages/
├── courses/                 # 课程管理
│   └── AdminCourses.tsx
│
├── classes/                 # 培训班管理
│   ├── AdminClasses.tsx         # 培训班列表
│   ├── AdminClassSchedules.tsx  # 排课管理
│   ├── AdminClassOrders.tsx     # 报名订单
│   └── AdminRegistrations.tsx   # 报名审核
│
├── users/                   # 用户管理
│   ├── AdminRoles.tsx           # 角色权限
│   ├── AdminUserRoles.tsx       # 用户角色
│   ├── AdminMemberLevels.tsx    # 会员等级
│   └── AdminCertificates.tsx    # 证书记录
│
├── orders/                  # 订单财务
│   ├── AdminCourseOrders.tsx    # 课程订单
│   ├── AdminFinance.tsx         # 财务统计
│   └── AdminTransfers.tsx       # 转让管理
│
├── exams/                   # 考试管理
│   ├── AdminExamsUnited.tsx     # 考试管理
│   └── AdminPracticeRecords.tsx # 练习记录
│
├── content/                 # 内容管理
│   ├── AdminCategories.tsx      # 分类管理
│   ├── AdminPageConfig.tsx      # 页面配置
│   ├── AdminComments.tsx        # 评论管理
│   ├── AdminMarketing.tsx       # 营销活动
│   └── AdminTeachers.tsx        # 教师管理
│
└── system/                  # 系统管理
    ├── AdminDashboard.tsx       # 数据看板
    ├── AdminLogin.tsx           # 后台登录
    ├── AdminDataFix.tsx         # 数据修复
    ├── AdminDiagnostics.tsx     # 系统诊断
    └── AdminLogs.tsx            # 操作日志
```

### 4. 其他目录

```
src/
├── components/              # 共用组件
│   ├── admin/              # 后台专用组件
│   ├── payment/            # 支付相关组件
│   └── ui/                 # 通用 UI 组件
│
├── services/               # 服务层（待合并到 shared/services）
├── store/                  # Zustand 状态管理
│   ├── authStore.ts        # 认证状态
│   ├── cartStore.ts        # 购物车状态
│   ├── courseStore.ts      # 课程状态
│   ├── orderStore.ts       # 订单状态
│   └── themeStore.ts       # 主题状态
│
├── router/                  # 路由配置
│   ├── index.tsx            # 路由入口
│   └── lazyRoutes.tsx      # 懒加载路由
│
├── utils/                   # 工具函数
│   ├── cloudbase.ts         # CloudBase 初始化
│   ├── logger.ts            # 日志工具
│   └── request.ts           # 请求封装
│
├── hooks/                   # 全局 Hooks
├── constants/               # 常量定义
└── types/                   # 全局类型
```

## 二、miniprogram/ - 小程序源码

原生微信小程序开发（TypeScript）。

```
miniprogram/
├── app.ts                   # 入口文件
├── app.json                 # 路由 + TabBar 配置
├── app.wxss                 # 全局样式 + CSS 变量
├── project.config.json      # 项目配置
│
├── pages/                   # 20个页面
│   ├── index/               # 首页
│   ├── course-list/         # 课程列表
│   ├── course-detail/       # 课程详情
│   ├── class-list/          # 培训班列表
│   ├── class-detail/        # 培训班详情
│   ├── class-enrollment/    # 培训班报名
│   ├── my-classes/          # 我的培训班
│   ├── my-schedule/         # 我的日程
│   ├── shop/                # 商城
│   ├── product-detail/      # 商品详情
│   ├── cart/                # 购物车
│   ├── checkout/            # 结算
│   ├── my-orders/           # 我的订单
│   ├── login/               # 登录
│   ├── my-learning/         # 个人中心
│   ├── profile/             # 个人资料
│   ├── practice/            # 练习中心
│   ├── exam/                # 答题页
│   ├── result/              # 考试结果
│   └── my-certificates/     # 我的证书
│
├── components/               # 自定义组件
│   ├── course-card/         # 课程卡片
│   ├── product-card/        # 商品卡片
│   ├── class-card/          # 培训班卡片
│   └── order-item/          # 订单项
│
├── utils/                   # 工具函数
│   ├── cloudbase.ts          # CloudBase 工具
│   ├── api.ts                # API 封装
│   └── util.ts               # 通用工具
│
└── assets/                   # 静态资源
    └── icons/                # TabBar 图标
```

## 三、cloudfunctions/ - 云函数

```
cloudfunctions/
├── api/                     # Web 端 API（主入口）
├── admin/                   # 后台管理 API
├── mini-api/                # 小程序 API 网关
├── login/                   # 小程序登录
├── getPhoneNumber/          # 获取手机号
├── wechat-pay/              # 微信支付
└── migrate-permissions/     # 数据迁移脚本
```

## 四、关键设计决策

| 决策 | 原因 |
|------|------|
| React 18 + TypeScript | 主流生态，类型安全 |
| 小程序原生开发 | 性能最优，避免跨平台框架开销 |
| CloudBase 后端 | 免运维，微信生态无缝集成 |
| 共用层设计 | 复用类型和 API 逻辑，减少重复 |
| 统一订单表 | 课程+商城订单共用结构，简化查询 |

## 五、数据流向

```
Web端 ─────┐
           ├──→ CloudBase API（云函数）──→ 数据库
小程序 ────┘

                      ↘ 微信支付 API
                      ↘ 短信服务（腾讯云）
```

## 六、命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面组件 | PascalCase + Page | CourseListPage |
| 组件 | PascalCase | CourseCard |
| 服务/API | camelCase + Api | courseApi |
| 类型 | PascalCase | Course, OrderFilters |
| 常量 | UPPER_SNAKE_CASE | API_BASE_URL |
| 云函数 | kebab-case | mini-api |

## 七、开发流程

1. **Web 端开发**：`npm run dev` → localhost:5173
2. **小程序开发**：微信开发者工具 → 导入 miniprogram/
3. **云函数开发**：修改后右键上传部署
4. **构建**：`npm run build`
5. **部署**：`tcb hosting deploy dist/`
