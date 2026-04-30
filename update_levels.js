const https = require('https');

const API_BASE = 'rcwljy-5ghmq2ex26764978.service.tcloudbase.com';

// 等级映射
const levelMapping = {
  'beginner': '初级工',
  'intermediate': '中级工',
  'advanced': '高级工',
  '初级': '初级工',
  '中级': '中级工',
  '高级': '高级工',
  '入门': '初级工',
  '进阶': '中级工',
};

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: API_BASE,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // 获取所有课程
  console.log('获取课程列表...');
  const result = await request('/db-init', 'POST', {
    action: 'getList',
    collection: 'courses',
    limit: 1000
  });
  
  const courses = result.data || [];
  console.log(`找到 ${courses.length} 个课程`);
  
  // 由于 HTTP API 不支持 update，我们需要使用云函数
  // 这里只是打印需要更新的课程
  let updateCount = 0;
  for (const course of courses) {
    const oldLevel = course.level || '';
    const newLevel = levelMapping[oldLevel];
    if (newLevel && newLevel !== oldLevel) {
      console.log(`需要更新: ${course.title} [${oldLevel}] -> [${newLevel}]`);
      updateCount++;
    }
  }
  console.log(`\n需要更新 ${updateCount} 个课程`);
  console.log('\n请在腾讯云开发控制台中：');
  console.log('1. 打开 sync-course-levels 云函数');
  console.log('2. 调用该云函数进行同步');
}

main().catch(console.error);
