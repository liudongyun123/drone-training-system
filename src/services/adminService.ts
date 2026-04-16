/**
 * 管理后台服务
 * 通过云函数处理所有管理后台的数据库操作
 */

import { app } from '@/utils/cloudbase'

// 云函数配置
const CLOUD_FUNCTION_NAME = 'admin'

/**
 * 调用管理后台云函数
 */
async function callAdminFunction(action, params = {}) {
  console.log(`[adminService] 调用云函数: action=${action}, params=`, params)
  try {
    // 调用云函数
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: {
        ...params,
        action
      }
    })

    console.log(`[adminService] 云函数返回:`, result)
    const response = result.result

    if (response.code !== 0) {
      console.error(`[adminService] 云函数调用失败:`, response)
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error) {
    console.error('[adminService] 管理后台服务错误:', error)
    throw error
  }
}

/**
 * 管理后台服务
 */
export const adminService = {
  /**
   * 查询列表
   */
  async list(collection, query = {}, options = {}) {
    return await callAdminFunction('list', { collection, query, options })
  },

  /**
   * 获取单个文档
   */
  async get(collection, docId) {
    return await callAdminFunction('get', { collection, docId })
  },

  /**
   * 添加文档
   */
  async add(collection, data) {
    return await callAdminFunction('add', { collection, data })
  },

  /**
   * 更新文档
   */
  async update(collection, docId, data) {
    return await callAdminFunction('update', { collection, docId, data })
  },

  /**
   * 删除文档
   */
  async delete(collection, docId) {
    return await callAdminFunction('delete', { collection, docId })
  },

  /**
   * 批量删除
   */
  async batchDelete(collection, query) {
    return await callAdminFunction('batchDelete', { collection, query })
  },

  /**
   * 统计数量
   */
  async count(collection, query = {}) {
    return await callAdminFunction('count', { collection, query })
  },

  /**
   * 聚合查询
   */
  async aggregate(collection, pipeline = [], options = {}) {
    return await callAdminFunction('aggregate', { collection, pipeline, options })
  },

  /**
   * Upsert (插入或更新)
   */
  async upsert(collection, docId, data) {
    return await callAdminFunction('upsert', { collection, docId, data })
  }
}

export default adminService
