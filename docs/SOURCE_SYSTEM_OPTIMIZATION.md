# 体系功能生产级优化文档

> 版本: v2.0  
> 更新日期: 2026-05-11

## 目录

1. [优化概述](#优化概述)
2. [核心优化点](#核心优化点)
3. [新增功能](#新增功能)
4. [数据迁移](#数据迁移)
5. [部署指南](#部署指南)
6. [API 参考](#api-参考)
7. [常见问题](#常见问题)

---

## 优化概述

本次优化针对无人机培训系统的「体系」功能模块进行生产级别重构，主要解决以下问题：

| 问题 | 优化方案 |
|------|----------|
| 请求频繁，无缓存 | 实现本地缓存 + 请求去重 |
| 错误处理不完善 | 统一错误类型 + 友好提示 |
| 空状态/加载状态缺失 | 骨架屏 + 状态管理 |
| 排序/显示配置繁琐 | 拖拽排序 + 批量操作 |
| 类型定义分散 | 统一类型定义文件 |

---

## 核心优化点

### 1. SourceService 缓存策略

```typescript
// 新增缓存管理
class SourceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pending = new Map<string, Promise<any>>()  // 请求去重

  get<T>(key: string): T | null { /* ... */ }
  set<T>(key: string, data: T, ttl?: number): void { /* ... */ }
  
  // 请求去重 - 防止同一请求并发发送
  async getOrSet<T>(key: string, factory: () => Promise<T>): Promise<T> { /* ... */ }
}
```

**缓存策略：**
- 默认缓存时间：5分钟
- 支持手动刷新：`forceRefresh: true`
- 支持按体系清除缓存：`clearCache(sourceId)`

### 2. 错误处理优化

```typescript
export class SourceServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'SourceServiceError'
  }
}

// 错误码定义
const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
} as const
```

### 3. 加载状态管理

```typescript
enum LoadState {
  IDLE = 'idle',      // 初始状态
  LOADING = 'loading', // 加载中
  SUCCESS = 'success', // 成功
  ERROR = 'error',    // 错误
  EMPTY = 'empty'     // 空数据
}
```

---

## 新增功能

### 1. 小程序端优化

#### 骨架屏
```typescript
// 切换体系时显示骨架屏
this.setData({ 
  skeletonVisible: true,
  currentSource: sourceKey,
  currentSourceId: sourceInfo.id
}, () => {
  this.loadData()
})
```

#### 空状态处理
```typescript
const isCoursesEmpty = !courses || courses.length === 0
const isClassesEmpty = !classes || classes.length === 0
const isPathsEmpty = !paths || paths.length === 0
```

#### 重试机制
```typescript
// 刷新数据（强制从服务器获取）
async refreshData() {
  await SourceService.refreshSourceData(this.data.currentSourceId)
  await this.loadData()
}
```

### 2. 管理后台优化

#### 拖拽排序 Hook
```typescript
import { useDragSort } from '@/components/admin/hooks/useDragSort'

const {
  items,
  draggedIndex,
  handleDragStart,
  handleDragEnter,
  handleDrop,
  handleDragEnd
} = useDragSort({
  items: configItems,
  onOrderChange: (newItems) => saveConfig(newItems)
})
```

#### 批量操作 Hook
```typescript
import { useBatchOperation } from '@/components/admin/hooks/useDragSort'

const {
  selectedIds,
  selectedCount,
  toggleSelect,
  selectAll,
  batchDelete,
  batchUpdate
} = useBatchOperation({
  items: configItems,
  onBatchDelete: async (ids) => deleteConfigs(ids)
})
```

---

## 数据迁移

### 迁移脚本

```bash
# 仅检查数据问题
node scripts/migrate-source-data.js

# 检查并自动修复
node scripts/migrate-source-data.js --fix

# 仅检查，不修改
node scripts/migrate-source-data.js --dry-run

# 详细日志
node scripts/migrate-source-data.js --verbose
```

### 迁移检查项

| 检查项 | 说明 |
|--------|------|
| sources | 校验 code, name, sortOrder, status |
| categories | 校验 code, name, sourceId |
| levels | 校验 code, name, sourceCode |
| courses | 校验 title, sourceId, categoryId |
| classes | 校验 name, sourceId, categoryId |
| 孤立数据 | 检查无对应父级的数据 |

### 迁移后初始化

脚本会自动初始化默认数据：
- 3个体系：CAAC、人社、国防
- 11个等级：按体系分类

---

## 部署指南

### 1. 小程序端部署

```bash
cd miniprogram

# 构建
npm run build

# 上传（使用微信开发者工具）
```

### 2. Web 管理端部署

```bash
cd src

# 构建
npm run build

# 部署到静态托管
```

### 3. 数据迁移

```bash
# 在服务器或本地执行迁移
node scripts/migrate-source-data.js --fix
```

### 4. 验证部署

1. 访问小程序首页
2. 检查体系 Tab 是否正常显示
3. 切换体系验证数据加载
4. 检查管理后台配置保存

---

## API 参考

### SourceService 方法

```typescript
// 获取体系列表（带缓存）
getSources(options?: { forceRefresh?: boolean }): Promise<Source[]>

// 获取体系详情
getSourceById(sourceId: string): Promise<Source | null>

// 获取分类列表
getCategories(sourceId: string, options?: { forceRefresh?: boolean }): Promise<Category[]>

// 获取课程列表
getCourses(sourceId: string, options?: { categoryId?: string; limit?: number }): Promise<Course[]>

// 获取培训班列表
getClasses(sourceId: string, options?: { categoryId?: string; limit?: number }): Promise<ClassItem[]>

// 获取页面配置
getPageConfig(sourceId: string, section: string): Promise<PageConfig | null>

// 保存页面配置
savePageConfig(sourceId: string, section: string, configData: any): Promise<{ success: boolean }>

// 批量保存配置项
saveConfigItems(sourceId: string, section: string, items: ConfigItem[]): Promise<{ success: boolean }>

// 清除缓存
clearCache(sourceId?: string): void

// 刷新数据
refreshSourceData(sourceId: string): Promise<void>

// 健康检查
healthCheck(): Promise<{ healthy: boolean; details: any }>
```

---

## 常见问题

### Q: 如何添加新的培训体系？

**方法一：通过管理后台**
1. 进入管理后台 → 体系管理
2. 点击「新增体系」
3. 填写 code, name, icon, description
4. 保存

**方法二：通过数据库**
```javascript
// 在 sources 集合添加
{
  code: 'NEW_SOURCE',
  name: '新培训体系',
  icon: '🆕',
  sortOrder: 4,
  status: 'active'
}
```

### Q: 如何配置某个体系的学习路径？

1. 进入管理后台 → 页面配置管理
2. 选择目标体系
3. 切换到「学习路径」Tab
4. 拖拽排序或切换显示/隐藏
5. 保存

### Q: 缓存不生效怎么办？

```typescript
// 强制刷新
await SourceService.getSources({ forceRefresh: true })

// 或清除所有缓存
SourceService.clearCache()

// 或清除特定体系缓存
SourceService.clearCache('source_xxx')
```

### Q: 如何回滚到旧版本？

```bash
# 使用 git 回滚
git checkout <旧版本commit>
```

---

## 更新日志

### v2.0 (2026-05-11)
- ✅ SourceService 缓存 + 请求去重
- ✅ 错误处理优化
- ✅ 小程序首页骨架屏
- ✅ 拖拽排序 Hook
- ✅ 批量操作 Hook
- ✅ 统一类型定义
- ✅ 数据迁移脚本
