# 无人机培训系统 - 部署指南

## 一、环境要求

| 项目 | 要求 |
|------|------|
| Node.js | >= 16.x |
| 微信开发者工具 | 最新稳定版 |
| 腾讯云 CloudBase | 已开通环境 |

## 二、CloudBase 配置

### 1. 环境变量

在项目根目录 `.env` 文件中配置：

```bash
# CloudBase 环境 ID
VITE_ENV_ID=your-cloudbase-env-id

# 微信支付配置
VITE_WX_MCH_ID=1726655499
VITE_WX_APP_ID=wx25aaf895ab86181a
```

### 2. 数据库集合

确保以下集合已创建：

| 集合名 | 用途 |
|--------|------|
| `users` | 用户信息 |
| `courses` | 课程 |
| `lessons` | 课程章节 |
| `classes` | 培训班 |
| `class_schedules` | 排课 |
| `enrollments` | 报名记录 |
| `products` | 商品 |
| `product_categories` | 商品分类 |
| `product_skus` | 商品SKU |
| `orders` | 统一订单 |
| `course_permissions` | 课程权限 |
| `learning_progress` | 学习进度 |
| `teachers` | 教师信息 |
| `exams` | 考试 |
| `questions` | 题目 |
| `exam_records` | 考试记录 |
| `certificates` | 证书记录 |
| `page_configs` | 页面配置 |
| `categories` | 分类 |
| `coupons` | 优惠券 |
| `marketing` | 营销活动 |

### 3. 安全规则

参考 `docs/SECURITY_RULES_CONFIG.js` 配置数据库安全规则。

## 三、Web 端部署

### 1. 安装依赖

```bash
cd drone-training-system
npm install
```

### 2. 本地开发

```bash
npm run dev
```

### 3. 构建

```bash
npm run build
```

### 4. 部署到 CloudBase 静态托管

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署
tcb hosting deploy dist/ -e your-env-id
```

## 四、云函数部署

### 1. 安装依赖

每个云函数目录需要单独安装依赖：

```bash
cd cloudfunctions/login && npm install
cd cloudfunctions/getPhoneNumber && npm install
cd cloudfunctions/mini-api && npm install
cd cloudfunctions/wechat-pay && npm install
cd cloudfunctions/api && npm install
cd cloudfunctions/admin && npm install
```

### 2. 部署方式

#### 方式一：微信开发者工具（推荐）
1. 打开微信开发者工具
2. 导入项目（指向 `miniprogram/` 目录）
3. 在左侧找到 `cloudfunctions` 目录
4. 右键每个云函数 → 上传并部署：云端安装依赖

#### 方式二：CloudBase CLI

```bash
# 部署单个云函数
tcb fn deploy login -e your-env-id
tcb fn deploy getPhoneNumber -e your-env-id
tcb fn deploy mini-api -e your-env-id
tcb fn deploy wechat-pay -e your-env-id
tcb fn deploy api -e your-env-id
tcb fn deploy admin -e your-env-id
```

### 3. 微信支付云函数配置

在 `wechat-pay` 云函数中配置环境变量：

| 变量名 | 值 |
|--------|-----|
| `WX_MCH_ID` | 1726655499 |
| `WX_APP_ID` | wx25aaf895ab86181a |
| `WX_API_KEY` | 你的API密钥（在 pay.weixin.qq.com → 账户中心 → API安全） |
| `WX_NOTIFY_URL` | https://your-domain.com/api/wechat-pay/notify |

## 五、小程序部署

### 1. 配置 AppID

1. 打开微信开发者工具
2. 导入 `miniprogram/` 目录
3. 填写 AppID: `wx25aaf895ab86181a`

### 2. 配置 CloudBase 环境

修改 `miniprogram/app.ts`：

```typescript
globalData: {
  envId: 'your-cloudbase-env-id'  // 替换为实际环境ID
}
```

### 3. 替换 TabBar 图标

将设计好的图标文件放入 `miniprogram/assets/icons/`：
- home.png / home-active.png
- course.png / course-active.png
- shop.png / shop-active.png
- user.png / user-active.png

### 4. 测试

在微信开发者工具中运行和调试。

### 5. 上传

微信开发者工具 → 上传 → 填写版本号和备注。

### 6. 提审

登录 [微信公众平台](https://mp.weixin.qq.com/) → 版本管理 → 提交审核。

## 六、数据库索引建议

为提高查询性能，建议创建以下索引：

| 集合 | 字段 | 索引类型 |
|------|------|----------|
| `courses` | status + createdAt | 复合索引 |
| `classes` | status + startDate | 复合索引 |
| `orders` | userId + createdAt | 复合索引 |
| `orders` | orderType + status | 复合索引 |
| `enrollments` | userId | 单字段索引 |
| `enrollments` | classId | 单字段索引 |
| `course_permissions` | userId + courseId | 复合索引 |
| `products` | status + salesCount | 复合索引 |

## 七、监控和运维

### 1. Sentry 错误监控

```bash
# 在 .env 中配置
VITE_SENTRY_DSN=your-sentry-dsn
```

### 2. CloudBase 日志

在腾讯云控制台 → CloudBase → 日志管理 查看云函数运行日志。

### 3. 数据备份

建议开启 CloudBase 自动备份，每日备份一次。

## 八、待办清单

- [ ] 设置微信支付 API 密钥
- [ ] 配置微信支付回调 URL
- [ ] 开启 CloudBase 自动备份
- [ ] 配置 Sentry 错误监控
- [ ] 创建数据库安全规则
- [ ] 创建数据库索引
- [ ] 替换小程序 TabBar 图标
- [ ] 配置 CDN 加速（静态资源）
- [ ] 申请 ICP 备案（如果需要自定义域名）
