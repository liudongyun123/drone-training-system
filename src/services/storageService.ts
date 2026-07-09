/**
 * 云存储服务
 * 处理文件上传、下载、删除等操作
 *
 * 上传策略：
 * 1. 小文件（≤4MB）优先使用 api-upload 云函数（base64 中转，需低于 HTTP 触发器 6MB 请求体限制）
 * 2. 大文件（>4MB）使用 @cloudbase/js-sdk 直传到对象存储（COS），支持大文件
 */

import axios from 'axios';
import cloudbase from '@cloudbase/js-sdk';
import { API_BASE_URL, TCB_ENV_ID } from '@/config/api';

const UPLOAD_API_URL = `${API_BASE_URL}/api-upload`;

// 复用 cloudbase app 实例
let cloudbaseApp: any = null;

function getCloudbaseApp() {
  if (!cloudbaseApp) {
    cloudbaseApp = cloudbase.init({
      env: TCB_ENV_ID,
    });
  }
  return cloudbaseApp;
}

/**
 * 确保 cloudbase 已登录（匿名或已登录用户均可）
 * 直传必须至少有一个有效身份
 */
async function ensureCloudbaseAuth() {
  const app = getCloudbaseApp();
  const auth = app.auth();

  try {
    const loginState = await auth.getLoginState();
    if (loginState) {
      return;
    }
  } catch (error) {
    // 未登录，继续匿名登录
  }

  try {
    await auth.anonymousAuthProvider().signIn();
  } catch (error: any) {
    console.error('[storageService] 匿名认证失败:', error);
    throw new Error('上传认证失败：' + (error?.message || '请检查匿名登录是否开启'));
  }
}

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
 * 解析 CloudBase HTTP 函数响应
 * CloudBase HTTP 触发器返回 { statusCode, headers, body: "JSON字符串" }
 * 需要提取 body 字符串并解析为 JSON
 */
