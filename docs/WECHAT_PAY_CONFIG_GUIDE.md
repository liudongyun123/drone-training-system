# 微信支付配置指南

## 前提条件

1. 已注册微信商户平台账号
2. 已完成商户实名认证
3. 已开通 Native支付 或 JSAPI支付

---

## 第一步：获取微信支付参数

1. 访问 [微信商户平台](https://pay.weixin.qq.com)
2. 获取以下参数：
   - **商户号 (MCHID)**: 微信支付分配的商户号
   - **API密钥 (APIKEY)**: 设置的支付密钥
   - **AppID**: 微信公众号或小程序的 AppID

---

## 第二步：获取证书

1. 在商户平台下载 API 证书
2. 将证书文件上传到云函数环境

---

## 第三步：配置云函数

创建支付云函数 `wechat-pay`:

```javascript
const cloud = require('wx-server-sdk');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 统一下单
async function unifiedOrder(params) {
  const { orderNo, amount, description, openId } = params;
  
  const mchId = process.env.WECHAT_MCHID;
  const apiKey = process.env.WECHAT_APIKEY;
  const appId = process.env.WECHAT_APPID;
  
  // 生成签名
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  
  // 构建签名数据
  const signData = {
    appid: appId,
    mch_id: mchId,
    nonce_str: nonceStr,
    body: description,
    out_trade_no: orderNo,
    total_fee: Math.round(amount * 100), // 转换为分
    spbill_create_ip: '127.0.0.1',
    notify_url: 'https://your-domain.com/api/wechat-pay-callback',
    trade_type: 'NATIVE'
  };
  
  // 生成签名
  const sign = generateSign(signData, apiKey);
  
  // 发送请求
  const result = await sendRequest(signData, sign);
  
  return result;
}

// 生成签名
function generateSign(data, apiKey) {
  const sorted = Object.keys(data)
    .filter(k => data[k])
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('&');
  const signStr = sorted + `&key=${apiKey}`;
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}

exports.main = async (event) => {
  const { action, data } = event;
  
  switch (action) {
    case 'unifiedOrder':
      return await unifiedOrder(data);
    default:
      return { success: false, error: 'Unknown action' };
  }
};
```

---

## 注意事项

- 微信支付需要 HTTPS 域名
- 需要配置支付回调地址
- 生产环境必须使用真实证书

---

## 替代方案：线下支付

如果暂时无法接入微信支付，可以使用**线下支付**模式：

1. 管理员在后台手动确认订单
2. 用户转账到指定账户
3. 管理员审核后手动标记已支付

当前系统已支持线下支付（AdminOfflineEnrollment 组件）。

