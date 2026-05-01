# 无人机培训系统 - 数据库设计 v3.0

> 重构日期: 2026-05-01
> 原则: 一业务一集合、字段命名统一、减少冗余、渐进迁移

---

## 集合总览（20个）

| # | 集合名 | 模块 | 说明 | 迁移策略 |
|---|--------|------|------|----------|
| 1 | `users` | 用户 | 替代 members/students/user_profiles | 双写迁移 |
| 2 | `user_roles` | 用户 | 角色权限 | 保留不动 |
| 3 | `courses` | 课程 | 课程主表 | 保留，字段规范化 |
| 4 | `lessons` | 课程 | 课时/章节 | 保留不动 |
| 5 | `categories` | 课程 | 课程分类 | 替代 course_categories |
| 6 | `progress` | 课程 | 学习进度 | 替代 learning_progress + course_permissions |
| 7 | `classes` | 培训 | 班级表 | 保留不动 |
| 8 | `schedules` | 培训 | 排课表 | 替代 course_schedules |
| 9 | `registrations` | 培训 | 报名记录 | 保留不动 |
| 10 | `attendance` | 培训 | 考勤记录 | 替代 attendance_records |
| 11 | `exams` | 考试 | 考试定义 | 保留不动 |
| 12 | `exam_attempts` | 考试 | 考试记录 | 替代 examAttempts |
| 13 | `question_banks` | 考试 | 题库 | 替代 questionBanks |
| 14 | `questions` | 考试 | 题目 | 替代 bankQuestions |
| 15 | `practice_records` | 考试 | 练习记录 | 替代 practiceRecords |
| 16 | `products` | 商城 | 商品表 | 新建 |
| 17 | `orders` | 商城 | 统一订单 | 保留，字段规范化 |
| 18 | `notices` | 系统 | 公告 | 新建 |
| 19 | `messages` | 系统 | 消息通知 | 新建 |
| 20 | `certificates` | 系统 | 证书 | 保留不动 |

---

## 集合详情

### 1. users — 用户表

替代: `members`, `students`, `user_profiles`

```typescript
interface User {
  _id: string
  
  // === 基本信息 ===
  phone: string              // 手机号（唯一）
  name: string               // 姓名
  avatar?: string            // 头像URL
  gender?: 'male' | 'female' | 'unknown'
  idCard?: string            // 身份证号（加密存储）
  
  // === 微信信息 ===
  openid?: string            // 微信openid
  unionid?: string           // 微信unionid
  
  // === 角色状态 ===
  role: 'student' | 'teacher' | 'admin'
  status: 'active' | 'inactive' | 'banned'
  
  // === 统计（冗余，定期更新） ===
  stats: {
    courseCount: number      // 已购课程数
    classCount: number       // 已报班级数
    studyHours: number       // 总学习时长（分钟）
    examCount: number        // 考试次数
  }
  
  // === 时间 ===
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}
```

**索引:**
- `phone` (unique) — 手机号查询
- `openid` (unique) — 微信登录
- `status` — 状态筛选

**迁移映射:**
```
members.name → users.name
members.phone → users.phone
members.avatar → users.avatar
members.level → (移除，改用 role)
students._openid → users.openid
user_profiles.bio → (移除，后续扩展)
```

---

### 2. user_roles — 用户角色表

保留现有，不变。

```typescript
interface UserRole {
  _id: string
  userId: string              // 关联 users._id
  role: 'student' | 'teacher' | 'admin' | 'super_admin'
  permissions: string[]       // 权限列表
  grantedBy?: string          // 授权人
  createdAt: Date
}
```

---

### 3. courses — 课程表

保留现有，字段规范化。

