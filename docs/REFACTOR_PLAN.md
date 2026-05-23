# 无人机培训系统 — 生产级架构统一方案

> 版本: v1.0 | 日期: 2026-05-23 | 作者: 基于完整代码审计生成

---

## 一、现状数据

| 指标 | 数值 |
|------|------|
| 前端数据库访问方式 | **6 种** |
| 云函数 SDK | **3 种**（`wx-server-sdk`、`tcb-admin-node`、双SDK动态选择） |
| 直接 `app.database()` 的文件 | **34 处** import |
| 使用 `adminService` 的文件 | **24 处** import |
| 使用 `cloudBaseService` 的文件 | **14 处** import |
| 全部 service 文件 | **59 个** |
| 云函数目录 | **27 个**（含 2 个空目录） |
| 有编译错误的文件 | **8 个** |

---

## 二、架构原则（不可妥协）

### 原则 1：云函数是唯一的数据入口
> 前端不直接操作数据库。所有 CRUD 操作必须经过云函数。

### 原则 2：按操作类型选择调用方式

| 操作类型 | 调用方式 | 说明 |
|----------|---------|------|
| **数据库 CRUD** | HTTP → 云函数 | 统一走 `db-init` 或领域云函数 |
| **用户认证** | CloudBase SDK | 匿名登录、手机号登录保留 SDK |
| **云存储上传** | CloudBase SDK | 文件直传更快，不受此规则限制 |
| **实时数据（如有）** | CloudBase SDK | watch() 能力云函数做不到 |

### 原则 3：四个端共享同一套云函数 API
> Web 客户端、Web 管理后台、小程序都调同一批云函数，参数和返回值约定一致。

### 原则 4：增量迁移，每次提交可独立回滚
> 每个 commit 只改一个模块，不出现"改一半没法用"的状态。

---

## 三、目标架构

```
┌──────────────────────────────────────────────────┐
│  前端三端                                          │
│                                                    │
│  Web 客户端      Web 管理后台      微信小程序        │
│  ┌─────────┐    ┌─────────┐     ┌──────────┐      │
│  │SDK(认证)│    │SDK(认证)│     │wx.request│      │
│  │HTTP(数据)│   │HTTP(数据)│    │HTTP(数据) │      │
│  └────┬────┘    └────┬────┘     └────┬─────┘      │
│       │              │               │             │
└───────┼──────────────┼───────────────┼─────────────┘
        │              │               │
        ▼              ▼               ▼
┌──────────────────────────────────────────────────┐
│  云函数层（统一 @cloudbase/node-sdk + Node 18）     │
│                                                    │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ db-init │  │ api-xxx  │  │ domain functions │ │
│  │通用CRUD │  │各模块API  │  │ 业务逻辑云函数     │ │
│  └────┬────┘  └────┬─────┘  └────────┬─────────┘ │
│       │            │                │             │
└───────┼────────────┼────────────────┼─────────────┘
        │            │                │
        ▼            ▼                ▼
┌──────────────────────────────────────────────────┐
│              CloudBase 数据库                      │
└──────────────────────────────────────────────────┘
```

---

## 四、分阶段执行计划

### 阶段 0：Git 安全网（5 分钟）

```bash
git add -A && git commit -m "chore: 重构前保存现场"
git push origin main
```

---

### 阶段 1：修复功能 Bug（预计 2 天）

**目标**：修复编译报错，让所有管理页面能正常运行。不动架构。

#### 1.1 `AdminRegistrations.tsx`（报名管理）

| 问题 | 修复方式 |
|------|---------|
| `'confirmed'` 不属于状态类型 | 改为 `'active'` |
| `rejectedReason` 字段不存在 | 从 `Partial<Enrollment>` 中移除或添加该字段 |
| 状态比较 `'cancelled'` 类型不匹配 | 统一状态枚举 |

#### 1.2 `AdminFinance.tsx`（财务管理）

| 问题 | 修复方式 |
|------|---------|
| `apiKey` 字段缺失 | `setState` 时补充 `apiKey` 默认值 |
| Alert `type` 类型不匹配 | 改为 `'danger'` 替代 `'error'`，`'info'` 替代 `'success'` |

#### 1.3 `AdminTransfers.tsx`（转班管理）

| 问题 | 修复方式 |
|------|---------|
| 访问不存在的 `.data` 属性 | 检查返回值结构，调整解构方式 |

#### 1.4 `AdminClassOrders.tsx`、`CommentManagement.tsx`、`AdminCourseOrders.tsx`

| 问题 | 修复方式 |
|------|---------|
| 未使用的 import/变量 | 删除未使用的导入和变量声明 |

#### 1.5 `CouponManagement.tsx`

