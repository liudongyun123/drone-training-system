# 无人机培训小程序

## 技术栈

- **框架**: 微信小程序原生开发 (TypeScript)
- **后端**: 腾讯云 CloudBase 云开发
- **云函数**: login / getPhoneNumber / mini-api
- **API 网关**: mini-api（统一小程序端请求）

## 项目结构

```
miniprogram/
├── app.ts              # 小程序入口
├── app.json            # 路由 + TabBar 配置
├── app.wxss            # 全局样式 + CSS 变量
├── project.config.json # 项目配置
├── sitemap.json        # 搜索配置
│
├── pages/              # 页面目录（20个页面）
│   ├── index/          # 首页（课程 + 培训班 + 商城）
│   ├── course-list/    # 课程列表（分类筛选 + 分页）
│   ├── course-detail/  # 课程详情（目录 + 购买）
│   ├── class-list/     # 培训班列表
│   ├── class-detail/   # 培训班详情（排课 + 报名）
│   ├── class-enrollment/ # 培训班报名（缴费方式选择）
│   ├── my-classes/     # 我的培训班
│   ├── my-schedule/    # 我的日程
│   ├── shop/           # 商城首页（分类 + 商品网格）
│   ├── product-detail/ # 商品详情（SKU选择 + 加购）
│   ├── cart/           # 购物车
│   ├── checkout/       # 结算页（课程/商城）
│   ├── my-orders/      # 我的订单（Tab 筛选）
│   ├── login/          # 登录（微信登录 + 手机号绑定）
│   ├── my-learning/    # 个人中心
│   ├── profile/        # 个人资料编辑
│   ├── practice/       # 练习中心（题库 + 模拟考试）
│   ├── exam/           # 答题页
│   ├── result/         # 考试结果
│   └── my-certificates/# 我的证书
│
├── components/         # 自定义组件
│   ├── course-card/    # 课程卡片
│   ├── product-card/   # 商品卡片
│   ├── class-card/     # 培训班卡片
│   └── order-item/     # 订单项
│
├── utils/              # 工具函数
│   ├── cloudbase.ts    # CloudBase 初始化 + 文件上传
│   ├── api.ts          # API 封装（课程/培训班/商品/订单/用户）
│   └── util.ts         # 通用工具（日期/价格/加载状态）
│
└── assets/             # 静态资源
    └── icons/          # TabBar 图标
```

## 云函数

| 云函数 | 功能 |
|--------|------|
| `login` | 微信登录，获取 openid，创建/更新用户 |
| `getPhoneNumber` | 获取手机号并绑定到用户 |
| `mini-api` | 统一 API 网关（action 路由） |

## mini-api 路由

### 用户
- `user.getInfo` - 获取用户信息
- `user.update` - 更新用户资料

### 课程
- `course.list` - 课程列表（分页/分类/搜索）
- `course.detail` - 课程详情 + 章节列表
- `course.hot` - 热门课程

### 培训班
- `class.list` - 培训班列表
- `class.detail` - 培训班详情 + 排课
- `class.enroll` - 报名（线上/线下缴费）

### 商城
- `product.list` - 商品列表
- `product.detail` - 商品详情 + SKU
- `product.categories` - 商品分类

### 订单
- `order.list` - 用户订单列表
- `order.detail` - 订单详情
- `order.create` - 创建订单

### 学习
- `learning.progress` - 更新学习进度

## 开发指南

### 1. 环境准备

```bash
# 安装微信开发者工具
# 导入项目目录 miniprogram/
# 填写 AppID: wx25aaf895ab86181a
```

### 2. 配置 CloudBase

在 `app.ts` 中修改环境 ID：

```typescript
globalData: {
  envId: 'your-cloudbase-env-id'  // 替换为实际环境ID
}
```

### 3. 部署云函数

```bash
# 在微信开发者工具中右键云函数目录，选择"上传并部署：云端安装依赖"
# 需要部署：login, getPhoneNumber, mini-api
```

### 4. TabBar 图标

当前使用占位图标，需要替换为设计稿：
- `assets/icons/home.png` (48x48)
- `assets/icons/home-active.png` (48x48)
- `assets/icons/course.png` (48x48)
- `assets/icons/course-active.png` (48x48)
- `assets/icons/shop.png` (48x48)
- `assets/icons/shop-active.png` (48x48)
- `assets/icons/user.png` (48x48)
- `assets/icons/user-active.png` (48x48)

## 业务规则

- **手机号**: 稳定用户标识，购买前必须绑定
- **培训班报名**: 线上（微信支付）/ 线下（管理员确认）
- **课程授权**: 报名成功自动授权 includedCourses
- **考试**: 模拟备考，不发证
- **证书**: 仅记录外部获得的证书
- **商城**: V1 阶段支持门店自提

## 与 Web 端的关系

- 共用 CloudBase 后端（数据库 + 云函数）
- 小程序使用独立的 `mini-api` 云函数
- 类型定义可复用（计划抽取为 @drone/shared npm 包）