```typescript
interface Course {
  _id: string
  
  // === 基本信息 ===
  title: string               // 课程标题（统一用title，不用name）
  description: string         // 课程描述
  cover: string               // 封面图（统一用cover，不用coverImage）
  videoUrl?: string           // 试看视频
  
  // === 价格 ===
  price: number               // 现价
  originalPrice?: number      // 原价
  isFree: boolean             // 是否免费
  
  // === 分类 ===
  categoryId: string          // 关联 categories._id
  tags: string[]              // 标签
  level: 'beginner' | 'intermediate' | 'advanced'
  
  // === 讲师 ===
  teacherId: string           // 关联 users._id（role=teacher）
  
  // === 课程内容 ===
  type: 'online' | 'offline' | 'hybrid'
  duration: number            // 总时长（分钟）
  lessonCount: number         // 课时数
  
  // === 统计 ===
  stats: {
    studentCount: number      // 在学人数
    rating: number            // 评分
    reviewCount: number       // 评价数
  }
  
  // === 状态 ===
  status: 'draft' | 'published' | 'archived'
  publishedAt?: Date
  sortOrder?: number          // 排序权重
  
  // === 时间 ===
  createdAt: Date
  updatedAt: Date
}
```

**字段统一规则:**
- `name` → `title`
- `coverImage` → `cover`
- `cover` → `cover`（保留）

---

### 4. lessons — 课时表

保留现有，不变。

```typescript
interface Lesson {
  _id: string
  courseId: string            // 关联 courses._id
  title: string
  description?: string
  videoUrl?: string
  duration: number            // 时长（秒）
  order: number               // 排序
  isFree: boolean             // 是否免费试看
  status: 'published' | 'draft'
  createdAt: Date
  updatedAt: Date
}
```

---

### 5. categories — 课程分类表

替代: `course_categories`

```typescript
interface Category {
  _id: string
  name: string                // 分类名称
  icon?: string               // 图标
  cover?: string              // 封面
  sortOrder: number           // 排序
  status: 'active' | 'inactive'
  parentId?: string           // 父分类（支持二级分类）
  createdAt: Date
  updatedAt: Date
}
```

---

### 6. progress — 学习进度表

替代: `learning_progress`, `course_permissions`

```typescript
interface Progress {
  _id: string
  userId: string              // 关联 users._id
  courseId: string            // 关联 courses._id
  
  // === 进度 ===
  completedLessons: string[]  // 已完成课时ID
  currentLessonId?: string    // 当前课时
  percentage: number          // 进度百分比 0-100
  
  // === 时间 ===
  totalDuration: number       // 总学习时长（秒）
  lastLearnAt?: Date
  
  // === 权限 ===
  accessFrom?: Date           // 有效期起始
  accessUntil?: Date          // 有效期截止
  
  createdAt: Date
  updatedAt: Date
}
```

**复合唯一索引:** `userId + courseId`

---

### 7. classes — 班级表

保留现有，不变。

```typescript
interface Class {
  _id: string
  courseId: string
  className: string           // 班级名称
  cover?: string
  
  // 容量
  maxStudents: number
  enrolledCount: number
  
  // 时间
  startDate: Date
  endDate: Date
  
  // 位置
  location: string
  
  // 讲师
  teacherId?: string
  
  // 视频授权
  hasVideoGrant: boolean
  videoGrantCourseId?: string
  
  status: 'planning' | 'enrolling' | 'full' | 'in_progress' | 'completed' | 'cancelled'
  description?: string
  
  createdAt: Date
  updatedAt: Date
}
```

---

### 8. schedules — 排课表

替代: `course_schedules`

```typescript
interface Schedule {
  _id: string
  classId: string             // 关联 classes._id
  courseId: string            // 关联 courses._id
  
  // 时间
  date: Date                  // 上课日期
  startTime: string           // HH:mm
  endTime: string             // HH:mm
  
  // 内容
  topic?: string              // 课时主题
  teacherId?: string
  location?: string
  content?: string            // 备注
  
  // 状态
  status: 'scheduled' | 'completed' | 'cancelled' | 'adjusted'
  
  // 调课记录
  originalDate?: Date
  adjustReason?: string
  
  createdAt: Date
  updatedAt: Date
}
```

**索引:** `classId`, `date`, `teacherId`

---

### 9. registrations — 报名记录表

保留现有，不变。

