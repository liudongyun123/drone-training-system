#!/usr/bin/env node
/**
 * ============================================================================
 * 体系数据迁移脚本 - 数据校验和规范化
 * ============================================================================
 * 
 * 功能：
 * 1. 校验现有数据的完整性
 * 2. 修复数据问题（缺失字段、类型错误等）
 * 3. 规范化数据结构
 * 4. 生成迁移报告
 * 
 * 使用方法：
 *   node scripts/migrate-source-data.js [--dry-run] [--verbose]
 * 
 * 选项：
 *   --dry-run   仅检查，不执行修改
 *   --verbose   显示详细日志
 *   --fix       自动修复问题
 * 
 * ============================================================================
 */

const https = require('https');
const http = require('http');

// ============================================================================
// 配置
// ============================================================================

// 云开发环境配置
const ENV_CONFIG = {
  envId: 'rcwljy-5ghmq2ex26764978-1318564729',
  baseUrl: 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com'
};

// 需要迁移的集合
const COLLECTIONS = [
  'sources',
  'categories', 
  'levels',
  'courses',
  'classes',
  'learning_paths',
  'page_configs'
];

// ============================================================================
// 日志工具
// ============================================================================

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const isFix = args.includes('--fix');

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
    ERROR: '\x1b[31m[ERROR]\x1b[0m',
    SUCCESS: '\x1b[32m[SUCCESS]\x1b[0m',
    DEBUG: '\x1b[90m[DEBUG]\x1b[0m'
  }[level] || '[LOG]';
  
  console.log(`${timestamp} ${prefix} ${message}`);
  if (isVerbose && data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// API 请求工具
// ============================================================================

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, ENV_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
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
    log('DEBUG', `[DryRun] 更新文档 ${collection}/${id}`, data);
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
    log('ERROR', `更新文档失败`, { collection, id, error: error.message });
    return { success: false };
  }
}

async function addDocument(collection, data) {
  if (isDryRun) {
    log('DEBUG', `[DryRun] 添加文档 ${collection}`, data);
    return { success: true, id: 'dry-run-id' };
  }
  
  try {
    return await request('POST', '/db-init', {
      action: 'add',
      collection,
      data
    });
  } catch (error) {
    log('ERROR', `添加文档失败`, { collection, error: error.message });
    return { success: false };
  }
}

// ============================================================================
// 数据校验规则
// ============================================================================

