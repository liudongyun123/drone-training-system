# 无人机培训系统 管理后台完善方案

**版本**: v1.0  
**日期**: 2026-05-08  
**状态**: 规划中

---

## 一、现状分析

### 1.1 小程序功能全景

| 模块 | 页面 | 数据集合 | 操作类型 |
|------|------|----------|----------|
| 首页 | index | banners, courses, classes, products, categories, sources, systemConfig | R |
| 课程 | course-list, course-detail | courses, lessons, categories, sources | R |
| 班级 | class-list, class-detail, class-enrollment | classes, class_schedules, enrollments | R, C |
| 学习 | learning-path, my-learning, lesson-player | courses, classes, user_progress, certificates | R, U |
| 考试 | practice, exam, result | question_banks, mock_exams, questions | R, C |
| 订单 | cart, checkout, my-orders | orders, products, cart | R, C, U, D |
| 证书 | my-certificates | certificates, external_certificates, training_certificates | R |
| 用户 | login, profile | users | R, U |
| 系统 | - | dictionaries, sources, systemConfig, notices, messages | R |

### 1.2 管理后台现状

| 模块 | 页面 | 功能 | 状态 |
|------|------|------|------|
| 课程 | AdminCourses | 课程/课时管理 | ✅ |
| 班级 | AdminClasses | 班级/排课管理 | ✅ |
| 报名 | AdminOfflineEnrollment | 线下报名 | ✅ |
| 考试 | AdminExams | 考试/题目管理 | ✅ |
| 订单 | AdminOrders | 订单管理 | ✅ |
| 商品 | AdminShop | 商品管理 | ✅ |
| 用户 | AdminUsers | 用户管理 | ✅ |
| 字典 | AdminDictionaries | 字典配置 | ✅ |
| 来源 | AdminSources | 来源管理 | ✅ |
| 分类 | AdminCategories | 分类管理 | ✅ |
| 营销 | AdminMarketing | 轮播图管理 | ✅ |
| 配置 | AdminSiteConfig | 站点配置 | ✅ |
| 转班 | AdminTransfers | 转班申请 | ✅ |

### 1.3 缺失功能

| 优先级 | 功能 | 数据集合 | 紧急度 | 影响 |
|--------|------|----------|--------|------|
| P0 | 学习进度管理 | user_progress | 高 | 无法查看/调整学员进度 |
| P0 | 证书管理 | certificates | 高 | 无法颁发/撤销证书 |
| P1 | 题库管理 | question_banks | 中 | 题库与考试耦合，不便维护 |
| P1 | 学习路径管理 | systemConfig | 中 | 无法可视化配置学习路径 |
| P2 | 日程管理 | schedules | 中 | 无法管理培训班日程 |
| P2 | 优惠券管理 | coupons | 中 | 无法管理优惠活动 |
| P3 | 消息管理 | messages | 低 | 无法查看/发送消息 |
| P3 | 通知管理 | notices | 低 | 无法发布系统通知 |

---

## 二、功能详细方案

### 2.1 P0 - 学习进度管理

**功能描述**: 管理后台查看、搜索、调整学员的学习进度

#### 2.1.1 页面结构

```
AdminLearningProgress/
├── components/
│   ├── ProgressTable.tsx       # 进度表格组件
│   ├── ProgressDetail.tsx      # 进度详情抽屉
│   ├── BatchUpdateModal.tsx    # 批量更新弹窗
│   └── ExportModal.tsx         # 导出功能弹窗
├── hooks/
│   ├── useLearningProgress.ts   # 学习进度数据Hook
│   └── useExport.ts            # 导出Hook
├── services/
│   └── progressAdminService.ts # 管理端进度服务
├── AdminLearningProgress.tsx    # 主页面
└── types.ts                   # 类型定义
```

#### 2.1.2 数据模型

