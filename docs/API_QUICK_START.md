# 前后端数据交互方案 - 快速开始

## 📋 方案概述

本方案为企业级的前后端数据交互设计，涵盖：

✅ 完整的 RESTful API 规范
✅ 统一的响应格式和错误处理
✅ 企业级的数据安全方案（身份认证、数据加密、请求签名）
✅ 清晰的代码结构和模块化设计
✅ TypeScript 类型安全
✅ 完整的文档和示例

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install axios bcryptjs crypto-js zustand
npm install -D @types/bcryptjs @types/crypto-js
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# API 配置
VITE_API_BASE_URL=https://your-env-id.api.tcloudbasegateway.com

# 加密配置（生产环境必须修改）
VITE_ENCRYPTION_KEY=your-secret-key-change-in-production
VITE_SIGN_SECRET=your-sign-secret-change-in-production
```

### 3. 使用 API 客户端

```typescript
import apiClient from '@/api/client'
import userApi from '@/api/modules/user'

// 获取用户列表
const response = await userApi.getUserList({
  page: 1,
  pageSize: 20,
  status: 'active'
})

if (response.success) {
  console.log(response.data.items)
} else {
  console.error(response.error)
}
```

---

## 📁 文件结构

```
src/
├── api/                          # API 接口层
│   ├── client.ts                 # Axios 客户端配置 ⭐
│   ├── types.ts                  # TypeScript 类型定义 ⭐
│   └── modules/                  # API 模块
│       ├── auth.ts               # 认证 API
│       ├── user.ts               # 用户管理 API
│       ├── course.ts             # 课程管理 API
│       └── order.ts              # 订单管理 API
├── utils/                        # 工具函数
│   ├── crypto.ts                 # 加密工具 ⭐
│   └── validation.ts             # 验证工具 ⭐
└── store/                        # 状态管理
    └── authStore.ts              # 认证状态
```

---

## 🔐 安全特性

### 1. 身份认证

```typescript
import authApi from '@/api/modules/auth'

// 短信验证码登录
const { verification_id } = await authApi.sendVerificationCode({
  phone_number: '+86 13800138000',
  target: 'ANY'
})

const { verification_token } = await authApi.verifyCode({
  verification_id,
  verification_code: '123456'
})

const { access_token, refresh_token } = await authApi.login({
  method: 'sms',
  verification_token
})

// Token 自动管理
// - Access Token: 15 分钟，存储在内存和 sessionStorage
// - Refresh Token: 7 天，存储在 localStorage
// - 自动刷新：Token 过期时自动刷新
```

### 2. 数据加密

```typescript
import { hashPassword, verifyPassword, encrypt, decrypt } from '@/utils/crypto'

// 密码加密
const hashedPassword = await hashPassword('password123')
const isValid = await verifyPassword('password123', hashedPassword)

// 数据加密
const encrypted = encrypt('sensitive data')
const decrypted = decrypt(encrypted)

// 对象加密
const encryptedObj = encryptObject({ name: '张三', age: 25 })
const decryptedObj = decryptObject(encryptedObj)
```

### 3. 请求签名

```typescript
import { generateSignature, verifySignature } from '@/utils/crypto'

// 生成签名
const signature = generateSignature(SIGN_SECRET, {
  method: 'POST',
  url: '/api/v1/users',
  body: { name: '张三' },
  timestamp: Date.now(),
  nonce: generateNonce()
})

// 验证签名
const isValid = verifySignature(SIGN_SECRET, options, signature)
```

### 4. 参数验证

```typescript
import { validateForm, ValidationRules } from '@/utils/validation'

// 表单验证
const result = validateForm(
  {
    email: 'user@example.com',
    password: 'Password123',
    phone: '+86 13800138000'
  },
  {
    email: ValidationRules.required('邮箱不能为空'),
    email: ValidationRules.email('邮箱格式不正确'),
    password: ValidationRules.password(
      { minLength: 8, requireNumber: true },
      '密码强度不够'
    ),
    phone: ValidationRules.phone('手机号格式不正确')
  }
)

if (result.valid) {
  // 验证通过
} else {
  console.log(result.errors)
}
```

---

## 📡 API 使用示例

### 认证 API

```typescript
import authApi from '@/api/modules/auth'

// 发送验证码
await authApi.sendVerificationCode({
  phone_number: '+86 13800138000',
  target: 'ANY'
})

// 验证码登录
await authApi.login({
  method: 'sms',
  verification_token: 'xxx'
})

// 获取当前用户
const { data } = await authApi.getCurrentUser()
console.log(data.user)

// 登出
await authApi.logout()
```

### 用户管理 API

```typescript
import userApi from '@/api/modules/user'

