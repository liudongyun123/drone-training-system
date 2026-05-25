/**
 * 云存储服务
 * 处理文件上传、下载、删除等操作
 * 
 * 上传策略：
 * 1. 优先使用 CloudBase JS SDK 直传（需要匿名登录 + 存储写权限）
 * 2. SDK 直传失败时，回退到 api-upload 云函数 base64 中转上传
 */

import { app } from '@/utils/cloudbase';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const UPLOAD_API_URL = `${API_BASE_URL}/api-upload`;

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
 * 将 File 对象转为 base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉 data:xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 通过 api-upload 云函数上传文件（base64 中转）
 * 当 SDK 直传失败时使用此方法
 */
async function uploadViaCloudFunction(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    // 模拟进度
    onProgress?.(10);

    const fileContent = await fileToBase64(file);
    onProgress?.(50);

    // 确定上传 action
    let action = 'uploadFile';
    if (folder.includes('video') || folder.includes('Video')) {
      action = 'uploadVideo';
    } else if (folder.includes('pdf') || folder.includes('Pdf') || folder.includes('PDF')) {
      action = 'uploadPdf';
    } else if (folder.includes('avatar') || folder.includes('Avatar')) {
      action = 'uploadAvatar';
    } else if (folder.includes('image') || folder.includes('Image') || folder.includes('cover')) {
      action = 'uploadImage';
    }

    // 生成云存储路径
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
    const cloudPath = `${folder}/${timestamp}_${safeName}`;

    onProgress?.(70);

    const response = await axios.post(UPLOAD_API_URL, {
      action,
      fileContent,
      cloudPath,
      fileName: file.name,
      contentType: file.type,
    }, {
      timeout: 120000, // 2分钟超时，大文件需要更多时间
      headers: { 'Content-Type': 'application/json' },
    });

    onProgress?.(90);

    const data = response.data;
    if (data?.code === 0 && data?.data?.fileID) {
      onProgress?.(100);
      return {
        success: true,
        fileID: data.data.fileID,
        fileUrl: data.data.fileUrl,
      };
    }

    return {
      success: false,
      message: data?.error || data?.message || '云函数上传失败',
    };
  } catch (error: any) {
    console.error('[storageService] 云函数中转上传失败:', error);
    return {
      success: false,
      message: error.message || '云函数上传失败',
    };
  }
}

/**
 * 上传文件到云存储
 * @param file 文件对象
 * @param folder 存储文件夹路径
 * @param onProgress 上传进度回调
 * 
 * 上传策略：优先 SDK 直传，失败回退到云函数 base64 中转
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // 策略1: 先尝试 SDK 直传
  try {
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
  } catch (sdkError: any) {
    console.warn('[storageService] SDK 直传失败，回退到云函数中转:', sdkError?.message || sdkError);
  }

  // 策略2: SDK 直传失败，使用云函数 base64 中转上传
  return uploadViaCloudFunction(file, folder, onProgress);
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
