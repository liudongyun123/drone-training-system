#!/usr/bin/env node
/**
 * ============================================================================
 * 分类数据修复脚本 - 修复课程/培训班的 categoryId 关联问题
 * ============================================================================
 * 
 * 功能：
 * 1. 检查分类表 (categories) 和课程表 (courses) 的关联
 * 2. 修复缺失或错误的 categoryId
 * 3. 验证修复结果
 * 
 * 使用方法：
 *   node scripts/fix-category-data.js [--dry-run] [--verbose]
 * 
 * ============================================================================
 */

const https = require('https');
const http = require('http');

// ============================================================================
// 配置
// ============================================================================

const ENV_CONFIG = {
  baseUrl: 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
};

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
    ERROR: '\x1b[31m[ERROR]\x1b[0m',
    SUCCESS: '\x1b[32m[SUCCESS]\x1b[0m',
    FIX: '\x1b[35m[FIX]\x1b[0m',
  }[level] || '[LOG]';
  
  console.log(`${timestamp} ${prefix} ${message}`);
  if (isVerbose && data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// API 请求
// ============================================================================

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
    log('ERROR', `查询集合 ${collection} 失败`, { error: error.message });
    return [];
  }
}

async function updateDocument(collection, id, data) {
  if (isDryRun) {
    log('FIX', `[DryRun] 更新 ${collection}/${id}`, data);
    return { success: true };
  }
  
  try {
    return await request('POST', '/db-init', {
      action: 'update',
      collection,
      id,
      data
    });
  } catch (error) {
    log('ERROR', `更新失败`, { collection, id, error: error.message });
    return { success: false };
  }
}

// ============================================================================
// 分类映射表
// ============================================================================

// CAAC 分类
const CAAC_CATEGORIES = [
  { _id: 'ae0498ca69fc52380151cf9344ba694d', name: '多旋翼', code: 'MULTI_ROTOR' },
  { _id: 'ae0498ca69fc52380151cf9416b82e7b', name: '固定翼', code: 'FIXED_WING' },
  { _id: 'ae0498ca69fc52380151cf9549195c14', name: '直升机', code: 'HELICOPTER' },
  { _id: 'ae0498ca69fc52380151cf9623c7aaa9', name: '垂直起降固定翼', code: 'VTOL' }
];

// RENSHE 分类
const RENSHE_CATEGORIES = [
  { _id: 'cat_renshe_001', name: '植保', code: 'PLANT_PROTECTION' },
  { _id: 'cat_renshe_002', name: '航拍', code: 'AERIAL_PHOTOGRAPHY' },
  { _id: 'cat_renshe_003', name: '巡检', code: 'INSPECTION' },
  { _id: 'cat_renshe_004', name: '测绘', code: 'SURVEYING' }
];

// 分类名称到ID的映射（用于修复）
const CATEGORY_NAME_TO_ID = new Map([
  ...CAAC_CATEGORIES.map(c => [c.name, c._id]),
  ...RENSHE_CATEGORIES.map(c => [c.name, c._id])
]);

// ============================================================================
// 主要逻辑
// ============================================================================