| 问题 | 修复方式 |
|------|---------|
| 类型比较错误 `'discount'` vs `'free'` | 统一优惠券类型枚举 |

#### 阶段 1 验收标准
- [ ] `npm run build` 零 error
- [ ] 8 个报错页面在管理后台能正常打开和基本操作

#### 阶段 1 回滚
```bash
git revert <commit-hash>
```

---

### 阶段 2：统一云函数层（预计 3 天）

**目标**：所有云函数使用同一个 SDK、同一个 runtime、同一套响应格式。

#### 2.1 清理废弃云函数

| 目录 | 操作 |
|------|------|
| `fix-orders/` | 删除（空目录） |
| `fix-permissions/` | 删除（空目录） |
| `cloudfunctions-zip/` | 删除（zip 归档） |

#### 2.2 统一响应格式

所有云函数返回：

```typescript
{
  code: number,      // 0 = 成功
  message: string,   // 提示信息
  data?: any,        // 数据
  requestId?: string // 请求追踪
}
```

`db-init` 已经是这个格式，其他云函数对齐即可。

#### 2.3 统一 SDK & Runtime

| 当前 SDK | 改为 |
|----------|------|
| `wx-server-sdk` | `@cloudbase/node-sdk` |
| `tcb-admin-node`（旧版） | `@cloudbase/node-sdk` |
| 双 SDK 动态选择 | `@cloudbase/node-sdk` 单一入口 |

```javascript
// 统一初始化方式
const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
```

#### 2.4 批量更新清单

按优先级排列：

| 优先级 | 云函数 | 当前 SDK | 补充说明 |
|--------|--------|---------|---------|
| P0 | `db-init` | tcb-admin-node | ✅ 已是最新 |
| P0 | `api-admin` | wx-server-sdk | 管理后台核心 API |
| P0 | `api-auth` | 双 SDK | 认证服务 |
| P1 | `api-course` | 双 SDK | 课程服务 |
| P1 | `api-exam` | 双 SDK | 考试服务 |
| P1 | `api-order` | 双 SDK | 订单服务 |
| P1 | `api-user` | 双 SDK | Node >= 18 已满足 |
| P2 | `admin`、`admin-http` | tcb-admin-node | 旧版 admin |
| P2 | `api-home` | 双 SDK | 首页聚合 |
| P2 | `api-training` | 双 SDK | 培训服务 |
| P2 | `api-shop` | 双 SDK | 商城服务 |
| P2 | `api-pay` | 双 SDK | 支付服务 |
| P3 | `mobile-*` 系列 | tcb-admin-node | 移动端备用 |
| P3 | `api-upload` | tcb-admin-node | 文件上传 |
| P3 | `submit-exam` | wx-server-sdk | 考试提交 |

#### 阶段 2 验收标准
- [ ] 所有云函数使用 `@cloudbase/node-sdk`
- [ ] 所有云函数 Runtime 为 Node 18
- [ ] `db-init` ping 测试正常
- [ ] 小程序端功能不受影响
- [ ] Web 管理后台功能不受影响

---

### 阶段 3：统一前端数据访问层（预计 5 天）

**目标**：前端只保留一种 HTTP 调用方式，砍掉所有 `app.database()` 直接操作。

**选择标准**：选用 `adminService`（HTTP → db-init），理由：
1. 已经被 24 个文件使用，迁移成本最小
2. 与小程序 `wx.request` 模式一致
3. 已经验证过 query/add/update/delete 功能正常（阶段 2 已统一）

#### 3.1 迁移策略：逐个 Service 替换

每个 Service 的迁移步骤：
1. 找到该 Service 的所有数据库操作
2. 用 `adminService.list/get/add/update/delete` 替换
3. 确保调用方不需要改接口
4. 提交、验证、继续下一个

#### 3.2 迁移清单（按影响范围从小到大）

