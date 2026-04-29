# 代码质量标准

## 一、TypeScript 类型安全

### 1.1 禁止 any

```typescript
// ❌ 错误
function process(data: any) { ... }

// ✅ 正确
interface ProcessData {
  id: string
  name: string
}
function process(data: ProcessData) { ... }
```

### 1.2 明确返回类型

```typescript
// ✅ 公共函数必须标注返回类型
export function getCourse(id: string): Promise<Course | null> { ... }

// ✅ 内部函数可以省略（TypeScript 推断）
const helper = (x: number) => x * 2
```

### 1.3 类型导入

```typescript
// ✅ 使用 type 关键字导入类型
import type { Course, Lesson } from '@/shared/types'

// ✅ 混合导入
import { courseApi } from '@/shared/services'
import type { Course } from '@/shared/types'
```

## 二、React 最佳实践

### 2.1 useEffect 清理

```typescript
// ✅ 副作用必须清理
useEffect(() => {
  const controller = new AbortController()
  
  fetchCourses({ signal: controller.signal })
  
  return () => controller.abort()
}, [])

// ✅ 定时器清理
useEffect(() => {
  const timer = setInterval(pollStatus, 5000)
  return () => clearInterval(timer)
}, [])

// ✅ 事件监听清理
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth)
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

### 2.2 组件拆分标准

| 行数 | 处理方式 |
|------|----------|
| < 200 | 合格 |
| 200-500 | 可接受，建议拆分 |
| 500-1000 | 警告，必须拆分 |
| > 1000 | 紧急，立即重构 |

### 2.3 状态管理原则

```typescript
// ✅ 组件局部状态
const [open, setOpen] = useState(false)

// ✅ 跨组件共享状态 → Zustand
const { user, login } = useAuthStore()

// ✅ 服务端状态 → 不需要额外状态管理，直接用 API
const { data, isLoading } = useQuery(['courses'], courseApi.getList)
```

## 三、代码组织

### 3.1 文件结构

```
ComponentName/
├── index.tsx          # 组件入口
├── ComponentName.tsx  # 主组件
├── hooks.ts           # 组件专用 hooks
├── utils.ts           # 组件专用工具函数
├── types.ts           # 类型定义
├── constants.ts       # 常量
└── ComponentName.test.tsx  # 测试
```

### 3.2 导出规范

```typescript
// ✅ 具名导出
export function MyComponent() { ... }
export const MyHelper = () => { ... }

// ✅ 类型导出
export type { MyComponentProps }
export type { MyData }
```

## 四、性能标准

### 4.1 Bundle 大小

| Chunk | 限制 |
|-------|------|
| 单个 chunk | < 500KB |
| 首屏加载 | < 200KB (gzip) |
| 懒加载 chunk | < 100KB (gzip) |

### 4.2 渲染性能

- 列表项 > 50 条：使用虚拟滚动
- 复杂计算：使用 useMemo
- 回调函数：使用 useCallback

### 4.3 网络请求

- 列表分页：pageSize <= 20
- 图片：使用 WebP 格式，< 200KB
- 接口响应：使用缓存策略

## 五、测试标准

### 5.1 覆盖率要求

| 类型 | 最低覆盖率 |
|------|-----------|
| 共用层 (shared/) | 80% |
| 业务组件 | 50% |
| 工具函数 | 90% |

### 5.2 测试用例要求

每个测试文件必须包含：
- 正常流程测试
- 边界情况测试
- 错误处理测试

## 六、文档标准

### 6.1 函数注释

```typescript
/**
 * 获取课程列表
 * @param filters 筛选条件
 * @param page 页码（从 1 开始）
 * @param pageSize 每页数量
 * @returns 分页课程列表
 * @throws {Error} 当网络请求失败时
 * @example
 * const { courses, total } = await courseApi.getList({ status: 'published' }, 1, 10)
 */
export async function getList(
  filters?: CourseFilters,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Course>> { ... }
```

### 6.2 组件注释

```typescript
/**
 * 课程卡片组件
 * 
 * @example
 * <CourseCard 
 *   course={course} 
 *   showProgress={true}
 *   onClick={(id) => navigate(`/course/${id}`)}
 * />
 */
```

## 七、安全标准

### 7.1 输入验证

```typescript
// ✅ 所有用户输入必须验证
const schema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  name: z.string().min(2).max(20),
  email: z.string().email().optional()
})

function handleSubmit(data: unknown) {
  const validated = schema.parse(data) // 类型安全
}
```

### 7.2 敏感信息

```typescript
// ❌ 禁止前端存储敏感信息
localStorage.setItem('token', token)  // 仅存储非敏感 token
localStorage.setItem('password', pwd) // ❌ 绝对禁止

// ✅ 敏感操作需要二次验证
async function changePassword(oldPwd: string, newPwd: string) {
  // 需要验证旧密码
}
```

## 八、Git 提交规范

### 8.1 Commit Message

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `docs`: 文档
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(course): 添加课程收藏功能

- 新增收藏按钮组件
- 集成收藏 API
- 添加收藏列表页面

Closes #123
```

### 8.2 PR 检查清单

- [ ] 代码通过 TypeScript 检查
- [ ] 代码通过 ESLint 检查
- [ ] 单元测试通过
- [ ] 新功能有对应测试
- [ ] 文档已更新
- [ ] 无敏感信息泄露