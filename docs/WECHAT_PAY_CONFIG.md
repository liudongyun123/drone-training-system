# 微信支付配置指南

## 📋 前置条件

1. **商户号已开通** Native Pay（扫码支付）能力
2. **AppID 已绑定** 到商户号（微信公众平台 → 支付配置）
3. **回调域名已配置**（微信商户平台 → 产品中心 → 开发配置）

---

## 🔧 配置步骤

### 1. 获取商户号信息

登录 [微信商户平台](https://pay.weixin.qq.com)：

| 信息 | 位置 | 用途 |
|------|------|------|
| **商户号 mch_id** | 账户中心 → 商户信息 → 商户号 | 云函数环境变量 `WX_MCH_ID` |
| **API 密钥** | 账户中心 → API安全 → 设置API密钥 | 云函数环境变量 `WX_API_KEY` |
| **证书序列号** | 账户中心 → API安全 → API证书 | 云函数环境变量 `WX_CERT_SERIAL_NO`（可选，退款需要） |

### 2. 配置回调通知地址

在商户平台 → 产品中心 → 开发配置 → 支付回调URL：

```
https://env-rcwljy-5ghmq2ex26764978.tcloudbaseapp.com/wechat-pay
```

如果使用自己的域名：
```
https://你的域名/api/wechat-pay/callback
```

### 3. 配置云函数环境变量

#### 方式 A：通过 cloudbaserc.json（推荐）

编辑 `cloudbaserc.json`，修改 `wechat-pay` 函数的 `envVariables`：

```json
{
  "name": "wechat-pay",
  "envVariables": {
    "WX_APPID": "wx25aaf895ab86181a",
    "WX_MCH_ID": "你的商户号（10位数字）",
    "WX_API_KEY": "你的API密钥（32位）",
    "WX_NOTIFY_URL": "https://env-rcwljy-5ghmq2ex26764978.tcloudbaseapp.com/wechat-pay"
  }
}
```

#### 方式 B：通过 CloudBase 控制台

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 环境 → 云函数 → wechat-pay → 函数配置 → 环境变量
3. 添加以下变量：

| 变量名 | 值 |
|--------|---|
| `WX_APPID` | `wx25aaf895ab86181a` |
| `WX_MCH_ID` | 你的商户号 |
| `WX_API_KEY` | 你的 API 密钥 |
| `WX_NOTIFY_URL` | 回调地址 |
| `WX_CERT_SERIAL_NO` | 证书序列号（可选） |

---

## 🚀 部署

### 部署云函数

```bash
tcb fn deploy wechat-pay
```

### 部署前端

```bash
npm run build
tcb hosting deploy dist
```

---

## 🧪 测试

### 测试支付创建

```bash
curl -X POST \
  https://env-rcwljy-5ghmq2ex26764978.tcloudbaseapp.com/wechat-pay \
  -H "Content-Type: application/json" \
  -d '{"action":"getConfig"}'
```

期望返回：
```json
{
  "code": 0,
  "data": {
    "appId": "wx25aaf895ab86181a",
    "mchId": "***"
  }
}
```

### 前端测试

1. 登录系统
2. 添加课程到购物车
3. 进入结算页面
4. 点击「立即支付」
5. 应显示微信支付二维码

---

## ⚠️ 安全提醒

1. **API 密钥不要写死在代码里**，使用环境变量
2. **生产环境必须实现签名验证**，防止伪造回调
3. **退款功能需要证书**，请下载 `apiclient_key.pem` 并上传到云函数

---

## 📞 问题排查

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 「商户号未配置」 | 环境变量未设置 | 检查云函数环境变量 |
| 「签名错误」 | API 密钥错误 | 在商户平台重新设置密钥 |
| 「AppID未绑定」 | AppID未关联商户号 | 在商户平台添加AppID绑定 |
| 「回调失败」 | 回调地址未配置 | 在商户平台配置回调URL |
| 二维码不显示 | 云函数返回异常 | 查看云函数日志 |

---

## 🔐 签名验证（生产环境必须）

当前代码未实现完整的 RSA 签名验证。生产环境建议：

1. 使用微信官方 SDK（推荐）
2. 或手动实现签名验证逻辑

```javascript
// 签名验证示例（需要 apiclient_key.pem）
const crypto = require('crypto')
const verify = crypto.createVerify('RSA-SHA256')
verify.update(data)
const valid = verify.verify(publicKey, signature, 'base64')
```

---

## 下一步

1. 把商户号告诉我
2. 我帮你配置环境变量
3. 部署后测试