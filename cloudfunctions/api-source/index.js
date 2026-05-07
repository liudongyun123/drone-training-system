/**
 * api-source 云函数 - 体系服务
 *
 * 功能：
 * - 获取所有体系
 * - 获取启用的体系列表
 * - 按体系获取分类
 */

// 动态选择 SDK
let cloud
let isWxEnv = false

try {
  cloud = require('wx-server-sdk')
  isWxEnv = true
} catch (e) {
  cloud = require('tcb-admin-node')
}

cloud.init({
  env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// ========== CORS 头 ==========

function getCorsHeaders(origin = '') {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://rcwljy-5ghmq2ex26764978-1318564729.tcloudbaseapp.com'
  ]

  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  }
}

// ========== 核心函数 ==========

/**
 * 获取所有体系
 */
async function getAllSources() {
  try {
    const result = await db.collection('sources')
      .orderBy('sortOrder', 'asc')
      .get()

    return {
      success: true,
      data: result.data || [],
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取体系列表失败:', err)
    return {
      success: false,
      error: err.message || '获取失败',
      message: '获取体系列表失败'
    }
  }
}

/**
 * 获取启用的体系列表
 */
async function getActiveSources() {
  try {
    const result = await db.collection('sources')
      .where({ status: 'active' })
      .orderBy('sortOrder', 'asc')
      .get()

    return {
      success: true,
      data: result.data || [],
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取启用的体系列表失败:', err)
    return {
      success: false,
      error: err.message || '获取失败',
      message: '获取启用的体系列表失败'
    }
  }
}

/**
 * 按体系获取分类
 * @param {string} sourceId - 体系ID
 */
async function getCategoriesBySource(sourceId) {
  try {
    const result = await db.collection('categories')
      .where({
        sourceId: sourceId,
        status: 'active'
      })
      .orderBy('sortOrder', 'asc')
      .get()

    return {
      success: true,
      data: result.data || [],
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取分类列表失败:', err)
    return {
      success: false,
      error: err.message || '获取失败',
      message: '获取分类列表失败'
    }
  }
}

// ========== 云函数入口 ==========

exports.main = async (event, context) => {
  const { origin = '' } = event.headers || {}
  const headers = getCorsHeaders(origin)

  // 处理 CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  const { action, sourceId } = event

  let result

  try {
    switch (action) {
      case 'getAll':
        result = await getAllSources()
        break
      case 'getActive':
        result = await getActiveSources()
        break
      case 'getCategories':
        result = await getCategoriesBySource(sourceId)
        break
      default:
        result = { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('云函数执行失败:', err)
    result = {
      success: false,
      error: err.message || '执行失败',
      message: '云函数执行失败'
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result)
  }
}