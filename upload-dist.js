#!/usr/bin/env node
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const ENV_ID = 'rcwljy-5ghmq2ex26764978';
const PUBLISHABLE_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3Jjd2xqeS01Z2htcTJleDI2NzY0OTc4LmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJyY3dsanktNWdobXEyZXgyNjc2NDk3OCIsImV4cCI6NDA3NzU5NTUxNCwiaWF0IjoxNzczOTEyMzE0LCJub25jZSI6Ik5ta1U4MXRaUTdHTnFvT2kxY3hrOHciLCJhdF9oYXNoIjoiTm1rVTgxdFpRN0dOcW9PaTFjeGs4dyIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJyY3dsanktNWdobXEyZXgyNjc2NDk3OCIsInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWMiOmZhbHNlfQ.QBOkGCaryupFFhFuxDIwDljwC5PRan_zMneIjlaa9_UJLz1ajlBumYCmaFA5IAYQ97yC5fuxmH36HjhBoegA3XY1gE_BNL0aRcD-Gwu5Tmk57IrPzXKKkXN3eSCbJmD3aLVDeHguRyUO1Qc3oSIiUVlVox77BGj7GFw9TdQzJaWnrRWSmhsPaQoiSqI7HjhdDhIpVoMBZfSpAY1kqEjUvZ8r54e6vHgGm6XmeQXFQQ9141SUAt839J45rkhrRWS28Yxt6Rlbrk7nGllYV-q_uuTzdCaBw0aUYdoRJAHoyaPyTz2rIPexk36Ox8Ai9pQpmn9RcrTpm0MXJIoQrrwNLw';

// 上传文件到 CloudBase
async function uploadFile(localPath, cloudPath) {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(localPath);
    const fileSize = stat.size;
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const fileContent = fs.readFileSync(localPath);
    
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${path.basename(localPath)}"\r\n`),
      Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    const options = {
      hostname: `${ENV_ID}.tcb-api.tencentcloudapi.com`,
      path: `/v1/apis/${ENV_ID}/storage/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization': `Bearer ${PUBLISHABLE_KEY}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0 || res.statusCode === 200) {
            console.log(`✅ 上传成功: ${cloudPath}`);
            resolve(result);
          } else {
            console.log(`❌ 上传失败: ${cloudPath} - ${data}`);
            reject(new Error(data));
          }
        } catch (e) {
          console.log(`❌ 解析失败: ${cloudPath} - ${data}`);
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log(`❌ 请求失败: ${cloudPath} - ${e.message}`);
      reject(e);
    });
    
    req.write(body);
    req.end();
  });
}

// 遍历目录上传所有文件
async function uploadDirectory(dir, basePath = '') {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const cloudPath = basePath ? `${basePath}/${file}` : file;
    
    if (fs.statSync(fullPath).isDirectory()) {
      await uploadDirectory(fullPath, cloudPath);
    } else {
      try {
        await uploadFile(fullPath, cloudPath);
      } catch (e) {
        console.log(`跳过: ${cloudPath}`);
      }
    }
  }
}

// 主函数
async function main() {
  const distDir = path.join(__dirname, 'dist');
  console.log('开始上传 dist 目录...');
  await uploadDirectory(distDir);
  console.log('上传完成！');
}

main().catch(console.error);
