# 后端接口文档

## 概述

本项目使用 **CloudBase 云函数**作为后端服务，采用 Serverless 架构。所有云函数都已部署并可用。

## 云函数列表

### 1. admin - 管理后台通用接口

**云函数名称**: `admin`

**描述**: 处理所有后台管理相关的数据库操作，提供通用的 CRUD 接口

**运行时**: Node.js 18.15

**状态**: ✅ Active

#### 接口参数

```typescript
interface AdminEvent {
  action: 'list' | 'get' | 'add' | 'update' | 'delete' | 'batchDelete' | 'count' | 'aggregate'
  collection: string        // 集合名称
  data?: any               // 添加/更新数据
  query?: object           // 查询条件
  docId?: string           // 文档ID
  options?: {
    limit?: number         // 分页限制，默认100
    offset?: number        // 分页偏移，默认0
    orderBy?: string       // 排序字段
    order?: 'asc' | 'desc' // 排序方向，默认asc
    field?: object         // 字段过滤
  }
}
```

#### 接口功能

| Action | 功能 | 参数 | 返回 |
|--------|------|------|------|
| `list` | 查询列表 | collection, query?, options? | 数据列表 |
| `get` | 获取单条 | collection, docId | 单条数据 |
| `add` | 添加文档 | collection, data | 添加结果 |
| `update` | 更新文档 | collection, docId, data | 更新结果 |
| `delete` | 删除文档 | collection, docId | 删除结果 |
| `batchDelete` | 批量删除 | collection, query | 删除结果 |
| `count` | 统计数量 | collection, query? | 数量 |
| `aggregate` | 聚合查询 | collection, pipeline? | 聚合结果 |

#### 使用示例

```typescript
// 查询列表
const result = await app.callFunction({
  name: 'admin',
  data: {
    action: 'list',
    collection: 'courses',
    query: { category: '多旋翼培训' },
    options: {
      limit: 20,
      offset: 0,
      orderBy: 'createdAt',
      order: 'desc'
    }
  }
})

// 获取单条
const result = await app.callFunction({
  name: 'admin',
  data: {
    action: 'get',
    collection: 'courses',
    docId: 'course_id_123'
  }
})

// 添加文档
const result = await app.callFunction({
  name: 'admin',
  data: {
    action: 'add',
    collection: 'courses',
    data: {
      title: '新课程',
      price: 99
    }
  }
})

// 更新文档
const result = await app.callFunction({
  name: 'admin',
  data: {
    action: 'update',
    collection: 'courses',
    docId: 'course_id_123',
    data: {
      price: 199
    }
  }
})

// 删除文档
const result = await app.callFunction({
  name: 'admin',
  data: {
    action: 'delete',
    collection: 'courses',
    docId: 'course_id_123'
  }
})
```

#### 返回格式

```typescript
// 成功
{
  code: 0,
  message: '操作成功',
  data: any,      // 返回的数据
  total?: number  // 总数（list操作时）
}

// 失败
{
  code: 400 | 404 | 500,
  message: '错误信息',
  error?: Error
}
```

---

### 2. api/courses-list - 获取课程列表

**云函数名称**: `api/courses-list`

**描述**: 查询所有课程信息

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 接口参数

```typescript
{
  envId?: string  // 环境ID，可选
}
```

#### 使用示例

```typescript
const result = await app.callFunction({
  name: 'api/courses-list',
  data: {}
})

// 返回
{
  code: 0,
  message: '获取课程列表成功',
  data: Course[]
}
```

---

### 3. api/orders-create - 创建订单

**云函数名称**: `api/orders-create`

**描述**: 创建课程订单，集成微信支付

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 接口参数

```typescript
{
  envId?: string
  openid: string           // 用户openid
  items: Array<{
    courseId: string      // 课程ID
    price: number         // 价格
  }>
}
```

#### 功能特性

- ✅ 自动检查重复购买
- ✅ 计算订单总金额
- ✅ 生成微信支付参数
- ✅ 创建订单记录

#### 使用示例