const VALIDATORS = {
  sources: (doc) => {
    const errors = [];
    
    if (!doc.code) errors.push('缺少 code 字段');
    if (!doc.name) errors.push('缺少 name 字段');
    if (!doc.sortOrder && doc.sortOrder !== 0) errors.push('缺少 sortOrder 字段');
    if (!doc.status) errors.push('缺少 status 字段，默认为 active');
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  categories: (doc) => {
    const errors = [];
    
    if (!doc.code) errors.push('缺少 code 字段');
    if (!doc.name) errors.push('缺少 name 字段');
    if (!doc.sourceId) errors.push('缺少 sourceId 字段');
    if (!doc.sortOrder && doc.sortOrder !== 0) errors.push('缺少 sortOrder 字段，默认为 1');
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  levels: (doc) => {
    const errors = [];
    
    if (!doc.code) errors.push('缺少 code 字段');
    if (!doc.name) errors.push('缺少 name 字段');
    if (!doc.sourceCode) errors.push('缺少 sourceCode 字段');
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  courses: (doc) => {
    const errors = [];
    
    if (!doc.title) errors.push('缺少 title 字段');
    if (!doc.sourceId) errors.push('缺少 sourceId 字段');
    if (!doc.categoryId) errors.push('缺少 categoryId 字段');
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  classes: (doc) => {
    const errors = [];
    
    if (!doc.name) errors.push('缺少 name 字段');
    if (!doc.sourceId) errors.push('缺少 sourceId 字段');
    if (!doc.categoryId) errors.push('缺少 categoryId 字段');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// ============================================================================
// 数据修复规则
// ============================================================================

const FIXERS = {
  sources: (doc) => {
    const fixes = [];
    const data = { ...doc };
    
    // 设置默认值
    if (!data.status) {
      data.status = 'active';
      fixes.push('设置 status = active');
    }
    if (!data.sortOrder && data.sortOrder !== 0) {
      data.sortOrder = 1;
      fixes.push('设置 sortOrder = 1');
    }
    if (!data.icon) {
      // 根据 code 设置默认图标
      const iconMap = { RENSHE: '🏛️', CAAC: '✈️', NATIONAL_DEFENSE: '🎖️' };
      data.icon = iconMap[data.code] || '📚';
      fixes.push(`设置 icon = ${data.icon}`);
    }
    
    return { data, fixes };
  },
  
  categories: (doc) => {
    const fixes = [];
    const data = { ...doc };
    
    if (!data.sortOrder && data.sortOrder !== 0) {
      data.sortOrder = 1;
      fixes.push('设置 sortOrder = 1');
    }
    if (!data.status) {
      data.status = 'active';
      fixes.push('设置 status = active');
    }
    
    return { data, fixes };
  },
  
  levels: (doc) => {
    const fixes = [];
    const data = { ...doc };
    
    if (!data.sortOrder && data.sortOrder !== 0) {
      data.sortOrder = 1;
      fixes.push('设置 sortOrder = 1');
    }
    if (!data.status) {
      data.status = 'active';
      fixes.push('设置 status = active');
    }
    
    return { data, fixes };
  },
  
  courses: (doc) => {
    const fixes = [];
    const data = { ...doc };
    
    if (!data.status) {
      data.status = 'draft';
      fixes.push('设置 status = draft');
    }
    if (data.price === undefined) {
      data.price = 0;
      fixes.push('设置 price = 0');
    }
    
    return { data, fixes };
  },
  
  classes: (doc) => {
    const fixes = [];
    const data = { ...doc };
    
    if (!data.status) {
      data.status = 'draft';
      fixes.push('设置 status = draft');
    }
    
    return { data, fixes };
  }
};

// ============================================================================
// 迁移任务
// ============================================================================

async function migrateCollection(collection) {
  log('INFO', `\n开始迁移集合: ${collection}`);
  console.log('='.repeat(50));
  
  const stats = {
    total: 0,
    valid: 0,
    invalid: 0,
    fixed: 0,
    errors: []
  };
  
  const validator = VALIDATORS[collection];
  const fixer = FIXERS[collection];
  
  if (!validator) {
    log('WARN', `集合 ${collection} 没有定义校验规则，跳过`);
    return stats;
  }
  
  // 获取所有文档
  const docs = await queryCollection(collection, {}, 1000);
  stats.total = docs.length;
  
  log('INFO', `共 ${stats.total} 条记录`);
  
  for (const doc of docs) {
    const docId = doc._id || doc.id;
    
    // 校验
    const validation = validator(doc);
    
    if (validation.valid) {
      stats.valid++;
    } else {
      stats.invalid++;
      stats.errors.push({
        id: docId,
        errors: validation.errors
      });
      
      if (isVerbose) {
        log('WARN', `文档 ${docId} 校验失败:`, validation.errors);
      }
    }
    
    // 修复
    if (fixer && (isFix || !validation.valid)) {
      const { data, fixes } = fixer(doc);
      
      if (fixes.length > 0) {
        stats.fixed++;
        
        if (isVerbose) {
          log('DEBUG', `文档 ${docId} 修复:`, fixes);
        }
        
        // 更新文档
        data.updatedAt = new Date().toISOString();
        await updateDocument(collection, docId, data);
      }
    }
  }
  
  // 输出统计
  console.log('='.repeat(50));
  log('SUCCESS', `集合 ${collection} 迁移完成`);
  log('INFO', `总计: ${stats.total}, 有效: ${stats.valid}, 无效: ${stats.invalid}, 已修复: ${stats.fixed}`);
  
  if (stats.errors.length > 0 && !isVerbose) {
    log('WARN', `有 ${stats.errors.length} 个文档仍有问题`);
  }
  
  return stats;
}

async function checkDataIntegrity() {
  log('INFO', '\n开始数据完整性检查');
  console.log('='.repeat(50));
  
  const report = {
    sources: [],
    orphanCategories: [],
    orphanLevels: [],
    orphanCourses: [],
    orphanClasses: []
  };
  
  // 1. 检查体系
  const sources = await queryCollection('sources');
  log('INFO', `发现 ${sources.length} 个体系`);
  report.sources = sources.map(s => ({
    id: s._id,
    code: s.code,
    name: s.name
  }));
  
  // 2. 检查孤立分类（没有对应体系）
  const categories = await queryCollection('categories');
  const sourceIds = new Set(sources.map(s => s._id));
  
  for (const cat of categories) {
    if (cat.sourceId && !sourceIds.has(cat.sourceId)) {
      report.orphanCategories.push({
        id: cat._id,
        name: cat.name,
        sourceId: cat.sourceId
      });
    }
  }
  
  if (report.orphanCategories.length > 0) {
    log('WARN', `发现 ${report.orphanCategories.length} 个孤立分类`);
  }
  
  // 3. 检查孤立课程（没有对应分类）
  const courses = await queryCollection('courses');
  const categoryIds = new Set(categories.map(c => c._id));
  
  for (const course of courses) {
    if (course.categoryId && !categoryIds.has(course.categoryId)) {
      report.orphanCourses.push({
        id: course._id,
        title: course.title,
        categoryId: course.categoryId
      });
    }
  }
  
  if (report.orphanCourses.length > 0) {
    log('WARN', `发现 ${report.orphanCourses.length} 个孤立课程`);
  }
  
  // 4. 检查孤立班级
  const classes = await queryCollection('classes');
  
  for (const cls of classes) {
    if (cls.categoryId && !categoryIds.has(cls.categoryId)) {
      report.orphanClasses.push({
        id: cls._id,
        name: cls.name,
        categoryId: cls.categoryId
      });
    }
  }
  
  if (report.orphanClasses.length > 0) {
    log('WARN', `发现 ${report.orphanClasses.length} 个孤立班级`);
  }
  
  return report;
}

async function initializeDefaultData() {
  log('INFO', '\n初始化默认数据');
  console.log('='.repeat(50));
  
  const defaultSources = [
    {
      code: 'CAAC',
      name: 'CAAC培训',
      icon: '✈️',
      description: '中国民用航空局认证的无人机驾驶员培训体系',
      sortOrder: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      code: 'RENSHE',
      name: '人社培训',
      icon: '🏛️',
      description: '人力资源和社会保障部认证的无人机培训体系',
      sortOrder: 2,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      code: 'NATIONAL_DEFENSE',
      name: '国防教育',
      icon: '🎖️',
      description: '国防动员体系无人机培训',
      sortOrder: 3,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  const existingSources = await queryCollection('sources');
  
  if (existingSources.length > 0) {
    log('INFO', `体系已存在 (${existingSources.length})，跳过初始化`);
    return existingSources;
  }
  
  log('INFO', '创建默认体系...');
  
  const createdIds = [];
  for (const source of defaultSources) {
    const result = await addDocument('sources', source);
    if (result.success) {
      createdIds.push(result.id);
      log('SUCCESS', `创建体系: ${source.name}`);
    }
  }
  
  return createdIds;
}

async function initializeDefaultLevels() {
  log('INFO', '\n初始化默认等级...');
  
  const existingLevels = await queryCollection('levels');
  if (existingLevels.length > 0) {
    log('INFO', `等级已存在 (${existingLevels.length})，跳过初始化`);
    return existingLevels;
  }
  
  const defaultLevels = [
    // CAAC 等级
    { code: 'caac_vlos', name: '视距内驾驶员', sourceCode: 'CAAC', sortOrder: 1, status: 'active' },
    { code: 'caac_bvlos', name: '超视距驾驶员', sourceCode: 'CAAC', sortOrder: 2, status: 'active' },
    { code: 'caac_instructor', name: '教员', sourceCode: 'CAAC', sortOrder: 3, status: 'active' },
    
    // 人社等级
    { code: 'beginner', name: '初级工', sourceCode: 'RENSHE', sortOrder: 1, status: 'active' },
    { code: 'intermediate', name: '中级工', sourceCode: 'RENSHE', sortOrder: 2, status: 'active' },
    { code: 'advanced', name: '高级工', sourceCode: 'RENSHE', sortOrder: 3, status: 'active' },
    { code: 'technician', name: '技师', sourceCode: 'RENSHE', sortOrder: 4, status: 'active' },
    { code: 'senior_technician', name: '高级技师', sourceCode: 'RENSHE', sortOrder: 5, status: 'active' },
    
    // 国防等级
    { code: 'level1', name: '一级', sourceCode: 'NATIONAL_DEFENSE', sortOrder: 1, status: 'active' },
    { code: 'level2', name: '二级', sourceCode: 'NATIONAL_DEFENSE', sortOrder: 2, status: 'active' },
    { code: 'level3', name: '三级', sourceCode: 'NATIONAL_DEFENSE', sortOrder: 3, status: 'active' }
  ];
  
  for (const level of defaultLevels) {
    const result = await addDocument('levels', {
      ...level,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (result.success) {
      log('SUCCESS', `创建等级: ${level.name} (${level.sourceCode})`);
    }
  }
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('       体系数据迁移脚本 v1.0');
  console.log('='.repeat(60));
  console.log(`\n运行模式: ${isDryRun ? '[DryRun] 仅检查' : '[Live] 实际修改'}`);
  console.log(`修复模式: ${isFix ? '[AutoFix] 自动修复' : '[CheckOnly] 仅检查'}\n`);
  
  const startTime = Date.now();
  const allStats = {};
  
  try {
    // 1. 数据完整性检查
    const integrityReport = await checkDataIntegrity();
    
    // 2. 迁移各集合
    for (const collection of COLLECTIONS) {
      const stats = await migrateCollection(collection);
      allStats[collection] = stats;
    }
    
    // 3. 初始化默认数据（仅在需要时）
    if (!isDryRun && isFix) {
      await initializeDefaultData();
      await initializeDefaultLevels();
    }
    
  } catch (error) {
    log('ERROR', '迁移过程出错', { error: error.message, stack: error.stack });
    process.exit(1);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // 输出总结
  console.log('\n' + '='.repeat(60));
  console.log('       迁移完成总结');
  console.log('='.repeat(60));
  
  let totalDocs = 0;
  let totalFixed = 0;
  
  for (const [collection, stats] of Object.entries(allStats)) {
    totalDocs += stats.total;
    totalFixed += stats.fixed;
    log('INFO', `${collection}: ${stats.total} 文档, ${stats.fixed} 修复`);
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`总耗时: ${duration}s`);
  console.log(`总文档数: ${totalDocs}`);
  console.log(`总修复数: ${totalFixed}`);
  console.log('='.repeat(60) + '\n');
}

// 运行
main().catch(console.error);
