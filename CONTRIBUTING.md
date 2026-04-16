# 🤝 贡献指南

感谢你愿意为无人机培训系统贡献代码！本文档将帮助你了解项目的开发流程和代码规范。

## 开发环境设置

### 必要条件

- Node.js >= 18.x
- npm >= 9.x
- Git
- CloudBase 账户（用于本地测试）

### 本地开发

```bash
# 1. Fork 项目
# 点击 GitHub 仓库右上角的 Fork 按钮

# 2. 克隆你的 Fork
git clone https://github.com/your-username/drone-training-system.git
cd drone-training-system

# 3. 添加上游仓库
git remote add upstream https://github.com/original-owner/drone-training-system.git

# 4. 安装依赖
npm install

# 5. 创建开发分支
git checkout -b feature/your-feature-name
```

## 分支管理

我们使用 Git Flow 分支模型：

```
main (生产环境)
  │
  ├── develop (开发分支)
  │     │
  │     ├── feature/xxx (功能分支)
  │     ├── fix/xxx (修复分支)
  │     └── docs/xxx (文档分支)
  │
  └── release/xxx (发布分支)
```

### 分支命名规范

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 功能 | `feature/功能描述` | `feature/course-review` |
| 修复 | `fix/问题描述` | `fix/login-redirect` |
| 文档 | `docs/文档类型` | `docs/api-reference` |
| 重构 | `refactor/模块` | `refactor/order-service` |

## 代码规范

### TypeScript 规范

```typescript
// ✅ 好的示例
interface Course {
  id: string;
  title: string;
  price: number;
  status: 'draft' | 'published';
}

async function getCourseById(id: string): Promise<Course | null> {
  try {
    const course = await courseService.getCourseById(id);
    return course;
  } catch (error) {
    console.error('获取课程失败:', error);
    return null;
  }
}

// ❌ 避免这样写
function getCourse(id: string) {
  return courseService.getCourseById(id);
}
```

### 文件命名

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `CourseCard.tsx` |
| 服务 | camelCase | `courseService.ts` |
| 工具函数 | camelCase | `formatDate.ts` |
| 类型定义 | PascalCase | `types/course.ts` |
| 测试 | `*.test.ts` | `courseService.test.ts` |

### 组件规范

```tsx
// ✅ 好的组件结构
interface Props {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<Props> = ({ title, onClose, children }) => {
  // hooks
  const { isOpen } = useModal();

  // handlers
  const handleBackdropClick = () => {
    if (isOpen) {
      onClose();
    }
  };

  return (
    <div onClick={handleBackdropClick}>
      <h2>{title}</h2>
      {children}
    </div>
  );
};

// ❌ 避免内联大量逻辑
export const BadModal = ({ title, onClose, items, onItemClick }) => (
  <div onClick={() => items.length > 0 && onClose()}>
    {items.map(item => (
      <div 
        key={item.id} 
        onClick={() => {
          const updated = [...items];
          updated.push(item);
          onItemClick(updated);
        }}
      >
        {item.name}
      </div>
    ))}
  </div>
);
```

### CSS/样式规范

使用 TailwindCSS 类名：

```tsx
// ✅ 好的示例
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
  提交
</button>

// ❌ 避免过度嵌套
<div className="container">
  <div className="card">
    <div className="card-body">
      <p className="card-text">内容</p>
    </div>
  </div>
</div>
```

## Git 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型标识

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具配置 |

### 提交示例

```bash
# ✅ 好的提交
git commit -m "feat(course): 添加课程评论功能

- 添加评论输入组件
- 集成评论 API
- 显示评论列表
- 支持回复功能

Closes #123"

git commit -m "fix(order): 修复订单状态更新失败问题

当订单状态为 pending 时，更新会失败。
现在正确处理 pending 状态下的更新逻辑。

Fixes #456"

# ❌ 避免这样提交
git commit -m "update code"
git commit -m "fix bug"
```

## Pull Request 流程

### 1. 保持同步

在开始新功能前，确保你的分支与上游同步：

```bash
git checkout develop
git fetch upstream
git merge upstream/develop
git push origin develop
```

### 2. 创建 PR

1. 推送你的分支到远程：
   ```bash
   git push origin feature/your-feature
   ```

2. 在 GitHub 创建 Pull Request
3. 填写 PR 模板

### 3. PR 模板

```markdown
## 描述
<!-- 请简要描述你的改动 -->

## 类型
- [ ] 新功能 (feature)
- [ ] Bug 修复 (fix)
- [ ] 文档更新 (docs)
- [ ] 代码重构 (refactor)
- [ ] 性能优化 (perf)
- [ ] 测试相关 (test)

## 测试
<!-- 请描述你测试过的场景 -->

- [ ] 已测试功能 A
- [ ] 已测试功能 B

## 截图（可选）
<!-- 如果有 UI 改动，请提供截图 -->

## Checklist
- [ ] 代码符合项目规范
- [ ] 已添加必要的测试
- [ ] 文档已更新（如有必要）
- [ ] 所有测试通过
```

### 4. Code Review

- 响应评审意见
- 及时更新代码
- 合并前确保所有评论已处理

## 测试规范

### 单元测试

```typescript
// src/services/__tests__/courseService.test.ts
describe('CourseService', () => {
  describe('getCourses', () => {
    it('should return paginated courses', async () => {
      const result = await courseService.getCourses({ page: 1, pageSize: 10 });
      expect(result.list).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by category', async () => {
      const result = await courseService.getCourses({ category: 'certificate' });
      result.list.forEach(course => {
        expect(course.category).toBe('certificate');
      });
    });
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并监听变化
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

## 文档要求

### 代码注释

```typescript
/**
 * 获取课程列表
 * @param params - 查询参数
 * @param params.category - 分类筛选
 * @param params.status - 状态筛选
 * @param params.page - 页码
 * @param params.pageSize - 每页数量
 * @returns 分页后的课程列表
 */
async function getCourses(params: QueryParams): Promise<PaginatedResult<Course>> {
  // 实现...
}
```

### 更新文档

如果你的改动涉及以下内容，请同步更新文档：

- API 接口变更 → 更新 `docs/API.md`
- 新增页面/路由 → 更新 `docs/ARCHITECTURE.md`
- 部署流程变更 → 更新 `docs/DEPLOYMENT.md`
- README 相关信息 → 更新 `README.md`

## 反馈与问题

如果你发现 Bug 或有新功能建议：

1. 先搜索 [Issues](https://github.com/your-repo/issues) 看是否已存在
2. 创建新 Issue 并选择合适的模板
3. 详细描述问题或建议

## 许可证

通过贡献代码，你同意将你的作品以 [MIT 许可证](LICENSE) 发布。

---

**感谢你的贡献！** 🎉