```typescript
interface Registration {
  _id: string
  studentId: string
  studentName: string
  phone: string
  
  // 来源
  source: 'offline' | 'online'
  
  // 关联
  courseId: string
  courseName: string
  classId?: string
  className?: string
  
  // 权限
  access: {
    videoEnabled: boolean
    videoValidFrom?: Date
    videoValidUntil?: Date
  }
  
  // 支付
  payment: {
    amount: number
    status: 'pending' | 'paid' | 'refunded'
    method: 'cash' | 'wechat' | 'offline'
    paidAt?: Date
  }
  
  // 审核
  status: 'pending' | 'confirmed' | 'learning' | 'completed' | 'dropped'
  review?: {
    reviewerId: string
    reviewedAt: Date
    comment: string
  }
  
  createdAt: Date
  updatedAt: Date
}
```

---

### 10. attendance — 考勤记录表

替代: `attendance_records`

```typescript
interface Attendance {
  _id: string
  scheduleId: string          // 关联 schedules._id
  classId: string             // 关联 classes._id
  studentId: string           // 关联 users._id
  studentName: string
  
  status: 'present' | 'absent' | 'late' | 'leave'
  remark?: string
  
  recordedBy?: string         // 考勤人
  createdAt: Date
}
```

---

### 11. exams — 考试表

保留现有，不变。

```typescript
interface Exam {
  _id: string
  title: string
  description?: string
  courseId?: string           // 关联课程
  questionBankId?: string     // 关联题库
  
  duration: number            // 考试时长（分钟）
  totalScore: number
  passScore: number
  
  questionCount: number
  questionIds: string[]       // 题目ID列表
  
  status: 'draft' | 'published' | 'archived'
  createdAt: Date
  updatedAt: Date
}
```

---

### 12. exam_attempts — 考试记录表

替代: `examAttempts`

```typescript
interface ExamAttempt {
  _id: string
  examId: string              // 关联 exams._id
  userId: string              // 关联 users._id
  
  score: number
  totalScore: number
  isPassed: boolean
  
  answers: Record<string, string | string[]>  // {questionId: 选项}
  
  duration: number            // 用时（秒）
  status: 'in_progress' | 'completed' | 'timeout'
  
  startedAt: Date
  completedAt?: Date
}
```

---

### 13. question_banks — 题库表

替代: `questionBanks`

```typescript
interface QuestionBank {
  _id: string
  name: string                // 题库名称
  description?: string
  courseId?: string
  questionCount: number
  
  // 题型分布
  types: {
    single: number            // 单选数量
    multiple: number          // 多选数量
    judge: number             // 判断数量
  }
  
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

---

### 14. questions — 题目表

替代: `bankQuestions`, `questions`

```typescript
interface Question {
  _id: string
  bankId: string              // 关联 question_banks._id
  
  type: 'single' | 'multiple' | 'judge'  // 单选/多选/判断
  
  content: string             // 题干
  options?: string[]          // 选项（判断题为 ['正确', '错误']）
  answer: string | string[]   // 正确答案
  explanation?: string        // 解析
  
  difficulty: 1 | 2 | 3 | 4 | 5  // 难度
  tags: string[]
  
