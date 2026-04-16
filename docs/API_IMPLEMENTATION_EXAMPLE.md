# API 实现示例

## 📖 目录

1. [用户认证完整流程](#1-用户认证完整流程)
2. [用户管理 CRUD](#2-用户管理-crud)
3. [错误处理最佳实践](#3-错误处理最佳实践)
4. [自定义 API 模块](#4-自定义-api-模块)
5. [前端组件集成](#5-前端组件集成)

---

## 1. 用户认证完整流程

### 1.1 短信验证码登录

```typescript
// src/pages/Login.tsx
import { useState } from 'react'
import { authApi } from '@/api/modules/auth'
import { useAuthStore } from '@/store/authStore'
import { isValidChinaPhone } from '@/utils/validation'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificationId, setVerificationId] = useState('')
  const [countdown, setCountdown] = useState(0)
  
  const login = useAuthStore((state) => state.login)
  
  // 发送验证码
  const handleSendCode = async () => {
    // 验证手机号
    if (!isValidChinaPhone(phone)) {
      showNotification('error', '手机号格式不正确')
      return
    }
    
    setLoading(true)
    try {
      const response = await authApi.sendVerificationCode({
        phone_number: `+86 ${phone}`,
        target: 'ANY'
      })
      
      if (response.success) {
        setVerificationId(response.data.verification_id)
        
        // 开始倒计时
        setCountdown(60)
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
        
        showNotification('success', '验证码已发送')
      }
    } catch (error) {
      console.error('发送验证码失败', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 登录
  const handleLogin = async () => {
    if (!code) {
      showNotification('error', '请输入验证码')
      return
    }
    
    setLoading(true)
    try {
      // 1. 验证验证码
      const verifyResponse = await authApi.verifyCode({
        verification_id: verificationId,
        verification_code: code
      })
      
      if (!verifyResponse.success) {
        showNotification('error', '验证码错误')
        return
      }
      
      // 2. 登录
      const loginResponse = await authApi.login({
        method: 'sms',
        verification_token: verifyResponse.data.verification_token
      })
      
      if (loginResponse.success) {
        const { access_token, refresh_token, user } = loginResponse.data
        
        // 存储用户信息
        login(user, access_token, refresh_token)
        
        showNotification('success', '登录成功')
        
        // 跳转首页
        window.location.href = '/'
      }
    } catch (error) {
      console.error('登录失败', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="login-page">
      <input
        type="text"
        placeholder="请输入手机号"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      
      <button
        onClick={handleSendCode}
        disabled={countdown > 0 || loading}
      >
        {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
      </button>
      
      <input
        type="text"
        placeholder="请输入验证码"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      
      <button onClick={handleLogin} disabled={loading}>
        {loading ? '登录中...' : '登录'}
      </button>
    </div>
  )
}
```

### 1.2 Token 自动刷新（已内置）

Token 自动刷新逻辑已在 `src/api/client.ts` 中实现：

```typescript
// 请求拦截器：自动添加 Token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：自动处理 401 并刷新 Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 自动刷新 Token 并重试请求
      return handleTokenExpired(error.config)
    }
    return Promise.reject(error)
  }
)
```

---

## 2. 用户管理 CRUD

### 2.1 用户列表组件

```typescript
// src/components/admin/UserManagement.tsx
import { useEffect, useState } from 'react'
import { userApi } from '@/api/modules/user'
import type { User, QueryParams } from '@/api/types'
import { DataGrid } from '@mui/x-data-grid'

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  })
  
  // 获取用户列表
  const fetchUsers = async (params?: QueryParams) => {
    setLoading(true)
    try {
      const response = await userApi.getUserList({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...params
      })
      
      if (response.success) {
        setUsers(response.data.items)
        setPagination({
          page: response.data.pagination.page,
          pageSize: response.data.pagination.pageSize,
          total: response.data.pagination.total
        })
      }
    } catch (error) {
      console.error('获取用户列表失败', error)
    } finally {
      setLoading(false)
    }
  }
  
  // 初始化加载
  useEffect(() => {
    fetchUsers()
  }, [])
  
  // 搜索
  const handleSearch = (keyword: string) => {
    fetchUsers({ keyword })
  }
  
  // 删除用户
  const handleDelete = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return
    
    setLoading(true)
    try {
      const response = await userApi.deleteUser(userId)
      
      if (response.success) {
        showNotification('success', '删除成功')
        // 重新加载列表
        fetchUsers()
      }
    } catch (error) {
      console.error('删除用户失败', error)
    } finally {
      setLoading(false)
    }
  }
  
  // DataGrid 列定义
  const columns = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'username', headerName: '用户名', width: 150 },
    { field: 'email', headerName: '邮箱', width: 200 },
    { field: 'role', headerName: '角色', width: 100 },
    { field: 'status', headerName: '状态', width: 100 },
    { field: 'createdAt', headerName: '创建时间', width: 180 },
    {
      field: 'actions',
      headerName: '操作',
      width: 200,
      renderCell: (params: any) => (
        <>
          <button onClick={() => handleEdit(params.row.id)}>编辑</button>
          <button onClick={() => handleDelete(params.row.id)}>删除</button>
        </>
      )
    }
  ]
  
  return (
    <div>
      <h1>用户管理</h1>
      
      <input
        type="text"
        placeholder="搜索用户"
        onChange={(e) => handleSearch(e.target.value)}
      />
      
      <button onClick={() => handleAdd()}>新增用户</button>
      
      <DataGrid
        rows={users}
        columns={columns}
        loading={loading}
        pagination
        pageSize={pagination.pageSize}
        page={pagination.page - 1}
        rowCount={pagination.total}
        onPageChange={(page) => setPagination({ ...pagination, page: page + 1 })}
        onPageSizeChange={(pageSize) => setPagination({ ...pagination, pageSize })}
      />
    </div>
  )
}
```

### 2.2 创建/编辑用户表单

```typescript
// src/components/admin/UserForm.tsx
import { useState, useEffect } from 'react'
import { userApi } from '@/api/modules/user'
import type { User, CreateUserRequest, UpdateUserRequest } from '@/api/types'
import { validateForm, ValidationRules } from '@/utils/validation'
import { isValidEmail, isValidChinaPhone } from '@/utils/validation'

interface UserFormProps {
  userId?: string
  onSuccess: () => void
  onCancel: () => void
}

export default function UserForm({ userId, onSuccess, onCancel }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    role: 'user' as 'user' | 'admin',
    status: 'active' as 'active' | 'disabled'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 编辑模式：获取用户信息
  useEffect(() => {
    if (userId) {
      fetchUser()
    }
  }, [userId])
  
  const fetchUser = async () => {
    try {
      const response = await userApi.getUserById(userId!)
      if (response.success) {
        const user = response.data
        setFormData({
          username: user.username || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          role: user.role,
          status: user.status
        })
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
  }
  
  // 表单验证
  const validate = () => {
    const result = validateForm(formData, {
      username: ValidationRules.username(),
      email: [ValidationRules.required(), ValidationRules.email()],
      phoneNumber: [ValidationRules.required(), ValidationRules.phone()]
    })
    
    setErrors(result.errors)
    return result.valid
  }
  
  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      showNotification('error', '请检查表单信息')
      return
    }
    
    setLoading(true)
    try {
      let response
      
      if (userId) {
        // 编辑
        const updateData: UpdateUserRequest = {
          username: formData.username,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          role: formData.role,
          status: formData.status
        }
        response = await userApi.updateUser(userId, updateData)
      } else {
        // 新增
        const createData: CreateUserRequest = {
          username: formData.username,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          role: formData.role,
          password: 'Password123' // 默认密码
        }
        response = await userApi.createUser(createData)
      }
      
      if (response.success) {
        showNotification('success', userId ? '更新成功' : '创建成功')
        onSuccess()
      }
    } catch (error) {
      console.error('操作失败', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>{userId ? '编辑用户' : '新增用户'}</h2>
      
      <div>
        <label>用户名</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>
      
      <div>
        <label>邮箱</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>
      
      <div>
        <label>手机号</label>
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
        />
        {errors.phoneNumber && <span className="error">{errors.phoneNumber}</span>}
      </div>
      
      <div>
        <label>角色</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
        >
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
        </select>
      </div>
      
      <div>
        <label>状态</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
        >
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
      </div>
      
      <div className="actions">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="submit" disabled={loading}>
          {loading ? '提交中...' : '提交'}
        </button>
      </div>
    </form>
  )
}
```

---

## 3. 错误处理最佳实践

### 3.1 组件级错误处理

```typescript
import { useState } from 'react'
import { userApi } from '@/api/modules/user'

export default function UserProfile() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const fetchUser = async (userId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await userApi.getUserById(userId)
      
      if (response.success) {
        setUser(response.data)
      } else {
        setError(response.error?.message || '获取用户信息失败')
      }
    } catch (err) {
      // 业务错误已在拦截器中处理
      // 这里只处理组件特定逻辑
      console.error('fetchUser error:', err)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) return <div>加载中...</div>
  if (error) return <div className="error">{error}</div>
  if (!user) return <div>用户不存在</div>
  
  return (
    <div>
      <h1>{user.username}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### 3.2 全局错误边界

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // 上报错误到监控系统
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>出错了</h1>
          <details>
            <summary>错误详情</summary>
            <pre>{this.state.error?.toString()}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}

// 使用
// src/App.tsx
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  )
}
```

---

## 4. 自定义 API 模块

### 4.1 创建课程管理 API

```typescript
// src/api/modules/course.ts
import apiClient from '../client'
import type {
  ApiResponse,
  QueryParams,
  Course,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseListResponse,
  BatchDeleteRequest,
  BatchDeleteResponse
} from '../types'

// 获取课程列表
export async function getCourseList(
  params?: QueryParams
): Promise<ApiResponse<CourseListResponse>> {
  return apiClient.get('/api/v1/courses', { params })
}

// 获取课程详情
export async function getCourseById(
  courseId: string
): Promise<ApiResponse<Course>> {
  return apiClient.get(`/api/v1/courses/${courseId}`)
}

// 创建课程
export async function createCourse(
  request: CreateCourseRequest
): Promise<ApiResponse<Course>> {
  return apiClient.post('/api/v1/courses', request)
}

// 更新课程
export async function updateCourse(
  courseId: string,
  request: UpdateCourseRequest
): Promise<ApiResponse<Course>> {
  return apiClient.patch(`/api/v1/courses/${courseId}`, request)
}

// 删除课程
export async function deleteCourse(
  courseId: string
): Promise<ApiResponse<{ message: string }>> {
  return apiClient.delete(`/api/v1/courses/${courseId}`)
}

// 批量删除课程
export async function batchDeleteCourses(
  request: BatchDeleteRequest
): Promise<ApiResponse<BatchDeleteResponse>> {
  return apiClient.post('/api/v1/courses/batch-delete', request)
}

// 获取课程统计
export async function getCourseStats(): Promise<ApiResponse<{
  total: number
  published: number
  draft: number
  archived: number
  enrolledTotal: number
  revenue: number
}>> {
  return apiClient.get('/api/v1/courses/stats')
}

// 导出
const courseApi = {
  getCourseList,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  batchDeleteCourses,
  getCourseStats
}

export default courseApi
```

---

## 5. 前端组件集成

### 5.1 使用状态管理

```typescript
// src/store/userStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { userApi } from '@/api/modules/user'
import type { User } from '@/api/types'

interface UserState {
  users: User[]
  currentUser: User | null
  loading: boolean
  error: string | null
  
  fetchUsers: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
  createUser: (data: any) => Promise<void>
  updateUser: (id: string, data: any) => Promise<void>
  deleteUser: (id: string) => Promise<void>
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      loading: false,
      error: null,
      
      fetchUsers: async () => {
        set({ loading: true, error: null })
        try {
          const response = await userApi.getUserList()
          if (response.success) {
            set({ users: response.data.items })
          }
        } catch (error) {
          set({ error: '获取用户列表失败' })
        } finally {
          set({ loading: false })
        }
      },
      
      fetchCurrentUser: async () => {
        set({ loading: true, error: null })
        try {
          const response = await userApi.getCurrentUser()
          if (response.success) {
            set({ currentUser: response.data })
          }
        } catch (error) {
          set({ error: '获取用户信息失败' })
        } finally {
          set({ loading: false })
        }
      },
      
      createUser: async (data) => {
        set({ loading: true, error: null })
        try {
          const response = await userApi.createUser(data)
          if (response.success) {
            set({ users: [...get().users, response.data] })
          }
        } catch (error) {
          set({ error: '创建用户失败' })
        } finally {
          set({ loading: false })
        }
      },
      
      updateUser: async (id, data) => {
        set({ loading: true, error: null })
        try {
          const response = await userApi.updateUser(id, data)
          if (response.success) {
            set({
              users: get().users.map(u => u.id === id ? response.data : u)
            })
          }
        } catch (error) {
          set({ error: '更新用户失败' })
        } finally {
          set({ loading: false })
        }
      },
      
      deleteUser: async (id) => {
        set({ loading: true, error: null })
        try {
          await userApi.deleteUser(id)
          set({
            users: get().users.filter(u => u.id !== id)
          })
        } catch (error) {
          set({ error: '删除用户失败' })
        } finally {
          set({ loading: false })
        }
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ currentUser: state.currentUser })
    }
  )
)
```

### 5.2 在组件中使用

```typescript
import { useEffect } from 'react'
import { useUserStore } from '@/store/userStore'

export default function UserList() {
  const { users, loading, error, fetchUsers, deleteUser } = useUserStore()
  
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])
  
  if (loading) return <div>加载中...</div>
  if (error) return <div>{error}</div>
  
  return (
    <div>
      <h1>用户列表</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.username} - {user.email}
            <button onClick={() => deleteUser(user.id)}>删除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 📝 总结

以上示例展示了如何：

1. ✅ 实现完整的用户认证流程
2. ✅ 创建用户管理的 CRUD 操作
3. ✅ 正确处理各种错误情况
4. ✅ 自定义 API 模块
5. ✅ 集成到前端组件中

关键要点：
- 使用封装的 API 模块，而不是直接调用 axios
- 利用拦截器自动处理 Token 和错误
- 使用 TypeScript 类型确保类型安全
- 使用状态管理器（Zustand）管理数据
- 实现良好的错误处理和用户提示
