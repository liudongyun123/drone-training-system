// 统一从 utils/cloudbase 导入 app 实例，避免重复初始化
import { app } from '@/utils/cloudbase'

export default app

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
