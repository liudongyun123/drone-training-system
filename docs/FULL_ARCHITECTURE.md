# 无人机培训系统 - 完整架构设计

## 一、业务全景

### 核心业务模块

```
┌─────────────────────────────────────────────────────┐
│              无人机培训 + 商城系统                     │
├────────────┬────────────┬──────────┬────────────────┤
│  📚 学习    │  ✈️ 培训    │  📝 考试  │  🛒 商城       │
│  线上课程    │  班级管理    │  题库练习  │  商品展示      │
│  视频学习    │  报名管理    │  理论考试  │  购物车       │
│  学习进度    │  排课管理    │  成绩管理  │  订单管理      │
│            │  教师管理    │  证书管理  │  库存管理      │
│            │            │          │  物流发货      │
└────────────┴────────────┴──────────┴────────────────┘
                      │
              ┌───────┴───────┐
              │   用户 + 支付   │
              │  登录/注册/会员  │
              │  微信支付       │
              └───────────────┘
```

### 核心业务规则

| 规则 | 说明 |
|------|------|
| 报名培训班 = 自动获得线上课程 | 报名成功自动授权对应课程 |
| 线上缴费 | 微信支付，自动确认 |
| 线下缴费 | 管理员录入，手动确认 |
| 课程独立购买 | 可单独买课程，不报培训班 |
| 统一订单管理 | 课程订单 + 商城订单统一管理 |

---

## 二、技术架构

### 三端分离

| 端 | 技术 | 位置 | 构建方式 |
|----|------|------|----------|
| **Web 前台** | React（响应式） | `src/web/` | 同一构建 |
| **Web 后台** | React（懒加载） | `src/admin/` | 同一构建 |
| **微信小程序** | 原生 WXML/TS | `miniprogram/` | 独立构建 |

### 共用层（地下室）

```
src/shared/
├── types/              # 类型定义（所有端共用）
│   ├── course.ts       # 课程
│   ├── class.ts        # 培训班 + 报名
│   ├── shop.ts         # 商城
│   ├── unifiedOrder.ts # 统一订单
│   ├── order.ts        # 课程订单
│   ├── user.ts         # 用户
│   └── index.ts        # 统一导出
│
├── services/           # API 调用（所有端共用）
│   ├── courseApi.ts
│   ├── classApi.ts
│   ├── shopApi.ts
│   ├── orderApi.ts
│   └── index.ts
│
└── hooks/              # 业务逻辑（React 端共用）
    ├── useCourseList.ts
    ├── useClassList.ts
    ├── useEnrollment.ts
    └── index.ts
```

---

## 三、数据模型

### 1. 培训班（TrainingClass）

```typescript
interface TrainingClass {
  _id: string
  name: string
  includedCourses: string[]  // 报名即获得的课程ID列表
  teacherId: string
  maxStudents: number
  price: number
  startDate: string
  endDate: string
  location: string
  status: 'draft' | 'enrolling' | 'ongoing' | 'finished'
}
```

### 2. 报名记录（Enrollment）

```typescript
interface Enrollment {
  _id: string
  classId: string
  userId: string
  paymentMethod: 'online' | 'offline'  // 线上/线下缴费
  paymentStatus: 'pending' | 'paid' | 'confirmed'
  grantedCourses: string[]   // 已授权课程
  status: 'pending' | 'confirmed' | 'cancelled'
}
```

### 3. 商品（Product）

```typescript
interface Product {
  _id: string
  name: string
  categoryId: string
  price: number
  stock: number
  specList: ProductSpec[]  // 规格列表
  status: 'draft' | 'onsale' | 'offsale'
}
```

### 4. 统一订单（UnifiedOrder）

```typescript
interface UnifiedOrder {
  _id: string
  orderNo: string
  userId: string
  orderType: 'course' | 'shop'  // 🔑 核心区分
  
  // 课程订单字段
  courseItems?: OrderItem[]
  
  // 商城订单字段
  shopItems?: CartProductItem[]
  shippingAddress?: ShippingAddress
  shippingInfo?: ShippingInfo
  
  // 公共字段
  totalAmount: number
  status: OrderStatus
  paymentMethod: 'wechat' | 'offline'
}
```

