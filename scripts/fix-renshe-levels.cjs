#!/usr/bin/env node
/**
 * 修复 RENSHE 课程 level 字段
 */

const https = require('https');
const http = require('http');

const ENV_CONFIG = {
  baseUrl: 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
};

// RENSHE 等级
const RENSHE_LEVELS = ['初级工', '中级工', '高级工', '技师', '高级技师'];

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
  console.log('\n========== 修复 RENSHE 课程 level 字段 ==========\n');

  // 获取所有分类
  const categories = await queryCollection('categories', {}, 100);
  const rensheCategories = categories.filter(c => 
    c.sourceCode === 'RENSHE' || c.code === 'RENSHE' || 
    c.name.includes('无人机') || c.name.includes('植保') ||
    c.name.includes('航拍') || c.name.includes('巡检') ||
    c.name.includes('测绘') || c.name.includes('物流') ||
    c.name.includes('安防')
  );
  
  const catIds = new Set(rensheCategories.map(c => c._id));
  
  console.log(`找到 ${rensheCategories.length} 个 RENSHE 分类`);
  console.log('分类列表:', rensheCategories.map(c => c.name).join(', '));
  console.log('');

  // 获取所有课程
  const allCourses = await queryCollection('courses', {}, 1000);
  const rensheCourses = allCourses.filter(c => 
    catIds.has(c.categoryId) || 
    c.sourceCode === 'RENSHE' ||
    (c.title && (
      c.title.includes('初级工') || 
      c.title.includes('中级工') ||
      c.title.includes('高级工') ||
      c.title.includes('技师')
    ))
  );
  
  console.log(`找到 ${rensheCourses.length} 个 RENSHE 课程\n`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const course of rensheCourses) {
    const title = course.title || '';
    
    // 根据标题判断等级
    let level = null;
    if (title.includes('初级工')) {
      level = '初级工';
    } else if (title.includes('中级工')) {
      level = '中级工';
    } else if (title.includes('高级工')) {
      level = '高级工';
    } else if (title.includes('技师') && !title.includes('高级技师')) {
      level = '技师';
    } else if (title.includes('高级技师')) {
      level = '高级技师';
    }

    if (level) {
      if (course.level === level) {
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
        } else {
          failed++;
          console.log(`  ✗ 失败: ${result.message || result.error}`);
        }
      }
    } else {
      console.log(`⚠️ [无法识别] ${title}`);
      failed++;
    }
  }

  console.log('\n========== 修复结果 ==========');
  console.log(`总计: ${rensheCourses.length}`);
  console.log(`已修复: ${fixed}`);
  console.log(`跳过: ${skipped}`);
  console.log(`失败: ${failed}\n`);

  // 按等级统计
  console.log('\n========== 按等级统计 ==========\n');
  const byLevel = {};
  for (const level of RENSHE_LEVELS) {
    byLevel[level] = allCourses.filter(c => c.level === level).length;
  }
  byLevel['未设置'] = allCourses.filter(c => !c.level).length;
  
  for (const [level, count] of Object.entries(byLevel)) {
    console.log(`  ${level}: ${count} 个`);
  }
}

main().catch(console.error);
