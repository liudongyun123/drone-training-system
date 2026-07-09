/**
 * CloudBase 工具函数 - 已废弃
 * 
 * v3.0 迁移：所有 CloudBase SDK 功能已迁移到 adminService HTTP 通道
 * - 数据库操作 → adminService → db-init 云函数
 * - 认证操作 → adminService.callFunction('api-auth')
 * - 文件上传 → storageService → api-upload 云函数
 * - 云函数调用 → adminService.callFunction()
 * 
 * 此文件保留仅为兼容性，不应再被任何代码引用
 */

console.warn('[cloudbase] 此模块已废弃，请使用 adminService 或 cloudBaseService')

export const app = {
  get: () => null,
  auth: () => ({ 
    getLoginState: async () => null,
    getCurrentUser: async () => null,
    signInAnonymously: async () => { throw new Error('请使用 adminService.callFunction("api-auth")') },
    signOut: async () => {},
  }),
  database: () => { throw new Error('请使用 adminService 或 dbService') },
  callFunction: async () => { throw new Error('请使用 adminService.callFunction()') },
  uploadFile: async () => { throw new Error('请使用 storageService.uploadFile()') },
  getTempFileURL: async () => { throw new Error('请使用 storageService.getFileUrl()') },
}

export async function init() {
  console.warn('[cloudbase] init() 已废弃，不再需要 SDK 初始化')
}

export async function ensureInit() {
  // 不再需要 SDK 初始化，直接返回
}

export function getAuth() {
  console.warn('[cloudbase] getAuth() 已废弃，请使用 authService')
  return null
}

export function getDatabase() {
  console.warn('[cloudbase] getDatabase() 已废弃，请使用 dbService 或 adminService')
  return null
}

export async function callFunction() {
  throw new Error('请使用 adminService.callFunction()')
}

export function isReady() {
  return true // 不再需要 SDK 初始化，始终返回 true
}

export async function checkLogin() {
  const { adminService } = await import('@/services/adminService')
  const result = await adminService.callFunction('api-auth', { action: 'verifyToken', data: {} })
  return result?.data || null
}

export async function ensureAuthenticated() {
  // 不再需要 SDK 认证，直接返回
  return true
}

export default { app, init, ensureInit, getAuth, getDatabase, callFunction, isReady, checkLogin, ensureAuthenticated }
