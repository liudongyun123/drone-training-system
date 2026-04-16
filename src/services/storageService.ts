/**
 * 云存储服务
 * 处理文件上传、下载、删除等操作
 */

import { app } from '@/utils/cloudbase';

export interface UploadResult {
  success: boolean;
  fileID?: string;
  fileUrl?: string;
  message?: string;
}

export interface FileInfo {
  fileID: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

/**
 * 上传文件到云存储
 * @param file 文件对象
 * @param folder 存储文件夹路径
 * @param onProgress 上传进度回调
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // 生成文件名：文件夹/时间戳_原文件名
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
    const cloudPath = `${folder}/${timestamp}_${safeName}`;

    const result = await app.uploadFile({
      cloudPath,
      filePath: file,
      onUploadProgress: onProgress ? (progressEvent: any) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      } : undefined,
    });

    if (result.fileID) {
      return {
        success: true,
        fileID: result.fileID,
      };
    }

    return {
      success: false,
      message: '上传失败',
    };
  } catch (error: any) {
    console.error('文件上传失败:', error);
    return {
      success: false,
      message: error.message || '上传失败',
    };
  }
}

/**
 * 获取文件的临时访问URL
 * @param fileID 云存储文件ID
 * @param maxAge URL有效期（秒），默认2小时
 */
export async function getFileUrl(fileID: string, maxAge: number = 7200): Promise<string | null> {
  try {
    const result = await app.getTempFileURL({
      fileList: [{ fileID, maxAge }],
    });

    if (result.fileList && result.fileList.length > 0) {
      const file = result.fileList[0];
      if (file.code === 'SUCCESS') {
        return file.tempFileURL;
      }
    }
    return null;
  } catch (error) {
    console.error('获取文件URL失败:', error);
    return null;
  }
}

/**
 * 删除云存储文件
 * @param fileID 云存储文件ID
 */
export async function deleteFile(fileID: string): Promise<boolean> {
  try {
    const result = await app.deleteFile({
      fileList: [fileID],
    });

    if (result.fileList && result.fileList.length > 0) {
      return result.fileList[0].code === 'SUCCESS';
    }
    return false;
  } catch (error) {
    console.error('删除文件失败:', error);
    return false;
  }
}

/**
 * 批量获取文件URL
 * @param fileIDs 文件ID数组
 * @param maxAge URL有效期（秒）
 */
export async function getFileUrls(fileIDs: string[], maxAge: number = 7200): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  if (fileIDs.length === 0) return urlMap;

  try {
    const result = await app.getTempFileURL({
      fileList: fileIDs.map(fileID => ({ fileID, maxAge })),
    });

    if (result.fileList) {
      result.fileList.forEach(file => {
        if (file.code === 'SUCCESS' && file.tempFileURL) {
          urlMap.set(file.fileID, file.tempFileURL);
        }
      });
    }
  } catch (error) {
    console.error('批量获取文件URL失败:', error);
  }

  return urlMap;
}

/**
 * 验证文件类型
 * @param file 文件对象
 * @param allowedTypes 允许的文件类型数组
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.includes('*')) {
      // 通配符匹配，如 "image/*"
      const prefix = type.replace('/*', '');
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
}

/**
 * 验证文件大小
 * @param file 文件对象
 * @param maxSizeMB 最大大小（MB）
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 默认导出
export default {
  uploadFile,
  getFileUrl,
  deleteFile,
  getFileUrls,
  validateFileType,
  validateFileSize,
  formatFileSize,
};
