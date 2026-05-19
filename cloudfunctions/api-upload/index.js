/**
 * api-upload 云函数
 * 处理文件上传到 CloudBase 云存储
 */

const tcb = require('tcb-admin-node');

const app = tcb.init({
  env: 'rcwljy-5ghmq2ex26764978'
});

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

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

    if (action === 'uploadAvatar') {
      // 上传头像 - 接收 base64 数据
      if (!fileContent) {
        return createResponse({ code: 400, error: '缺少文件内容' });
      }

      // 生成云存储路径
      const userId = params.userId || 'user';
      const timestamp = Date.now();
      const path = cloudPath || `avatars/${userId}_${timestamp}.jpg`;

      // 将 base64 转换为 Buffer
      const buffer = Buffer.from(fileContent, 'base64');

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
    }

    return createResponse({ code: 400, error: '未知操作' });

  } catch (error) {
    console.error('[api-upload] 上传失败:', error);
    return createResponse({
      code: 500,
      success: false,
      error: error.message || '上传失败'
    });
  }
};
