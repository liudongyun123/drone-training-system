# 数据库重构报告

> 日期: 2026-05-01
> 状态: Schema定义完成，迁移脚本就绪，待执行

---

## 一、变更概览

| 项目 | 数量 |
|------|------|
| 新集合 | 3个（products, notices, messages, users） |
| 重命名集合 | 7个 |
| 合并集合 | 6个（三合一用户表等） |
| 保留不变 | 8个 |
| 新建文件 | 7个 |

---

## 二、迁移执行顺序

```
步骤1: init-new-collections.js
  → 创建 users, products, notices, messages 集合
  → 插入示例数据

步骤2: rename-collections.js
  → course_categories → categories
  → learning_progress → progress
  → examAttempts → exam_attempts
  → questionBanks → question_banks
  → practiceRecords → practice_records
  → attendance_records → attendance
  → course_schedules → schedules

步骤3: migrate-users.js
  → members + students + user_profiles → users

步骤4: migrate-orders.js
  → 统一订单格式，添加 type/items 字段

步骤5: 手动操作
  → 在 CloudBase 控制台创建索引
  → 确认数据正确后删除旧集合
```

---

## 三、新建文件清单

| 文件 | 说明 |
|------|------|
| `docs/new-database-schema.md` | 完整数据库Schema定义 |
| `src/types/models.ts` | TypeScript类型定义（含旧字段兼容） |
| `src/utils/collections.ts` | 集合名称常量 + 旧名映射 |
| `scripts/db-migration/init-new-collections.js` | 创建新集合 |
| `scripts/db-migration/rename-collections.js` | 集合重命名 |
| `scripts/db-migration/migrate-users.js` | 用户数据合并 |
| `scripts/db-migration/migrate-orders.js` | 订单格式统一 |

---

## 四、需要前端适配的改动

### 4.1 集合名称变更

```typescript
// 旧代码
db.collection('members').where(...)
db.collection('examAttempts').where(...)

// 新代码
import { COLLECTIONS } from '@/utils/collections'
db.collection(COLLECTIONS.USERS).where(...)
db.collection(COLLECTIONS.EXAM_ATTEMPTS).where(...)
```

### 4.2 字段名称变更

| 旧字段 | 新字段 | 影响范围 |
|--------|--------|----------|
| `name`(课程) | `title` | 课程列表、详情、搜索 |
| `coverImage` | `cover` | 所有带封面的组件 |
| `examAttempts` | `exam_attempts` | 考试模块服务 |
| `questionBanks` | `question_banks` | 题库模块 |

### 4.3 订单类型区分

```typescript
// 旧代码 - 混在一起
const orders = await db.collection('orders').where({ userId }).get()

// 新代码 - 按类型筛选
const courseOrders = await db.collection('orders')
  .where({ userId, type: 'course' })
  .get()
const classOrders = await db.collection('orders')
  .where({ userId, type: 'class' })
  .get()
const productOrders = await db.collection('orders')
  .where({ userId, type: 'product' })
  .get()
```

### 4.4 小程序适配

小程序中硬编码的集合名称需要同步更新：
```
miniprogram/pages/ 和 miniprogram/utils/ 中的:
  'members' → 'users'
  'examAttempts' → 'exam_attempts'
  'questionBanks' → 'question_banks'
  'practiceRecords' → 'practice_records'
```

---

## 五、需要云函数适配的改动

| 云函数 | 改动点 |
|--------|--------|
| api-auth | 写入 users 而非 members |
| api-course | collection('courses') 字段名统一 |
| api-exam | questionBanks → question_banks |
| api-training | course_schedules → schedules |
| api-shop | 新增 products 集合操作 |
| api-admin | 通用CRUD的集合名映射 |

---

## 六、风险与回滚

### 风险点
1. **索引创建需要手动操作** — CloudBase控制台不支持脚本创建
2. **迁移期间双写** — 旧代码和新代码可能同时写不同集合
3. **小程序发版延迟** — 小程序需要审核，无法即时切换

### 回滚方案
- 旧集合数据不删除（只是复制到新集合）
- 类型定义保留了旧字段（@deprecated）
- 集合名称映射函数 `normalizeCollection()` 可快速切回旧名

---

## 七、后续TODO

- [ ] 在CloudBase控制台执行迁移脚本
- [ ] 创建数据库索引
- [ ] 更新云函数中的集合引用
- [ ] 更新小程序中的集合引用
- [ ] 前端组件逐步适配新字段名
- [ ] 确认稳定后删除旧集合
