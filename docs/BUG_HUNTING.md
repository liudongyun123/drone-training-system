# Bug 排查与预防方法论（BUG_HUNTING）

> 适用：无人机培训系统（CloudBase，HTTP 云函数网关 + Web 静态托管 + 微信小程序）
> 目的：把"写端/读端不一致""契约缺口""类型错误"等可静态探测的 bug，用一套关卡快速找出来；
>       并明确哪些 bug 只能靠运行时/人工验证。

---

## 一、核心 bug 模式（本项目反复踩的坑）

### 1. 状态枚举分裂（写端 ≠ 读端）
同一张集合，后台"写入端"和前端"读取端"用了不一致的状态枚举，数据写进去了但前端过滤不到。

- **案例**：`notices` 集合规范状态是 `published`/`draft`/`expired`（前端 `CloudNoticeService.getPublishedNotices` 按 `status:'published'` 过滤），但内容配置模块公告 Tab 复用通用 `active`/`inactive` 开关写入 `active` → 公告在前端"消失"。
- **修复**：写入端统一用 `published`/`draft`；存量数据用 `scripts/db-migration/normalize-notices-status.js` 归一（`active→published`、`inactive→draft`）。
- **项目状态枚举三大家族**：
  - `active`/`inactive`/`disabled`/`banned`：`users`、`members`、`teachers`、`categories`、`banners`
  - `published`/`draft`/`archived`/`expired`：`courses`、`classes`、`learningPaths`、`notices`
  - `paid`/`completed`/`paid_offline`/`pending`/`refunded`：`orders`（已收款集合 `PAID_STATUSES = ['paid','completed','paid_offline']`）

### 2. 契约缺口（前端调用了云函数没实现的 action）
前端/小程序调用 `(api-x, action)`，但 `cloudfunctions/api-x/index.js` 的 dispatch 没声明该 action → 运行时静默失败。

- **案例**：`api-upload` 通用上传 action 是 `uploadFile`（不是 `upload`），Web 契约管理与小程序合同签署曾误用 `upload`。

### 3. 字段名不一致
读写两端字段名对不上（读 `noticeType`，写 `type`）。

- **案例**：公告需同时写 `noticeType` 与 `type`；订单金额字段 `finalAmount`/`totalAmount`/`amount`/`totalPrice` 需 `getOrderAmount` 统一兼容。

### 4. 逻辑/业务规则矛盾（静态扫不出）
代码能跑、编译通过，但业务规则自相矛盾。

- **案例 A（api-order 重复下单拦截）**：`createOrder` 把 `pending` 订单也算"已购买"，一次支付失败后残留 pending 永久拦截重新购买。修复：仅拦截 `['paid','completed','paid_offline']`，下单前清理遗留 pending。
- **案例 B（api-order 退款审核）**：`approveRefundAction` 无条件调微信退款 API，对 `paid_offline`（无微信交易）订单必失败 → 退款永远审不过。修复：线下/无证书时本地置 `refunded` 跳过微信调用。

### 5. 孤儿引用 / 主键完整性
文档外键指向不存在的 `_id`。注意：**用户标识字段（phone/编码）不是外键**，不能当 `_id` 引用判孤儿（见 `api-datacheck` SKIP_FIELDS）。

---

## 二、自动探测关卡（一键体检）

运行 `node scripts/health-check.mjs`（支持 `--mp` 纳入小程序、`--quiet` 精简输出），依次跑：

| 关卡 | 脚本 | 抓哪类 | 严重级 |
|---|---|---|---|
| 云函数契约自检 | `scripts/check-contract.mjs` | 契约缺口（模式 2） | FAIL（确属 bug） |
| 状态枚举一致性 | `scripts/check-status-enum.mjs` | 枚举分裂（模式 1） | WARN（需复核） |
| 类型回归门禁 | `scripts/type-check-gate.mjs` | 新增类型错误（模式 3） | FAIL（防回归） |

另：`api-datacheck` 云函数 + 每周一 03:00 定时 + 后台 `/admin/data-fix` 覆盖模式 5。

### 状态枚举扫描原理（避免误报）
`check-status-enum.mjs` 用**窗口邻近（±250 字符）**把状态字面量归并到集合名引用，排除 `collections.ts`/`Layout.tsx` 等跨集合汇总文件干扰。当某集合同时出现 A 族（`active`/`inactive`/`disabled`/`banned`）与 B 族（`published`/`draft`/`expired`）即列为候选。**候选需人工复核**——典型误报：
- `courses`：窗口把 `coursePermission.ts` 里邻近的 `course_permissions` 查询（`status:['active']`）误归并，`courses` 自身读/写都是 `published`/`draft` 族，安全。
- `course_permissions`：`expired` 是视频权限到期字段，非生命周期状态，安全。
- `coupons`：`active`/`disabled`/`expired` 是同一套连贯生命周期枚举（`active→expired` 过期流转），`expired` 本就是券状态，安全。

---

## 三、逻辑/业务类 bug 的找法（静态扫不出）

1. **逐一审云函数核心分支**：重点 `api-order`、`api-shop`（已合并 mobile-learning）、`api-course`、`api-user`。检查"前置校验"和"副作用"是否对**所有状态分支**成立（如线下订单不能走微信退款）。
2. **E2E 端到端走查**：项目已有 `e2e/`（Playwright）。补"购买→支付→报名→退款""课程视频权限开关"等用例，最能炸出逻辑 bug。
3. **手动走查读端过滤条件**：每个前端 service 的 `list(..., { status:'xxx' })` 都要和写端实际写入的值对得上（本次 notices 即漏于此）。

---

## 四、上线前标准动作

1. 跑 `node scripts/health-check.mjs` → 0 FAIL。
2. `node scripts/check-status-enum.mjs --mp` 复核候选（必要时 `--mp` 纳入小程序）。
3. 若有历史脏数据，跑对应 `scripts/db-migration/normalize-*.js --dry-run` 先看规模，再真实执行。
4. Web 前端改动需在可联网环境 `node build-and-deploy.sh` 部署静态托管（本沙箱 COS DNS 常被卡，需本地/CI 环境）。
5. 逻辑改动补 e2e 用例覆盖关键流程。
