# Sentry 错误监控配置指南

## 📋 概述

Sentry 是一个开源的错误追踪和性能监控平台，帮助开发者实时发现和修复应用问题。

本项目已集成 Sentry SDK，可监控：
- JavaScript 运行时错误
- React 组件渲染错误
- API 请求失败
- 页面加载性能（Web Vitals）
- 用户行为面包屑

---

## 🚀 快速开始

### 1. 创建 Sentry 账号

访问 [Sentry.io](https://sentry.io) 注册账号（免费计划可用）

### 2. 创建项目

1. 登录 Sentry 后，点击 "Projects" → "Create Project"
2. 选择 "React" 作为框架
3. 设置项目名称：`drone-training-system`
4. 获取 DSN 地址

### 3. 配置 DSN

编辑 `.env.local` 文件（从 `.env.example` 复制）：

```bash
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxxx
```

### 4. 重新构建部署

```bash
npm run build
npm run deploy
```

---

## ⚙️ 高级配置

### Source Maps 上传（可选）

为了更好的错误追踪体验，建议配置 Source Maps 上传：

1. 安装 Sentry CLI：
```bash
npm install -g @sentry/cli
```

2. 创建 API Token：
   - 进入 Sentry → Settings → API Keys
   - 创建新 Token，勾选 `project:releases`

3. 配置环境变量：
```bash
SENTRY_ORG=your-org-name
SENTRY_PROJECT=drone-training-system
SENTRY_AUTH_TOKEN=your-api-token
```

4. 构建时会自动上传 Source Maps

### 性能监控采样率

在 `src/utils/sentry.ts` 中调整：

```typescript
tracesSampleRate: 0.1,  // 10% 的页面加载事务
sampleRate: 0.1,        // 10% 的错误事件
```

### 自定义用户上下文

在用户登录时设置用户信息：

```typescript
import { setSentryUser } from '@/utils/sentry';

const handleLogin = async () => {
  // 登录逻辑...
  setSentryUser({
    uid: user.uid,
    phone: user.phone,
    nickname: user.nickname,
  });
};
```

### 添加业务面包屑

追踪关键用户行为：

```typescript
import { addSentryBreadcrumb } from '@/utils/sentry';

addSentryBreadcrumb(
  '用户开始考试',
  'exam',
  'info',
  { examId: '123', examTitle: '理论考试' }
);
```

---

## 🔧 环境变量说明

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `VITE_SENTRY_DSN` | Sentry DSN 地址 | 生产环境必填 |
| `SENTRY_ORG` | Sentry 组织名称 | 上传 Source Maps 时必填 |
| `SENTRY_PROJECT` | Sentry 项目名称 | 上传 Source Maps 时必填 |
| `SENTRY_AUTH_TOKEN` | Sentry API Token | 上传 Source Maps 时必填 |

---

## 📊 监控指标

集成后可查看以下指标：

1. **错误统计**
   - 错误数量和趋势
   - 错误频率（每会话）
   - 受影响用户数

2. **性能指标**
   - LCP (最大内容绘制)
   - FID (首次输入延迟)
   - CLS (累积布局偏移)

3. **用户行为**
   - 用户面包屑
   - 用户会话
   - 用户设备信息

---

## 🎯 最佳实践

### 1. 敏感信息过滤

Sentry 会自动过滤以下字段：
- `password`
- `authorization`
- `secret`
- `token`

如需过滤其他字段，在 `sentry.ts` 中配置：

```typescript
Sentry.init({
  // ...
  beforeSend: (event) => {
    // 删除敏感数据
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
});
```

### 2. 错误分组

合理使用错误类型和指纹，避免过度聚合：

```typescript
captureSentryError(error, {
  // 自定义指纹，避免相同错误被合并
  fingerprint: ['drone-training', error.message, userId],
});
```

### 3. 告警规则

在 Sentry 控制台设置告警：
- 错误数量超过阈值
- 新出现的错误类型
- 性能指标异常

---

## 🐛 常见问题

### Q: 生产环境没有错误堆栈？

确保：
1. 配置了 Source Maps 上传
2. `vite.config.ts` 中 `build.sourcemap` 为 `true`
3. 构建后检查 `.map` 文件是否存在

### Q: 本地开发环境也发送错误？

检查 `src/utils/sentry.ts` 中的判断条件：

```typescript
const SENTRY_ENABLED = import.meta.env.PROD && Boolean(SENTRY_DSN);
```

只有 `PROD=true` 且配置了 DSN 时才会启用。

### Q: 错误被忽略？

检查 `ignoreErrors` 和 `denyUrls` 配置。

---

## 📚 相关资源

- [Sentry React 文档](https://docs.sentry.io/platforms/javascript/react/)
- [Sentry Vite 集成](https://docs.sentry.io/platforms/javascript/guides/vite/)
- [Source Maps 配置](https://docs.sentry.io/platforms/javascript/sourcemaps/)

---

**配置完成时间**: 2026-04-16
