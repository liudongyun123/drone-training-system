/**
 * 共享 CORS 工具模块
 * 
 * 所有 api-* 和 admin 云函数统一使用此模块，消除重复代码。
 * 
 * 使用方式：
 *   const { getCorsHeaders } = require('./lib/cors')          // api-* 系列
 *   const { corsHeaders } = require('./lib/cors')             // 常量模式
 *   const { getAdminCorsHeaders } = require('./lib/cors')     // admin 增强版
 */

/**
 * CORS 白名单 — 动态构建，不硬编码环境 ID
 * 依赖环境变量 TCB_ENV_ID 自动生成对应域名
 */
const TCB_ENV_ID = process.env.TCB_ENV_ID || ''
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
]

// 动态添加 CloudBase 托管域名（仅当环境变量存在时）
if (TCB_ENV_ID) {
  ALLOWED_ORIGINS.push(
    `https://${TCB_ENV_ID}-1318564729.tcloudbaseapp.com`,
    `https://${TCB_ENV_ID}-1318564729.ap-shanghai.app.tcloudbase.com`
  )
} else {
  // 回退值：仅用于本地开发无环境变量的场景
  ALLOWED_ORIGINS.push(
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com',
    'https://rcwljy-5ghmq2ex26764978-1318564729.ap-shanghai.app.tcloudbase.com'
  )
}

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
}

/**
 * 基础版 CORS 头 — 用于 api-* 系列云函数
 * 
 * 如果 origin 在白名单中则返回具体 origin，否则返回 *。
 * 
 * @param {string} origin - 请求来源 URL
 * @returns {object} CORS 响应头对象
 */
function getCorsHeaders(origin = '') {
  return {
    'Access-Control-Allow-Origin': (origin && ALLOWED_ORIGINS.includes(origin)) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...BASE_HEADERS
  }
}

/**
 * 增强版 CORS 头 — 用于 admin 云函数
 * 
 * 支持 PUT/DELETE 方法、自定义请求头、凭证传递。
 * 从 CloudBase HTTP 触发器 event 对象中提取 origin。
 * 
 * @param {object} event - CloudBase HTTP 触发器事件对象
 * @returns {object} CORS 响应头对象
 */
function getAdminCorsHeaders(event) {
  let origin = ''
  if (event && event.request) {
    origin = event.request.headers?.origin ||
             event.request.headers?.Origin ||
             event.request.origin ||
             ''
  }

  const base = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, tcb-uuid, X-TCB-UUID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    ...BASE_HEADERS
  }

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin }
  }

  return { ...base, 'Access-Control-Allow-Origin': '*' }
}

/**
 * 预设的 CORS 响应头常量（始终允许所有来源）
 * 用于 api-order 等需要直接引用的场景
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  ...BASE_HEADERS
}

module.exports = {
  getCorsHeaders,
  getAdminCorsHeaders,
  corsHeaders,
  ALLOWED_ORIGINS,
  BASE_HEADERS
}
