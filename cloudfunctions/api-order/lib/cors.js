/**
 * 共享响应头工具模块
 * 
 * CORS 头由 CloudBase HTTP 网关自动添加，云函数代码只设 Content-Type
 * 避免 Access-Control-Allow-Origin 重复导致浏览器 CORS 报错
 * 
 * 使用方式：
 *   const { getHeaders } = require('./lib/cors')
 *   const { baseHeaders } = require('./lib/cors')
 */

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8'
}

/**
 * 基础响应头（仅 Content-Type）
 * @returns {object}
 */
function getHeaders() {
  return { ...BASE_HEADERS }
}

/**
 * 预设的响应头常量
 */
const baseHeaders = {
  ...BASE_HEADERS
}

module.exports = {
  getHeaders,
  baseHeaders,
  corsHeaders: baseHeaders  // 保持向后兼容，api-order 使用 corsHeaders 的地方自动获得不含 CORS 的头
}
