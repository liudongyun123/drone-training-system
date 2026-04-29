# 云函数合并方案

> 创建时间：2026-04-29
> 状态：规划中 + 已执行安全合并

---

## 一、当前云函数清单

### A. 核心业务 API（需要保留/合并）

| 云函数 | 类型 | 行数 | SDK | 功能说明 |
|--------|------|------|-----|----------|
| `api/` | 目录（5个子函数） | ~200 | `@cloudbase/node-sdk` | Web 端 API：auth-login, courses-list, orders-create, orders-callback, progress-update |
| `mobile-api` | 单函数 | 580 | `wx-server-sdk` | 移动端统一 API：课程列表/详情、班级列表/详情/报名、轮播图、学习路径、公告、教师 |
| `mini-api` | 单函数 | 346 | `wx-server-sdk` | **小程序统一 API 网关**：用户、课程、培训班、商城、订单、学习记录 |
| `admin` | 单函数 | 2135 | `tcb-admin-node` | 管理后台 API（含鉴权中间件）：通用 CRUD、批量操作 |
| `admin-http` | 单函数 | 127 | `wx-server-sdk` | 管理后台 HTTP 版（简化版）：test, count, list, generateTestData |

### B. 业务功能（独立模块）

| 云函数 | 行数 | SDK | 功能说明 |
|--------|------|-----|----------|
| `class` | 427 | `wx-server-sdk` | 班级管理 CRUD + 排课/调课 |
| `registration` | 425 | `wx-server-sdk` | 线下报名 + 权限开通 + 审核 |
| `transfer-request` | 1442 | `@cloudbase/node-sdk` | 调课请求管理（含审批流） |
| `submit-exam` | 229 | `wx-server-sdk` | Web 端考试提交 + 评分 |
| `mobile-auth` | 723 | `tcb-admin-node` | 移动端认证（短信/密码/微信登录 + Token） |
| `mobile-course` | 970 | `tcb-admin-node` | 移动端课程服务（比 mobile-api 更丰富） |
| `mobile-exam` | ~500 | `tcb-admin-node` | 移动端考试（含招生班级查询） |
| `mobile-learning` | 236 | `wx-server-sdk` | 移动端学习进度/收藏 |
| `mobile-order` | 500 | `tcb-admin-node` | 移动端订单创建/查询/取消 |

### C. 微信生态

| 云函数 | 行数 | SDK | 功能说明 |
|--------|------|-----|----------|
| `login` | 59 | `wx-server-sdk` | 小程序登录（获取 openid + 创建/更新用户） |
| `getPhoneNumber` | 37 | `wx-server-sdk` | 获取用户手机号 |
| `wechat-pay` | 461 | `tcb-admin-node` | 微信支付（Native Pay + H5 支付） |

### D. 一次性/工具类（可归档）

| 云函数 | 功能说明 |
|--------|----------|
| `add-real-courses` | 插入真实课程种子数据 |
| `addUser` | 添加单个用户 |
| `createCollection` | 创建 todos 集合（模板遗留） |
| `create-collections` | 创建所有数据库集合 |
| `diagnose` | 系统诊断工具（HTTP 触发） |
| `getEnvInfo` | 获取环境 ID |
| `init-database` | 初始化数据库课程数据 |
| `init-uav` | 初始化 UAV 集合 |
| `init-uav-collections` | 创建 UAV 所需新集合 |
| `insert-test-data` | 插入测试数据（教师等） |
| `migrate-passwords` | 明文密码 → bcrypt 迁移 |
| `migrate-permissions` | 已支付订单 → course_permissions 迁移 |
| `migrate-uav` | users 集合字段扩展 |
| `test-fn` | 测试函数 |

### E. 遗留文件

| 文件 | 说明 |
|------|------|
| `admin-simple.js` | 旧版管理后台（单文件，非目录） |
| `admin.zip` | 旧版管理后台压缩包 |

---

## 二、问题分析

### 2.1 功能重复严重

