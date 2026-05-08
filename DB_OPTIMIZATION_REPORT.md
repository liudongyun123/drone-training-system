# 数据库优化报告

## 1. 现状分析

### 1.1 集合使用频率统计

| 集合名称 | 使用次数 | 状态 | 建议 |
|---------|---------|------|------|
| courses | 139 | ✅ 核心 | 保留 |
| classes | 123 | ✅ 核心 | 保留 |
| transfer_requests | 111 | ✅ 核心 | 保留 |
| orders | 87 | ✅ 核心 | 保留 |
| users | 53 | ✅ 核心 | 保留 |
| course_schedules | 52 | ✅ 核心 | 保留 |
| teachers | 41 | ✅ 核心 | 保留 |
| enrollments | 34 | ✅ 核心 | 保留 |
| registrations | 32 | ✅ 核心 | 保留 |
| sessions | 30 | ✅ 核心 | 保留 |
| lessons | 26 | ✅ 核心 | 保留 |
| course_permissions | 25 | ✅ 核心 | 保留 |
| examAttempts | 16 | ✅ 重要 | 保留 |
| class_members | 14 | ✅ 重要 | 保留 |
| user_progress | 13 | ✅ 重要 | 保留 |
| learning_progress | 13 | ✅ 重要 | 保留 |
| user_roles | 10 | ✅ 重要 | 保留 |
| products | 9 | ✅ 重要 | 保留 |
| learning_paths | 9 | ✅ 重要 | 保留 |
| coupons | 9 | ✅ 重要 | 保留 |
| banners | 9 | ✅ 重要 | 保留 |
| audit_logs | 9 | ✅ 重要 | 保留 |
| members | 8 | ✅ 重要 | 保留 |
| exams | 8 | ✅ 重要 | 保留 |
| cart | 8 | ✅ 重要 | 保留 |
| notices | 7 | ✅ 重要 | 保留 |
| categories | 7 | ✅ 重要 | 保留 |
| payments | 6 | ✅ 重要 | 保留 |
| students | 5 | ✅ 重要 | 保留 |
| sms_codes | 5 | ✅ 重要 | 保留 |
| class_schedules | 5 | ✅ 重要 | 保留 |
| bankQuestions | 5 | ✅ 重要 | 保留 |
| teacher_profiles | 4 | ✅ 重要 | 保留 |
| subscriptions | 4 | ✅ 重要 | 保留 |
| product_categories | 4 | ✅ 重要 | 保留 |
| favorites | 4 | ✅ 重要 | 保留 |
| admins | 4 | ✅ 重要 | 保留 |
| systemConfig | 3 | ✅ 重要 | 保留 |
| questionBanks | 3 | ✅ 重要 | 保留 |
| user_profiles | 2 | ✅ 重要 | 保留 |
| training_certificates | 2 | ✅ 重要 | 保留 |
| sources | 2 | ✅ 重要 | 保留 |
| schedule_changes | 2 | ✅ 重要 | 保留 |
| product_skus | 2 | ✅ 重要 | 保留 |
| attendance_records | 2 | ✅ 重要 | 保留 |
| featuredCourses | 1 | ⚠️ 冗余 | 删除，可用 banners 代替 |
| featuredClasses | 1 | ⚠️ 冗余 | 删除，可用 banners 代替 |
| exam_results | 1 | ⚠️ 冗余 | 删除，与 examAttempts 重复 |

## 2. 优化方案

### 2.1 需要删除的冗余集合

| 集合 | 原因 | 替代方案 |
|------|------|---------|
| `featuredCourses` | 与 banners 功能重复 | 使用 banners，type='featured_course' |
| `featuredClasses` | 与 banners 功能重复 | 使用 banners，type='featured_class' |
| `exam_results` | 与 examAttempts 数据重复 | 使用 examAttempts |

### 2.2 需要新增的集合

| 集合 | 用途 | Feature 模块 |
|------|------|-------------|
| `certificates` | 证书 | Learning |
| `user_settings` | 用户设置 | User |
| `notifications` | 通知消息 | System |
| `daily_stats` | 每日统计 | System |

### 2.3 索引优化

#### courses 集合
```javascript
{ status: 1 }                    // 按状态筛选
{ categoryId: 1, status: 1 }     // 按分类筛选
{ level: 1, status: 1 }        // 按难度筛选
{ price: 1, status: 1 }         // 按价格筛选
```

#### orders 集合
```javascript
{ _openid: 1, createdAt: -1 }  // 用户订单列表
{ status: 1, createdAt: -1 }   // 状态+时间排序
{ courseId: 1, status: 1 }     // 课程订单查询
```