---

## 四、页面结构

### 前台用户端

```
src/web/pages/
├── learning/           # 线上学习
│   ├── CourseListPage
│   ├── CourseDetailPage
│   ├── LessonPlayerPage
│   └── MyLearningPage
│
├── training/           # 线下培训（核心）
│   ├── ClassListPage      # 培训班列表
│   ├── ClassDetailPage    # 培训班详情（含包含课程）
│   ├── ClassEnrollmentPage # 报名页面
│   ├── MySchedulePage     # 我的排课表
│   └── MyClassesPage      # 我的培训班
│
├── shop/               # 🆕 商城
│   ├── ShopHomePage       # 商城首页
│   ├── ProductListPage    # 商品列表
│   ├── ProductDetailPage  # 商品详情
│   ├── CartPage           # 购物车
│   └── CheckoutPage       # 结算
│
├── practice/           # 练习/考试
│   ├── QuestionBankPage
│   ├── ExamPage
│   └── MyPracticePage
│
├── certificate/        # 证书
│   └── CertificateListPage
│
├── account/            # 账户
│   ├── LoginPage
│   ├── RegisterPage
│   ├── ProfilePage
│   ├── MyOrdersPage       # 统一订单（课程+商城）
│   └── CartPage           # 课程购物车
│
└── home/
    ├── HomePage           # 首页（推荐课程+培训班+商品）
    ├── TeachersPage
    └── NoticesPage
```

### 后台管理端

```
src/admin/pages/
├── classes/            # 培训班管理（核心）
│   ├── ClassManagement      # 培训班管理（设置包含课程）
│   ├── ScheduleManagement   # 排课管理
│   ├── EnrollmentManagement # 报名管理（含线下缴费确认）
│   └── TeacherManagement    # 教师管理
│
├── shop/               # 🆕 商城管理
│   ├── ProductManagement    # 商品管理
│   ├── CategoryManagement   # 分类管理
│   ├── InventoryManagement  # 库存管理
│   └── ShopOrderManagement  # 商城订单
│
├── courses/            # 课程管理
│   ├── CourseManagement
│   ├── ChapterManagement
│   └── LessonManagement
│
├── orders/             # 🆕 统一订单管理
│   └── OrderManagement      # 课程订单 + 商城订单
│
├── exams/              # 考试管理
│   ├── ExamManagement
│   ├── QuestionBankManagement
│   └── ExamResultManagement
│
├── certificates/       # 证书管理
│   └── CertificateManagement
│
├── users/              # 用户管理
│   ├── UserManagement
│   └── RoleManagement
│
├── marketing/          # 营销管理
│   ├── CouponManagement
│   ├── BannerManagement
│   └── PageConfigManagement
│
└── system/             # 系统管理
    ├── Dashboard           # 统一统计（培训+商城）
    ├── SystemSettings
    └── LogManagement
```

---

## 五、执行计划

| 阶段 | 内容 | 时间 | 状态 |
|------|------|------|------|
| **第 1 步** | 建地下室 + 类型收拢 | 2-3天 | ✅ 已完成 |
| **第 2 步** | API 层统一 | 2-3天 | 进行中 |
| **第 3 步** | Hooks 提取 | 2-3天 | - |
| **第 4 步** | Web 端页面迁移 | 5-7天 | - |
| **第 5 步** | 后台页面迁移 | 3-5天 | - |
| **第 6 步** | 商城模块开发 | 7-10天 | - |
| **第 7 步** | 小程序项目搭建 | 10-14天 | - |
| **第 8 步** | 大组件拆分 | 3-5天 | - |
| **第 9 步** | 测试 + 上线 | 3-5天 | - |

**总计：6-9 周**

---

## 六、商城分期规划

| 版本 | 功能 | 时间 |
|------|------|------|
| **V1** | 商品展示 + 购买 + 到店自提 | 2周 |
| **V2** | 快递发货 + 物流跟踪 | 1周 |
| **V3** | 退款退货 + 售后 | 1周 |
| **V4** | 营销活动（满减、秒杀） | 1周 |

---

创建时间：2026-04-29
最后更新：2026-04-29
确认人：红包