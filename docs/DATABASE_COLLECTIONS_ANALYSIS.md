# 数据库集合数据结构检查报告

## 受影响的集合分析

| 集合 | 是否有 sourceId | 是否有 categoryId | 是否有 level | 问题严重程度 |
|------|----------------|------------------|--------------|-------------|
| **sources** | - | - | - | ⚠️ _id 格式不统一 |
| **categories** | ⚠️ 格式混乱 | - | - | 🔴 核心问题 |
| **courses** | ⚠️ 格式混乱 | ⚠️ 格式混乱 | ✅ 已设置 | 🔴 核心问题 |
| **classes** | ⚠️ 格式混乱 | ⚠️ 格式混乱 | ⚠️ 已设置 | 🔴 核心问题 |
| **orders** | ❓ 未知 | ❓ 未知 | - | 🟡 待检查 |
| **enrollments** | ❓ 未知 | ❓ 未知 | - | 🟡 待检查 |
| **schedules** | ❓ 未知 | ❓ 未知 | - | 🟡 待检查 |
| **exams** | ❓ 未知 | ❓ 未知 | ⚠️ 已设置 | 🟡 待检查 |
| **questions** | - | ⚠️ 可能有 | - | 🟡 待检查 |
| **certificates** | ❓ 未知 | - | ⚠️ 可能有 | 🟡 待检查 |

---

## 问题分类

### 🔴 核心集合（必须修复）

这些集合直接影响体系/分类功能：

1. **sources**
   - 问题: `_id` 有时是 `"CAAC"`，有时是 32位hash
   - 影响: 所有关联查询都会失败

2. **categories**
   - 问题: `_id` 和 `sourceId` 格式混乱
   - 影响: 课程无法正确关联分类

3. **courses**
   - 问题: `sourceId` 和 `categoryId` 与 categories 不匹配
   - 影响: 用户看不到正确的课程

4. **classes**（培训班）
   - 问题: 同 courses
   - 影响: 用户看不到正确的培训班

### 🟡 关联集合（可能需要修复）

这些集合可能需要关联到体系：

5. **orders**（订单）
   - 如果订单需要区分体系来源
   - 可能的字段: `sourceId`

6. **enrollments**（报名记录）
   - 如果报名需要区分体系
   - 可能的字段: `sourceId`, `categoryId`

7. **exams**（考试）
   - 如果考试需要区分体系
   - 可能的字段: `sourceId`, `categoryId`, `level`

8. **questions**（题目）
   - 题库可能关联分类
   - 可能的字段: `categoryId`, `bankId`

9. **certificates**（证书）
   - 证书可能关联等级
   - 可能的字段: `level`, `sourceId`

---

## 各集合数据结构现状

### sources（体系）

```javascript
// 当前问题：_id 格式不统一
{
  _id: "CAAC",                    // 理想格式
  // 或
  _id: "e35392d069fc521f0152e2c2537e32ad",  // 旧格式
  
  code: "CAAC",
  name: "CAAC民航局",
  levels: ["视距内驾驶员", "超视距驾驶员", "教员"]
}
```

### categories（分类）

```javascript
// 当前问题：_id 和 sourceId 格式混乱
{
  _id: "ae0498ca69fc52380151cf9344ba694d",  // CAAC 多旋翼（32位hash）
  // 或
  _id: "cat-drone",                          // RENSHE 多旋翼（简化字符串）
  
  sourceId: "e35392d069fc521f0152e2c2537e32ad",  // 不匹配！
  // 或
  sourceId: "RENSHE",
  
  code: "MULTI_ROTOR",
  // 或
  code: "cat-drone",
  
  name: "多旋翼"
}
```

### courses（课程）

```javascript
// 当前问题：sourceId 和 categoryId 与 categories 不匹配
{
  _id: "...",
  title: "多旋翼视距内驾驶员培训",
  
  sourceId: "e35392d069fc521f0152e2c2537e32ad",  // CAAC hash
  // 但 categories._id 可能是 "CAAC:MULTI_ROTOR"
  
  categoryId: "ae0498ca69fc52380151cf9344ba694d",  // CAAC hash
  // 与 categories._id 匹配，但格式不统一
  
  level: "视距内驾驶员"
}
```

---

## 统一规范

### 所有集合统一使用

```javascript
// 体系标识
sourceId: "CAAC"          // sources._id = code

// 分类标识（新增统一格式）
categoryId: "CAAC:MULTI_ROTOR"  // categories._id = "{SOURCE}:{CODE}"
```

### 不再使用

```javascript
// ❌ 废弃这些格式
sourceId: "e35392d069fc521f0152e2c2537e32ad"  // 32位hash
categoryId: "cat-drone"                         // 简化字符串
categoryId: "ae0498ca69fc52380151cf9344ba694d" // 其他hash
```

---

## 修复优先级

| 优先级 | 集合 | 原因 |
|--------|------|------|
| P0 | sources, categories, courses, classes | 直接影响功能 |
| P1 | exams, questions | 考试题库可能需要区分体系 |
| P2 | orders, enrollments | 订单和报名可能需要统计 |
| P3 | 其他集合 | 暂不需要 |

---

## 结论

**需要修复的集合数量**: 4-10 个（取决于业务需求）

**核心问题**集中在：
1. sources._id 格式不统一
2. categories._id 和 sourceId 格式混乱
3. courses/classes 的 sourceId 和 categoryId 不匹配

**其他集合**（orders, enrollments 等）可能需要根据业务需求决定是否修复。
