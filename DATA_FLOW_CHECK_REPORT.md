# 三端数据流对齐检查报告

> 生成时间：2026-05-02 02:30
> 更新时间：2026-05-02 02:45
> 检查范围：后台管理(30模块) + Web端(40页面) + 小程序(20页面) + 云函数(7个)

---

## ✅ 已修复

### 1. 新建 api-home 云函数（首页聚合）

- 三端共用，一次请求获取首页所有数据
- 读取配置：featuredCourses、featuredClasses、featuredLearningPaths
- 按配置顺序返回，自动过滤失效ID
- 无配置时降级到默认排序

### 2. Web端 HomePage 改造

- 调用 api-home 云函数
- 降级逻辑：云函数失败则逐个加载

### 3. 小程序端 index 改造

- 调用 api-home 云函数
- 降级逻辑：云函数失败则逐个加载

### 4. 轮播图后台排序

- CloudBannerAdminService.getAll 添加 orderBy: 'order', order: 'asc'
- 后台列表顺序与前端一致

### 5. CourseManagement 读分类

- 改为走 adminService 云函数代理
- 不再直接用 app.database()

---

## ❌ 待修复

### MyLearningPage 用 adminService（架构问题）

**问题**：前台用户页面调用了后台管理专用服务

**位置**：`src/web/pages/learning/MyLearningPage.tsx`（15+处调用）

**影响**：
- 生产环境移除 `_dev: true` 后会失败
- 架构不规范，前台不应调用后台服务

**修复方案**：
- 方案A：改用 dbService 直接读（安全规则 read: true）
- 方案B：创建前台专用云函数 api-user

**优先级**：🟡 中（功能正常，架构不规范）

---

## ❌ 发现的问题（核心问题）

### 问题1：首页配置功能完全没接上

| 配置项 | 后台功能 | 数据库 | Web端读取 | 小程序读取 | 问题 |
|-------|---------|-------|---------|-----------|------|
| 热门课程 | PageConfigManagement | `featuredCourses` | ❌ 直接取前4个 | ❌ 按studentCount排序 | **配置白做** |
| 最新开班 | PageConfigManagement | `featuredClasses` | ❌ 查status=enrolling | ❌ 查status=enrolling | **配置白做** |
| 学习路径 | PageConfigManagement | `featuredLearningPaths` | ❌ 直接取前3个 | - | **配置白做** |

### 问题2：轮播图排序不对齐

| 端 | 排序逻辑 | 问题 |
|---|---------|------|
| 后台列表 | ❌ 无排序，默认顺序 | 管理员看不到实际展示顺序 |
| Web端首页 | ✅ 按`order`升序 | 正确 |
| 小程序首页 | ✅ 按`order`升序 | 正确 |

### 问题3：Web端MyLearningPage用adminService

```javascript
// src/web/pages/learning/MyLearningPage.tsx
const { adminService } = await import('@/services/adminService');
// ❌ 前台用户页面调用了后台管理专用服务
```

### 问题4：CourseManagement直接用database

```javascript
// src/components/admin/CourseManagement.tsx:101
const result = await app.database().collection('categories')...
// ❌ 后台管理直接用SDK，没走adminService云函数代理
```

---

## ✅ 已对齐的数据流

### banners（轮播图）- 基本对齐

| 端 | 写入 | 读取 | 排序 | 状态 |
|---|------|------|------|------|
| 后台 | BannerManagement | CloudBannerAdminService | ❌ 无排序 | 写入正确 |
| Web端 | - | dbService.getAll('banners') | ✅ order升序 | 正确 |
| 小程序 | - | bannerApi.getList | ✅ order升序 | 正确 |

### notices（公告）- 对齐

| 端 | 写入 | 读取 | 状态 |
|---|------|------|------|
| 后台 | NoticeManagement | CloudNoticeAdminService | ✅ |
| Web端 | - | CloudNoticeService.getPublishedNotices | ✅ |
| 小程序 | - | - | 无公告功能 |

### orders（订单）- 对齐

| 端 | 写入 | 读取 | 状态 |
|---|------|------|------|
| 后台 | OrderManagement | CloudOrderAdminService.getAll | ✅ |
| Web端 | 下单流程 | MyOrdersPage查询自己订单 | ✅ |
| 小程序 | checkout下单 | my-orders查询自己订单 | ✅ |

---

## 详细检查清单

### 1. courses（课程）

| 功能 | 后台 | Web端 | 小程序 | 问题 |
|-----|------|------|------|------|
| 课程列表 | CourseManagement ✅ | CourseListPage ✅ | course-list ✅ | - |
| 课程详情 | CourseManagement ✅ | CourseDetailPage ✅ | course-detail ✅ | - |
| 热门课程 | PageConfigManagement配置 | ❌ 直接取前4 | ❌ 按studentCount | **配置未使用** |
| 课程分类 | CourseManagement读取 | HomePage读取 | course-list读取 | ✅ |

### 2. classes（培训班）