```typescript
const result = await app.callFunction({
  name: 'api/orders-create',
  data: {
    openid: 'user_openid_123',
    items: [
      { courseId: 'course_1', price: 99 },
      { courseId: 'course_2', price: 199 }
    ]
  }
})

// 返回
{
  code: 0,
  message: '创建订单成功',
  data: {
    orderId: 'order_xxx',
    paymentParams: {
      appId: 'wx...',
      timeStamp: '...',
      nonceStr: '...',
      package: 'prepay_id=...',
      signType: 'RSA'
    },
    total: 298
  }
}
```

---

### 4. api/orders-callback - 支付回调

**云函数名称**: `api/orders-callback`

**描述**: 处理微信支付回调，更新订单状态

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 接口参数

```typescript
{
  envId?: string
  out_trade_no: string      // 商户订单号
  transaction_id: string    // 微信支付订单号
  result_code: string       // 支付结果：SUCCESS/FAIL
  // ... 其他微信支付回调参数
}
```

#### 功能特性

- ✅ 验证微信支付签名
- ✅ 更新订单状态
- ✅ 自动创建学习进度记录
- ✅ 完成课程后更新用户信息

#### 使用示例

```typescript
// 由微信支付服务器自动调用
// 通常不需要手动调用

// 返回
{
  code: 0,
  message: '支付回调处理成功'
}
```

---

### 5. api/auth-login - 用户登录

**云函数名称**: `api/auth-login`

**描述**: 微信小程序登录，生成JWT Token

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 接口参数

```typescript
{
  envId?: string
  code: string  // 微信登录code
}
```

#### 功能特性

- ✅ 微信code换取用户信息
- ✅ 生成JWT Token（有效期7天）
- ✅ 自动创建新用户
- ✅ 初始化学习进度

#### 使用示例

```typescript
const result = await app.callFunction({
  name: 'api/auth-login',
  data: {
    code: 'wx_login_code_xxx'
  }
})

// 返回
{
  code: 0,
  message: '登录成功',
  data: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      openid: 'mock_openid_xxx',
      name: '测试用户',
      email: 'test@example.com',
      avatar: '',
      level: 'beginner'
    }
  }
}
```

---

### 6. api/progress-update - 更新学习进度

**云函数名称**: `api/progress-update`

**描述**: 更新用户学习进度

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 接口参数

```typescript
{
  envId?: string
  openid: string      // 用户openid
  courseId: string   // 课程ID
  lessonId: string   // 课程节ID
  progress: number   // 进度 0-100
}
```

#### 功能特性

- ✅ 创建或更新学习进度
- ✅ 自动记录当前课程节
- ✅ 进度100%时标记为已完成
- ✅ 自动添加到用户完成课程列表

#### 使用示例

```typescript
const result = await app.callFunction({
  name: 'api/progress-update',
  data: {
    openid: 'user_openid_123',
    courseId: 'course_1',
    lessonId: 'lesson_1',
    progress: 50
  }
})

// 返回
{
  code: 0,
  message: '进度更新成功'
}
```

---

### 7. init-database - 初始化数据库

**云函数名称**: `init-database`

**描述**: 创建数据库集合

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 使用示例

```typescript
const result = await app.callFunction({
  name: 'init-database',
  data: {}
})

// 返回
{
  code: 0,
  message: '初始化成功'
}
```

---

### 8. init-uav-collections - 初始化无人机培训数据

**云函数名称**: `init-uav-collections`

**描述**: 创建无人机培训相关集合并插入示例数据

**运行时**: Node.js 16.13

**状态**: ✅ Active

#### 创建的集合

- `teacher_profiles` - 教师资料
- `course_schedules` - 排课信息
- `enrollments` - 报名信息
- `attendance_records` - 出勤记录
- `schedule_changes` - 调课申请

#### 使用示例

```typescript
const result = await app.callFunction({
  name: 'init-uav-collections',
  data: {}
})

// 返回
{
  code: 0,
  message: '初始化成功'
}
```

---

### 9. init-uav - 初始化无人机培训系统

**云函数名称**: `init-uav`

**描述**: 完整初始化无人机培训系统，包含数据和配置