async function fixCourses() {
  log('INFO', '\n========== 开始修复课程数据 ==========');
  
  // 1. 获取所有分类
  const categories = await queryCollection('categories', {}, 100);
  log('INFO', `找到 ${categories.length} 个分类`);
  
  // 构建分类映射
  const catMap = new Map();
  categories.forEach(cat => {
    catMap.set(cat.name, cat);
    catMap.set(cat._id, cat);
    if (cat.code) {
      catMap.set(cat.code, cat);
    }
  });
  
  log('INFO', '分类映射表:', Array.from(catMap.keys()).slice(0, 10));
  
  // 2. 获取所有课程
  const courses = await queryCollection('courses', {}, 1000);
  log('INFO', `找到 ${courses.length} 个课程`);
  
  const stats = {
    total: courses.length,
    correct: 0,       // categoryId 正确
    missing: 0,       // categoryId 缺失
    wrong: 0,        // categoryId 错误
    fixed: 0,        // 已修复
    failed: 0        // 修复失败
  };
  
  const issues = [];
  
  for (const course of courses) {
    const courseId = course._id;
    const courseName = course.title || course.name || '未命名';
    const currentCategoryId = course.categoryId;
    const currentCategoryName = course.category;
    const level = course.level || course.levelText || '';
    
    // 尝试找到正确的分类
    let correctCategoryId = null;
    let correctCategoryName = null;
    
    // 方案1: 如果有 categoryId，检查是否有效
    if (currentCategoryId) {
      const cat = catMap.get(currentCategoryId);
      if (cat) {
        correctCategoryId = cat._id;
        correctCategoryName = cat.name;
      }
    }
    
    // 方案2: 通过 category 名称查找
    if (!correctCategoryId && currentCategoryName) {
      const cat = catMap.get(currentCategoryName);
      if (cat) {
        correctCategoryId = cat._id;
        correctCategoryName = cat.name;
      }
    }
    
    // 方案3: 通过课程名称推断
    if (!correctCategoryId) {
      for (const catName of CATEGORY_NAME_TO_ID.keys()) {
        if (courseName.includes(catName)) {
          const cat = CATEGORY_NAME_TO_ID.get(catName);
          if (cat) {
            correctCategoryId = cat;
            correctCategoryName = catName;
            break;
          }
        }
      }
    }
    
    // 判断状态
    if (!currentCategoryId || !currentCategoryId.trim()) {
      stats.missing++;
      issues.push({
        type: 'MISSING',
        id: courseId,
        name: courseName,
        current: { categoryId: '', categoryName: currentCategoryName },
        correct: { categoryId: correctCategoryId, categoryName: correctCategoryName },
        level
      });
    } else if (!correctCategoryId) {
      stats.wrong++;
      issues.push({
        type: 'WRONG',
        id: courseId,
        name: courseName,
        current: { categoryId: currentCategoryId, categoryName: currentCategoryName },
        correct: { categoryId: correctCategoryId, categoryName: correctCategoryName },
        level
      });
    } else if (currentCategoryId !== correctCategoryId) {
      stats.wrong++;
      issues.push({
        type: 'MISMATCH',
        id: courseId,
        name: courseName,
        current: { categoryId: currentCategoryId, categoryName: currentCategoryName },
        correct: { categoryId: correctCategoryId, categoryName: correctCategoryName },
        level
      });
    } else {
      stats.correct++;
    }
  }
  
  // 显示问题列表
  log('INFO', '\n========== 问题汇总 ==========');
  log('INFO', `总课程数: ${stats.total}`);
  log('INFO', `正确关联: ${stats.correct}`);
  log('INFO', `缺失关联: ${stats.missing}`);
  log('INFO', `错误关联: ${stats.wrong}`);
  
  if (issues.length > 0) {
    log('WARN', `\n需要修复的课程 (${issues.length}):`);
    issues.forEach((issue, i) => {
      log('FIX', `${i + 1}. [${issue.type}] ${issue.name}`);
      log('FIX', `   当前: categoryId=${issue.current.categoryId || '(空)'}, category=${issue.current.categoryName || '(空)'}`);
      log('FIX', `   正确: categoryId=${issue.correct.categoryId || '(未找到)'}, category=${issue.correct.categoryName || '(未找到)'}`);
    });
    
    // 执行修复
    if (!isDryRun) {
      log('INFO', '\n========== 开始修复 ==========');
      for (const issue of issues) {
        if (issue.correct.categoryId) {
          const result = await updateDocument('courses', issue.id, {
            categoryId: issue.correct.categoryId,
            category: issue.correct.categoryName,
            updatedAt: new Date().toISOString()
          });
          
          if (result.success) {
            stats.fixed++;
            log('SUCCESS', `已修复: ${issue.name}`);
          } else {
            stats.failed++;
            log('ERROR', `修复失败: ${issue.name}`);
          }
        } else {
          stats.failed++;
          log('WARN', `无法修复（未找到对应分类）: ${issue.name}`);
        }
      }
      
      log('INFO', '\n========== 修复结果 ==========');
      log('INFO', `成功修复: ${stats.fixed}`);
      log('INFO', `修复失败: ${stats.failed}`);
    } else {
      log('WARN', '\n[DryRun] 未执行实际修复');
    }
  }
  
  return stats;
}

