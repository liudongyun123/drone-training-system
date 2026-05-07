# CDN 配置指南

## 📦 静态资源 CDN 配置

### 1. 腾讯云 CDN 配置

**前提条件**：
- 已开通腾讯云 CDN 服务
- 已开通对象存储 COS 服务
- 已在 COS 创建存储桶

**配置步骤**：

1. **创建 COS 存储桶**
   - 登录腾讯云 COS 控制台
   - 创建新存储桶（建议选择与云开发相同地域）
   - 设置为「公有读、私有写」

2. **配置 CDN 加速**
   - 进入 CDN 控制台
   - 添加域名，选择 COS 作为源站
   - 配置缓存策略（见下文）

3. **配置缓存规则**
   ```json
   {
     "CacheRules": [
       {
         "RuleType": "file",
         "RulePaths": ["*.js", "*.css"],
         "MaxAge": 31536000
       },
       {
         "RuleType": "file",
         "RulePaths": ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.svg"],
         "MaxAge": 2592000
       },
       {
         "RuleType": "all",
         "RulePaths": ["*"],
         "MaxAge": 600
       }
     ]
   }
   ```

4. **配置 HTTPS**
   - 申请 SSL 证书
   - 开启 HTTPS
   - 强制跳转 HTTPS

### 2. 缓存策略建议

| 资源类型 | 缓存时间 | 说明 |
|---------|---------|------|
| JS/CSS 文件 | 1 年 | 依赖文件名哈希 |
| 图片资源 | 30 天 | 支持版本更新 |
| HTML 文件 | 10 分钟 | 确保及时更新 |
| API 响应 | 不缓存 | 实时数据 |

### 3. Vite CDN 配置

在 `vite.config.ts` 中配置公共 CDN：

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // CDN 基础路径（可选）
        // publicDir: false,
      },
    },
  },
  // 配置公共路径
  base: 'https://your-cdn-domain.com/',
});
```

### 4. Gzip/Brotli 压缩

**服务器端配置（Nginx）**：

```nginx
# Gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_types text/plain text/css text/xml application/json application/javascript 
           application/rss+xml application/atom+xml image/svg+xml;

# Brotli 压缩（可选，更好的压缩率）
brotli on;
brotli_types text/plain text/css text/xml application/json application/javascript 
             application/rss+xml application/atom+xml image/svg+xml;
```

### 5. 资源预加载

在 `index.html` 中添加资源预加载：

```html
<!-- 预加载关键资源 -->
<link rel="preload" href="/assets/vendor-mui-core.js" as="script">
<link rel="preload" href="/assets/vendor-cloudbase.js" as="script">

<!-- 预加载关键字体 -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>

<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="//your-cdn-domain.com">
```

### 6. 监控和优化

**性能监控指标**：
- LCP (最大内容绘制): < 2.5s
- FID (首次输入延迟): < 100ms
- CLS (累积布局偏移): < 0.1

**工具推荐**：
- Lighthouse
- WebPageTest
- Google PageSpeed Insights
- 腾讯云前端性能监控