```typescript
// user_progress 集合结构
interface UserProgress {
  _id: string
  userId: string          // 用户ID
  userName?: string       // 用户名(冗余)
  userPhone?: string      // 手机号(冗余)
  courseId: string        // 课程ID
  courseTitle: string     // 课程名(冗余)
  lessonId: string         // 课时ID
  lessonTitle: string     // 课时名(冗余)
  status: 'not_started' | 'in_progress' | 'completed'  // 状态
  progress: number        // 进度百分比 0-100
  videoProgress: number    // 视频播放进度(秒)
  lastStudyTime?: number  // 最后学习时间
  completedAt?: number     // 完成时间
  createdAt: number
  updatedAt: number
}
```

#### 2.1.3 功能列表

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 进度列表 | 按用户/课程搜索进度 | 表格+筛选+分页 |
| 进度详情 | 查看用户某课程的完整进度 | 抽屉组件 |
| 调整进度 | 修改进度百分比、重置状态 | 表单+确认 |
| 完成课时 | 标记课时为已完成 | 快捷操作 |
| 重置进度 | 清空用户课程进度 | 危险操作+二次确认 |
| 批量操作 | 批量完成/重置进度 | 复选框+批量确认 |
| 导出报表 | 导出进度Excel | xlsx库 |
| 学习统计 | 学员学习时长、完成率统计 | 图表组件 |

#### 2.1.4 API 设计

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 获取进度列表 | GET | /progress/admin/list | 分页查询进度 |
| 获取进度详情 | GET | /progress/admin/detail/:id | 进度详情 |
| 更新进度 | PUT | /progress/admin/update/:id | 更新单条进度 |
| 批量更新 | PUT | /progress/admin/batch-update | 批量更新 |
| 重置进度 | DELETE | /progress/admin/reset/:userId/:courseId | 重置用户课程进度 |
| 导出报表 | POST | /progress/admin/export | 导出Excel |

#### 2.1.5 组件设计

**ProgressTable**
- 列：用户、课程、课时、状态、进度、时间、操作
- 支持排序、筛选、搜索
- 行操作：查看、编辑、重置

**ProgressDetailDrawer**
- 用户信息卡片
- 课程进度列表
- 课时完成状态时间线

---

### 2.2 P0 - 证书管理

**功能描述**: 管理后台颁发、撤销、查看学员证书

#### 2.2.1 页面结构

```
AdminCertificates/
├── components/
│   ├── CertificateTable.tsx      # 证书表格
│   ├── CertificateDetail.tsx      # 证书详情抽屉
│   ├── IssueModal.tsx            # 颁发证书弹窗
│   ├── RevokeModal.tsx           # 撤销证书弹窗
│   └── CertificateTemplate.tsx     # 证书模板预览
├── services/
│   └── certificateAdminService.ts # 证书管理服务
├── hooks/
│   └── useCertificateTemplate.ts  # 证书模板Hook
├── types.ts
└── AdminCertificates.tsx          # 主页面
```

#### 2.2.2 数据模型

```typescript
// certificates 集合结构
interface Certificate {
  _id: string
  certificateNo: string      // 证书编号
  userId: string             // 用户ID
  userName: string           // 用户姓名
  userPhone: string          // 用户手机
  userIdCard?: string        // 用户身份证
  type: 'course' | 'exam' | 'training'  // 证书类型
  sourceId: string           // 来源ID(课程/考试/培训班ID)
  sourceTitle: string        // 来源名称
  title: string              // 证书标题
  description?: string       // 证书描述
  issueDate: number          // 颁发日期
  expireDate?: number        // 过期日期
  status: 'valid' | 'expired' | 'revoked'  // 状态
  revokeReason?: string      // 撤销原因
  revokedAt?: number         // 撤销时间
  revokedBy?: string         // 撤销人
  verifyCode: string         // 验真码
  createdAt: number
  updatedAt: number
}

// external_certificates 结构
interface ExternalCertificate {
  _id: string
  userId: string
  userName: string
  userPhone: string
  certificateName: string     // 证书名称
  issuer: string             // 颁发机构
  issueDate: number
  expireDate?: number
  credentialId?: string      // 证件号
  credentialImage?: string   // 证书图片
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: number
  reviewedBy?: string
  createdAt: number
}

// training_certificates 结构
interface TrainingCertificate {
  _id: string
  userId: string
  userName: string
  userPhone: string
  classId: string           // 培训班ID
  className: string          // 培训班名称
  issueDate: number
  status: 'issued' | 'revoked'
  createdAt: number
}
```

