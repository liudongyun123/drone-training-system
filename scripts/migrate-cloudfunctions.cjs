/**
 * 云函数 SDK 统一迁移脚本
 * 目标：所有云函数统一使用 @cloudbase/node-sdk + Node 18
 * 
 * 用法：node scripts/migrate-cloudfunctions.cjs
 * 回滚：git checkout -- cloudfunctions/
 */

const fs = require('fs');
const path = require('path');

const CLOUDFUNCTIONS_DIR = path.join(__dirname, '..', 'cloudfunctions');
const ENV_ID = 'rcwljy-5ghmq2ex26764978';

// 新的统一 SDK 初始化代码
const UNIFIED_INIT = `const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: '${ENV_ID}' })
const db = app.database()
const _ = db.command`;

// 新的 package.json 模板
function makePackageJson(dirName, description, extras = {}) {
  const pkg = {
    name: dirName,
    version: '1.0.0',
    description: description || `${dirName} 云函数`,
    main: 'index.js',
    dependencies: {
      '@cloudbase/node-sdk': 'latest',
      ...extras
    },
    engines: {
      node: '18'
    }
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

/**
 * 替换 index.js 中的 SDK 初始化代码块
 */
function replaceSdkInit(content, dirName) {
  let modified = content;

  // 模式 A: wx-server-sdk 标准初始化
  // const cloud = require('wx-server-sdk')
  // cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
  // const db = cloud.database()
  // const _ = db.command
  const patternWxServerSdk = /const cloud = require\(['"]wx-server-sdk['"]\)[\s\S]*?const _ = db\.command/g;
  if (patternWxServerSdk.test(content)) {
    modified = content.replace(
      /const cloud = require\(['"]wx-server-sdk['"]\)[\s\S]*?const _ = db\.command/g,
      UNIFIED_INIT
    );
    console.log(`  [FIX] ${dirName}: wx-server-sdk → @cloudbase/node-sdk`);
    return { modified, changed: true };
  }

  // 模式 B: tcb-admin-node 标准初始化
  // const tcb = require('tcb-admin-node')
  // const app = tcb.init()
  // const db = app.database()
  const patternTcbAdminNode = /const tcb = require\(['"]tcb-admin-node['"]\)/;
  if (patternTcbAdminNode.test(content)) {
    // 处理 admin/admin-http 这种复杂函数：它们还有子模块引用
    // 保留子模块的 require，只替换 SDK 初始化和 db 初始化
    // 检查是否有 INIT 注释标记
    if (content.includes('// 初始化 CloudBase') || content.includes('// 使用固定环境ID初始化')) {
      // 替换：const tcb = require(...) ... const app = tcb.init(...)
      // 到 const _ = db.command 之间
      modified = content.replace(
        /const tcb = require\(['"]tcb-admin-node['"']\)[\s\S]*?const _ = db\.command/,
        UNIFIED_INIT
      );
    } else {
      // 简单 tcb.init() 调用
      modified = content.replace(
        /const tcb = require\(['"]tcb-admin-node['"']\)[\s\S]*?const _ = db\.command/g,
        UNIFIED_INIT
      );
    }
    console.log(`  [FIX] ${dirName}: tcb-admin-node → @cloudbase/node-sdk`);
    return { modified, changed: true };
  }

  // 模式 C: 双 SDK 动态选择 (try/catch 回退)
  // let cloud; let isWxEnv = false;
  // try { cloud = require('wx-server-sdk'); isWxEnv = true; } catch(e) { cloud = require('tcb-admin-node'); }
  // cloud.init({ env: isWxEnv ? cloud.DYNAMIC_CURRENT_ENV : cloud.SYMBOL_CURRENT_ENV })
  const patternDualSDK = /\/\/ 动态选择 SDK|let cloud\nlet isWxEnv/;
  if (patternDualSDK.test(content)) {
    modified = content.replace(
      /\/\/ 动态选择 SDK\nlet cloud\nlet isWxEnv = false[\s\S]*?const _ = db\.command/g,
      UNIFIED_INIT
    );
    console.log(`  [FIX] ${dirName}: 双SDK → @cloudbase/node-sdk`);
    return { modified, changed: true };
  }

  // 变体：没有注释的 try/catch 双SDK
  const patternDualSDK2 = /let cloud\s*\nlet isWxEnv = false/;
  if (patternDualSDK2.test(content)) {
    modified = content.replace(
      /let cloud\s*\nlet isWxEnv = false[\s\S]*?const _ = db\.command/g,
      UNIFIED_INIT
    );
    console.log(`  [FIX] ${dirName}: 双SDK(v2) → @cloudbase/node-sdk`);
    return { modified, changed: true };
  }

  // 检查是否已经使用了 @cloudbase/node-sdk
  if (content.includes('@cloudbase/node-sdk')) {
    console.log(`  [SKIP] ${dirName}: 已使用 @cloudbase/node-sdk`);
    return { modified, changed: false };
  }

  console.log(`  [WARN] ${dirName}: 未识别的 SDK 模式，跳过`);
  return { modified, changed: false };
}

/**
 * 处理特殊问题：mobile-exam 的 DYNAMIC_CURRENT_ENV
 */
function fixSpecialCases(content, dirName) {
  if (dirName === 'mobile-exam') {
    // 替换 tcb.DYNAMIC_CURRENT_ENV → tcb.SYMBOL_CURRENT_ENV
    if (content.includes('DYNAMIC_CURRENT_ENV')) {
      content = content.replace(/DYNAMIC_CURRENT_ENV/g, 'SYMBOL_CURRENT_ENV');
      console.log(`  [FIX] ${dirName}: DYNAMIC_CURRENT_ENV → SYMBOL_CURRENT_ENV`);
    }
  }
  return content;
}

// ========================
// 主流程
// ========================

function main() {
  console.log('=== 云函数 SDK 统一迁移 ===\n');
  
  const dirs = fs.readdirSync(CLOUDFUNCTIONS_DIR);
  let packageChanged = 0;
  let jsChanged = 0;
  let skipped = 0;

  // 跳过非目录文件
  const funcDirs = dirs.filter(d => {
    const fullPath = path.join(CLOUDFUNCTIONS_DIR, d);
    return fs.statSync(fullPath).isDirectory() && d !== 'cloudfunctions-zip';
  });

  for (const dirName of funcDirs) {
    const funcPath = path.join(CLOUDFUNCTIONS_DIR, dirName);
    const indexPath = path.join(funcPath, 'index.js');
    const pkgPath = path.join(funcPath, 'package.json');
    
    console.log(`\n[${dirName}]`);

    // 读取当前 package.json
    let pkg;
    let pkgNeedsUpdate = false;
    
    if (fs.existsSync(pkgPath)) {
      try {
        const pkgContent = fs.readFileSync(pkgPath, 'utf8');
        pkg = JSON.parse(pkgContent);
        
        // 检查并更新 dependencies
        if (pkg.dependencies) {
          // 移除旧 SDK
          if (pkg.dependencies['wx-server-sdk']) {
            delete pkg.dependencies['wx-server-sdk'];
            pkgNeedsUpdate = true;
          }
          if (pkg.dependencies['tcb-admin-node']) {
            delete pkg.dependencies['tcb-admin-node'];
            pkgNeedsUpdate = true;
          }
          // 添加新 SDK（如果还没有）
          if (!pkg.dependencies['@cloudbase/node-sdk']) {
            pkg.dependencies['@cloudbase/node-sdk'] = 'latest';
            pkgNeedsUpdate = true;
          }
        } else {
          pkg.dependencies = { '@cloudbase/node-sdk': 'latest' };
          pkgNeedsUpdate = true;
        }
        
        // 确保保留其他依赖（如 tencentcloud-sdk-nodejs）
        // mobile-auth 需要保留 tencentcloud-sdk-nodejs
        
        // 添加 engines
        if (!pkg.engines || pkg.engines.node !== '18') {
          pkg.engines = { node: '18' };
          pkgNeedsUpdate = true;
        }
        
        if (pkgNeedsUpdate) {
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
          console.log(`  [FIX] package.json: 更新依赖 → @cloudbase/node-sdk, node:18`);
          packageChanged++;
        } else {
          console.log(`  [OK] package.json: 已是最新`);
        }
      } catch (e) {
        console.log(`  [ERROR] package.json 解析失败: ${e.message}`);
      }
    }

    // 处理 index.js
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      let modified = content;
      
      // 先处理特殊情况
      modified = fixSpecialCases(modified, dirName);
      
      // 替换 SDK 初始化
      const result = replaceSdkInit(modified, dirName);
      
      if (result.changed || modified !== content) {
        fs.writeFileSync(indexPath, result.modified);
        jsChanged++;
      } else {
        skipped++;
      }
    } else {
      console.log(`  [WARN] 无 index.js`);
      skipped++;
    }
  }

  console.log('\n=== 迁移完成 ===');
  console.log(`package.json 更新: ${packageChanged} 个`);
  console.log(`index.js 更新: ${jsChanged} 个`);
  console.log(`跳过/未变更: ${skipped} 个`);
  console.log(`\n下一步：`);
  console.log(`1. git diff 检查变更`);
  console.log(`2. 部署云函数验证`);
  console.log(`3. npm run build 确认前端不受影响`);
}

main();
