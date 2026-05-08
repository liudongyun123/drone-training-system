# 云函数归档报告
**生成时间**: 2026-05-08  
**环境**: rcwljy-5ghmq2ex26764978

---

## 归档摘要

### Phase 1-3: 功能扩展 ✅

| 云函数 | 状态 | 说明 |
|--------|------|------|
| mobile-learning | ✅ 已部署 | 学习路径、证书管理 |
| api-order | ✅ 已部署 | 订单、购物车、优惠券 |
| api-user | ✅ 已部署 | 用户、会员、设置、统计 |

### Phase 4: 归档清理 ✅

#### 本地归档完成
- 14 个云函数目录已移动到 `cloudfunctions/_archived/`

#### 待清理云端函数 (16个)

| 函数名 | 类型 | 建议 |
|--------|------|------|
| init-dictionaries | 初始化 | 可删除 |
| init-caac-data | 初始化 | 可删除 |
| init-renshe-classes | 初始化 | 可删除 |
| init-renshe-classes-new | 初始化 | 可删除 |
| init-renshe-classes-v2 | 初始化 | 可删除 |
| init-renshe-courses-v2 | 初始化 | 可删除 |
| sync-caac-classes-category | 同步 | 可删除 |
| sync-class-level | 同步 | 可删除 |
| sync-class-source | 同步 | 可删除 |
| sync-course-source | 同步 | 可删除 |
| sync-renshe-category-source | 同步 | 可删除 |
| cleanup-old-courses | 清理 | 可删除 |
| fix-class-category | 修复 | 可删除 |
| update-course-covers | 更新 | 可删除 |
| db-optimize | 优化 | 保留（可能需要再次运行） |
| create-missing-collections | 创建 | 保留（可能需要再次运行） |

---

## 删除云端函数

### 安全删除脚本

```bash
# 删除前请确保已备份重要数据

FUNCTIONS=(
  "init-dictionaries"
  "init-caac-data"
  "init-renshe-classes"
  "init-renshe-classes-new"
  "init-renshe-classes-v2"
  "init-renshe-courses-v2"
  "sync-caac-classes-category"
  "sync-class-level"
  "sync-class-source"
  "sync-course-source"
  "sync-renshe-category-source"
  "cleanup-old-courses"
  "fix-class-category"
  "update-course-covers"
)

for func in "${FUNCTIONS[@]}"; do
  echo "删除云函数: $func"
  tcb fn delete "$func" --envId rcwljy-5ghmq2ex26764978 --force
done
```

### 保留函数清单

以下函数建议保留，不要删除：
- `mobile-learning` - 学习功能主入口
- `api-order` - 订单功能主入口
- `api-user` - 用户功能主入口
- `api-course` - 课程管理
- `api-exam` - 考试管理
- `api-auth` - 认证服务
- `api-message` - 消息服务
- `api-home` - 首页数据
- `api-source` - 资源管理
- `api-shop` - 商城管理
- `api-pay` - 支付服务
- `api-training` - 培训管理
- `mobile-course` - 小程序课程
- `mobile-exam` - 小程序考试
- `mobile-auth` - 小程序认证
- `mobile-order` - 小程序订单
- `mini-api` - 小程序API
- `admin-http` - 管理后台API
- `login-http` - 登录服务
- `get-sources` - 资源获取
- `registration` - 报名服务
- `wechat-pay` - 微信支付
- `submit-exam` - 提交考试
- `getPhoneNumber` - 获取手机号
- `db-optimize` - 数据库优化
- `create-missing-collections` - 创建集合

---

## 归档后状态

### 当前活跃云函数 (约26个)

```
✅ 核心业务函数
├── mobile-learning     - 学习路径/证书
├── api-order          - 订单/购物车/优惠券
├── api-user           - 用户/会员/设置/统计
├── api-course         - 课程管理
├── api-exam           - 考试管理
├── api-auth           - 认证服务
├── api-message        - 消息服务
├── api-home           - 首页数据
├── api-source         - 资源管理
├── api-shop           - 商城管理
├── api-pay            - 支付服务
├── api-training       - 培训管理

✅ 小程序函数
├── mobile-course      - 小程序课程
├── mobile-exam        - 小程序考试
├── mobile-auth        - 小程序认证
├── mobile-order       - 小程序订单
├── mini-api           - 小程序API

✅ 管理后台函数
├── admin-http         - 管理后台API
├── login-http         - 登录服务

✅ 工具函数
├── get-sources        - 资源获取
├── registration       - 报名服务
├── wechat-pay         - 微信支付
├── submit-exam        - 提交考试
├── getPhoneNumber     - 获取手机号
├── db-optimize        - 数据库优化
└── create-missing-collections - 创建集合
```

### 已归档函数 (14个)
存储在 `cloudfunctions/_archived/` 目录，可随时恢复。

---

## 后续工作

### 建议的后续步骤

1. **确认删除云端函数**
   - 运行上面的删除脚本清理已归档函数

2. **更新前端代码**
   - 同步小程序代码使用新的 Feature 架构
   - 同步管理后台代码使用新的 Feature 架构

3. **添加云函数触发器**
   - 为相关函数配置定时触发器
   - 配置 HTTPS 访问域名

4. **性能监控**
   - 配置云函数监控告警
   - 设置日志归档策略

---

**报告生成**: CloudBase CLI v2.12.7