#### 2.2.3 功能列表

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 证书列表 | 按类型/状态/用户搜索 | 表格+Tab+筛选 |
| 颁发证书 | 选择用户、填写信息、生成证书 | 表单弹窗 |
| 撤销证书 | 填写撤销原因 | 表单弹窗+确认 |
| 证书详情 | 查看完整证书信息 | 抽屉组件 |
| 证书模板 | 预览证书样式 | 模板组件 |
| 批量颁发 | 导入Excel批量颁发 | 上传+预览+确认 |
| 证书导出 | 导出证书列表Excel | xlsx库 |
| 验真查询 | 输入验真码查询证书 | 验真入口 |

#### 2.2.4 API 设计

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 证书列表 | GET | /certificate/admin/list | 分页查询 |
| 证书详情 | GET | /certificate/admin/detail/:id | 详情 |
| 颁发证书 | POST | /certificate/admin/issue | 颁发单张 |
| 批量颁发 | POST | /certificate/admin/batch-issue | 批量颁发 |
| 撤销证书 | PUT | /certificate/admin/revoke/:id | 撤销 |
| 删除证书 | DELETE | /certificate/admin/delete/:id | 删除 |
| 导出列表 | POST | /certificate/admin/export | 导出Excel |
| 验真查询 | GET | /certificate/verify/:code | 验真 |

---

### 2.3 P1 - 题库管理

**功能描述**: 独立的题库管理，与考试模块解耦

#### 2.3.1 页面结构

```
AdminQuestionBanks/
├── components/
│   ├── QuestionBankTable.tsx    # 题库表格
│   ├── QuestionBankForm.tsx      # 题库表单
│   ├── QuestionTable.tsx         # 题目表格
│   ├── QuestionForm.tsx          # 题目表单
│   ├── QuestionImport.tsx        # 题目导入
│   └── QuestionPreview.tsx       # 题目预览
├── services/
│   └── questionBankAdminService.ts
├── types.ts
└── AdminQuestionBanks.tsx
```

#### 2.3.2 数据模型

```typescript
// question_banks 集合结构
interface QuestionBank {
  _id: string
  name: string                // 题库名称
  description?: string        // 题库描述
  type: 'course' | 'exam' | 'practice'  // 类型
  category?: string           // 分类
  difficulty: 'easy' | 'medium' | 'hard'  // 难度
  questionCount: number       // 题目数量(冗余)
  totalScore: number          // 总分(冗余)
  status: 'draft' | 'published' | 'archived'
  tags?: string[]             // 标签
  createdAt: number
  updatedAt: number
}

// questions 集合结构
interface Question {
  _id: string
  bankId: string              // 所属题库ID
  type: 'single_choice' | 'multiple_choice' | 'judgment' | 'essay'  // 题型
  content: string             // 题干
  options?: QuestionOption[]  // 选项(单选/多选)
  answer: string | string[]   // 答案
  analysis?: string           // 解析
  difficulty: 'easy' | 'medium' | 'hard'
  score: number               // 分值
  tags?: string[]             // 标签
  usedCount: number           // 被引用次数
  createdAt: number
  updatedAt: number
}

interface QuestionOption {
  key: string                 // A/B/C/D
  content: string             // 选项内容
  isCorrect?: boolean         // 是否正确答案
}
```

#### 2.3.3 功能列表

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 题库列表 | 查看所有题库 | 表格+状态筛选 |
| 创建题库 | 新建题库 | 表单弹窗 |
| 编辑题库 | 修改题库信息 | 表单弹窗 |
| 题目列表 | 查看题库下所有题目 | 表格+筛选 |
| 添加题目 | 添加单题 | 表单弹窗 |
| 批量导入 | Excel/Word导入题目 | 上传+解析+预览 |
| 题目编辑 | 编辑题目内容/答案 | 表单弹窗 |
| 题目预览 | 预览题目效果 | 预览组件 |
| 题库统计 | 题目数量、通过率统计 | 图表 |

