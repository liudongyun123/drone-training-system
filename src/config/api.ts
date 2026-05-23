/**
 * 统一 API 配置
 * 所有 HTTP 客户端和云函数调用的基础 URL 在此集中管理
 */

/** CloudBase 环境 ID */
export const TCB_ENV_ID = import.meta.env.VITE_TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978'

/** CloudBase 服务基础地址 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `https://${TCB_ENV_ID}.service.tcloudbase.com`

/** 静态托管域名 */
export const HOSTING_URL = import.meta.env.VITE_HOSTING_URL || `https://${TCB_ENV_ID}-1318564729.tcloudbaseapp.com`

/** 请求超时（毫秒） */
export const REQUEST_TIMEOUT = 30000