| 功能 | 存在于 | 问题 |
|------|--------|------|
| 课程列表/详情 | api/courses-list, mobile-api, mobile-course, mini-api | 4 个地方实现 |
| 订单创建 | api/orders-create, mobile-order, mini-api | 3 个地方实现 |
| 学习进度 | api/progress-update, mobile-learning, mini-api | 3 个地方实现 |
| 班级列表/报名 | mobile-api, mini-api, class, registration | 4 个地方实现 |
| 认证 | api/auth-login, mobile-auth, login | 3 种不同方案 |

### 2.2 SDK 不统一

- `@cloudbase/node-sdk`（旧版）→ api/, transfer-request/, 工具类
- `wx-server-sdk`（微信云开发）→ mobile-api, mini-api, login 等
- `tcb-admin-node`（新版管理 SDK）→ admin, mobile-auth, mobile-course, wechat-pay

### 2.3 api 目录结构问题

`api/` 不是单个云函数，而是 5 个子云函数目录。在 CloudBase 部署时需要逐一部署，维护成本高。

### 2.4 admin 与 admin-http 重复

`admin` 有完整的鉴权中间件，`admin-http` 是简化版，两者功能重叠。

---

## 三、合并方案

### 3.1 第一步：已执行 ✅

**api 子函数合并 + mobile-api 合并到 api**

- 将 `api/` 下的 5 个子云函数（auth-login, courses-list, orders-create, orders-callback, progress-update）合并到单个 `api/index.js`
- 将 `mobile-api` 的独有路由（班级报名等）合并到 `api/index.js`
- 通过 `event.platform` 区分 Web 和 H5 平台
- 删除 `mobile-api` 目录

### 3.2 第二步：合并 mobile-* 到 mini-api（建议）

将 `mobile-auth`, `mobile-course`, `mobile-exam`, `mobile-learning`, `mobile-order` 合并到 `mini-api` 中。

**理由：**
- mini-api 已经是统一网关模式，扩展路由即可
- 所有 mobile-* 函数都使用 wx-server-sdk 或 tcb-admin-node，兼容性好
- 合并后小程序端只需调用一个云函数

**注意：**
- `mobile-auth` 的短信认证逻辑较复杂，需保留完整的 Token 生成/验证流程
- 需要确保合并后的冷启动时间不会超限（CloudBase 云函数限制 60s）
- 如果函数过大，可拆分为 `mini-api`（C 端）+ `mini-auth`（认证）

### 3.3 第三步：合并业务模块到对应 API（建议）

| 当前函数 | 合并到 | 说明 |
|----------|--------|------|
| `class` | `mini-api` 或独立保留 | 班级管理较复杂，建议暂时保留 |
| `registration` | `mini-api` | 报名是小程序核心功能 |
| `transfer-request` | `admin` | 调课审批是管理功能 |
| `submit-exam` | `mini-api` 或 `admin` | 考试提交可合并到小程序 API |

### 3.4 第四步：清理 admin-http（建议）

`admin-http` 功能是 `admin` 的子集，且缺少鉴权：
- 确认无前端调用 `admin-http`
- 删除 `admin-http` 目录

### 3.5 第五步：工具类归档（低优先级）

将一次性/工具类云函数移动到 `_tools/` 目录，避免误操作：
- `add-real-courses`, `addUser`, `createCollection`, `create-collections`
- `diagnose`, `getEnvInfo`, `init-database`, `init-uav`, `init-uav-collections`
- `insert-test-data`, `migrate-passwords`, `migrate-permissions`, `migrate-uav`
- `test-fn`
- `admin-simple.js`, `admin.zip`

---

## 四、建议的最终结构