---

### 2.4 P1 - 学习路径管理

**功能描述**: 可视化配置学习路径等级顺序

#### 2.4.1 页面结构

```
AdminLearningPaths/
├── components/
│   ├── PathConfig.tsx          # 路径配置面板
│   ├── LevelEditor.tsx         # 等级编辑器
│   ├── CourseSelector.tsx      # 课程选择器
│   ├── ClassSelector.tsx       # 班级选择器
│   └── PathPreview.tsx         # 路径预览
├── services/
│   └── learningPathAdminService.ts
├── types.ts
└── AdminLearningPaths.tsx
```

#### 2.4.2 数据模型

```typescript
// systemConfig 中 learningPathCategories 结构
interface LearningPathConfig {
  learningPathCategories: {
    [source: string]: {        // RENSHE / CAAC / ...
      [categoryName: string]: string[]  // 分类名 -> 等级数组
    }
  }
  courseLevels: CourseLevel[]
  classLevels: ClassLevel[]
}

interface CourseLevel {
  source: string
  value: string              // 等级值
  label: string              // 等级名称
  sort: number               // 排序
}

interface ClassLevel {
  source: string
  value: string
  label: string
  sort: number
}
```

#### 2.4.3 功能列表

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 来源列表 | 展示所有来源(RENSHE/CAAC) | Tab切换 |
| 分类列表 | 展示来源下的分类 | 卡片列表 |
| 等级配置 | 拖拽调整等级顺序 | 拖拽列表 |
| 预览路径 | 预览该路径的完整展示 | 模拟小程序端 |
| 课程绑定 | 绑定等级下的课程 | 选择器弹窗 |
| 班级绑定 | 绑定等级下的班级 | 选择器弹窗 |

---

### 2.5 P2 - 日程管理

**功能描述**: 管理培训班日程

#### 2.5.1 页面结构

```
AdminSchedules/
├── components/
│   ├── ScheduleCalendar.tsx    # 日历视图
│   ├── ScheduleTable.tsx      # 表格视图
│   ├── ScheduleForm.tsx        # 日程表单
│   └── ScheduleImport.tsx     # 批量导入
├── services/
│   └── scheduleAdminService.ts
├── types.ts
└── AdminSchedules.tsx
```

#### 2.5.2 功能列表

| 功能 | 描述 | 实现方式 |
|------|------|----------|
| 日历视图 | 按月/周展示日程 | 日历组件 |
| 表格视图 | 列表展示所有日程 | 表格+分页 |
| 创建日程 | 添加新日程 | 表单弹窗 |
| 编辑日程 | 修改日程信息 | 表单弹窗 |
| 删除日程 | 删除日程 | 确认弹窗 |
| 关联班级 | 日程关联培训班 | 选择器 |
| 批量导入 | Excel导入日程 | 上传+解析 |

---

### 2.6 P2 - 优惠券管理

**功能描述**: 优惠券增删改查、发放、统计

#### 2.6.1 页面结构

```
AdminCoupons/
├── components/
│   ├── CouponTable.tsx         # 优惠券表格
│   ├── CouponForm.tsx          # 优惠券表单
│   ├── CouponGrant.tsx         # 发放弹窗
│   ├── CouponStat.tsx          # 统计卡片
│   └── CouponRecord.tsx        # 发放记录
├── services/
│   └── couponAdminService.ts
├── types.ts
└── AdminCoupons.tsx
```

#### 2.6.2 数据模型

