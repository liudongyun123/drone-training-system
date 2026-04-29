# 无人机培训系统 - 项目结构说明

> 最后更新: 2026-04-29

## 📁 项目目录结构

```
drone-training-system/
├── miniprogram/                    # 微信小程序（原生开发）
│   ├── pages/                      # 小程序页面
│   │   ├── index/                  # 首页
│   │   ├── course-list/            # 课程列表
│   │   ├── course-detail/          # 课程详情
│   │   ├── shop/                   # 配件商城
│   │   ├── product-detail/         # 商品详情
│   │   ├── cart/                   # 购物车
│   │   ├── checkout/               # 结算
│   │   ├── login/                  # 登录
│   │   ├── my-learning/            # 我的学习（TabBar:我的）
│   │   ├── my-orders/              # 我的订单
│   │   ├── my-classes/             # 我的培训班
│   │   ├── my-schedule/            # 我的日程
│   │   ├── class-list/             # 培训班列表
│   │   ├── class-detail/           # 培训班详情
│   │   ├── class-enrollment/       # 培训班报名
│   │   ├── practice/               # 练习记录
│   │   ├── exam/                   # 考试
│   │   ├── result/                 # 考试结果
│   │   └── my-certificates/        # 我的证书
│   ├── utils/                      # 工具函数
│   │   ├── cloudbase.ts            # CloudBase 封装
│   │   ├── api.ts                  # API 层（与 Web 端 shared/services 对齐）
│   │   └── util.ts                 # 通用工具
│   ├── components/                 # 组件
│   ├── assets/                     # 静态资源
│   ├── styles/                     # 样式
│   ├── app.ts / app.json / app.wxss # 小程序入口
│   ├── project.config.json         # 项目配置
│   └── sitemap.json                # 站点地图
│
├── src/                            # Web + Admin 前端（React 18）
│   ├── shared/                     # 🔑 共用层（Web + Admin 复用）
│   │   ├── types/                  # 类型定义
│   │   │   ├── course.ts           # 课程/章节/进度
│   │   │   ├── class.ts            # 培训班/报名/排课/教师
│   │   │   ├── shop.ts             # 商品/SKU/规格/物流
│   │   │   ├── unifiedOrder.ts     # 统一订单（课程+商城）
│   │   │   ├── order.ts            # 课程订单
│   │   │   ├── user.ts             # 用户
│   │   │   └── index.ts            # 统一导出
│   │   ├── services/               # API 层
│   │   │   ├── courseApi.ts        # 课程 API
│   │   │   ├── classApi.ts         # 培训班+排课+报名 API
│   │   │   ├── shopApi.ts          # 商城 API
│   │   │   ├── orderApi.ts         # 课程订单 API
│   │   │   ├── unifiedOrderApi.ts  # 统一订单 API
│   │   │   └── index.ts            # 统一导出
│   │   ├── hooks/                  # React Hooks
│   │   │   ├── useCourseList.ts
│   │   │   ├── useCourseDetail.ts
│   │   │   ├── useClassList.ts
│   │   │   ├── useClassDetail.ts
│   │   │   ├── useEnrollment.ts
│   │   │   ├── useShopProducts.ts
│   │   │   ├── useUnifiedOrders.ts
│   │   │   └── index.ts            # 统一导出
│   │   └── index.ts                # 共用层总入口
│   │
│   ├── web/pages/                  # 前台页面
│   │   ├── home/                   # 首页/教师/公告
│   │   ├── account/                # 登录/注册/订单/购物车
│   │   ├── learning/               # 课程列表/详情/学习
│   │   ├── training/               # 培训班/我的班级/日程
│   │   ├── practice/               # 考试/练习/证书
│   │   └── shop/                   # 商城/商品详情 ⭐新增
│   │
│   ├── admin/pages/                # 后台管理页面
│   │   ├── system/                 # 仪表盘/登录/数据修复
│   │   ├── courses/                # 课程管理
│   │   ├── classes/                # 班级/排课/订单/报名
│   │   ├── users/                  # 用户/角色/证书
│   │   ├── orders/                 # 课程订单/财务/调课
│   │   ├── exams/                  # 考试/练习记录
│   │   ├── content/                # 分类/配置/教师
│   │   └── shop/                   # 商品管理/商城订单 ⭐新增
│   │
│   ├── components/                 # 共用组件
│   ├── services/                   # 业务服务（待整合到 shared）
│   ├── store/                      # 状态管理 (Zustand)
│   ├── contexts/                   # React Context
│   ├── router/                     # 路由配置
│   ├── types/                      # 类型（待整合到 shared）
│   └── utils/                      # 工具函数
│
├── cloudfunctions/                 # 云函数
│   ├── login/                      # ⭐ 小程序登录
│   ├── getPhoneNumber/             # ⭐ 获取手机号
│   ├── wechat-pay/                 # 微信支付
│   ├── api/                        # Web API
│   ├── mobile-api/                 # 移动端 API（待整合）
│   ├── admin/                      # 后台 API（待整合）
│   └── migrate-permissions/        # 数据迁移
│
├── docs/                           # 文档
│   ├── FULL_ARCHITECTURE.md        # 完整架构设计
│   ├── REFACTOR_PLAN.md            # 重构计划
│   ├── WECHAT_PAY_CONFIG.md        # 微信支付配置
│   └── SECURITY_RULES_CONFIG.js    # 安全规则
│
├── tests/                          # 测试
├── project.config.json             # 微信开发者工具配置
└── package.json
```

## 🛣️ 路由表

### 前台路由
| 路径 | 页面 | 需登录 |
|------|------|--------|
| `/` | 首页 | ❌ |
| `/courses` | 课程列表 | ❌ |
| `/courses/:id` | 课程详情 | ❌ |
| `/shop` | 配件商城 ⭐ | ❌ |
| `/shop/:id` | 商品详情 ⭐ | ❌ |
| `/classes` | 培训班列表 | ❌ |
| `/login` | 登录 | ❌ |
| `/learning` | 我的学习 | ✅ |
| `/my-classes` | 我的班级 | ✅ |
| `/my-orders` | 我的订单 | ✅ |
| `/exam-center` | 考试中心 | ✅ |
| `/checkout` | 结算 | ✅ |

### 后台路由
| 路径 | 功能 |
|------|------|
| `/admin` | 仪表盘 |
| `/admin/courses` | 课程管理 |
| `/admin/classes` | 班级管理 |
| `/admin/products` | 商品管理 ⭐ |
| `/admin/shop-orders` | 商城订单 ⭐ |
| `/admin/course-orders` | 课程订单 |
| `/admin/class-orders` | 培训班订单 |
| `/admin/exams` | 考试题库 |

## 📊 使用方式

```tsx
// 任何页面 - 从共用层导入
import { 
  type Course, TrainingClass, Product, UnifiedOrder,
  courseApi, classApi, shopApi, unifiedOrderApi,
  useCourseList, useClassList, useShopProducts
} from '@/shared'
```

## ⚡ 构建信息

- 构建时间: ~25s
- index chunk: 271KB (gzip: 84KB)
- 最大 chunk: vendor-cloudbase 643KB（第三方库，无法拆分）

## 🔜 待完成

- [ ] 现有 services 层整合到 shared/services
- [ ] 现有 types 层整合到 shared/types  
- [ ] 大组件拆分（3079行 CourseDetailPage 等）
- [ ] 云函数合并（api + mobile-api + admin → unified）
- [ ] 小程序小程序云函数部署
- [ ] 小程序剩余页面补全（profile, my-certificates 等）