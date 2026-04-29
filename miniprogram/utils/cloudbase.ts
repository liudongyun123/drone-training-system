// utils/cloudbase.ts
// CloudBase 云开发工具函数

const ENV_ID = 'drone-training-xxx' // 替换为实际环境ID

/**
 * 初始化云开发
 */
export function initCloud() {
  if (wx.cloud) {
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true
    })
  }
}

/**
 * 获取数据库引用
 */
export function getDatabase() {
  return wx.cloud.database()
}

/**
 * 调用云函数
 */
export async function callFunction<T = any>(name: string, data?: any): Promise<T> {
  try {
    const res = await wx.cloud.callFunction({
      name,
      data
    })
    return res.result as T
  } catch (err) {
    console.error(`云函数 ${name} 调用失败:`, err)
    throw err
  }
}

/**
 * 获取文件下载链接
 */
export async function getTempFileURL(fileID: string): Promise<string> {
  try {
    const res = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    })
    return res.fileList[0].tempFileURL
  } catch (err) {
    console.error('获取文件链接失败:', err)
    return fileID // 返回原 fileID
  }
}

/**
 * 上传文件
 */
export async function uploadFile(
  filePath: string,
  cloudPath?: string
): Promise<string> {
  try {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    const ext = filePath.split('.').pop() || 'jpg'
    const path = cloudPath || `uploads/${timestamp}_${random}.${ext}`
    
    const res = await wx.cloud.uploadFile({
      cloudPath: path,
      filePath
    })
    
    return res.fileID
  } catch (err) {
    console.error('上传文件失败:', err)
    throw err
  }
}