**运行时**: Node.js 16.13

**状态**: ✅ Active

---

### 10. migrate-uav - 数据迁移

**云函数名称**: `migrate-uav`

**描述**: 迁移无人机培训相关数据

**运行时**: Node.js 16.13

**状态**: ✅ Active

---

### 11. migrate-passwords - 密码迁移

**云函数名称**: `migrate-passwords`

**描述**: 迁移用户密码数据

**运行时**: Node.js 16.13

**状态**: ✅ Active

---

### 12. create-collections - 批量创建集合

**云函数名称**: `create-collections`

**描述**: 批量创建数据库集合

**运行时**: Node.js 16.13

**状态**: ✅ Active

---

### 13. insert-test-data - 插入测试数据

**云函数名称**: `insert-test-data`

**描述**: 插入测试数据用于开发测试

**运行时**: Node.js 16.13

**状态**: ✅ Active

---

## 数据库集合

### 已创建的集合

| 集合名称 | 数据量 | 说明 |
|---------|-------|------|
| `attendance_records` | 5 | 出勤记录 |
| `cart` | 0 | 购物车 |
| `course_schedules` | 10 | 排课信息 |
| `courses` | 3 | 课程信息 |
| `enrollments` | 6 | 报名信息 |
| `orders` | 4 | 订单信息 |
| `promotions` | 0 | 优惠活动 |
| `schedule_changes` | 3 | 调课申请 |
| `statistics_daily` | 0 | 每日统计 |
| `statistics_teacher` | 0 | 教师统计 |
| `teacher_profiles` | 4 | 教师资料 |
| `user_profiles` | 5 | 用户资料 |
| `user_progress` | 0 | 学习进度 |
| `users` | 0 | 用户信息 |

---

## 前端调用方式

### 使用 CloudBase SDK

```typescript
import app from './config/tcb'

// 调用云函数
const callCloudFunction = async (name: string, data: any) => {
  const result = await app.functions().callFunction({
    name,
    data
  })

  if (result.result.code !== 0) {
    throw new Error(result.result.message)
  }

  return result.result.data
}

// 示例：获取课程列表
const courses = await callCloudFunction('api/courses-list', {})

// 示例：创建订单
const order = await callCloudFunction('api/orders-create', {
  openid: 'user_openid_123',
  items: [
    { courseId: 'course_1', price: 99 }
  ]
})

// 示例：管理后台查询
const teachers = await callCloudFunction('admin', {
  action: 'list',
  collection: 'teacher_profiles',
  options: {
    limit: 20,
    orderBy: 'createdAt',
    order: 'desc'
  }
})
```

---

## 错误处理

### 错误码说明

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误处理示例

```typescript
try {
  const result = await app.functions().callFunction({
    name: 'api/courses-list',
    data: {}
  })

  if (result.result.code === 0) {
    // 成功处理
    console.log('数据:', result.result.data)
  } else {
    // 业务错误
    console.error('业务错误:', result.result.message)
  }
} catch (error) {
  // 系统错误
  console.error('系统错误:', error)
}
```

---

## 最佳实践

### 1. 权限控制

```typescript
// 在云函数中验证用户权限
const { openid } = event

if (!openid) {
  return {
    code: 401,
    message: '未授权'
  }
}
```

### 2. 数据验证

```typescript
// 验证必要参数
if (!event.collection) {
  return {
    code: 400,
    message: 'collection 参数必填'
  }
}
```

### 3. 错误日志

```typescript
try {
  // 业务逻辑
} catch (error) {
  console.error('操作失败:', error)
  return {
    code: 500,
    message: error.message || '操作失败',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  }
}
```

---

## 安全建议

1. **环境变量管理**: 敏感信息使用环境变量
2. **签名验证**: 支付回调必须验证签名
3. **权限控制**: 所有接口验证用户身份
4. **输入验证**: 所有输入参数进行验证
5. **错误处理**: 不暴露敏感错误信息

---

## 更新日志

- 2026-03-17: 创建初始云函数
- 2026-03-18: 优化 admin 云函数，添加聚合查询