async function fixClasses() {
  log('INFO', '\n========== 开始修复培训班数据 ==========');
  
  const categories = await queryCollection('categories', {}, 100);
  const catMap = new Map();
  categories.forEach(cat => {
    catMap.set(cat.name, cat);
    catMap.set(cat._id, cat);
  });
  
  const classes = await queryCollection('classes', {}, 1000);
  log('INFO', `找到 ${classes.length} 个培训班`);
  
  const stats = {
    total: classes.length,
    correct: 0,
    missing: 0,
    wrong: 0,
    fixed: 0,
    failed: 0
  };
  
  for (const cls of classes) {
    const classId = cls._id;
    const className = cls.name || '未命名';
    const currentCategoryId = cls.categoryId;
    const currentCategoryName = cls.category;
    
    let correctCategoryId = null;
    let correctCategoryName = null;
    
    if (currentCategoryId && catMap.has(currentCategoryId)) {
      const cat = catMap.get(currentCategoryId);
      correctCategoryId = cat._id;
      correctCategoryName = cat.name;
    } else if (currentCategoryName) {
      const cat = catMap.get(currentCategoryName);
      if (cat) {
        correctCategoryId = cat._id;
        correctCategoryName = cat.name;
      }
    }
    
    if (!currentCategoryId || !currentCategoryId.trim()) {
      stats.missing++;
    } else if (!correctCategoryId || currentCategoryId !== correctCategoryId) {
      stats.wrong++;
      
      if (correctCategoryId && !isDryRun) {
        const result = await updateDocument('classes', classId, {
          categoryId: correctCategoryId,
          category: correctCategoryName,
          updatedAt: new Date().toISOString()
        });
        
        if (result.success) {
          stats.fixed++;
          log('SUCCESS', `已修复培训班: ${className}`);
        } else {
          stats.failed++;
        }
      }
    } else {
      stats.correct++;
    }
  }
  
  log('INFO', `培训班: 总数=${stats.total}, 正确=${stats.correct}, 缺失=${stats.missing}, 错误=${stats.wrong}, 已修复=${stats.fixed}`);
  
  return stats;
}

async function verifyData() {
  log('INFO', '\n========== 数据验证 ==========');
  
  // 验证各分类下的课程数量
  const CAAC_SOURCE_ID = 'e35392d069fc521f0152e2c2537e32ad';
  
  const categories = await queryCollection('categories', { sourceId: CAAC_SOURCE_ID }, 100);
  const courses = await queryCollection('courses', { sourceId: CAAC_SOURCE_ID }, 1000);
  
  log('INFO', '\nCAAC体系各分类的课程分布:');
  for (const cat of categories) {
    const catCourses = courses.filter(c => c.categoryId === cat._id);
    log('INFO', `  ${cat.name}: ${catCourses.length} 个课程`);
    
    if (catCourses.length > 0 && isVerbose) {
      catCourses.forEach(c => {
        log('DEBUG', `    - ${c.title} (level: ${c.level || '未设置'})`);
      });
    }
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('       分类数据修复脚本 v1.0');
  console.log('='.repeat(60));
  console.log(`\n运行模式: ${isDryRun ? '[DryRun] 仅检查' : '[Live] 实际修复'}\n`);
  
  try {
    // 1. 修复课程数据
    const courseStats = await fixCourses();
    
    // 2. 修复培训班数据
    const classStats = await fixClasses();
    
    // 3. 验证结果
    await verifyData();
    
    console.log('\n' + '='.repeat(60));
    console.log('       修复完成');
    console.log('='.repeat(60));
    
    if (isDryRun) {
      console.log('\n提示：使用 --dry-run 参数仅做检查');
      console.log('      移除 --dry-run 参数将执行实际修复\n');
    }
    
  } catch (error) {
    log('ERROR', '脚本执行出错', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main().catch(console.error);
