# 培训系统数据库设计 (Phase 1)

## 状态: ✅ 已完成

---

## 已创建集合

| 集合名 | 状态 | 数据量 | 说明 |
|--------|------|--------|------|
| `courses` | ✅ 已存在 | 37 | 课程表 |
| `classes` | ✅ 新建 | 0 | 班级表 |
| `registrations` | ✅ 新建 | 0 | 报名记录表(核心) |
| `learning_progress` | ✅ 新建 | 0 | 学习进度表 |
| `course_categories` | ✅ 新建 | 0 | 课程分类表 |

---

## 集合详情

### 1. courses - 课程表

```typescript
{
  _id: string,
  name: string,                   // 课程名称
  description: string,            // 课程描述
  coverImage: string,             // 封面图片URL
  type: 'online' | 'offline' | 'hybrid',
  
  price: {
    online: number,
    offline: number,
    hybrid: number,
  },
  
  offlineConfig?: {
    maxStudentsPerClass: number,
    defaultLocation: string,
    materials: string[],
    scheduleTemplate: {
      duration: number,
      breakTime: number,
    }
  },
  
  onlineConfig?: {
    videos: [{
      id: string,
      title: string,
      duration: number,
      videoUrl: string,
      order: number,
    }],
    resources: [{
      name: string,
      url: string,
      type: 'pdf' | 'doc' | 'video',
    }],
  },
  
  // 权限规则 (关键字段)
  accessRules: {
    offlineStudentVideoAccess: boolean,  // 线下学员是否可观看视频
    videoAccessDuration: number,         // 视频有效期(天), 0=永久
    syncProgress: boolean,               // 线上线下进度同步
    allowRetake: boolean,                // 是否允许重修
  },
  
  status: 'draft' | 'published' | 'archived',
  categoryId: string,
  tags: string[],
  createdAt: Date,
  updatedAt: Date,
}
```

---

### 2. classes - 班级表

```typescript
{
  _id: string,
  courseId: string,               // 关联课程
  name: string,                   // 班级名称
  
  schedule: [{
    date: Date,
    startTime: string,            // HH:mm
    endTime: string,
    location: string,
    teacherId: string,
    content: string,
    status: 'scheduled' | 'completed' | 'cancelled' | 'adjusted',
    originalDate?: Date,
    adjustReason?: string,
  }],
  
  capacity: {
    max: number,
    enrolled: number,
    confirmed: number,
  },
  
  startDate: Date,
  endDate: Date,
  enrollmentDeadline: Date,
  
  status: 'planning' | 'enrolling' | 'full' | 'in_progress' | 'completed' | 'cancelled',
  createdAt: Date,
  updatedAt: Date,
}
```

**索引:**
- `idx_courseId` - 查询课程的班级
- `idx_status` - 状态筛选
- `idx_startDate` - 日期排序

---

### 3. registrations - 报名记录表 (核心关联表)

```typescript
{
  _id: string,
  
  // 学员信息
  studentId: string,
  studentName: string,
  phone: string,
  idCard?: string,
  
  // 报名来源
  source: 'offline' | 'online',
  
  // 关联课程
  courseId: string,
  courseName: string,
  
  // 线下班级信息
  classId?: string,
  className?: string,
  
  // 权限配置 (关键字段)
  access: {
    videoEnabled: boolean,
    videoValidFrom: Date,
    videoValidUntil: Date,
    offlineMaterials: boolean,
  },
  
  // 支付信息
  payment: {
    amount: number,
    originalAmount: number,
    discountAmount: number,
    status: 'pending' | 'paid' | 'refunded' | 'partial_refunded',
    method: 'cash' | 'wechat' | 'alipay' | 'card' | 'transfer',
    paidAt?: Date,
    transactionId?: string,
  },
  
  status: 'pending' | 'confirmed' | 'learning' | 'completed' | 'dropped' | 'refunded',
  
  review?: {
    reviewerId: string,
    reviewedAt: Date,
    comment: string,
  },
  
  remarks?: string,
  createdAt: Date,
  updatedAt: Date,
}
```

**索引:**
- `idx_studentId` - 查询我的报名
- `idx_courseId` - 查询课程的报名
- `idx_classId` - 查询班级的学员
- `idx_status_source` - 后台筛选
- `idx_phone` - 手机号查询

---

### 4. learning_progress - 学习进度表

```typescript
{
  _id: string,
  registrationId: string,         // 关联报名记录
  studentId: string,
  courseId: string,
  
  videoProgress: [{
    videoId: string,
    completed: boolean,
    currentTime: number,
    duration: number,
    lastWatchedAt: Date,
    watchCount: number,
  }],
  
  overallProgress: number,
  completedVideos: number,
  totalVideos: number,
  
  totalStudyTime: number,         // 分钟
  lastStudyAt?: Date,
  
  examAttempts: [{
    examId: string,
    score: number,
    passed: boolean,
    attemptedAt: Date,
  }],
  
  updatedAt: Date,
}
```

**索引:**
- `idx_registrationId` (唯一) - 一对一关联报名
- `idx_student_course` - 查询学员的课程进度

---

### 5. course_categories - 课程分类表

```typescript
{
  _id: string,
  name: string,
  description: string,
  icon: string,
  order: number,
  parentId: string | null,
  status: 'active' | 'inactive',
  createdAt: Date,
}
```

---

## 数据关联关系

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   courses   │◄────┤   classes   │     │   users     │
│  (课程)      │     │  (班级)      │     │  (用户)      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │    ┌──────────────┴───────────────────┘
       │    │
       ▼    ▼
┌─────────────────────────────────────┐
│         registrations               │
│        (报名记录 - 核心关联)          │
│  • 关联 course (学什么)              │
│  • 关联 class (线下班级)             │
│  • 关联 student (谁报名)             │
│  • 控制 video access (观看权限)      │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│       learning_progress             │
│        (学习进度)                    │
└─────────────────────────────────────┘
```

---

## 核心业务流程

### 线下报名流程
```
学员浏览课程 ──► 选择班级 ──► 提交报名信息 ──► 管理员审核
                                                    │
                                                    ▼
                                            分配班级/确认收款
                                                    │
                                                    ▼
                                            开通视频权限(可选)
                                                    │
                                                    ▼
                                            学员: 查看课表 + 视频学习
```

### 线上购买流程
```
学员浏览课程 ──► 在线支付 ──► 自动开通权限 ──► 视频学习 + 考试
```

---

## 下一步: Phase 2

进入 **后端 API 开发**，包括:
1. 核心业务接口 (报名、课程、权限校验)
2. 管理后台接口 (CRUD、统计)
3. 云函数/云托管服务
