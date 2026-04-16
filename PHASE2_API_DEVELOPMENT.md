# Phase 2: 后端 API 开发进度

## 状态: ✅ 已完成

---

## 新增内容

### 1. 类型定义 (`src/types/registration.ts`)

| 类型 | 说明 |
|------|------|
| `Registration` | 报名记录（核心业务关联表） |
| `Class` | 班级信息 |
| `ClassSchedule` | 班级课表项 |
| `RegistrationAccess` | 视频权限配置 |
| `RegistrationPayment` | 支付信息 |
| `LearningProgress` | 学习进度（关联报名记录） |

### 2. 前端服务 (`src/services/registrationService.ts`)

**报名管理服务 (`registrationService`)**
- `create()` - 创建报名申请
- `getMyRegistrations()` - 获取我的报名列表
- `getDetail()` - 获取报名详情
- `checkVideoAccess()` - 检查视频观看权限
- `getList()` - 管理端报名列表
- `review()` - 审核报名
- `assignClass()` - 分配班级
- `updateAccess()` - 更新视频权限
- `updatePayment()` - 更新支付信息

**班级管理服务 (`classService`)**
- `create()` - 创建班级
- `update()` - 更新班级
- `delete()` - 删除班级
- `getDetail()` - 获取班级详情
- `getList()` - 班级列表
- `adjustSchedule()` - 调课

### 3. 云函数 (`cloudfunctions/registration/`)

| 端点 | 功能 |
|------|------|
| `createRegistration` | 创建报名 |
| `getMyRegistrations` | 我的报名列表 |
| `getRegistrationDetail` | 报名详情 |
| `checkVideoAccess` | 视频权限校验 |
| `listRegistrations` | 管理端报名列表 |
| `reviewRegistration` | 审核报名 |
| `assignClass` | 分配班级 |
| `updateVideoAccess` | 更新视频权限 |
| `updatePayment` | 更新支付 |
| `createClass` | 创建班级 |
| `updateClass` | 更新班级 |
| `deleteClass` | 删除班级 |
| `getClassDetail` | 班级详情 |
| `listClasses` | 班级列表 |
| `adjustSchedule` | 调课 |

---

## 核心业务流实现

### 业务流 A：线下培训报名

```
学员提交报名 → 管理员审核 → 分配班级 → 开通视频权限(可选)
     ↓                ↓            ↓              ↓
   create         review      assignClass   updateAccess
```

### 业务流 B：线上课程购买

```
在线支付 → 自动开通视频权限
   ↓            ↓
orders    updateAccess
```

### 两流关联：视频权限控制

```
报名记录 (registration)
    └── access.videoEnabled: boolean  // 是否可观看
    └── access.videoValidUntil: Date  // 有效期
            ↓
    视频播放前调用 checkVideoAccess() 校验
```

---

## 下一步: Phase 3

**管理后台页面开发**

需要创建的页面：
1. `/admin/registrations` - 报名审核管理
2. `/admin/classes` - 班级管理
3. `/admin/class-schedule` - 排课/调课

**学员前端页面开发**
1. `/courses` - 课程浏览（显示班级选择）
2. `/my-schedule` - 我的课表
3. `/registration` - 线下报名页
