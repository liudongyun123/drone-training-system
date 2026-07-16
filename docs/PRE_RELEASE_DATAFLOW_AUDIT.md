# 上线前测试报告（第二轮）：数据流流通 · 前后端互联互通 · 功能完整性

> 生成时间：2026-07-15 13:00
> 本轮重点：**数据流调用链路、前后端互联互通、功能完整性**（区别于首轮的构建/类型/契约泛检）
> 结论：**核心数据流与互联互通整体健康，无阻断性缺陷；发现 1 处架构违规（考试记录双写路径）与若干待清理项。**

---

## 一、自动化测试复跑结果（全部通过）

| 测试项 | 命令 | 结果 |
|---|---|---|
| 前后端契约自检 | `node scripts/check-contract.mjs` | ✅ **0 缺口**（80 唯一 (函数,action) 契约一致，退出码 0） |
| 单元 / 集成测试 | `npm run test:run` | ✅ **200/200**（9 文件） |
| 完整端到端测试 | `npx playwright test --project="Desktop Chrome"` | ✅ **77/77**（01-09 功能流 + 19 模块冒烟） |
| 生产构建 | `npm run build` | ✅ 通过（chunk 优化见首轮报告） |

> E2E 77 用例覆盖登录、课程/学员/订单/退款/考试/消息等核心链路，且全部命中**真实 CloudBase 后端**，是"前后端互联互通"的最强实证。

---

## 二、数据流 / 互联互通专项审计

### ✅ 2.1 集合层连通（前端 50 ↔ 后端 78）
- 前端经 `adminService` 访问 **50** 个集合；后端云函数访问 **78** 个集合。
- 前端有 **18** 个集合（`chapters`、`class_schedules`、`registrations`、`practiceRecords`、`wrongQuestions`、`teacher_profiles`、`user_profiles` 等）在后端无字面 `db.collection('x')` 引用 —— 经核查均由 **`/db-init` 通用 CRUD**（action=query/add/update/delete，带 `collection` 参数动态分发）处理，**数据层连通正常**，非断点。
- 后端有 **30** 个集合前端未直接访问：其中 `refundRequests`、`exam_results`、`contracts`、`coupon_templates`、`courseProgress` 等为业务云函数写入侧（订单/考试/合同/营销），前端经对应 Service 间接访问；其余见 §2.4。

### ✅ 2.2 退款链路一致性（重点复核，已排除误报）
- `api-order`：`createRefundRequest` 写 `refundRequests`(status:pending) 并镜像 `orders.refundStatus`；`approveRefund`/`rejectRefund` 双向更新两集合。
- `financeService.getRefundList` 读 `refundRequests`；`AdminRefundManagement` 经 `getRefundList`→`approveRefund`→`rejectRefund` 闭环。
- **结论**：`refundRequests` 是退款队列单一真相源，`orders` 镜像状态，三端一致。**此前"退款只存 orders"的记忆已过时，当前设计自洽，非缺陷。**

### ⚠️ 2.3 架构违规：考试记录双写路径（P2）
- `src/web/pages/practice/ExamResultPage.tsx` 通过 `cloudBaseService.getDb()` **直连 CloudBase SDK** 读写 `examAttempts`（第 55/126/146 行）。
- 而 `examService.ts`、`membersService.ts`、`database.ts` 的 `examAttemptService` 均走 `adminService`→`/db-init` 云函数路径。
- **风险**：同一集合存在两条数据访问路径；SDK 直连与云函数路径的权限模型/身份不同，长期易产生数据不一致与排查困难，违反 `CONVENTIONS §1.1`（前端禁写数据库）。
- **建议**：`ExamResultPage` 改为调用 `examAttemptService`（database.ts）或 `examService` 的统一接口，移除 `getDb()` 直连。

### ⚠️ 2.4 疑似冗余 / 演示集合（P3）
- 后端云函数引用了一批 **CloudBase quickstart 示例集合**：`fruits`、`math`、`railroads`、`passages`、`books`、`articles`、`authors`、`photo`、`player`、`points`、`price`、`ratings`、`sales`、`schools`、`scores`、`sessions`、`shopping`、`staff`、`mongoraw`、`coll`、`dates`、`attractions`、`avatar` 等。
- `cart`/`goods`/`shops` 属 `api-shop` 正常业务集合（保留）。
- **建议**：核查 `db-init`/`db-optimize` 等初始化脚本是否残留演示 seed 代码，清理无关集合引用。

---

## 三、功能完整性核查

| 维度 | 结果 |
|---|---|
| 后台模块加载 | ✅ 19 个核心模块冒烟全过（仪表板/课程/教师/班级/排课/报名/调课/合同/证书/题库/订单财务/退款/商城订单/商品/消息/角色/体系/分类/数据修复），无 pageerror |
| 路由 ↔ 页面 ↔ 后端 | ✅ 冒烟测试逐模块访问真实路由并断言主区域渲染 + 无运行时错误，路由与页面组件均真实存在且连通 |
| 核心业务闭环 | ✅ 购课→开通权限、报名→审核→名单、考试→成绩、支付→退款、消息通知均有对应云函数 action 且契约一致 |

### 待补强（非阻断，见首轮 P1）
- **P1-1** `api-message` HTTP 触发器疑似未部署 → 后台"消息公告"HTTP 调用不可用（内部 `app.callFunction` 不受影响）。
- **P1-2** 小程序端未随本轮改动重新部署 → 需上传并回归核心链路。

---

## 四、问题清单（本轮新增 / 聚焦项）

### 🟠 P2 — 建议上线前处理
- **P2-1 考试记录双写路径**：`ExamResultPage.tsx` 直连 SDK 写 `examAttempts`，绕过 Service 层（§2.3）。修复：改用 `examAttemptService`。

### 🟡 P3 — 技术债 / 待清理
- **P3-1** 清理 `db-init`/`db-optimize` 中可能残留的 CloudBase quickstart 演示集合引用（§2.4）。
- **P3-2** 首轮 P2-1 类型错误（293→194）剩余 194 个，多为未使用变量（TS6133），零运行时风险，建议逐文件清理。

### 🔴 P0 — 无
本轮未发现阻断性数据流 / 互联互通 / 功能完整性缺陷。

---

## 五、上线前检查清单（数据流专项）

- [ ] 修复 `ExamResultPage` SDK 直连，统一走 `examAttemptService`（P2-1）
- [ ] 部署并验证 `api-message` HTTP 触发器（P1-1）
- [ ] 重新部署小程序端并回归（P1-2）
- [ ] 清理 quickstart 演示集合引用（P3-1）
- [ ] 运行 `scripts/cleanup-e2e-gifts.cjs` 清理 E2E 残留 `class_gift/revoked` 记录
- [ ] 生产环境冒烟：登录 → 购课 → 学习 → 报名 → 考试 → 支付 → 退款 → 消息