```
cloudfunctions/
├── api/                    # 统一 API（Web + H5）
│   ├── index.js            # 主入口（合并后的统一路由）
│   └── package.json
│
├── mini-api/               # 小程序 API（统一网关）
│   ├── index.js            # 包含原 mobile-* 的所有路由
│   └── package.json
│
├── admin/                  # 管理后台 API（保留鉴权中间件）
│   ├── index.js
│   ├── auth.js             # 鉴权中间件
│   └── package.json
│
├── wechat-pay/             # 微信支付（独立，安全敏感）
│   ├── index.js
│   └── package.json
│
├── login/                  # 小程序登录（独立，微信生态必须）
│   ├── index.js
│   └── package.json
│
├── getPhoneNumber/         # 获取手机号（独立，微信生态必须）
│   ├── index.js
│   └── package.json
│
├── class/                  # 班级管理（复杂业务，暂时独立）
│   ├── index.js
│   └── package.json
│
├── registration/           # 报名管理（暂时独立）
│   ├── index.js
│   └── package.json
│
├── submit-exam/            # 考试提交（暂时独立）
│   ├── index.js
│   └── package.json
│
└── _tools/                 # 一次性工具（归档，不部署）
    ├── add-real-courses/
    ├── addUser/
    ├── createCollection/
    ├── create-collections/
    ├── diagnose/
    ├── getEnvInfo/
    ├── init-database/
    ├── init-uav/
    ├── init-uav-collections/
    ├── insert-test-data/
    ├── migrate-passwords/
    ├── migrate-permissions/
    ├── migrate-uav/
    ├── test-fn/
    ├── admin-simple.js
    └── admin.zip
```

---

## 五、权限隔离注意事项

### 5.1 admin 云函数

- **已有鉴权中间件**（`auth.js`），通过 `user_roles` 集合验证管理员身份
- 合并 `transfer-request` 时需确保审批流操作走管理员鉴权
- `admin-http` 缺少鉴权，**不能**用 admin-http 替代 admin

### 5.2 mini-api 云函数

- 通过 `cloud.getWXContext()` 获取 openid 进行用户识别
- 用户私有数据（订单、学习记录）通过 openid 过滤
- 合并 mobile-auth 时需注意：
  - 短信验证码有效期管理
  - Token 生成/验证逻辑不能有竞争条件
  - 频率限制（短信发送频率）

### 5.3 api 云函数

- Web 端目前使用 JWT 方式认证
- 合并 mobile-api 后需统一认证方式
- **建议**：Web 端继续用 JWT，H5 端可用手机号 + 短信验证码

### 5.4 wechat-pay

- **独立部署**，不与其他云函数合并
- 涉及支付密钥和证书，必须隔离
- 回调通知 URL 指向此云函数

---

## 六、迁移步骤

### 第一步 ✅（已完成）
1. 合并 api 子函数到单个 api/index.js
2. 合并 mobile-api 到 api/index.js（通过 platform 区分）
3. 删除 mobile-api 目录
4. Git 提交

### 第二步（建议下一步）
1. 在 mini-api 中添加 mobile-course 的路由
2. 在 mini-api 中添加 mobile-order 的路由
3. 在 mini-api 中添加 mobile-learning 的路由
4. 在 mini-api 中添加 mobile-exam 的路由
5. 将 mobile-auth 的 Token 逻辑提取为共享模块
6. 测试验证所有路由
7. 删除 mobile-* 系列目录
8. Git 提交

### 第三步（按需执行）
1. 合并 registration → mini-api
2. 合并 submit-exam → mini-api
3. 合并 transfer-request → admin
4. 删除 admin-http
5. Git 提交

### 第四步（低优先级）
1. 将工具类云函数移动到 _tools/
2. 清理遗留文件（admin-simple.js, admin.zip）
3. Git 提交

---

## 七、风险提示

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 云函数冷启动超时 | 合并后函数体积增大，可能超过 60s 冷启动 | 监控冷启动时间，必要时拆分 |
| 前端调用地址变化 | 已部署的小程序/网页会调用失败 | 合并后保留旧路由兼容层 |
| SDK 版本兼容 | 不同 SDK 行为差异 | 统一使用 `wx-server-sdk` |
| 并发限流 | 单一入口可能成为瓶颈 | CloudBase 自动扩容，短期无需担心 |
| 权限漏洞 | 合并时可能遗漏鉴权 | 合并前 review 每个路由的鉴权逻辑 |