```typescript
interface Coupon {
  _id: string
  name: string                // 优惠券名称
  type: 'fixed' | 'percentage'  // 满减/折扣
  value: number               // 优惠金额/折扣率
  minAmount?: number          // 最低消费
  totalCount: number          // 发行总量
  remainCount: number         // 剩余数量
  validFrom: number           // 生效时间
  validUntil: number         // 失效时间
  status: 'draft' | 'published' | 'paused' | 'expired'
  applicableProducts?: string[]  // 适用商品ID
  applicableCategories?: string[] // 适用分类
  createdAt: number
  updatedAt: number
}

interface CouponRecord {
  _id: string
  couponId: string
  userId: string
  userName: string
  userPhone: string
  status: 'unused' | 'used' | 'expired'
  usedAt?: number
  orderId?: string
  createdAt: number
}
```

---

## 三、技术方案

### 3.1 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 | 现有技术栈 |
| 路由 | React Router 6 | 现有技术栈 |
| UI组件 | Ant Design 5 | 现有技术栈 |
| 状态管理 | Zustand | 轻量级状态管理 |
| HTTP | Axios | 现有技术栈 |
| 云函数 | Node.js | 现有技术栈 |
| 数据库 | MongoDB (NoSQL) | 现有技术栈 |

### 3.2 目录结构

```
src/admin/
├── pages/
│   ├── progress/              # 学习进度管理
│   │   ├── AdminLearningProgress.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── certificates/          # 证书管理
│   │   ├── AdminCertificates.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── questionBanks/         # 题库管理
│   │   ├── AdminQuestionBanks.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── learningPaths/         # 学习路径管理
│   │   ├── AdminLearningPaths.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── schedules/             # 日程管理
│   │   ├── AdminSchedules.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── coupons/               # 优惠券管理
│       ├── AdminCoupons.tsx
│       ├── components/
│       ├── hooks/
│       └── services/
└── services/
    └── adminProgressService.ts
    └── adminCertificateService.ts
    └── ...
```

### 3.3 API 设计规范

#### 3.3.1 RESTful 规范

| 操作 | 方法 | 路径 | 示例 |
|------|------|------|------|
| 列表 | GET | /resource/admin/list | GET /progress/admin/list |
| 详情 | GET | /resource/admin/:id | GET /progress/admin/123 |
| 创建 | POST | /resource/admin | POST /progress/admin |
| 更新 | PUT | /resource/admin/:id | PUT /progress/admin/123 |
| 删除 | DELETE | /resource/admin/:id | DELETE /progress/admin/123 |
| 批量 | PUT | /resource/admin/batch | PUT /progress/admin/batch |
| 导出 | POST | /resource/admin/export | POST /progress/admin/export |

#### 3.3.2 统一响应格式

```typescript
// 成功响应
{
  success: true,
  data: T,
  message?: string
}

// 列表响应
{
  success: true,
  data: {
    list: T[],
    total: number,
    page: number,
    pageSize: number
  }
}

// 错误响应
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

### 3.4 权限控制

```typescript
// 路由权限配置
const adminRoutes = [
  {
    path: '/admin/progress',
    component: AdminLearningProgress,
    permission: 'progress:view',  // 查看进度
    title: '学习进度'
  },
  {
    path: '/admin/progress/edit',
    permission: 'progress:edit',  // 编辑进度
    title: '编辑进度'
  },
  // ...
]
```

---

## 四、开发计划

### 4.1 优先级与工时

| 优先级 | 功能 | 工时(人天) | 依赖 |
|--------|------|-----------|------|
| P0 | 学习进度管理 | 5 | 无 |
| P0 | 证书管理 | 5 | 无 |
| P1 | 题库管理 | 4 | 无 |
| P1 | 学习路径管理 | 3 | 无 |
| P2 | 日程管理 | 3 | 无 |
| P2 | 优惠券管理 | 4 | 无 |
| P3 | 消息管理 | 2 | 无 |
| P3 | 通知管理 | 2 | 无 |
| **总计** | | **28** | |

### 4.2 里程碑

| 阶段 | 功能 | 交付日期 | 验收标准 |
|------|------|----------|----------|
| M1 | P0功能 | +5天 | 进度查看/调整/批量操作可用；证书颁发/撤销/查看可用 |
| M2 | P1功能 | +3天 | 题库独立管理；学习路径可视化配置 |
| M3 | P2功能 | +3天 | 日程管理；优惠券管理 |
| M4 | P3功能 | +2天 | 消息管理；通知管理 |

---

## 五、数据库集合定义

### 5.1 新增集合

```javascript
// user_progress (如不存在需创建)
{
  collName: 'user_progress',
  indexes: [
    { fields: { userId: 1 }, options: { name: 'idx_user' } },
    { fields: { courseId: 1 }, options: { name: 'idx_course' } },
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { lastStudyTime: -1 }, options: { name: 'idx_last_study' } }
  ]
}

