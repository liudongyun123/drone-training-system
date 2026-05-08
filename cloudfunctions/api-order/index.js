/**
 * api-order 简化测试版本
 */

let cloud
try {
  cloud = require('wx-server-sdk')
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV || cloud.SYMBOL_CURRENT_ENV })

exports.main = async (event, context) => {
  console.log('[api-order] 收到请求:', JSON.stringify(event))
  
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  }
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  }
  
  let action = event.action || ''
  let data = event.data || {}
  
  if (event.body) {
    try {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      action = body.action || action
      data = body.data || body
    } catch (e) {}
  }
  
  console.log('[api-order] action:', action)
  
  // 返回测试数据
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'api-order working!',
      action: action,
      data: { orders: [] }
    })
  }
}
