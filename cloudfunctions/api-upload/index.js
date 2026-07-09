/**
 * api-upload 云函数
 * 处理文件上传到 CloudBase 云存储
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978'
});

// CORS 响应头
const { corsHeaders } = require('./lib/cors');

function createResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(data)
  };
}

exports.main = async (event, context) => {
  console.log('[api-upload] 收到请求');

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return createResponse({ ok: true });
  }

  try {
    // 解析请求参数
    let params = event;
    if (event.body) {
      try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        params = body;
      } catch (e) {
        console.error('[api-upload] 解析body失败:', e);
      }
    }

    const { action, filePath, cloudPath, fileContent, contentType } = params;

    // 通用文件上传处理函数
    const handleFileUpload = async () => {
      if (!fileContent) {
        return createResponse({ code: 400, error: '缺少文件内容' });
      }

      // 生成云存储路径
      const timestamp = Date.now();
      const safeName = (params.fileName || 'file').replace(/[^a-zA-Z0-9\u4e00-\u9fa5.-]/g, '_');
      let path;
      
      if (cloudPath) {
        path = cloudPath;
      } else if (action === 'uploadAvatar') {
        const userId = params.userId || 'user';
        path = `avatars/${userId}_${timestamp}.jpg`;
      } else if (action === 'uploadVideo') {
        path = `chapters/video/${timestamp}_${safeName}`;
      } else if (action === 'uploadPdf') {
        path = `chapters/pdf/${timestamp}_${safeName}`;
      } else if (action === 'uploadImage') {
        path = `images/${timestamp}_${safeName}`;
      } else {
        path = `uploads/${timestamp}_${safeName}`;
      }

      // 将 base64 转换为 Buffer
      const buffer = Buffer.from(fileContent, 'base64');

      console.log(`[api-upload] ${action} 上传: ${path}, 大小: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

      // 上传到云存储
      const result = await app.uploadFile({
        cloudPath: path,
        fileContent: buffer
      });

      console.log('[api-upload] 上传成功:', result.fileID);

      // 获取文件下载链接
      const urlResult = await app.getTempFileURL({
        fileList: [{
          fileID: result.fileID,
          maxAge: 7 * 24 * 60 * 60 // 7天有效期
        }]
      });

      const fileUrl = urlResult.fileList[0]?.tempFileURL || result.fileID;

      return createResponse({
        code: 0,
        success: true,
        data: {
          fileID: result.fileID,
          fileUrl: fileUrl,
          cloudPath: path
        },
        message: '上传成功'
      });
    };

    // 支持多种上传 action
    if (['uploadAvatar', 'uploadVideo', 'uploadPdf', 'uploadImage', 'uploadFile'].includes(action)) {
      return await handleFileUpload();
    }

    // ========== 获取文件临时访问链接（单个） ==========
    if (action === 'getTempFileURL') {
      const { fileID, maxAge } = params;
      if (!fileID) {
        return createResponse({ code: 400, error: '缺少 fileID 参数' });
      }
      try {
        const urlResult = await app.getTempFileURL({
          fileList: [{ fileID, maxAge: maxAge || 7200 }]
        });
        const fileInfo = urlResult.fileList[0] || {};
        const tempFileURL = fileInfo.tempFileURL || '';
        return createResponse({
          code: 0,
          success: true,
          data: { fileID, tempFileURL, code: fileInfo.code }
        });
      } catch (err) {
        console.error('[api-upload] getTempFileURL 失败:', err);
        return createResponse({ code: 500, error: err.message || '获取链接失败' });
      }
    }

    // ========== 批量获取文件临时访问链接 ==========
    if (action === 'getTempFileURLs') {
      const { fileIDs, maxAge } = params;
      if (!fileIDs || !Array.isArray(fileIDs) || fileIDs.length === 0) {
        return createResponse({ code: 400, error: '缺少 fileIDs 参数' });
      }
      try {
        const urlResult = await app.getTempFileURL({
          fileList: fileIDs.map((id) => ({ fileID: id, maxAge: maxAge || 7200 }))
        });
        return createResponse({
          code: 0,
          success: true,
          data: { fileList: urlResult.fileList || [] }
        });
      } catch (err) {
        console.error('[api-upload] getTempFileURLs 失败:', err);
        return createResponse({ code: 500, error: err.message || '获取链接失败' });
      }
    }

    // ========== 删除云存储文件 ==========
    if (action === 'deleteFile') {
      const { fileID } = params;
      if (!fileID) {
        return createResponse({ code: 400, error: '缺少 fileID 参数' });
      }
      try {
        const result = await app.deleteFile({ fileList: [fileID] });
        const fileResult = result.fileList[0] || {};
        return createResponse({
          code: fileResult.code === 'SUCCESS' ? 0 : 500,
          success: fileResult.code === 'SUCCESS',
          data: { fileID, code: fileResult.code },
          error: fileResult.code !== 'SUCCESS' ? fileResult.code : undefined
        });
      } catch (err) {
        console.error('[api-upload] deleteFile 失败:', err);
        return createResponse({ code: 500, error: err.message || '删除失败' });
      }
    }

    return createResponse({ code: 400, error: `未知操作: ${action}` });

  } catch (error) {
    console.error('[api-upload] 处理失败:', error);
    return createResponse({
      code: 500,
      success: false,
      error: error.message || '处理失败'
    });
  }
};
