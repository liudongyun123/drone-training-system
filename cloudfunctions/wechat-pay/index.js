/**
 * 微信支付云函数 - Native支付
 * 
 * 支持：
 * - 统一下单（生成二维码）
 * - 支付回调
 * - 查询订单
 * - 关闭订单
 * 
 * 环境变量配置：
 * - WECHAT_MCHID: 商户号
 * - WECHAT_APIKEY: API密钥
 * - WECHAT_APPID: AppID（微信开放平台应用）
 * - WECHAT_NOTIFY_URL: 支付回调地址
 */

const cloud = require('tcb-admin-node');
const crypto = require('crypto');
const https = require('https');

// 初始化云开发
cloud.init({
  env: cloud.SYMBOL_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

// 配置
const MCHID = process.env.WECHAT_MCHID || '';
const APIKEY = process.env.WECHAT_APIKEY || '';
const APPID = process.env.WECHAT_APPID || '';
const NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || '';

// 微信支付API地址
const UNIFIED_ORDER_URL = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
const ORDER_QUERY_URL = 'https://api.mch.weixin.qq.com/pay/orderquery';
const CLOSE_ORDER_URL = 'https://api.mch.weixin.qq.com/pay/closeorder';

/**
 * 生成随机字符串
 */
function generateNonceStr(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

/**
 * 生成签名
 */
function generateSign(params, key) {
  // 1. 字典序排序参数
  const sorted = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  // 2. 拼接密钥
  const signStr = `${sorted}&key=${key}`;
  
  // 3. MD5签名并转大写
  return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
}

/**
 * 转换为XML
 */
function toXML(params) {
  let xml = '<xml>';
  for (const [key, value] of Object.entries(params)) {
    xml += `<${key}><![CDATA[${value}]]></${key}>`;
  }
  xml += '</xml>';
  return xml;
}

/**
 * 解析XML
 */
function parseXML(xml) {
  const result = {};
  const regex = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

/**
 * 发送HTTPS请求
 */
function httpsRequest(url, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * 统一下单 - 生成支付二维码
 */
async function unifiedOrder(params) {
  const { orderNo, amount, description, attach = '' } = params;

  // 验证配置
  if (!MCHID || !APIKEY || !APPID) {
    return {
      success: false,
      error: '微信支付配置不完整，请联系管理员'
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const nonceStr = generateNonceStr();
  const outTradeNo = orderNo || `ORDER${Date.now()}`;
  
  // 单位转换：元转分
  const totalFee = Math.round(parseFloat(amount) * 100);

  // 构建请求参数
  const requestParams = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: nonceStr,
    body: description.substring(0, 128), // 限制长度
    out_trade_no: outTradeNo,
    total_fee: totalFee,
    spbill_create_ip: '127.0.0.1',
    notify_url: NOTIFY_URL || `https://${process.env.ENV_ID}.tcloudbaseapp.com/wechat-pay-callback`,
    trade_type: 'NATIVE',
    attach: attach.substring(0, 128),
    time_start: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
    time_expire: new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14)
  };

  // 生成签名
  requestParams.sign = generateSign(requestParams, APIKEY);

  // 发送请求
  const xmlData = toXML(requestParams);
  console.log('统一下单请求:', xmlData);

  try {
    const response = await httpsRequest(UNIFIED_ORDER_URL, xmlData);
    console.log('统一下单响应:', response);

    const result = parseXML(response);

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      // 保存订单到数据库
      await db.collection('wechat_orders').add({
        data: {
          orderNo: outTradeNo,
          mchId: MCHID,
          appId: APPID,
          totalFee,
          description,
          attach,
          codeUrl: result.code_url,
          transactionId: '',
          tradeState: 'NOTPAY',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: {
          orderNo: outTradeNo,
          codeUrl: result.code_url,
          qrCode: result.code_url // 前端可用于生成二维码
        }
      };
    } else {
      return {
        success: false,
        error: result.err_code_des || result.return_msg || '统一下单失败'
      };
    }
  } catch (error) {
    console.error('统一下单异常:', error);
    return {
      success: false,
      error: '请求微信支付接口失败'
    };
  }
}

/**
 * 支付回调处理
 */
async function handleNotify(notifyData) {
  const { return_code, return_msg, transaction_id, out_trade_no, total_fee, trade_state, attach } = notifyData;

  console.log('支付回调数据:', notifyData);

  // 验证签名
  const sign = notifyData.sign;
  const signParams = { ...notifyData };
  delete signParams.sign;
  const calculatedSign = generateSign(signParams, APIKEY);

  if (calculatedSign !== sign) {
    return {
      return_code: 'FAIL',
      return_msg: '签名验证失败'
    };
  }

  // 更新订单状态
  try {
    const orderResult = await db.collection('wechat_orders')
      .where({ orderNo: out_trade_no })
      .limit(1)
      .get();

    if (orderResult.data.length > 0) {
      const order = orderResult.data[0];
      
      // 避免重复处理
      if (order.tradeState === 'SUCCESS') {
        return { return_code: 'SUCCESS', return_msg: 'OK' };
      }

      await db.collection('wechat_orders')
        .doc(order._id)
        .update({
          data: {
            transactionId: transaction_id,
            tradeState: trade_state || 'SUCCESS',
            totalFee: parseInt(total_fee),
            updatedAt: new Date().toISOString()
          }
        });

      // 如果有附加数据，更新课程权限等
      if (attach) {
        try {
          const attachData = JSON.parse(attach);
          if (attachData.type === 'course_purchase') {
            // 添加课程权限
            await db.collection('course_permissions').add({
              data: {
                userId: attachData.userId,
                courseId: attachData.courseId,
                orderNo: out_trade_no,
                source: 'wechat_pay',
                status: 'active',
                createdAt: new Date().toISOString()
              }
            });
          }
        } catch (e) {
          console.error('处理附加数据失败:', e);
        }
      }
    }

    return { return_code: 'SUCCESS', return_msg: 'OK' };
  } catch (error) {
    console.error('处理回调失败:', error);
    return { return_code: 'FAIL', return_msg: '处理失败' };
  }
}

/**
 * 查询订单
 */
async function queryOrder(outTradeNo) {
  const nonceStr = generateNonceStr();
  
  const requestParams = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: nonceStr,
    out_trade_no: outTradeNo
  };
  
  requestParams.sign = generateSign(requestParams, APIKEY);
  
  const xmlData = toXML(requestParams);
  
  try {
    const response = await httpsRequest(ORDER_QUERY_URL, xmlData);
    const result = parseXML(response);
    
    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return {
        success: true,
        data: {
          orderNo: outTradeNo,
          tradeState: result.trade_state,
          transactionId: result.transaction_id,
          totalFee: parseInt(result.total_fee),
          tradeStateDesc: result.trade_state_desc
        }
      };
    } else {
      return {
        success: false,
        error: result.err_code_des || '查询失败'
      };
    }
  } catch (error) {
    console.error('查询订单异常:', error);
    return {
      success: false,
      error: '查询失败'
    };
  }
}

/**
 * 关闭订单
 */
async function closeOrder(outTradeNo) {
  const nonceStr = generateNonceStr();
  
  const requestParams = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: nonceStr,
    out_trade_no: outTradeNo
  };
  
  requestParams.sign = generateSign(requestParams, APIKEY);
  
  const xmlData = toXML(requestParams);
  
  try {
    const response = await httpsRequest(CLOSE_ORDER_URL, xmlData);
    const result = parseXML(response);
    
    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      // 更新订单状态
      await db.collection('wechat_orders')
        .where({ orderNo: outTradeNo })
        .update({
          data: {
            tradeState: 'CLOSED',
            updatedAt: new Date().toISOString()
          }
        });
      
      return { success: true };
    } else {
      return {
        success: false,
        error: result.err_code_des || '关闭失败'
      };
    }
  } catch (error) {
    console.error('关闭订单异常:', error);
    return {
      success: false,
      error: '关闭失败'
    };
  }
}

/**
 * 获取订单状态
 */
async function getOrderStatus(outTradeNo) {
  try {
    const result = await db.collection('wechat_orders')
      .where({ orderNo: outTradeNo })
      .limit(1)
      .get();
    
    if (result.data.length > 0) {
      const order = result.data[0];
      return {
        success: true,
        data: {
          orderNo: order.orderNo,
          tradeState: order.tradeState,
          totalFee: order.totalFee / 100, // 分转元
          description: order.description,
          createdAt: order.createdAt
        }
      };
    } else {
      return {
        success: false,
        error: '订单不存在'
      };
    }
  } catch (error) {
    console.error('查询订单状态异常:', error);
    return {
      success: false,
      error: '查询失败'
    };
  }
}

/**
 * 主入口
 */
exports.main = async (event, context) => {
  const { action, data = {} } = event;

  // 如果是支付回调（POST请求直接带XML数据）
  if (event.httpMethod === 'POST' && !action) {
    const notifyData = parseXML(event.body || event.rawBody || '');
    return await handleNotify(notifyData);
  }

  try {
    let result;

    switch (action) {
      case 'createOrder':
        // 创建支付订单
        result = await unifiedOrder(data);
        break;

      case 'queryOrder':
        // 查询订单（微信API）
        result = await queryOrder(data.orderNo);
        break;

      case 'getOrderStatus':
        // 获取本地订单状态
        result = await getOrderStatus(data.orderNo);
        break;

      case 'closeOrder':
        // 关闭订单
        result = await closeOrder(data.orderNo);
        break;

      case 'notify':
        // 处理支付回调
        result = await handleNotify(data);
        break;

      case 'checkConfig':
        // 检查配置状态
        result = {
          configured: !!(MCHID && APIKEY && APPID),
          mchId: MCHID ? MCHID.slice(0, 4) + '****' + MCHID.slice(-4) : '',
          appId: APPID ? APPID.slice(0, 4) + '****' : '',
          hasNotifyUrl: !!NOTIFY_URL
        };
        break;

      default:
        result = { success: false, error: '未知的操作' };
    }

    return result;
  } catch (error) {
    console.error('Wechat Pay Error:', error);
    return { success: false, error: error.message };
  }
};
