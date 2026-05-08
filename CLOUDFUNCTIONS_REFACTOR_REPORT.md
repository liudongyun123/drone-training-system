# 云函数 API 重构规划

## 1. 现状分析

### 现有云函数分布

| 分类 | 云函数 | 状态 | Feature |
|------|--------|------|---------|
| **Course** | api-course, mobile-course | ✅ 核心 | Course |
| **Learning** | mobile-learning | ✅ 核心 | Learning |
| **Order** | api-order, mobile-order | ✅ 核心 | Order |
| **Class** | class | ✅ 核心 | Class |
| **Auth** | api-auth, mobile-auth | ✅ 核心 | User |
| **Admin** | api-admin, admin-http | ✅ 核心 | Admin |
| **Payment** | api-pay, wechat-pay | ✅ 核心 | Payment |
| **Exam** | api-exam, mobile-exam | ⚠️ 可选 | Exam |
| **Home** | api-home | ⚠️ 可选 | Home |
| **Message** | api-message | ⚠️ 可选 | Message |
| **Shop** | api-shop | ⚠️ 可选 | Shop |
| **Training** | api-training | ⚠️ 可选 | Training |
| **Source** | api-source | ⚠️ 可选 | Source |

### Feature 模块与云函数映射

```
Feature Module          Cloud Functions
─────────────────────────────────────────────────
Course Feature    ←    api-course, mobile-course
Learning Feature  ←    mobile-learning
Order Feature     ←    api-order, mobile-order  
Class Feature     ←    class
User Feature      ←    api-auth, mobile-auth
Admin Feature     ←    api-admin, admin-http
Payment Feature   ←    api-pay, wechat-pay
Exam Feature      ←    api-exam, mobile-exam
```

## 2. 重构策略

### 2.1 保留并优化（使用频率 >= 5）

| 云函数 | 优化方向 |
|--------|----------|
| api-course | 统一返回格式，增加缓存 |
| mobile-learning | 扩展支持学习路径、证书 |
| api-order | 优化订单状态机 |
| class | 统一班级管理接口 |
| api-auth | JWT Token 优化 |
| api-admin | 权限细粒度控制 |

### 2.2 归档（使用频率 < 5）

| 云函数 | 原因 |
|--------|------|
| add-real-courses | 一次性初始化 |
| clean-classes | 已用完 |
| clearEmptyCollections | 已完成 |
| cleanup-old-courses | 已完成 |
| fix-* | 修复完成 |

### 2.3 新增 Feature API

| Feature | 缺失接口 | 建议 |
|---------|---------|------|
| Learning | 学习路径列表 | 扩展 mobile-learning |
| Learning | 证书管理 | 扩展 mobile-learning |
| User | 用户设置 | 新增 api-user |
| Order | 购物车 | 扩展 api-order |
| Order | 优惠券 | 扩展 api-order |

## 3. API 规范统一

### 3.1 统一返回格式

```javascript
// 成功
{
  code: 0,
  message: 'success',
  data: { ... }
}

// 失败
{
  code: <error_code>,
  message: '<error_message>',
  error: { ... } // 可选
}
```

### 3.2 错误码规范

| 错误码 | 含义 |
|--------|------|
| 0 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 3.3 Action 命名规范

```
getXxx      - 获取单个
getXxxList  - 获取列表
createXxx   - 创建
updateXxx   - 更新
deleteXxx   - 删除
```

## 4. Feature API 扩展

### 4.1 Learning Feature (mobile-learning)

新增 actions:
- `getLearningPaths` - 获取学习路径列表
- `getLearningPathDetail` - 获取学习路径详情
- `getPathProgress` - 获取路径学习进度
- `getCertificates` - 获取证书列表
- `getCertificateDetail` - 获取证书详情
- `downloadCertificate` - 下载证书

### 4.2 Order Feature (api-order)

新增 actions:
- `getCart` - 获取购物车
- `addToCart` - 添加到购物车
- `removeFromCart` - 从购物车移除
- `clearCart` - 清空购物车
- `getCoupons` - 获取优惠券
- `applyCoupon` - 应用优惠券
- `validateCoupon` - 验证优惠券

### 4.3 User Feature (api-auth)

新增 actions:
- `getUserProfile` - 获取用户资料
- `updateUserProfile` - 更新用户资料
- `getUserSettings` - 获取用户设置
- `updateUserSettings` - 更新用户设置

## 5. 执行计划

### Phase 1: Learning Feature 扩展
1. 扩展 mobile-learning 支持学习路径
2. 添加证书相关接口
3. 测试验证

### Phase 2: Order Feature 扩展
1. 扩展 api-order 支持购物车
2. 添加优惠券接口
3. 测试验证

### Phase 3: User Feature 扩展
1. 创建 api-user 云函数
2. 实现用户设置接口
3. 集成到认证流程

### Phase 4: 归档清理
1. 清理已完成的初始化云函数
2. 更新文档
3. Git 提交

## 6. 预期效果

- API 接口统一规范
- Feature 模块完整性提升
- 代码可维护性增强
- 新功能开发效率提高