function parseResponse(response: any): any {
  const raw = response?.data || response;
  // 如果是 CloudBase HTTP 触发器包装格式
  if (raw && typeof raw === 'object' && 'body' in raw && typeof raw.body === 'string') {
    try {
      return JSON.parse(raw.body);
    } catch {
      return raw;
    }
  }
  // 已经是解析后的 JSON 对象
  return raw;
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
 * 仅用于小文件兜底，大文件请使用 @cloudbase/js-sdk 直传
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

    // 生成云存储路径（视频强制 .mp4 扩展名）
    const timestamp = Date.now();
    let safeName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
    const isVideoFolder = /video|lessons\/video|chapters\/video/i.test(folder);
    if (isVideoFolder && !safeName.toLowerCase().endsWith('.mp4')) {
      safeName = safeName.replace(/\.[^.]+$/, '') + '.mp4';
    }
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

    const data = parseResponse(response);
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
 * 小文件使用 api-upload 云函数，大文件使用 @cloudbase/js-sdk 直传
 * @param file 文件对象
 * @param folder 存储文件夹路径
 * @param onProgress 上传进度回调
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const isVideoFolder = /video|lessons\/video|chapters\/video/i.test(folder);
  const timestamp = Date.now();
  let safeName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
  if (isVideoFolder && !safeName.toLowerCase().endsWith('.mp4')) {
    safeName = safeName.replace(/\.[^.]+$/, '') + '.mp4';
  }
  const cloudPath = `${folder}/${timestamp}_${safeName}`;

  // 策略：小文件（≤4MB）走 api-upload 云函数；base64 后约 5.3MB + JSON 包装，留足余量避免 413
  // 大文件（>4MB）走 JS SDK 直传到 COS，不经过 HTTP 触发器
  const CLOUD_FUNC_LIMIT = 4 * 1024 * 1024;

  if (file.size <= CLOUD_FUNC_LIMIT) {
    const cfResult = await uploadViaCloudFunction(file, folder, onProgress);
    if (cfResult.success && cfResult.fileID) {
      // ★ 云函数上传也需要验证（防止 base64 解码异常产生空文件）
      try {
        await ensureCloudbaseAuth();
        const app = getCloudbaseApp();
        const verifyResult = await verifyUploadedFile(app, cfResult.fileID, file.size);
        if (verifyResult.ok) {
          onProgress?.(100);
          return {
            ...cfResult,
            fileUrl: verifyResult.url || cfResult.fileUrl,
          };
        }
        // 验证失败：清理空文件
        console.warn('[storageService] 云函数上传验证失败，清理文件:', verifyResult.message);
        await deleteFileViaSDK(app, cfResult.fileID);
        throw new Error(verifyResult.message);
      } catch (verifyErr: any) {
        console.warn('[storageService] 云函数上传验证异常，转 SDK 直传:', verifyErr?.message);
        // 继续走 SDK 路径
      }
    } else {
      console.warn('[storageService] 云函数上传失败，尝试 SDK 直传:', cfResult.message);
    }
  }

  // JS SDK 直传（适用于大文件，也作为小文件兜底）
  let uploadedFileID: string | undefined;
  try {
    await ensureCloudbaseAuth();
    const app = getCloudbaseApp();

    onProgress?.(10);

    // 浏览器端 SDK 必须使用 filePath 传入 File 对象；fileContent 在浏览器端不被支持
    const result = await app.uploadFile({
      cloudPath,
      filePath: file,
      onUploadProgress: (progressEvent: any) => {
        const loaded = progressEvent?.loaded || 0;
        const total = progressEvent?.total || file.size || 1;
        const percent = Math.max(10, Math.min(90, Math.round((loaded / total) * 80)));
        onProgress?.(percent);
      }
    });

    uploadedFileID = result.fileID;
    onProgress?.(90);

    // 验证文件是否真的写入云存储（带重试和 CDN 传播延迟容忍）
    const verifyResult = await verifyUploadedFile(app, result.fileID, file.size);
    if (!verifyResult.ok) {
      // ★ 关键修复：清理验证失败的孤文件，避免留下 0 字节垃圾
      await deleteFileViaSDK(app, result.fileID);
      throw new Error(verifyResult.message || '上传后文件验证失败');
    }

    onProgress?.(100);

    return {
      success: true,
      fileID: result.fileID,
      fileUrl: verifyResult.url || result.fileID,
    };
  } catch (error: any) {
    console.error('[storageService] SDK 直传失败:', error);

    // ★ 兜底：异常时也尝试清理已创建的文件
    if (uploadedFileID) {
      try {
        await ensureCloudbaseAuth();
        const app = getCloudbaseApp();
        await deleteFileViaSDK(app, uploadedFileID);
      } catch (cleanupErr) {
        console.warn('[storageService] 异常清理失败:', cleanupErr);
      }
    }

    return {
      success: false,
      message: error?.message || '文件上传失败',
    };
  }
}

/**
 * 通过 SDK 删除云存储文件（内部使用，不需要 HTTP API 中转）
 */
async function deleteFileViaSDK(app: any, fileID: string): Promise<void> {
  try {
    const delResult = await app.deleteFile({ fileList: [fileID] });
    const fileResult = delResult?.fileList?.[0];
    if (fileResult?.code === 'SUCCESS') {
      console.log('[storageService] 已清理验证失败的文件:', fileID);
    } else {
      console.warn('[storageService] 清理文件结果:', fileResult);
    }
  } catch (err) {
    console.warn('[storageService] 清理文件失败（可能已被自动回收）:', err);
  }
}

/**
 * 验证云存储文件是否真实存在且非空
 * 支持重试机制，容忍 CDN 传播延迟（大文件可能需要数秒才能被 CDN 节点感知）
 */
