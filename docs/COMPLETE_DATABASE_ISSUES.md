# 数据库所有集合问题完整清单

## 一、核心集合（直接影响体系功能）

| 集合 | 问题 | 严重程度 |
|------|------|---------|
| sources | `_id` 格式不统一 | 🔴 P0 |
| categories | `_id` 和 `sourceId` 混乱 | 🔴 P0 |
| courses | `sourceId` 和 `categoryId` 不匹配 | 🔴 P0 |
| classes | 同上 | 🔴 P0 |

---

## 二、用户相关集合（"我的课程"功能）

| 集合 | 问题 | 严重程度 |
|------|------|---------|
| **enrollments** | ❌ 没有 `sourceId` | 🔴 P1 |
| **course_permissions** | ❌ 没有 `sourceId` | 🔴 P1 |
| learning_progress | ❌ 没有 `sourceId` | 🟡 P2 |

### enrollments（报名记录）当前结构：
```javascript
{
  enrollmentNo: "ENR000001",
  courseId: "",           // ← 只有课程ID
  userId: "",
  status: "active"
  // ❌ 没有 sourceId
  // ❌ 没有 categoryId
}
```

**影响**:
- 无法直接查询"我在CAAC买了哪些课"
- 只能 courseId → courses → sourceId 间接获取
- 如果课程被删除，报名记录丢失上下文

### course_permissions（课程权限）当前结构：
```javascript
{
  type: "course" | "class",
  targetId: "",           // ← 只有目标ID
  userId: "",
  level: 1
  // ❌ 没有 sourceId
  // ❌ 没有 categoryId
}
```

**影响**:
- 无法直接查询"用户在CAAC的权限"
- 无法按体系统计权限数量

---

## 三、订单相关集合

| 集合 | 问题 | 严重程度 |
|------|------|---------|
| **orders** | items 中没有 `sourceId` | 🟡 P2 |

### orders（订单）当前结构：
```javascript
{
  orderNo: "ORD000001",
  items: [{
    courseId: "",
    productId: "",
    title: "",
    price: 0
    // ❌ 没有 sourceId
  }]
}
```

**影响**:
- 无法直接按体系统计营收
- 只能通过 courseId → courses → sourceId 获取

---

## 四、考试相关集合

| 集合 | 问题 | 严重程度 |
|------|------|---------|
| exams | 可能没有 `sourceId` | 🟡 P2 |
| questions | 可能没有 `categoryId` | 🟡 P2 |
| exam_results | 可能没有 `sourceId` | 🟡 P2 |

---

## 五、权限问题分析

### 当前权限架构问题

**场景1**: 查询"用户在CAAC的所有权限"
```
❌ 当前: course_permissions → targetId → courses → sourceId
✅ 应该: course_permissions 直接有 sourceId
```

**场景2**: "我的课程"页面
```
❌ 当前: enrollments → courseId → courses → sourceId
✅ 应该: enrollments 直接有 sourceId
```

**场景3**: 权限隔离
```
如果 CAAC 权限不能用于 RENSHE 课程：
- 需要在权限校验时检查 sourceId
- 当前架构无法实现
```

---

## 六、完整问题汇总表

| 集合 | 缺少 sourceId | 缺少 categoryId | 影响 |
|------|-------------|---------------|------|
| sources | ❌ 格式混乱 | - | 所有关联 |
| categories | ❌ 混乱 | - | 分类关联 |
| courses | ❌ 混乱 | ❌ 混乱 | 课程显示 |
| classes | ❌ 混乱 | ❌ 混乱 | 培训班显示 |
| enrollments | ❌ 缺少 | ❌ 缺少 | 我的课程 |
| course_permissions | ❌ 缺少 | ❌ 缺少 | 权限管理 |
| orders | ❌ 缺少 | ❌ 缺少 | 订单统计 |
| learning_progress | ❌ 缺少 | ❌ 缺少 | 学习统计 |
| exams | ❓ 可能缺 | ❓ 可能缺 | 考试管理 |
| questions | - | ❓ 可能缺 | 题库管理 |
| exam_results | ❓ 可能缺 | ❓ 可能缺 | 成绩统计 |
| certificates | ❓ 可能缺 | - | 证书管理 |

---

## 七、修复方案选择

### 方案A：最小修复（只修核心）
```
只修: sources, categories, courses, classes
工作量: 小
效果: 解决学习路径显示问题
```

### 方案B：推荐修复（修到用户层）
```
+ enrollments 添加 sourceId
+ course_permissions 添加 sourceId
+ orders.items 添加 sourceId
工作量: 中
效果: "我的课程"等功能可按体系统计
```

### 方案C：完整修复（修到统计层）
```
+ exams, questions, exam_results 添加 sourceId
+ learning_progress 添加 sourceId
+ certificates 添加 sourceId
工作量: 大
效果: 所有功能可按体系统计
```

---

## 八、需要你确认

1. **enrollments** 需要 `sourceId` 吗？（直接查"我的CAAC课程"）
2. **course_permissions** 需要 `sourceId` 吗？（按体系统计权限）
3. **orders** 需要 `sourceId` 吗？（按体系统计营收）
4. **exams/questions** 需要区分体系吗？（CAAC考试 vs RENSHE考试）
