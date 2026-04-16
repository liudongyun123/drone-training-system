// 统一从 utils/cloudbase 导入 app 实例，避免重复初始化
import { app } from '@/utils/cloudbase'

export default app

// API 基础路径 - 从环境变量读取或使用默认地址
const getApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL
  if (envBase) {
    return envBase
  }
  // 移除 /api 后缀，确保是基础地址
  return 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
}

const API_BASE = getApiBase()

export const api = {
  // 用户登录
  login: `${API_BASE}/auth-login`,

  // 获取课程列表
  coursesList: `${API_BASE}/courses-list`,

  // 创建订单
  createOrder: `${API_BASE}/orders-create`,

  // 支付回调
  orderCallback: `${API_BASE}/orders-callback`,

  // 更新进度
  updateProgress: `${API_BASE}/progress-update`
}

// 云函数调用方法
export const callCloudFunction = async (name, data = {}) => {
  try {
    const result = await app.callFunction({
      name,
      data
    })
    return result.result
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error)
    throw error
  }
}
