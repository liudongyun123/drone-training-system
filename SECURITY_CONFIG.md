# 安全配置指南

## 🔒 安全性最佳实践

### 1. 内容安全策略 (CSP)

在 `index.html` 中添加 CSP 头：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.tcloudbaseapp.com https://*.tcbrt.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### 2. 其他安全头

```html
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
<meta http-equiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()">
```

### 3. HTTPS 配置 (CloudBase)

在 `cloudbaserc.json` 中配置：

```json
{
  "framework": {
    "plugins": {
      "client": {
        "use": "@cloudbase/framework-plugin-website",
        "inputs": {
          "websiteConfig": {
            "index": "index.html",
            "error": "index.html",
            "cloudfront": {
              "viewerCertificate": {
                "acmCertificateArn": "your-cert-arn",
                "sslSupportMethod": "sni-only"
              }
            }
          }
        }
      }
    }
  }
}
```

### 4. CORS 配置 (云函数)

在云函数中添加 CORS 头：

```javascript
// 云函数响应中添加 CORS 头
exports.main = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'https://your-domain.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
    body: JSON.stringify({ code: 0, data: {} }),
  };
};
```

### 5. 数据库安全规则

确保数据库集合有正确的访问权限：

```json
{
  "collections": {
    "users": {
      "read": "doc._openid == auth.openid",
      "create": "doc._openid == auth.openid",
      "update": "doc._openid == auth.openid",
      "delete": "doc._openid == auth.openid"
    },
    "courses": {
      "read": true,
      "create": "auth.isAdmin == true",
      "update": "auth.isAdmin == true",
      "delete": "auth.isAdmin == true"
    }
  }
}
```

### 6. API 安全检查清单

**输入验证**：
- ✅ 验证所有用户输入
- ✅ 使用参数化查询防止 SQL 注入
- ✅ 清理 HTML 防止 XSS
- ✅ 验证文件上传类型和大小

**认证与授权**：
- ✅ 使用 JWT 或 CloudBase 认证
- ✅ 实施最小权限原则
- ✅ 定期轮换密钥
- ✅ 实现 Token 刷新机制

**敏感数据**：
- ✅ 加密敏感数据（密码、支付信息）
- ✅ 不在客户端存储敏感信息
- ✅ 使用环境变量管理密钥
- ✅ 日志中不记录敏感信息

### 7. 支付安全

**微信支付安全**：

```javascript
// 1. 回调验签
const crypto = require('crypto');

function verifyWechatPayCallback(data, sign) {
  const key = process.env.WX_API_KEY;
  const signString = Object.keys(data)
    .filter(k => k !== 'sign' && data[k])
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('&') + `&key=${key}`;
  
  const calculatedSign = crypto
    .createHash('md5')
    .update(signString)
    .digest('hex')
    .toUpperCase();
  
  return calculatedSign === sign;
}

// 2. 金额验证
function verifyAmount(amount) {
  return Number.isInteger(amount) && amount > 0 && amount <= 100000;
}
```

**注意事项**：
- ⚠️ **必须验证回调签名** - 永不信任未验证的回调
- ⚠️ **验证订单金额** - 防止用户篡改价格
- ⚠️ **防止重复发货** - 使用订单状态机
- ⚠️ **记录所有交易** - 日志完整可追溯

### 8. 安全监控

**监控指标**：
- 异常登录尝试
- API 调用频率
- 错误率异常
- 支付异常

**告警配置**：
```javascript
// Sentry 安全告警
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // 过滤敏感信息
    if (event.request) {
      delete event.request.headers;
      delete event.request.cookies;
    }
    return event;
  },
});
```

### 9. 常见安全漏洞修复

**XSS 防护**：

```tsx
// React 中使用 dangerouslySetInnerHTML 的替代方案
function SafeHTML({ html }) {
  const sanitizeHTML = (str) => {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };
  
  return <div>{sanitizeHTML(html)}</div>;
}
```

**CSRF 防护**：
- 使用 CloudBase 认证令牌
- 检查 Referer 头
- 实现 Token 验证

## 📋 安全检查清单

### 开发阶段
- [ ] 所有用户输入已验证
- [ ] 数据库查询使用参数化
- [ ] 敏感数据已加密
- [ ] API 有适当的速率限制

### 测试阶段
- [ ] 已进行渗透测试
- [ ] 已测试 XSS 攻击
- [ ] 已测试 SQL 注入
- [ ] 已测试 CSRF 攻击

### 部署阶段
- [ ] HTTPS 已启用
- [ ] 安全头已配置
- [ ] 数据库权限已设置
- [ ] 环境变量已配置
- [ ] 监控告警已启用

## 🚨 应急响应

如果发现安全漏洞：

1. **立即响应**：
   - 评估漏洞严重程度
   - 停止相关服务（如果必要）
   - 准备修复方案

2. **修复阶段**：
   - 实施修复
   - 测试修复
   - 部署更新

3. **后续跟进**：
   - 通知受影响用户
   - 更新安全文档
   - 进行事后分析

## 📞 安全支持

**腾讯云安全中心**：
- 安全审计服务
- Web 应用防火墙
- DDoS 防护

**外部资源**：
- OWASP Top 10
- 安全博客和公告
- 漏洞赏金计划（可选）
