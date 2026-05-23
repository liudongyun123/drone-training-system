# 项目编码规范

> 所有新增功能和重构都必须遵守。违反规范的 PR 不接受。

---

## 一、架构铁律

### 1.1 数据库操作：只能写在云函数中

```
❌ 前端代码（src/、miniprogram/）不出现 app.database()
❌ 不出现 @/config/tcb 的数据库操作
✅ 需要数据 → 调 adminService 或新建云函数
```

**例外**（只有这两类）：
- 用户认证（匿名登录、手机号登录） → CloudBase SDK
- 云存储上传（图片、文件上传） → CloudBase SDK

### 1.2 云函数：统一 SDK 和 Runtime

```javascript
// 所有云函数固定使用这个初始化方式
const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
```

```
❌ 不要 wx-server-sdk
❌ 不要 tcb-admin-node（旧版）
❌ 不要双 SDK 动态选择
✅ 只用 @cloudbase/node-sdk + Node 18
```

### 1.3 四个端调用同一套云函数

| 端 | 数据请求方式 | 认证方式 |
|---|---|---|
| Web 管理后台 | HTTP → 云函数 | CloudBase SDK |
| Web 客户端 | HTTP → 云函数 | CloudBase SDK |
| 微信小程序 | `wx.request` → 云函数 | 微信登录 |

---

## 二、服务方式规范

### 2.1 前端 Service 写法

```typescript
// ✅ 正确：所有 service 只导 adminService
import { adminService } from '@/services/adminService'

export const exampleService = {
  async getList(query = {}) {
    const result = await adminService.list('collection_name', query, { limit: 20 })
    if (result.code !== 0) throw new Error(result.message)
    return result.data.list
  },

  async getById(id: string) {
    const result = await adminService.get('collection_name', id)
    if (result.code !== 0) throw new Error(result.message)
    return result.data
  },

  async create(data: Record<string, any>) {
    const result = await adminService.add('collection_name', data)
    if (result.code !== 0) throw new Error(result.message)
    return result.data.id
  },

  async update(id: string, data: Record<string, any>) {
    const result = await adminService.update('collection_name', id, data)
    if (result.code !== 0) throw new Error(result.message)
  },

  async delete(id: string) {
    const result = await adminService.delete('collection_name', id)
    if (result.code !== 0) throw new Error(result.message)
  }
}
```

### 2.2 adminService API 速查

```typescript
// 列表查询
adminService.list('collection', { field: value }, { limit: 20, orderBy: 'createdAt', order: 'desc' })
// 单条查询
adminService.get('collection', 'recordId')
// 新增
adminService.add('collection', { field: value })
// 更新
adminService.update('collection', 'recordId', { field: newValue })
// 删除
adminService.delete('collection', 'recordId')
// 统计
adminService.count('collection', { field: value })
```

### 2.3 查询条件写法

```typescript
// ✅ 统一：普通对象查询
{ section: 'stats', status: 'active' }
{ 'data.sourceId': 'CAAC' }   // 嵌套字段用点号

// ❌ 不要在前端代码中用 db.command
// ❌ 不要在前端代码中写 .where().orderBy()
```

### 2.4 错误处理

```typescript
// ✅ 统一模式
try {
  const result = await adminService.list('collection', query)
  if (result.code !== 0) throw new Error(result.message)
  // 处理 result.data
} catch (error) {
  console.error('操作失败:', error)
  // 统一错误提示
}
```

---

## 三、云函数规范

### 3.1 文件结构

```
cloudfunctions/
└── my-function/
    ├── index.js          # 入口
    ├── package.json      # 依赖
    └── cloudbaserc.json  # 部署配置（如有）
```

### 3.2 响应格式

```javascript
// ✅ 所有云函数统一返回此格式
{
  code: 0,       // 0=成功，非0=失败
  message: 'ok', // 提示信息
  data: {}       // 数据
}
```

### 3.3 通用 CRUD 用 db-init

```javascript
// 简单增删改查直接走 db-init，不新建云函数
POST /db-init
{
  "action": "query",  // query | add | update | delete | count
  "collection": "courses",
  "query": { "status": "active" },  // query/delete/count 时用
  "data": { "title": "新课" },       // add/update 时用
  "id": "recordId",                  // get/update/delete 时用
  "limit": 20
}
```

### 3.4 什么时候新建云函数