// coupons (如不存在需创建)
{
  collName: 'coupons',
  indexes: [
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { validFrom: 1, validUntil: 1 }, options: { name: 'idx_valid' } }
  ]
}

// coupon_records (如不存在需创建)
{
  collName: 'coupon_records',
  indexes: [
    { fields: { couponId: 1 }, options: { name: 'idx_coupon' } },
    { fields: { userId: 1 }, options: { name: 'idx_user' } },
    { fields: { status: 1 }, options: { name: 'idx_status' } }
  ]
}

// schedules (如不存在需创建)
{
  collName: 'schedules',
  indexes: [
    { fields: { classId: 1 }, options: { name: 'idx_class' } },
    { fields: { startTime: 1 }, options: { name: 'idx_time' } }
  ]
}

// messages (如不存在需创建)
{
  collName: 'messages',
  indexes: [
    { fields: { userId: 1 }, options: { name: 'idx_user' } },
    { fields: { type: 1 }, options: { name: 'idx_type' } },
    { fields: { isRead: 1 }, options: { name: 'idx_read' } }
  ]
}

// notices (如不存在需创建)
{
  collName: 'notices',
  indexes: [
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { publishTime: -1 }, options: { name: 'idx_publish' } }
  ]
}

// question_banks (如不存在需创建)
{
  collName: 'question_banks',
  indexes: [
    { fields: { status: 1 }, options: { name: 'idx_status' } },
    { fields: { type: 1 }, options: { name: 'idx_type' } }
  ]
}
```

---

## 六、部署方案

### 6.1 部署流程

```
代码合并 → 自动构建 → 测试环境验证 → 预发布验证 → 正式发布
    ↓
Git Push → CI/CD Pipeline → 腾讯云
```

### 6.2 环境配置

| 环境 | 用途 | 配置 |
|------|------|------|
| 开发 | 本地开发 | 本地MongoDB |
| 测试 | 功能测试 | 测试环境数据库 |
| 预发布 | 验收测试 | 生产数据副本 |
| 生产 | 正式环境 | rcwljy环境 |

---

## 七、测试计划

### 7.1 测试用例覆盖

| 模块 | 测试用例数 | 覆盖内容 |
|------|-----------|----------|
| 学习进度 | 20 | CRUD、搜索、批量操作、导出 |
| 证书管理 | 25 | 颁发、撤销、查看、验真、导出 |
| 题库管理 | 30 | 题库CRUD、题目CRUD、导入导出 |
| 学习路径 | 15 | 配置、预览、绑定 |
| 日程管理 | 20 | CRUD、日历视图、导入 |
| 优惠券 | 25 | CRUD、发放、核销、统计 |

### 7.2 回归测试

每次发布前执行全量回归测试，重点关注：
- 管理后台与小程序数据一致性
- 权限控制有效性
- 大数据量性能

---

## 八、监控与运维

### 8.1 监控指标

| 指标 | 阈值 | 处理方式 |
|------|------|----------|
| API响应时间 | > 3s | 告警+排查 |
| 错误率 | > 1% | 告警+回滚 |
| 数据库连接 | > 80% | 扩容 |

### 8.2 日志

- 操作日志：记录管理员关键操作
- 错误日志：记录异常信息
- 访问日志：记录接口调用

---

## 九、文档

### 9.1 用户手册

- 管理后台使用指南
- 各功能操作手册
- 常见问题FAQ

### 9.2 技术文档

- API接口文档
- 数据库字典
- 部署文档

---

**文档结束**