| 序号 | 文件 | 当前方式 | 改动复杂度 | 
|:--:|------|---------|:--:|
| 1 | `siteConfigService.ts` | 直接 SDK | ⭐ |
| 2 | `systemConfigService.ts` | 直接 SDK | ⭐ |
| 3 | `pageConfigService.ts` | 直接 SDK | ⭐ |
| 4 | `dictionaryService.ts` | 直接 SDK | ⭐⭐ |
| 5 | `membersService.ts` | 直接 SDK | ⭐⭐ |
| 6 | `authService.ts` | 直接 SDK | ⭐⭐ |
| 7 | `wechatPayService.ts` | 直接 SDK | ⭐ |
| 8 | `storageService.ts` | 直接 SDK | ⭐ |
| 9 | `webApi.ts` | 直接 SDK | ⭐ |
| 10 | `featureApi.ts` | 直接 SDK | ⭐⭐ |
| 11 | `CloudCourseService.ts` | 直接 SDK | ⭐⭐ |
| 12 | `coupon.ts` | 直接 SDK | ⭐⭐⭐ |
| 13 | `groupBuy.ts` | 直接 SDK | ⭐⭐⭐ |
| 14 | `flashSale.ts` | 直接 SDK | ⭐⭐⭐ |
| 15 | `progress.ts` | 直接 SDK | ⭐⭐ |
| 16 | `cart.ts` | 直接 SDK | ⭐ |
| 17 | `examService.ts` | 混合（最严重） | ⭐⭐⭐⭐⭐ |
| 18 | `database.ts` | 混合 | ⭐⭐⭐⭐ |
| 19 | `coursePermission.ts` | 混合 | ⭐⭐⭐ |
| 20 | `core/BaseService.ts` | `@/config/tcb` | ⭐⭐⭐ |
| 21 | `core/ApiClient.ts` | `@/config/tcb` | ⭐⭐⭐ |
| 22 | `userRoleService.ts` | `@/config/tcb` | ⭐⭐ |

**cloudBaseService 系文件**（`CloudProgressService`、`CloudMessageService` 等共 10 个）：这些封装层本身会被废弃，改为直接调 `adminService`。

#### 3.3 每个迁移的验收标准
- [ ] 原功能不受影响
- [ ] 不引入新的 TypeScript 错误
- [ ] Git commit 独立可回滚

#### 阶段 3 验收标准
- [ ] `src/` 下零 `app.database()` 调用（认证和存储除外）
- [ ] `src/` 下零 `@/config/tcb` 直接数据库操作
- [ ] `npm run build` 零 error
- [ ] 管理后台所有页面功能正常

---

### 阶段 4：清理重复 Service（预计 2 天）

#### 4.1 合并清单

| 保留 | 废弃 | 原因 |
|------|------|------|
| `adminService.ts` | `CloudAdminService.ts` | 前者更简洁，已被最多文件使用 |
| `adminService.ts` | `CloudDBService.ts` | 功能重复，都是 HTTP 到 db-init |
| `enrollmentService.ts` | `registrationService.ts` | 合并为统一的报名服务 |
| `pageConfigService.ts` | `featuredCourseService.ts` | 合并到 pageConfigService |

#### 4.2 废弃 cloudBaseService.ts 体系

`cloudBaseService.ts` + 其 10 个消费者全部改为直接调 `adminService`。

#### 4.3 删除未使用的 Service

检查每个 service 的 import 次数，零引用的直接删除。

#### 阶段 4 验收标准
- [ ] Service 文件从 59 个减少到 ~35 个
- [ ] 无重复功能的 service
- [ ] 所有 import 路径有效

---

### 阶段 5：代码规范收尾（预计 2 天）

#### 5.1 统一错误处理

```typescript
// 统一模式
try {
  const result = await adminService.list('collection', query)
  if (result.code !== 0) throw new Error(result.message)
  // 处理数据
} catch (error) {
  // 统一错误提示
}
```

#### 5.2 统一查询条件写法

```typescript
// 所有查询条件用此格式
adminService.list('collection', { field: value, status: 'active' })
// 不再出现 db.command、{ 'data.field': value } 等写法
```

#### 5.3 TypeScript 严格模式

- 补全类型定义，减少 `any`
- 开启 `strict: true`（逐步）

#### 5.4 批量更新 BUILD_VERSION

每次重构完成后更新版本号并部署验证。

---

## 五、风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:--:|:--:|---------|
| 迁移后功能异常 | 中 | 高 | 每次只改一个 service，独立 commit，随时回滚 |
| 小程序受影响 | 低 | 高 | 小程序走独立云函数，阶段 2 重点验证 |
| 认证失效 | 低 | 高 | 认证保留 SDK，不动 |
| 构建失败 | 低 | 中 | 每次改完立即 `npm run build` |
| 性能下降 | 低 | 中 | HTTP 调用有网络开销，但 db-init 已经验证性能可接受 |

---

## 六、执行节奏建议

```
Week 1: 阶段 1（修 Bug） + 阶段 2 前一半（P0 云函数）
Week 2: 阶段 2 后一半（P1/P2 云函数） + 阶段 3 前 10 个 service
Week 3: 阶段 3 后 12 个 service + 阶段 4（清理）
Week 4: 阶段 5（规范收尾） + 全量回归测试
```

---

## 七、不在本次范围内的

- 小程序代码重构（已经相对统一）
- UI 翻新（独立项目）
- 数据库索引优化（独立项目）
- 单元测试补充（后续单独做）
