# 会员体系优化方案 v20260411

## 📋 业务场景分析

### 三种用户来源

| 场景 | 来源 | 获得权限 |
|------|------|----------|
| **线上购课** | 线上支付购买课程 | 仅视频观看权限 |
| **线上报班** | 线上报名班级 | 视频 + 线下排课出勤 |
| **线下报名** | 前台/后台录入账号 | 视频 + 线下排课出勤 |

### 核心区别
- **买课** = 看视频
- **报班** = 看视频 + 参加线下课程

---

## ✅ 已完成实施

### 1. 数据库集合创建

```javascript
// course_permissions - 课程权限表
{
  userId: "user_001",           // 用户ID
  userName: "张三",
  phone: "139****1234",
  courseId: "course_001",       // 课程ID
  courseName: "无人机基础飞行",
  source: "purchase",          // 来源: purchase/registration/gift
  memberType: "online_buyer",   // 会员类型
  videoAccess: {
    enabled: true,
    validFrom: "2026-04-01",
    validUntil: "2027-04-01"
  },
  status: "active",            // active/expired/revoked
  grantedBy: "admin",
  grantedAt: "2026-04-01T10:00:00Z"
}

// class_members - 班级成员表
{
  classId: "class_001",        // 班级ID
  className: "飞行基础班A",
  userId: "user_001",          // 用户ID
  userName: "张三",
  source: "registration",       // 来源: registration/transfer/admin_add
  status: "enrolled",          // enrolled/learning/completed/dropped
  enrollmentDate: "2026-04-01",
  attendanceStats: {
    total: 20,
    present: 18,
    absent: 2,
    late: 1
  },
  progress: 75
}
```

### 2. 索引设计

```javascript
// course_permissions 索引
- idx_user_course: { userId + courseId } (唯一索引)
- idx_user: { userId }
- idx_status: { status }

// class_members 索引
- idx_class_user: { classId + userId } (唯一索引)
- idx_user: { userId }
- idx_class: { classId }
- idx_status: { status }
```

### 3. 类型定义 (`src/types/permission.ts`)

```typescript
// 会员类型
type MemberType = 'online_buyer' | 'online_registrant' | 'offline_registrant' | 'hybrid'

// 权限来源
type PermissionSource = 'purchase' | 'registration' | 'gift' | 'transfer' | 'admin_add'

// 视频访问配置
interface VideoAccess {
  enabled: boolean
  validFrom?: string
  validUntil?: string
}

// 课程权限
interface CoursePermission {
  userId: string
  userName?: string
  courseId: string
  courseName?: string
  source: PermissionSource
  memberType?: MemberType
  videoAccess: VideoAccess
  status: PermissionStatus
  grantedBy?: string
  grantedAt?: string
}

// 班级成员
interface ClassMember {
  classId: string
  className?: string
  userId: string
  userName?: string
  source: 'registration' | 'transfer' | 'admin_add'
  status: ClassMemberStatus
  enrollmentDate?: string
  attendanceStats?: AttendanceStats
  progress?: number
}
```

### 4. 权限服务 (`src/services/permissionService.ts`)

```typescript
// 核心方法
class PermissionService {
  // 检查视频访问权限
  async checkVideoAccess(userId: string, courseId: string): Promise<VideoAccessCheckResponse>
  
  // 检查班级访问权限
  async checkClassAccess(userId: string, classId: string): Promise<ClassAccessCheckResponse>
  
  // 购买后自动授权
  async grantAfterPurchase(userId: string, courseId: string, orderId: string): Promise<CoursePermission>
  
  // 报名后自动授权（包含视频+班级）
  async grantAfterRegistration(userId: string, classId: string): Promise<{coursePermission, classMember}>
  
  // 批量添加班级成员
  async batchAddClassMembers(classId: string, userIds: string[], source: string): Promise<number>
  
  // 权限统计
  async getPermissionStats(): Promise<PermissionStats>
}
```

### 5. 权限管理页面 (`/admin/permissions`)

**功能模块：**
- 课程权限管理（来源、状态、有效期）
- 班级成员管理（出勤统计、状态）
- 统计卡片
- 批量操作

**路由：** `/admin/permissions`

### 6. 测试数据生成

```javascript
// 云函数支持生成权限测试数据
handleGenerateTestData('course_permissions', { count: 10 })
handleGenerateTestData('class_members', { count: 10 })
```

---

## 🚀 部署信息

| 资源 | 状态 | 说明 |
|------|------|------|
| `course_permissions` 集合 | ✅ 已创建 | 课程权限表 |
| `class_members` 集合 | ✅ 已创建 | 班级成员表 |
| 权限管理页面 | ✅ 已部署 | `/admin/permissions` |
| 诊断页面 | ✅ 已部署 | `/diagnose-permissions.html` |

**访问地址：** https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com

---

## 📌 下一步计划

### 优先级 P0 - 必须完成

1. **前台权限集成**
   - 在视频播放页面集成 `checkVideoAccess()`
   - 在班级详情页面集成 `checkClassAccess()`
   - 未授权用户显示"暂无权限"提示

2. **购买/报名流程集成**
   - 订单支付成功后自动调用 `grantAfterPurchase()`
   - 报名审核通过后自动调用 `grantAfterRegistration()`

3. **现有数据迁移**
   - 将已有的学员报名数据迁移到 `course_permissions` 和 `class_members`

### 优先级 P1 - 建议完成

4. **权限管理页面完善**
   - 添加权限撤销功能
   - 添加权限续期功能
   - 添加权限转移功能（学员换班级）

5. **权限验证中间件**
   - 创建 `withVideoAccess` 高阶组件
   - 创建 `withClassAccess` 高阶组件

### 优先级 P2 - 可选功能

6. **权限日志**
   - 记录所有权限变更
   - 支持权限变更历史查询

7. **到期提醒**
   - 权限即将到期时发送通知
   - 支持自定义提醒规则

---

## 🔧 使用指南

### 诊断工具

访问权限诊断页面：
```
https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/diagnose-permissions.html
```

功能：
- 查看集合数据统计
- 创建集合
- 生成测试数据
- 查看权限列表

### 权限管理后台

访问权限管理页面：
```
https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com/admin/permissions
```

功能：
- 管理课程权限
- 管理班级成员
- 查看权限统计

### API 调用示例

```javascript
// 检查视频权限
const result = await permissionService.checkVideoAccess(userId, courseId);
if (result.allowed) {
  console.log('可以观看，有效期至', result.validUntil);
} else {
  console.log('无权观看');
}

// 购买后授权
const permission = await permissionService.grantAfterPurchase(userId, courseId, orderId);

// 报名后授权
const { coursePermission, classMember } = await permissionService.grantAfterRegistration(userId, classId);
```

---

## 📊 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| v20260411 | 2026-04-11 | 初始版本：创建集合、权限服务、管理页面 |