async function verifyUploadedFile(
  app: any,
  fileID: string,
  expectedSize?: number,
  maxRetries: number = 3,
  retryDelayMs: number = 2000
): Promise<{ ok: boolean; url?: string; message?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const urlResult = await app.getTempFileURL({
        fileList: [{ fileID, maxAge: 60 }]
      });
      const fileInfo = urlResult?.fileList?.[0];
      if (!fileInfo || fileInfo.code !== 'SUCCESS') {
        if (attempt < maxRetries) {
          console.warn(`[storageService] 第${attempt}次验证失败（无法获取链接），${retryDelayMs}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }
        return { ok: false, message: '无法获取文件临时链接' };
      }
      const url = fileInfo.tempFileURL || fileInfo.download_url;
      if (!url) {
        if (attempt < maxRetries) {
          console.warn(`[storageService] 第${attempt}次验证失败（临时链接为空），${retryDelayMs}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }
        return { ok: false, message: '文件临时链接为空' };
      }

      // HEAD 检查文件大小
      const headRes = await axios.head(url, { timeout: 10000 });
      const contentLength = headRes.headers['content-length'];

      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > 0) {
          // 如果有 expectedSize，验证大小是否合理（±10%容差）
          if (expectedSize && size > 0) {
            const ratio = size / expectedSize;
            if (ratio < 0.9 || ratio > 1.1) {
              console.warn(`[storageService] 文件大小偏差: 期望${expectedSize}, 实际${size}, 比率${ratio.toFixed(2)}`);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                continue;
              }
              // 有内容但大小不对，以 HEAD 返回为准
            }
          }
          return { ok: true, url };
        }
      }

      // content-length 缺失或为 0：尝试 GET Range 请求（只取前1字节）来二次确认
      if (!contentLength || parseInt(contentLength, 10) === 0) {
        console.warn(`[storageService] 第${attempt}次验证: content-length=${contentLength || '缺失'}，尝试 Range 验证...`);
        try {
          const rangeRes = await axios.get(url, {
            timeout: 10000,
            headers: { 'Range': 'bytes=0-0' },
            responseType: 'arraybuffer',
          });
          const rangeContentLength = rangeRes.headers['content-length'];
          const rangeStatus = rangeRes.status;

          // 206 = Partial Content（成功），200 = 文件太小不支持 Range（也说明有内容）
          if (rangeStatus === 206 || rangeStatus === 200) {
            if (rangeContentLength && parseInt(rangeContentLength, 10) > 0) {
              console.log('[storageService] Range 验证通过，文件非空');
              return { ok: true, url };
            }
            // 206 + content-length=1 说明至少有1字节
            if (rangeRes.data && (rangeRes.data as ArrayBuffer).byteLength > 0) {
              console.log('[storageService] Range 验证通过，返回了数据');
              return { ok: true, url };
            }
          }
        } catch (rangeErr) {
          console.warn('[storageService] Range 验证请求失败:', rangeErr);
        }

        if (attempt < maxRetries) {
          console.warn(`[storageService] 第${attempt}次验证文件为空，${retryDelayMs}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }
        return { ok: false, message: '文件大小为 0，上传未成功（已重试' + maxRetries + '次）' };
      }
    } catch (error: any) {
      console.error(`[storageService] 第${attempt}次验证异常:`, error?.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        continue;
      }
      return { ok: false, message: error?.message || '验证上传文件失败' };
    }
  }

  return { ok: false, message: '验证超时，无法确认文件状态' };
}

/**
 * 获取文件的临时访问URL
 * @param fileID 云存储文件ID
 * @param maxAge URL有效期（秒），默认2小时
 */
export async function getFileUrl(fileID: string, maxAge: number = 7200): Promise<string | null> {
  try {
    const response = await axios.post(UPLOAD_API_URL, {
      action: 'getTempFileURL',
      fileID,
      maxAge,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = parseResponse(response);
    if (data?.data?.tempFileURL) {
      return data.data.tempFileURL;
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
    const response = await axios.post(UPLOAD_API_URL, {
      action: 'deleteFile',
      fileID,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = parseResponse(response);
    return data?.success === true || data?.code === 0;
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
    const response = await axios.post(UPLOAD_API_URL, {
      action: 'getTempFileURLs',
      fileIDs,
      maxAge,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = parseResponse(response);
    if (data?.data?.fileList) {
      data.data.fileList.forEach((file: any) => {
        if (file.tempFileURL) {
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
