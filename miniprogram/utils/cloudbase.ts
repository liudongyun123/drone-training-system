// utils/cloudbase.ts
// CloudBase 云开发工具函数
// 小程序通过云调用连接腾讯云 CloudBase

import logger from './logger'

const ENV_ID = 'rcwljy-5ghmq2ex26764978'

/**
 * 初始化云开发（必须调用才能使用 wx.cloud.callFunction）
 */
export function initCloud() {
  if (!wx.cloud) {
    logger.error('CloudBase', 'wx.cloud 不存在，请检查基础库版本')
    return
  }
  
  // 使用固定环境
  wx.cloud.init({
    env: 'rcwljy-5ghmq2ex26764978',
    traceUser: true
  })
  logger.debug('CloudBase', '云开发已初始化')
}

/**
 * 获取环境 ID
 */
export function getEnvId() {
  return ENV_ID
}

/**
 * 获取数据库引用（HTTP 模式不使用）
 */
export function getDatabase() {
  throw new Error('HTTP 模式请使用 api 模块')
}

/**
 * 调用云函数（通过 HTTP）
 */
export async function callFunction<T = any>(name: string, data?: any): Promise<T> {
  const { callFunction: httpCallFunction } = require('./http')
  return await httpCallFunction(name, data)
}

/**
 * 获取文件下载链接
 */
export async function getTempFileURL(fileID: string): Promise<string> {
  return fileID
}

/**
 * 上传文件（HTTP 模式不支持）
 */
export async function uploadFile(
  filePath: string,
  cloudPath?: string
): Promise<string> {
  throw new Error('HTTP 模式暂不支持文件上传')
}