| 功能 | 后台 | Web端 | 小程序 | 问题 |
|-----|------|------|------|------|
| 班级管理 | src/admin/pages/classes ✅ | - | - | - |
| 班级列表 | getList ✅ | OpenClassesPage ✅ | class-list ✅ | - |
| 最新开班 | PageConfigManagement配置 | ❌ 查status=enrolling | ❌ 查status=enrolling | **配置未使用** |
| 班级报名 | - | ClassEnrollmentPage ✅ | class-enrollment ✅ | - |

### 3. learning_paths（学习路径）

| 功能 | 后台 | Web端 | 小程序 | 问题 |
|-----|------|------|------|------|
| 路径管理 | LearningPathManagement ✅ | - | - | - |
| 首页展示 | PageConfigManagement配置 | ❌ 直接取前3 | - | **配置未使用** |
| 路径详情 | - | LearningPathsPage ✅ | - | - |

### 4. products（商品）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 商品管理 | src/admin/pages/shop ✅ | - | - | ✅ |
| 商城首页 | - | ShopPage ✅ | shop ✅ | ✅ |
| 商品详情 | - | ProductDetailPage ✅ | product-detail ✅ | ✅ |

### 5. exams（考试）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 考试管理 | ExamManagement ✅ | - | - | ✅ |
| 考试列表 | - | ExamCenterPage ✅ | exam ✅ | ✅ |
| 考试结果 | - | ExamResultPage ✅ | result ✅ | ✅ |

### 6. teachers（教师）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 教师管理 | src/admin/pages无teacher组件 | - | - | ❌ 后台缺失 |
| 教师展示 | - | TeachersPage ✅ | - | Web端有 |

### 7. categories（分类）

| 功能 | 后台 | Web端 | 小程序 | 问题 |
|-----|------|------|------|------|
| 分类管理 | 无专用组件 | - | - | ❌ |
| 课程分类 | CourseManagement直读 | HomePage读取 | course-list读取 | ✅ |

### 8. user_progress（学习进度）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 进度统计 | DashboardNew ✅ | - | - | ✅ |
| 我的进度 | - | MyLearningPage ✅ | my-learning ✅ | ✅ |

### 9. course_permissions（课程权限）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 权限管理 | PermissionManagement ✅ | - | - | ✅ |
| 已购课程 | - | MyLearningPage ✅ | course-detail查询 ✅ | ✅ |

### 10. enrollments（报名记录）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 报名管理 | PermissionManagement ✅ | - | - | ✅ |
| 我的班级 | - | MyClassesPage ✅ | my-classes ✅ | ✅ |

### 11. coupons（优惠券）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 优惠券管理 | CouponManagement ✅ | - | - | ✅ |
| 我的优惠券 | - | MyCouponsPage ✅ | - | Web端有 |

### 12. messages（消息）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 消息管理 | MessageManagement ✅ | - | - | ✅ |
| 我的消息 | - | MessagesPage ✅ | - | Web端有 |

### 13. comments（评论）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 评论管理 | CommentManagement ✅ | - | - | ✅ |
| 课程评论 | - | CourseDetailPage ✅ | course-detail ✅ | ✅ |

### 14. schedules（排课）

| 功能 | 后台 | Web端 | 小程序 | 状态 |
|-----|------|------|------|------|
| 排课管理 | src/admin/pages无schedules组件 | - | - | ❌ 后台缺失 |
| 我的日程 | - | MySchedulePage ✅ | my-schedule ✅ | ✅ |

---

## 问题汇总表

| 问题类型 | 集合/功能 | 影响 | 优先级 |
|---------|---------|------|--------|
| **配置未使用** | featuredCourses | 后台热门课程配置白做 | 🔴 高 |
| **配置未使用** | featuredClasses | 后台最新开班配置白做 | 🔴 高 |
| **配置未使用** | featuredLearningPaths | 后台学习路径配置白做 | 🔴 高 |
| **排序不对齐** | banners后台列表 | 管理员看不到实际顺序 | 🟡 中 |
| **服务混用** | MyLearningPage用adminService | 前台调后台服务 | 🟡 中 |
| **直用SDK** | CourseManagement读categories | 没走云函数代理 | 🟡 中 |
| **功能缺失** | 后台教师管理 | 无教师管理组件 | 🟢 低 |
| **功能缺失** | 后台分类管理 | 无分类管理组件 | 🟢 低 |
| **功能缺失** | 后台排课管理 | 无排课管理组件 | 🟢 低 |

---

## 修复计划

### 第一阶段：配置功能接上（优先级高）

1. **热门课程**：Web端/小程序读取`featuredCourses['home-featured'].courseIds`
2. **最新开班**：Web端/小程序读取`featuredClasses['home-featured-classes'].classIds`
3. **学习路径**：Web端读取`featuredLearningPaths['home-featured-paths'].pathIds`

### 第二阶段：排序对齐

1. **banners后台列表**：按`order`升序排列

### 第三阶段：架构规范

1. **MyLearningPage**：改用前台专用服务
2. **CourseManagement**：读categories走adminService

---

## 结论

**三端数据流整体基本对齐，但首页配置功能完全没接上，相当于后台做了配置但前端没用，这是核心问题。**

其他问题属于代码规范层面的，不影响功能。