  sortOrder: number
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

---

### 15. practice_records — 练习记录表

替代: `practiceRecords`

```typescript
interface PracticeRecord {
  _id: string
  userId: string
  bankId: string              // 关联 question_banks._id
  
  questionId: string
  userAnswer: string | string[]
  isCorrect: boolean
  
  createdAt: Date
}
```

---

### 16. products — 商品表（新建）

```typescript
interface Product {
  _id: string
  
  // === 基本信息 ===
  title: string               // 商品名称
  description: string         // 商品描述
  cover: string               // 封面图
  images: string[]            // 详情图
  
  // === 价格库存 ===
  price: number
  originalPrice?: number
  stock: number               // 库存
  sales: number               // 销量
  
  // === 分类 ===
  category: string            // 配件分类（propeller/battery/frame/controller/other）
  
  // === 规格 ===
  specs: Array<{
    name: string              // 规格名（如"桨叶长度"）
    value: string             // 规格值（如"9450"）
  }>
  
  // === 适配机型 ===
  compatibleModels?: string[] // 兼容机型
  
  status: 'active' | 'inactive'
  sortOrder?: number
  
  createdAt: Date
  updatedAt: Date
}
```

---

### 17. orders — 统一订单表

保留现有，增加 type 字段区分。

```typescript
interface Order {
  _id: string
  orderNo: string             // 订单编号（自动生成）
  
  userId: string              // 关联 users._id
  
  // === 订单类型 ===
  type: 'course' | 'class' | 'product'
  
  // === 订单项 ===
  items: Array<{
    id: string                // 课程/商品ID
    title: string
    cover?: string
    price: number
    quantity: number
  }>
  
  // === 金额 ===
  amount: number              // 原始金额
  discountAmount: number      // 优惠金额
  finalAmount: number         // 实付金额
  
  // === 支付 ===
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
  paymentMethod?: 'wechat' | 'alipay' | 'balance' | 'offline'
  paidAt?: Date
  
  // === 优惠 ===
  couponId?: string
  
  // === 关联 ===
  registrationId?: string     // 培训班订单关联报名
  
  remark?: string
  
  createdAt: Date
  updatedAt: Date
}
```

---

### 18. notices — 公告表（新建）

```typescript
interface Notice {
  _id: string
  title: string
  content: string             // 支持富文本
  type: 'system' | 'course' | 'activity' | 'urgent'
  
  // 显示控制
  isPinned: boolean           // 是否置顶
  status: 'published' | 'draft' | 'archived'
  
  // 统计
  viewCount: number
  
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

---

### 19. messages — 消息通知表（新建）

```typescript
interface Message {
  _id: string
  userId: string              // 接收用户
  
  type: 'system' | 'course' | 'exam' | 'order' | 'class'
  
  title: string
  content: string
  
  // 关联
  relatedId?: string          // 关联的业务ID
  relatedType?: string        // 关联业务类型
  
  isRead: boolean
  readAt?: Date
  
  createdAt: Date
}
```

**索引:** `userId + isRead`, `userId + createdAt`

---

### 20. certificates — 证书表

保留现有，不变。

```typescript
interface Certificate {
  _id: string
  userId: string
  courseId?: string
  classId?: string
  
  type: 'course' | 'exam' | 'training'
  title: string
  certificateNo: string       // 证书编号
  
  issueDate: Date
  expireDate?: Date
  
  status: 'active' | 'expired' | 'revoked'
  
  createdAt: Date
}
```

---

## 集合名称映射表（旧 → 新）

| 旧集合名 | 新集合名 | 操作 |
|----------|----------|------|
| `members` | `users` | 迁移数据 |
| `students` | `users` | 合并迁移 |
| `user_profiles` | `users` | 合并迁移 |
| `user_roles` | `user_roles` | 保留 |
| `admins` | `user_roles` | 合并到角色表 |
| `courses` | `courses` | 字段规范化 |
| `lessons` | `lessons` | 保留 |
| `course_categories` | `categories` | 重命名 |
| `learning_progress` | `progress` | 重命名 |
| `course_permissions` | `progress` | 合并 |
| `classes` | `classes` | 保留 |
| `course_schedules` | `schedules` | 重命名 |
| `registrations` | `registrations` | 保留 |
| `attendance_records` | `attendance` | 重命名 |
| `enrollments` | `registrations` | 合并 |
| `exams` | `exams` | 保留 |
| `examAttempts` | `exam_attempts` | 重命名 |
| `questionBanks` | `question_banks` | 重命名 |
| `bankQuestions` | `questions` | 合并 |
| `questions` | `questions` | 保留 |
| `practiceRecords` | `practice_records` | 重命名 |
| `favoriteQuestions` | `practice_records` | 合并 |
| `wrongQuestions` | `practice_records` | 合并 |
| `orders` | `orders` | 字段规范化 |
| `products` | `products` | **新建** |
| `notices` | `notices` | **新建** |
| `messages` | `messages` | **新建** |
| `certificates` | `certificates` | 保留 |
| `coupons` | (暂保留) | 后续独立模块 |
| `groupBuyTeams` | (暂保留) | 后续独立模块 |
| `transfer_requests` | (暂保留) | 后续合并到培训模块 |
| `audit_logs` | (暂保留) | 系统日志 |