// 获取用户列表
const response = await userApi.getUserList({
  page: 1,
  pageSize: 20,
  status: 'active',
  sort: 'createdAt:desc'
})

// 获取用户详情
const user = await userApi.getUserById('user_123')

// 创建用户
const newUser = await userApi.createUser({
  username: '张三',
  email: 'zhangsan@example.com',
  password: 'Password123',
  role: 'user'
})

// 更新用户
await userApi.updateUser('user_123', {
  username: '李四',
  email: 'lisi@example.com'
})

// 删除用户
await userApi.deleteUser('user_123')

// 获取用户统计
const stats = await userApi.getUserStats()
console.log(stats.data.total)
```

### 错误处理

```typescript
import apiClient from '@/api/client'

try {
  const response = await apiClient.get('/api/v1/users')
  if (response.success) {
    console.log(response.data)
  }
} catch (error) {
  // 错误已由拦截器自动处理
  // - 401: 自动刷新 Token
  // - 429: 显示限流提示
  // - 500: 显示服务器错误提示
  console.error('操作失败', error)
}
```

---

## 🎯 核心特性

### 1. 统一响应格式

```typescript
// 成功响应
{
  success: true,
  data: { ... },
  message: "操作成功",
  timestamp: 1710710400000,
  requestId: "req_123456789"
}

// 错误响应
{
  success: false,
  error: {
    code: "USER_NOT_FOUND",
    message: "用户不存在",
    details: { userId: "123" }
  },
  timestamp: 1710710400000,
  requestId: "req_123456789"
}
```

### 2. 自动 Token 刷新

- Token 过期时自动刷新
- 并发请求时队列处理
- 刷新失败自动跳转登录

### 3. 请求/响应拦截器

- 自动添加 Authorization Header
- 自动添加 Request-ID
- 统一错误处理
- 自动显示通知

### 4. 防重放攻击

- 时间戳验证（5 分钟有效）
- Nonce 防重复使用
- 关键操作请求签名

---

## 🔧 自定义配置

### 自定义 API 基础 URL

```typescript
// src/api/client.ts
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://your-env-id.service.tcloudbase.com',
  timeout: 30000
}
```

### 自定义错误处理

```typescript
// src/api/client.ts
function handleBusinessError(error: any) {
  switch (error.code) {
    case 'CUSTOM_ERROR':
      showNotification('error', '自定义错误信息')
      break
  }
}
```

### 添加新的 API 模块

```typescript
// src/api/modules/custom.ts
import apiClient from '../client'
import type { ApiResponse } from '../types'

export interface CustomData {
  id: string
  name: string
}

export async function getCustomData(): Promise<ApiResponse<CustomData>> {
  return apiClient.get('/api/v1/custom')
}

export default {
  getCustomData
}
```

---

## 📚 完整文档

详细的架构设计文档请参考：

- [API_ARCHITECTURE_DESIGN.md](./API_ARCHITECTURE_DESIGN.md) - 完整架构设计

---

## 🎓 最佳实践

### 1. API 调用

```typescript
// ✅ 推荐：使用封装的 API 模块
import userApi from '@/api/modules/user'
const response = await userApi.getUserList()

// ❌ 不推荐：直接使用 axios
const response = await axios.get('/api/v1/users')
```

### 2. 错误处理

```typescript
// ✅ 推荐：使用 try-catch 并让拦截器处理
try {
  const response = await userApi.createUser(data)
  // 处理成功逻辑
} catch (error) {
  // 错误已自动处理，只需记录日志
  console.error(error)
}

// ❌ 不推荐：重复处理错误
try {
  const response = await userApi.createUser(data)
} catch (error) {
  if (error.response?.status === 401) {
    // ❌ 拦截器已处理
  }
}
```

### 3. 类型安全

```typescript
// ✅ 推荐：使用 TypeScript 类型
import type { User, CreateUserRequest } from '@/api/types'

const request: CreateUserRequest = {
  username: '张三',
  email: 'user@example.com',
  password: 'Password123'
}

const response = await userApi.createUser(request)
const user: User = response.data

// ❌ 不推荐：使用 any
const response = await userApi.createUser({
  username: '张三',
  email: 'user@example.com'
} as any)
```

---

## 🚀 下一步

1. 阅读完整架构设计：[API_ARCHITECTURE_DESIGN.md](./API_ARCHITECTURE_DESIGN.md)
2. 根据项目需求调整配置
3. 实现具体的 API 模块
4. 编写单元测试
5. 部署到生产环境

---

## 📞 支持

如有问题，请参考：
- [CloudBase 官方文档](https://docs.cloudbase.net/)
- [Axios 官方文档](https://axios-http.com/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