当操作包含**业务逻辑**时才新建，例如：
- 报名（校验名额 + 写报名表 + 发通知）
- 支付回调（验签 + 更新订单 + 开通权限）
- 复杂聚合查询（跨集合联查）

---

## 四、新增功能流程

```
1. 设计数据库集合结构
2. 如需业务逻辑 → 新建云函数（否则直接用 db-init CRUD）
3. 写前端 Service（固定用 adminService）
4. 写页面组件（调 Service，不直接调 adminService）
5. 提交前 npm run build 零 error
```

---

## 五、代码风格规范

### 5.1 组件和样式：MUI + sx

```tsx
// ✅ 正确：用 MUI 组件 + sx 写样式
import { Box, Typography, Paper, Grid, Stack, Chip, IconButton, TextField, Select, MenuItem } from '@mui/material'
import { Edit, Trash2, Plus } from 'lucide-react'

function MyPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>标题</Typography>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={2}>
          <IconButton onClick={handleEdit}><Edit size={18} /></IconButton>
          <IconButton onClick={handleDelete} sx={{ color: 'error.main' }}><Trash2 size={18} /></IconButton>
        </Stack>
      </Paper>
    </Box>
  )
}
```

```
❌ 不要在新代码中用 Tailwind className="bg-white p-4 rounded-lg"
❌ 不要混用两套样式体系
✅ 统一用 MUI 组件 + sx prop
✅ 图标统一用 lucide-react
```

### 5.2 组件导入优先级

| 优先级 | 来源 | 示例 |
|:--:|------|------|
| 1 | `@mui/material` | `Box`, `Typography`, `Paper`, `Button` |
| 2 | `lucide-react` | 图标（`Edit`, `Plus`, `Trash2`） |
| 3 | `@/components` | 项目公共组件（`Loading`, `Modal`, `ImageUploader`） |

### 5.3 状态管理

```typescript
// ✅ React hooks（项目统一）
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
// ✅ 全局状态用 zustand
```

```
❌ 不引入 Redux、MobX 等额外状态库
```

### 5.4 TypeScript

```typescript
// ✅ 组件 Props 必须定义接口
interface MyComponentProps {
  title: string
  onSave: (data: FormData) => Promise<void>
  loading?: boolean
}

// ✅ Service 函数标注返回类型
async getList(): Promise<CourseItem[]> { ... }

// ❌ 新代码避免 any
// ❌ 不写没有意义的类型标注
```

### 5.5 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `CourseManagement`, `PageConfigManagement` |
| Service 文件 | camelCase + Service 后缀 | `courseService.ts`, `examService.ts` |
| Hooks | use 前缀 + camelCase | `useCourses`, `useSourceConfig` |
| 云函数目录 | kebab-case | `api-course`, `db-init` |
| 数据库集合 | snake_case | `page_configs`, `course_permissions` |
| 工具函数 | camelCase | `formatDate`, `parsePhoneNumber` |

---

## 六、禁止事项

| 禁止 | 原因 |
|------|------|
| `app.database()` 在前端代码中 | 安全规则 `_openid` 限制，管理员查不全数据 |
| `wx-server-sdk` 在新代码中 | 与 `@cloudbase/node-sdk` 不统一 |
| `tcb-admin-node` 在新代码中 | 已废弃，统一用 `@cloudbase/node-sdk` |
| 一个 Service 混用多种数据访问方式 | 难维护、难排查 |
| 新功能绕过 Service 直接调 adminService | 破坏分层，业务逻辑散落 |
| Tailwind `className` 在新代码中 | 与 MUI `sx` 不统一，混用两套样式体系 |
| MUI 组件混用自定义 Button/Modal | 直接用 MUI 组件，不要套一层不必要的封装 |
| `any` 在新代码中不加注释 | 至少写 `// TODO: 类型待补` |
| 新组件不定义 Props 接口 | 补全类型是基本要求 |
| Redux/MobX 等额外状态库 | 项目统一用 React hooks + zustand |

---

## 七、检查清单（提交前自检）

- [ ] 前端有没有 `app.database()`？→ 删掉，改用 adminService
- [ ] 新云函数用了 `@cloudbase/node-sdk`？→ 是
- [ ] 返回格式是 `{ code, message, data }`？→ 是
- [ ] 组件用的 MUI + sx？→ 不是 className
- [ ] import 没有未使用的？→ `npm run build` 零 error
- [ ] 新文件命名符合规范？→ 对照 5.5 节
