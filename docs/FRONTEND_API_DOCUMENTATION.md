# 无人机培训系统 - 前端 API 文档

**文档版本**: v1.0
**更新日期**: 2026-04-01
**文档人员**: AI Assistant

---

## 📋 目录

1. [API 架构概述](#api-架构概述)
2. [CloudBase SDK API](#cloudbase-sdk-api)
3. [HTTP 客户端 API](#http-客户端-api)
4. [服务层 API 清单](#服务层-api-清单)
5. [API 使用示例](#api-使用示例)

---

## 📚 API 架构概述

### 系统架构

本系统采用**双 API 架构**：
1. **CloudBase SDK API** - 前端直接调用 CloudBase SDK（认证、数据库、存储）
2. **HTTP 客户端 API** - 通过统一的 HTTP 客户端调用后端云函数

### 为什么采用双架构？

- **CloudBase SDK**: 适合前端直接操作（认证、数据库 CRUD、文件存储）
- **HTTP API**: 适合需要云函数处理逻辑（复杂业务、权限校验、数据处理）

---

## ☁️ CloudBase SDK API

### 1. 认证相关（@cloudbase/node-sdk）

#### 导入
```typescript
import app from '@/config/tcb'
// 或
import { app } from '@cloudbase/node-sdk'
```

#### 匿名登录
```typescript
app.auth().signInAnonymously()
  .then(result => {
    const { user } = result
    console.log('匿名登录成功:', user.uid)
  })
  .catch(error => {
    console.error('登录失败:', error)
  })
```

#### 手机验证码登录
```typescript
app.auth().signInWithPhoneCode(phone, code)
  .then(result => {
    const { user } = result
    console.log('登录成功:', user)
  })
```

#### 微信登录
```typescript
app.auth().signInWithWechat()
  .then(result => {
    const { user } = result
    console.log('微信登录成功:', user)
  })
```

#### 邮箱密码登录
```typescript
app.auth().signInWithEmailAndPassword(email, password)
  .then(result => {
    const { user } = result
    console.log('邮箱登录成功:', user)
  })
```

#### 登出
```typescript
app.auth().signOut()
  .then(() => {
    console.log('登出成功')
  })
```

#### 获取登录状态
```typescript
app.auth().getLoginState()
  .then(loginState => {
    if (loginState) {
      console.log('已登录:', loginState.user)
    }
  })
```

---

### 2. 数据库操作（NoSQL 文档型数据库）

#### 初始化数据库
```typescript
const db = app.database()
```

#### 查询数据
```typescript
// 获取所有记录
const { data } = await db.collection('courses').get()

// 获取指定数量
const { data } = await db.collection('courses').limit(10).get()

// 根据条件查询
const { data } = await db.collection('courses').where({
  field: 'level',
  op: '==',
  value: 'beginner'
}).get()
```

#### 创建数据
```typescript
const result = await db.collection('courses').add({
  title: '新课程',
  description: '课程描述',
  price: 6800,
  createdAt: new Date().toISOString()
})

console.log('创建成功，ID:', result.id)
```

#### 更新数据
```typescript
await db.collection('courses').doc('course_id').update({
  title: '更新后的标题',
  updatedAt: new Date().toISOString()
})
```

#### 删除数据
```typescript
await db.collection('courses').doc('course_id').remove()
```

#### 复杂查询（聚合）
```typescript
// 使用云函数进行复杂聚合
const result = await app.callFunction({
  name: 'aggregateCourses',
  data: {
    collection: 'courses',
    pipeline: [...]
  }
})
```

---

### 3. 云存储操作

#### 上传文件
```typescript
const result = await app.uploadFile({
  cloudPath: 'uploads/video.mp4',
  filePath: localFile,
  onUploadProgress: (progress) => {
    const percent = Math.round((progress.loaded * 100) / progress.total)
    console.log(`上传进度: ${percent}%`)
  }
})

console.log('文件ID:', result.fileID)
```

#### 获取临时访问 URL
```typescript
const result = await app.getTempFileURL({
  fileList: [
    { fileID: 'cloud_id', maxAge: 7200 }
  ]
})

const url = result.fileList[0].tempFileURL
```

#### 删除文件
```typescript
await app.deleteFile({
  fileList: ['cloud_id']
})
```

#### 批量获取文件 URL
```typescript
const urlMap = new Map()

const result = await app.getTempFileURL({
  fileList: fileIDs.map(fileID => ({ fileID, maxAge: 7200 }))
})

result.fileList.forEach(file => {
  if (file.code === 'SUCCESS') {
    urlMap.set(file.fileID, file.tempFileURL)
  }
})
```

---

### 4. 云函数调用

#### 调用云函数
```typescript
const result = await app.callFunction({
  name: 'functionName',
  data: {
    param1: 'value1',
    param2: 'value2'
  }
})

console.log('函数返回:', result.result)
```

---

## 🌐 HTTP 客户端 API

### API 客户端配置

**文件**: `src/api/client.ts`

#### 基础配置
```typescript
import apiClient from '@/api/client'

// API 基础 URL
const BASE_URL = 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'

// 请求配置
- 超时时间: 30000ms（30秒）
- 自动添加 Authorization 头
- 自动添加请求 ID（防重放）
- 自动添加时间戳（防重放）
```

#### 请求拦截器

```typescript
// 自动添加 Access Token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Request-ID'] = generateRequestId()
  config.headers['X-Timestamp'] = Date.now().toString()
  return config
})
```

#### 响应拦截器

```typescript
// 统一错误处理
apiClient.interceptors.response.use((response) => {
  const { data } = response
  
  // 业务错误处理
  if (data.success === false) {
    handleBusinessError(data.error)
    return Promise.reject(new Error(data.error?.message || '操作失败'))
  }
  
  return data
})

// 401 自动刷新 Token
if (status === 401) {
  return handleTokenExpired(error.config)
}
```

---

### API 方法

#### 通用请求方法

```typescript
import apiClient from '@/api/client'

// GET 请求
apiClient.get('/api/v1/courses')

// POST 请求
apiClient.post('/api/v1/orders', { data: {...} })

// PUT 请求
apiClient.put('/api/v1/users/profile', { data: {...} })

// DELETE 请求
apiClient.delete('/api/v1/courses/123')
```

---

## 🔧 服务层 API 清单

### 1. 数据库服务（database.ts）

| 方法 | 描述 | 返回类型 |
|------|------|----------|
| `paginatedQuery()` | 分页查询 | `Promise<PaginatedResponse<T>>` |
| `findById()` | 根据ID查询单条 | `Promise<T \| null>` |
| `create()` | 创建记录 | `Promise<T>` |
| `update()` | 更新记录 | `Promise<boolean>` |
| `delete()` | 删除记录 | `Promise<void>` |

**集合操作示例**：
```typescript
import { dbService } from '@/services/database'

// 查询课程
const { list, total } = await dbService.getAll('courses', { page: 1, pageSize: 20 })

// 创建课程
const newCourse = await dbService.create('courses', {
  title: '新课程',
  price: 6800
})

// 更新课程
await dbService.update('courses', courseId, { title: '更新标题' })

// 删除课程
await dbService.delete('courses', courseId)
```

---

### 2. 云存储服务（storageService.ts）

| 方法 | 描述 | 返回类型 |
|------|------|----------|
| `uploadFile()` | 上传文件到云存储 | `Promise<UploadResult>` |
| `getFileUrl()` | 获取文件临时访问URL | `Promise<string \| null>` |
| `deleteFile()` | 删除云存储文件 | `Promise<boolean>` |
| `getFileUrls()` | 批量获取文件URL | `Promise<Map<string, string>>` |
| `validateFileType()` | 验证文件类型 | `boolean` |
| `validateFileSize()` | 验证文件大小 | `boolean` |
| `formatFileSize()` | 格式化文件大小 | `string` |

**使用示例**：
```typescript
import { storageService } from '@/services/storageService'

// 上传文件
const { success, fileID } = await storageService.uploadFile(file, 'uploads')

// 获取访问 URL
const url = await storageService.getFileUrl(fileID, 7200)

// 批量获取 URL
const urlMap = await storageService.getFileUrls([id1, id2, id3])

// 删除文件
await storageService.deleteFile(fileID)
```

---

### 3. 业务服务层

#### 课程服务（CloudCourseService.ts）

```typescript
import { CloudCourseService } from '@/services/CloudCourseService'

// 获取所有课程
const courses = await CloudCourseService.getAll()

// 根据ID获取课程
const course = await CloudCourseService.getById('course_id')

// 搜索课程
const results = await CloudCourseService.search('无人机')

// 按级别筛选
const beginnerCourses = await CloudCourseService.filterByLevel('beginner')
```

#### 订单服务（CloudOrderService.ts）

```typescript
import { CloudOrderService } from '@/services/CloudOrderService'

// 获取订单列表
const orders = await CloudOrderService.getAll()

// 创建订单
const order = await CloudOrderService.create({ ... })
```

#### 学习进度服务（CloudProgressService.ts）

```typescript
import { CloudProgressService } from '@/services/CloudProgressService'

// 获取学习进度
const progress = await CloudProgressService.getByUserId('user_id')

// 更新进度
await CloudProgressService.update('progress_id', { percent: 80 })
```

#### 练习服务（CloudPracticeService.ts）

```typescript
import { CloudPracticeService } from '@/services/CloudPracticeService'

// 获取练习记录
const practices = await CloudPracticeService.getByUserId('user_id')

// 添加练习记录
await CloudPracticeService.create({ ... })
```

#### 购物车服务（CloudCartService.ts）

```typescript
import { CloudCartService } from '@/services/CloudCartService'

// 获取购物车
const cart = await CloudCartService.getByUserId('user_id')

// 添加商品到购物车
await CloudCartService.addItem({ ... })

// 更新数量
await CloudCartService.updateItem('item_id', { quantity: 2 })
```

#### 团购服务（groupBuyService.ts）

```typescript
import { groupBuyService } from '@/services/groupBuyService'

// 创建团购
await groupBuyService.create({ ... })
```

#### 优惠券服务（couponService.ts）

```typescript
import { couponService } from '@/services/couponService'

// 获取优惠券
const coupons = await couponService.getAll()

// 验证优惠券
const result = await couponService.validate('coupon_code')
```

#### 考试服务（examService.ts）

```typescript
import { examService } from '@/services/examService'

// 获取考试列表
const exams = await examService.getAll()

// 获取考试详情
const exam = await examService.getById('exam_id')

// 创建考试
const newExam = await examService.create({ ... })

// 更新考试
await examService.update('exam_id', { ... })

// 删除考试
await examService.delete('exam_id')
```

#### 题库服务（questionBankService.ts）

```typescript
import { questionBankService } from '@/services/questionBankService'

// 获取题库列表
const banks = await questionBankService.getAll()

// 根据ID获取题库
const bank = await questionBankService.getById('bank_id')

// 创建题目
await questionBankService.createQuestion({ ... })

// 删除题目
await questionBankService.deleteQuestion('question_id')
```

#### 章节服务（ChapterService.ts）

```typescript
import { chapterService } from '@/services/ChapterService'

// 获取章节列表
const chapters = await chapterService.getByCourseId('course_id')
```

#### 学习记录服务（progress.ts）

```typescript
import { progressService } from '@/services/progress.ts'

// 获取学习记录
const records = await progressService.getByUserId('user_id')

// 添加学习记录
await progressService.create({ ... })
```

#### 注册服务（enrollmentService.ts）

```typescript
import { enrollmentService } from '@/services/enrollmentService'

// 获取注册信息
const enrollments = await enrollmentService.getByUserId('user_id')

// 创建注册
await enrollmentService.create({ ... })
```

#### 证书服务（certificateService.ts）

```typescript
import { certificateService } from '@/services/certificateService'

// 获取证书列表
const certificates = await certificateService.getByUserId('user_id')

// 创建证书
await certificateService.create({ ... })

// 更新证书
await certificateService.update('certificate_id', { ... })
```

#### 管理后台服务（CloudAdminService.ts）

```typescript
import { CloudAdminService } from '@/services/CloudAdminService'

// 获取统计数据
const stats = await CloudAdminService.getStats()

// 获取所有数据
const data = await CloudAdminService.getAll('collection_name')
```

#### 教师服务（teacherService.ts / teacherServiceDirect.ts）

```typescript
import { teacherService } from '@/services/teacherService'

// 获取教师列表
const teachers = await teacherService.getAll()

// 创建教师
await teacherService.create({ ... })

// 更新教师
await teacherService.update('teacher_id', { ... })

// 删除教师
await teacherService.delete('teacher_id')
```

#### 学生服务（studentService.ts）

```typescript
import { studentService } from '@/services/studentService'

// 获取学生列表
const students = await studentService.getAll()

// 创建学生
await studentService.create({ ... })

// 更新学生
await studentService.update('student_id', { ... })

// 删除学生
await studentService.delete('student_id')
```

#### 排课服务（scheduleService.ts）

```typescript
import { scheduleService } from '@/services/scheduleService'

// 获取排课列表
const schedules = await scheduleService.getAll()

// 创建排课
await scheduleService.create({ ... })

// 更新排课
await scheduleService.update('schedule_id', { ... })

// 删除排课
await scheduleService.delete('schedule_id')
```

#### 财务服务（financeService.ts）

```typescript
import { financeService } from '@/services/financeService'

// 获取财务记录
const finances = await financeService.getAll()

// 创建财务记录
await financeService.create({ ... })

// 更新财务
await financeService.update('finance_id', { ... })

// 删除财务
await financeService.delete('finance_id')
```

#### 出勤服务（attendanceService.ts）

```typescript
import { attendanceService } from '@/services/attendanceService'

// 获取出勤记录
const attendance = await attendanceService.getAll()

// 创建出勤记录
await attendanceService.create({ ... })

// 更新出勤
await attendanceService.update('attendance_id', { ... })

// 删除出勤
await attendanceService.delete('attendance_id')
```

#### 系统配置服务（systemConfigService.ts）

```typescript
import { systemConfigService } from '@/services/systemConfigService'

// 获取配置
const config = await systemConfigService.getAll()

// 更新配置
await systemConfigService.update('config_key', { value: 'new_value' })
```

---

## 📝 API 使用示例

### 示例 1: 课程列表查询

**使用 CloudBase SDK 直接查询**：
```typescript
import { dbService } from '@/services/database'

const { list, total } = await dbService.getAll('courses', {
  page: 1,
  pageSize: 20
})

console.log(`共 ${total} 门课程，当前页 ${list.length} 门`)
```

### 示例 2: 上传课程封面

**使用云存储上传 + 数据库保存**：
```typescript
import { storageService } from '@/services/storageService'
import { dbService } from '@/services/database'

// 1. 上传文件到云存储
const { success, fileID } = await storageService.uploadFile(file, 'course-covers')

if (success) {
  // 2. 获取临时访问 URL
  const url = await storageService.getFileUrl(fileID, 7200)
  
  // 3. 保存到数据库
  await dbService.update('courses', courseId, { thumbnail: url })
}
```

### 示例 3: 调用云函数

**调用后端云函数**：
```typescript
import app from '@/config/tcb'

const result = await app.callFunction({
  name: 'processOrder',
  data: {
    userId: 'user_123',
    courseId: 'course_456',
    amount: 6800
  }
})

console.log('订单处理结果:', result.result)
```

### 示例 4: 复杂查询聚合

**使用云函数进行聚合查询**：
```typescript
import app from '@/config/tcb'

// 获取课程平均价格
const result = await app.callFunction({
  name: 'aggregateCourses',
  data: {
    pipeline: [
      { $group: '_id', sum: 'price' }
    ]
  }
})

console.log('平均价格:', result.result)
```

### 示例 5: 认证状态管理

**使用 Zustand + LocalStorage**：
```typescript
import { useAuthStore } from '@/store/authStore'

// 在组件中使用
function MyComponent() {
  const { user, isAuthenticated, loginWithPassword } = useAuthStore()
  
  const handleLogin = async () => {
    const result = await loginWithPassword(email, password)
    if (result.success) {
      // 登录成功
    }
  }
}
```

### 示例 6: 错误处理

**统一错误提示**：
```typescript
import { showNotification } from '@/utils/notification'

try {
  await someOperation()
} catch (error) {
  showNotification('error', '操作失败，请重试')
  console.error('详细错误:', error)
}
```

---

## 🔒️ 安全最佳实践

### 1. 权限控制

```typescript
// 检查用户权限
const hasPermission = useAuthStore(state => state.hasPermission)

if (!hasPermission('admin:course')) {
  alert('没有权限')
  return
}
```

### 2. 数据验证

```typescript
// 前端验证
if (!email || !email.includes('@')) {
  alert('请输入有效的邮箱地址')
  return
}
```

### 3. 防重放攻击

```typescript
// 每个请求自动添加时间戳
config.headers['X-Timestamp'] = Date.now().toString()

// 服务器端验证时间差（建议5秒内有效）
```

### 4. 请求 ID 追踪

```typescript
// 每个请求自动添加唯一 ID
config.headers['X-Request-ID'] = generateRequestId()

// 服务器端记录日志，方便问题排查
```

---

## 📊 API 性能优化

### 1. 懒加载

```typescript
import { lazy } from 'react'

// 路由级懒加载
const CourseList = lazy(() => import('@/routes/CourseListPage'))

// 组件级懒加载
const HeavyComponent = lazy(() => import('@/components/HeavyComponent'))
```

### 2. 分页加载

```typescript
// 每次只加载20条数据
const { list, total } = await dbService.getAll('courses', {
  page: 1,
  pageSize: 20
})

// 避免一次性加载大量数据
```

### 3. 缓存策略

```typescript
// 使用 LocalStorage 缓存不常变化的数据
const cacheKey = 'course_list_cache'
const cached = localStorage.getItem(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

// 更新缓存
const fresh = await fetchCourses()
localStorage.setItem(cacheKey, JSON.stringify(fresh))
```

---

## 📄 相关文档

- **CloudBase SDK 文档**: https://docs.cloudbase.net/sdk/
- **CloudBase HTTP API 文档**: https://docs.cloudbase.net/api/
- **项目 API 配置**: `src/api/client.ts`
- **服务层目录**: `src/services/`

---

## 🎯 最佳实践总结

1. **简单 CRUD** → 使用 CloudBase SDK 直接操作数据库
2. **复杂业务逻辑** → 使用云函数处理
3. **文件操作** → 使用云存储服务
4. **认证相关** → 使用 CloudBase Auth SDK
5. **HTTP API** → 统一使用 apiClient 拦截错误
6. **权限控制** → 使用 useAuthStore 检查权限
7. **错误处理** → 统一使用 showNotification 提示用户
8. **性能优化** → 分页加载、懒加载、合理缓存

---

**文档完成时间**: 2026-04-01
**文档版本**: v1.0
**维护人员**: AI Assistant
