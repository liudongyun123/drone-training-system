# 微信支付配置指南 - Native（扫码支付）

## ✅ 已创建支付云函数

云函数路径：`cloudfunctions/wechat-pay/index.js`

---

## 📋 配置步骤

### 第一步：获取微信支付参数

| 参数 | 获取位置 | 说明 |
|------|---------|------|
| **商户号 (MCHID)** | 商户平台首页 | 登录后可见 |
| **API密钥 (APIKEY)** | 账户中心 → API安全 → 设置密钥 | 32位自主设置 |
| **AppID** | 微信公众平台/开放平台 | 如有公众号或小程序应用 |

### 第二步：设置 API 密钥

1. 登录 [微信商户平台](https://pay.weixin.qq.com)
2. 进入 **账户中心** → **API安全**
3. 点击 **设置密钥**
4. 输入32位密钥（建议使用密码生成器）
5. 确认保存

**密钥格式示例**：
```
aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

⚠️ **注意**：
- API密钥必须32位
- 设置后请妥善保存，微信不会明文显示
- 建议格式：字母+数字组合

### 第三步：配置云函数环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `WECHAT_MCHID` | 商户号 | `1234567890` |
| `WECHAT_APIKEY` | API密钥 | 32位密钥 |
| `WECHAT_APPID` | AppID | `wx1234567890abcdef` |
| `WECHAT_NOTIFY_URL` | 回调地址（可选） | 自动生成 |

**云函数控制台**：
https://console.cloud.tencent.com/scf/list-detail?rid=4&ns=rcwljy-5ghmq2ex26764978&funcname=wechat-pay

### 第四步：部署云函数

1. 在云函数控制台创建 `wechat-pay` 函数
2. 上传代码（选择 `cloudfunctions/wechat-pay` 目录）
3. 配置环境变量
4. 部署

### 第五步：创建订单集合

在数据库中创建 `wechat_orders` 集合（或云函数会自动处理）

---

## 🔧 前端集成

### 支付流程

```javascript
// 1. 调用云函数创建订单
const result = await cloud.callFunction({
  name: 'wechat-pay',
  data: {
    action: 'createOrder',
    data: {
      orderNo: 'ORDER123456',      // 订单号
      amount: 99.00,               // 金额（元）
      description: '无人机培训课程', // 描述
      attach: JSON.stringify({     // 附加数据
        type: 'course_purchase',
        userId: userId,
        courseId: courseId
      })
    }
  }
});

// 2. 获取二维码链接
if (result.success) {
  const { codeUrl } = result.data;
  // 使用 qrcode 库生成二维码
  QRCode.toCanvas(codeUrl);
}

// 3. 轮询查询支付状态
const status = await cloud.callFunction({
  name: 'wechat-pay',
  data: {
    action: 'getOrderStatus',
    data: { orderNo: 'ORDER123456' }
  }
});
```

---

## 📊 支付状态

| 状态码 | 说明 |
|--------|------|
| `NOTPAY` | 未支付 |
| `SUCCESS` | 支付成功 |
| `CLOSED` | 订单关闭 |
| `PAYERROR` | 支付失败 |
| `REFUND` | 已退款 |

---

## 🛡️ 安全建议

1. **API密钥安全**
   - 不要在前端暴露 API 密钥
   - 密钥只在云函数后端使用
   - 定期更换密钥

2. **回调验证**
   - 云函数会验证微信支付回调签名
   - 确保 API 密钥配置正确

3. **订单安全**
   - 订单号要唯一
   - 金额在前端和后端都要校验
   - 防止重复下单

---

## ❓ 常见问题

### Q: 统一下单失败？
- 检查 MCHID、APIKEY、APPID 是否正确
- 检查网络连接
- 查看云函数日志

### Q: 回调接收不到？
- 确保云函数已部署且可访问
- 检查回调地址是否配置正确
- 查看云函数日志

### Q: 支付成功但状态未更新？
- 检查数据库权限
- 查看云函数是否报错
- 验证签名是否正确

---

**文档更新时间**: 2026-04-16
