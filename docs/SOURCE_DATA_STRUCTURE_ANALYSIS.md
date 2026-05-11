# 体系数据结构现状分析报告

## 一、集合关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据库集合关系                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────────────────┐   │
│  │   sources   │◄────►│ categories  │◄────►│        courses          │   │
│  └─────────────┘      └─────────────┘      └─────────────────────────┘   │
│       │                    │                        │                      │
│       │                    │                        │                      │
│       │                    ▼                        ▼                      │
│       │             ┌─────────────┐          ┌─────────────┐             │
│       └────────────►│   classes   │          │ page_configs│             │
│                     └─────────────┘          └─────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、当前数据结构（混乱状态）

### 2.1 sources 集合

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `_id` | string | 主键 | `"CAAC"` 或 `"e35392d069fc521f0152e2c2537e32ad"` |
| `code` | string | 体系代码 | `"CAAC"`, `"RENSHE"` |
| `name` | string | 显示名称 | `"CAAC民航局"`, `"人社培训"` |
| `icon` | string | 图标 | `"✈️"` |
| `levels` | array | 等级序列 | `["视距内驾驶员","超视距驾驶员","教员"]` |
| `status` | string | 状态 | `"active"` |
| `sortOrder` | number | 排序 | `1` |

**问题**: `_id` 格式不统一
- CAAC 的 `_id` 可能被初始化为 `"e35392d069fc521f0152e2c2537e32ad"`（旧格式）
- RENSHE 的 `_id` 可能被设置为 `"RENSHE"`

### 2.2 categories 集合

| 字段 | 类型 | 说明 | CAAC 示例 | RENSHE 示例 |
|------|------|------|-----------|-------------|
| `_id` | string | 主键 | `"ae0498ca69fc52380151cf9344ba694d"` | `"cat-drone"` |
| `sourceId` | string | 关联体系 | `"e35392d069fc521f0152e2c2537e32ad"` | `"RENSHE"` |
| `code` | string | 分类代码 | `"MULTI_ROTOR"` | `"cat-drone"` |
| `name` | string | 显示名称 | `"多旋翼"` | `"多旋翼"` |
| `status` | string | 状态 | `"active"` | `"active"` |

**问题**: 
1. CAAC 用 32 位 hash 作为 `_id`，RENSHE 用简化字符串
2. `sourceId` 格式不一致，导致无法精确匹配

### 2.3 courses 集合

| 字段 | 类型 | 说明 | CAAC 示例 | RENSHE 示例 |
|------|------|------|-----------|-------------|
| `_id` | string | 主键 | 自动生成 | 自动生成 |
| `title` | string | 课程标题 | `"多旋翼视距内驾驶员培训课程"` | `"多旋翼初级工培训"` |
| `sourceId` | string | 关联体系 | `"e35392d069fc521f0152e2c2537e32ad"` | `"RENSHE"` |
| `categoryId` | string | 关联分类 | `"ae0498ca69fc52380151cf9344ba694d"` | `"cat-drone"` |
| `category` | string | 分类名称 | `"多旋翼"` | `"多旋翼"` |
| `level` | string | 等级 | `"视距内驾驶员"` | `"初级工"` |
| `status` | string | 状态 | `"published"` | `"published"` |

---

## 三、核心问题定位

### 3.1 查询时的 sourceId 不匹配

**场景**: 小程序首页切换到 CAAC 体系

| 位置 | 使用的 sourceId | categories 集合中的 sourceId |
|------|----------------|----------------------------|
| index.ts | `"CAAC"` | `"e35392d069fc521f0152e2c2537e32ad"` |

**结果**: 查询不到任何分类！

### 3.2 旧代码的回退查询导致数据混淆

```typescript
// learning-path.ts 旧代码
const [courses, classes, allCoursesForCategory] = await Promise.all([
  SourceService.getCourses(sourceId, { categoryId }),
  SourceService.getClasses(sourceId, { categoryId }),
  SourceService.getCourses(sourceId, { category: categoryName }),  // 回退查询
])
const mergedCourses = this.mergeById(courses, allCoursesForCategory)  // 合并导致混淆
```

---

## 四、当前代码中的 ID 值

### 4.1 硬编码的 ID

```
CAAC 旧 sourceId:  "e35392d069fc521f0152e2c2537e32ad"
CAAC 多旋翼分类:    "ae0498ca69fc52380151cf9344ba694d"
CAAC 固定翼分类:    "ae0498ca69fc52380151cf9416b82e7b"
CAAC 直升机分类:    "ae0498ca69fc52380151cf9549195c14"
CAAC 垂直起降分类:  "ae0498ca69fc52380151cf9623c7aaa9"

RENSHE sourceId:    "RENSHE"
RENSHE 多旋翼:      "cat-drone"
RENSHE 固定翼:      "cat-fixedwing"
RENSHE 直升机:      "cat-helicopter"
RENSHE 垂直起降:    "cat-vtol"
```

---

## 五、解决方案

### 方案 A：统一 ID 格式（推荐）

```
sources._id:          "CAAC", "RENSHE", "NATIONAL_DEFENSE"
categories._id:      "CAAC:MULTI_ROTOR", "RENSHE:DRONE"
courses.categoryId:   "CAAC:MULTI_ROTOR", "RENSHE:DRONE"
```

### 方案 B：代码兼容处理（快速修复）

在代码中添加兼容逻辑，统一转换 ID 格式。

---

## 六、实施步骤

### 第一阶段：诊断确认
1. 创建诊断页面，查询数据库实际数据
2. 确认 sources/categories/courses 中的 ID 实际值
3. 确认 page_configs 中的配置数据

### 第二阶段：统一规范
1. 制定统一 ID 规范文档
2. 确定迁移方案
3. 编写迁移脚本

### 第三阶段：数据迁移
1. 备份现有数据
2. 执行数据迁移
3. 验证迁移结果

### 第四阶段：代码统一
1. 统一 SourceService.ts 查询逻辑
2. 统一 learning-path.ts 数据加载
3. 统一首页体系切换
4. 更新管理后台

### 第五阶段：测试验证
1. 测试 CAAC 体系多旋翼页面
2. 测试 RENSHE 体系多旋翼页面
3. 测试体系切换功能
4. 测试管理后台配置保存
