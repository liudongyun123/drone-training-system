#!/usr/bin/env node
/**
 * 修复 CAAC 课程 level 字段
 */

const https = require('https');
const http = require('http');

const ENV_CONFIG = {
  baseUrl: 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
};

const CAAC_SOURCE_ID = 'e35392d069fc521f0152e2c2537e32ad';

// 等级映射
const LEVEL_MAP = {
  '视距内驾驶员': '视距内驾驶员',
  '超视距驾驶员': '超视距驾驶员',
  '超视距驾驶员（机长）': '超视距驾驶员',
  '教员': '教员'
};

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, ENV_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON解析失败: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function queryCollection(collection, query = {}, limit = 100) {
  try {
    const result = await request('POST', '/db-init', {
      action: 'query',
      collection,
      query,
      limit
    });
    return result.data || [];
  } catch (error) {
    console.error(`查询失败:`, error);
    return [];
  }
}

async function updateDocument(collection, id, data) {
  try {
    return await request('POST', '/db-init', {
      action: 'update',
      collection,
      id,
      data
    });
  } catch (error) {
    console.error(`更新失败:`, error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n========== 修复 CAAC 课程 level 字段 ==========\n');

  // 获取所有 CAAC 课程
  const courses = await queryCollection('courses', { sourceId: CAAC_SOURCE_ID }, 100);
  
  console.log(`找到 ${courses.length} 个 CAAC 课程\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const course of courses) {
    const title = course.title || '';
    
    // 根据标题判断等级
    let level = null;
    if (title.includes('视距内驾驶员')) {
      level = '视距内驾驶员';
    } else if (title.includes('超视距驾驶员') || title.includes('机长')) {
      level = '超视距驾驶员';
    } else if (title.includes('教员')) {
      level = '教员';
    }

    if (level) {
      // 检查是否需要更新
      if (course.level === level) {
        console.log(`✓ [跳过] ${title} - level 已正确: ${level}`);
        skipped++;
      } else {
        console.log(`🔧 [修复] ${title} - 设置 level: ${level}`);
        const result = await updateDocument('courses', course._id, {
          level: level,
          levelText: level,
          updatedAt: new Date().toISOString()
        });
        
        if (result.success || result.code === 0) {
          fixed++;
          console.log(`  ✓ 修复成功`);
        } else {
          failed++;
          console.log(`  ✗ 修复失败: ${result.message || result.error}`);
        }
      }
    } else {
      console.log(`⚠️ [无法识别] ${title} - 无法确定等级`);
      failed++;
    }
  }

  console.log('\n========== 修复结果 ==========');
  console.log(`总计: ${courses.length}`);
  console.log(`已修复: ${fixed}`);
  console.log(`跳过: ${skipped}`);
  console.log(`失败: ${failed}\n`);

  // 验证修复
  console.log('\n========== 验证修复结果 ==========\n');
  
  const coursesAfter = await queryCollection('courses', { sourceId: CAAC_SOURCE_ID }, 100);
  
  const byLevel = {
    '视距内驾驶员': [],
    '超视距驾驶员': [],
    '教员': [],
    '未设置': []
  };
  
  for (const course of coursesAfter) {
    const level = course.level || '未设置';
    if (byLevel[level]) {
      byLevel[level].push(course.title);
    } else {
      byLevel['未设置'].push(course.title);
    }
  }
  
  for (const [level, titles] of Object.entries(byLevel)) {
    if (titles.length > 0) {
      console.log(`\n${level} (${titles.length} 个):`);
      titles.forEach(t => console.log(`  - ${t}`));
    }
  }
}

main().catch(console.error);