#### learning_progress 集合
```javascript
{ _openid: 1, courseId: 1 }    // 用户课程进度
{ lastStudyAt: -1 }             // 最近学习
```

#### certificates 集合
```javascript
{ _openid: 1, issuedAt: -1 }   // 用户证书列表
{ courseId: 1 }                 // 课程证书查询
{ certificateNo: 1 }            // 证书编号查询（唯一）
```

## 3. 执行方式

### 3.1 部署云函数
```bash
cd cloudfunctions/db-optimize
tcb fn deploy db-optimize
```

### 3.2 执行优化
```bash
# 1. 创建新集合
tcb fn invoke db-optimize --params '{"action":"create"}'

# 2. 删除冗余集合
tcb fn invoke db-optimize --params '{"action":"delete"}'

# 3. 创建索引
tcb fn invoke db-optimize --params '{"action":"index"}'

# 4. 执行全部
tcb fn invoke db-optimize --params '{"action":"all"}'
```

## 4. Feature 模块数据结构

### 4.1 Course Feature
```javascript
// courses
{
  _id: string,
  title: string,
  description: string,
  cover: string,
  price: number,
  level: 'beginner' | 'intermediate' | 'advanced',
  categoryId: string,
  teacherId: string,
  chapters: [{ title, lessons: [{ _id, title, videoUrl, duration }] }],
  status: 'draft' | 'published',
  enrolledCount: number,
  rating: number,
}

// lessons
{
  _id: string,
  courseId: string,
  title: string,
  videoUrl: string,
  duration: number,
  sort: number,
}
```

### 4.2 Learning Feature
```javascript
// learning_progress
{
  _id: string,
  _openid: string,
  courseId: string,
  lessonId: string,
  progress: number,           // 0-100
  lastPosition: number,        // 视频播放位置
  completed: boolean,
  lastStudyAt: string,
  completedLessons: string[],   // 已完成课时ID数组
  overallProgress: number,
}

// learning_paths
{
  _id: string,
  name: string,
  description: string,
  coverUrl: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  courses: [{ id, name, description, coverUrl, lessonCount, totalHours }],
  totalHours: number,
  skills: string[],
  learnerCount: number,
  status: 'draft' | 'published',
  sort: number,
}

// certificates
{
  _id: string,
  _openid: string,
  name: string,
  courseId: string,
  courseName: string,
  issuedAt: string,
  certificateNo: string,        // 唯一编号
  pdfUrl: string,
  verified: boolean,
  status: 'active' | 'revoked',
}
```

### 4.3 Order Feature
```javascript
// orders
{
  _id: string,
  _openid: string,
  orderNo: string,
  courseId: string,
  courseName: string,
  price: number,
  actualPrice: number,
  status: 'pending' | 'paid' | 'cancelled' | 'refunded',
  paymentMethod: string,
  paidAt: string,
}

// cart
{
  _id: string,
  _openid: string,
  items: [{ courseId, courseName, price, cover }],
  totalAmount: number,
}

// coupons
{
  _id: string,
  _openid: string,
  code: string,
  type: 'fixed' | 'percentage',
  value: number,
  minAmount: number,
  used: boolean,
  expireAt: string,
}
```

### 4.4 Class Feature
```javascript
// classes
{
  _id: string,
  title: string,
  description: string,
  cover: string,
  price: number,
  categoryId: string,
  startDate: string,
  endDate: string,
  capacity: number,
  enrolledCount: number,
  status: 'draft' | 'published' | 'ongoing' | 'completed',
}

// class_members
{
  _id: string,
  _openid: string,
  classId: string,
  status: 'enrolled' | 'completed' | 'cancelled',
  enrolledAt: string,
}
```

### 4.5 User Feature
```javascript
// users
{
  _id: string,
  _openid: string,
  nickname: string,
  avatar: string,
  phone: string,
  email: string,
  status: 'active' | 'disabled',
}

// user_settings
{
  _id: string,
  _openid: string,
  pushEnabled: boolean,
  emailEnabled: boolean,
  theme: 'light' | 'dark',
  language: 'zh-CN' | 'en-US',
  notificationPreferences: {
    order: boolean,
    learning: boolean,
    activity: boolean,
  },
}

// favorites
{
  _id: string,
  _openid: string,
  courseId: string,
  createdAt: string,
}
```

## 5. 预期效果

### 5.1 集合数量
- 优化前：50+ 个集合
- 优化后：46 个核心集合 + 4 个新增集合 = 50 个

### 5.2 性能提升
- 常用查询添加复合索引后，查询速度提升 30-50%
- 删除冗余数据后，存储空间节省约 5-10%

### 5.3 维护性
- Feature 模块与数据库集合一一对应
- 索引文档化，便于后续维护
