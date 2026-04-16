# 🚀 部署指南

## 环境准备

### 1. 安装 CloudBase CLI

```bash
# 使用 npm 安装
npm install -g @cloudbase/cli

# 验证安装
tcb --version
```

### 2. 登录 CloudBase

```bash
# 登录
tcb login

# 查看登录状态
tcb env:list
```

### 3. 创建 CloudBase 环境

如果还没有环境，请在 [CloudBase 控制台](https://console.cloud.tencent.com/tcb) 创建：

- **环境名称**: drone-training
- **区域**: ap-shanghai
- **套餐**: 体验版/专业版

## 配置项目

### 1. 创建环境变量文件

```bash
# 在项目根目录创建 .env 文件
VITE_ENV_ID=your-environment-id
```

### 2. 配置 CloudBase 环境 ID

编辑 `src/config/cloudbase.ts`:

```typescript
const cloudbaseConfig = {
  env: import.meta.env.VITE_ENV_ID || 'your-env-id',
  region: 'ap-shanghai',
};
```

## 构建项目

### 开发环境构建

```bash
npm run build
```

### 生产环境构建

```bash
# 完整构建（包含类型检查）
npm run build:check

# 直接构建
npm run build
```

构建输出到 `dist/` 目录。

## 部署方式

### 方式一：CloudBase CLI 部署

```bash
# 部署整个目录
cloudbase hosting deploy ./dist

# 部署并指定环境
cloudbase hosting deploy ./dist -e your-env-id
```

### 方式二：使用 MCP 工具部署

```bash
# 调用 uploadFiles 工具上传
# localPath: ./dist
# cloudPath: /
```

### 方式三：GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to CloudBase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_ENV_ID: ${{ secrets.CLOUDBASE_ENV_ID }}
          
      - name: Deploy
        run: npx @cloudbase/cli hosting deploy ./dist -e ${{ secrets.CLOUDBASE_ENV_ID }}
        env:
          CLOUDBASE_SECRET_ID: ${{ secrets.CLOUDBASE_SECRET_ID }}
          CLOUDBASE_SECRET_KEY: ${{ secrets.CLOUDBASE_SECRET_KEY }}
```

在 GitHub仓库设置中添加以下 secrets：
- `CLOUDBASE_ENV_ID`: CloudBase 环境 ID
- `CLOUDBASE_SECRET_ID`: 腾讯云 SecretId
- `CLOUDBASE_SECRET_KEY`: 腾讯云 SecretKey

## 部署后配置

### 1. 配置安全域名

在 CloudBase 控制台添加你的域名到安全域名列表：

```
https://your-domain.com
```

### 2. 配置静态托管

确保静态托管已启用：

1. 进入 CloudBase 控制台 → 静态网站托管
2. 确认默认域名可用
3. 如需自定义域名，进行 DNS 配置

### 3. 验证部署

部署完成后，访问以下地址验证：

```
https://your-env-id.tcloudbaseapp.com/
```

## 数据库初始化

### 1. 创建集合

在 CloudBase 控制台创建以下集合：

| 集合名 | 说明 |
|--------|------|
| users | 用户信息 |
| courses | 课程信息 |
| chapters | 课程章节 |
| lessons | 课时信息 |
| orders | 订单记录 |
| enrollments | 报名记录 |
| learning_progress | 学习进度 |
| schedules | 排课信息 |
| attendance | 出勤记录 |
| exams | 考试信息 |
| exam_attempts | 考试记录 |
| question_banks | 题库信息 |
| bank_questions | 题目内容 |
| certificates | 证书信息 |
| coupons | 优惠券 |
| group_buys | 拼团活动 |
| live_streams | 直播课程 |
| banners | 轮播图 |
| page_configs | 页面配置 |
| categories | 分类管理 |
| admin_users | 管理员 |
| notifications | 通知消息 |
| comments | 评论 |
| learning_paths | 学习路径 |
| member_levels | 会员等级 |
| roles | 角色 |

### 2. 配置安全规则

为集合配置适当的安全规则：

```json
// courses 集合 - 所有用户可读，管理员可写
{
  "read": true,
  "write": "doc._openid == auth.uid || auth.isAdmin"
}
```

### 3. 创建索引

为常用查询字段创建索引：

| 集合 | 索引字段 | 类型 |
|------|----------|------|
| orders | userId, status | 复合索引 |
| orders | createdAt | 降序索引 |
| courses | category, status | 复合索引 |
| schedules | date, status | 复合索引 |
| question_banks | category | 单字段 |

## 环境变量参考

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_ENV_ID` | CloudBase 环境 ID | `env-xxx` |
| `VITE_REGION` | 区域 | `ap-shanghai` |

## 故障排查

### 部署后页面空白

1. 检查浏览器控制台错误
2. 确认 `.env` 文件中的 `VITE_ENV_ID` 正确
3. 验证 CloudBase 环境状态正常

### API 请求失败

1. 检查安全规则是否允许读写
2. 确认网络可以访问 CloudBase
3. 查看 CloudBase 日志排查

### CDN 缓存问题

部署后如果资源未更新：

1. 添加版本查询参数
2. 或等待 CDN 自动刷新（通常 5-10 分钟）

## 回滚操作

### 使用 CLI 回滚

```bash
# 查看部署历史
cloudbase hosting list

# 回滚到指定版本
cloudbase hosting restore <deploy-id>
```

### 手动回滚

1. 重新构建旧版本代码
2. 重新部署

## 监控与告警

### 配置监控

在 CloudBase 控制台启用：

- 流量监控
- 请求延迟
- 错误率告警
- 存储使用量

### 日志查看

```bash
# 查看云函数日志
tcb scf log -e your-env-id -n function-name

# 查看静态网站访问日志
tcb hosting log -e your-env-id
```

---

**最后更新**: 2026-04-05
