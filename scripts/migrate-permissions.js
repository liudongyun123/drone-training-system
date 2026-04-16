/**
 * 权限系统迁移脚本
 * 自动替换旧版权限判断为新版
 * 
 * 使用方式：
 * node scripts/migrate-permissions.js
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

// 迁移规则
const migrationRules = [
  // 导入替换
  {
    from: /from ['"]@\/store\/useAuthStore['"]/g,
    to: "from '@/store/authStore.new'",
    description: '更新导入路径',
  },
  {
    from: /from ['"]\.\.\/..\/store\/useAuthStore['"]/g,
    to: "from '../../store/authStore.new'",
    description: '更新相对导入路径',
  },
  
  // useAuthStore 替换为 useAuthStore
  {
    from: /useAuthStore\(\)/g,
    to: 'useAuthStore()',
    description: '保持hook名称一致',
  },
  
  // isAdmin 检查替换（保留兼容）
  {
    from: /user\.role === ['"]admin['"]/g,
    to: "user?.role === 'admin'",
    description: '优化admin检查',
  },
  
  // 添加可选链
  {
    from: /user\.role/g,
    to: 'user?.role',
    description: '添加可选链',
  },
];

// 需要跳过的文件
const skipFiles = [
  'node_modules',
  'dist',
  '.codebuddy',
  'authStore.new.ts',
  'AuthGuardNew.tsx',
  'usePermission.ts',
  'permissionMigrate.ts',
];

// 统计
const stats = {
  scanned: 0,
  modified: 0,
  skipped: 0,
  errors: 0,
};

function shouldSkip(filePath) {
  const basename = path.basename(filePath);
  return skipFiles.some(skip => 
    filePath.includes(skip) || basename === skip
  );
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;
    let modified = false;
    
    migrationRules.forEach(rule => {
      if (rule.from.test(newContent)) {
        newContent = newContent.replace(rule.from, rule.to);
        modified = true;
        console.log(`${colors.yellow}  [${rule.description}]${colors.reset} ${filePath}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      stats.modified++;
      console.log(`${colors.green}✓ 已更新${colors.reset}: ${filePath}`);
    } else {
      console.log(`${colors.blue}○ 无变更${colors.reset}: ${filePath}`);
    }
    
    stats.scanned++;
  } catch (error) {
    stats.errors++;
    console.error(`${colors.red}✗ 错误${colors.reset}: ${filePath} - ${error.message}`);
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!shouldSkip(fullPath)) {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      // 只处理 TS/TSX/JS/JSX 文件
      if (/\.(ts|tsx|js|jsx)$/.test(file) && !shouldSkip(fullPath)) {
        processFile(fullPath);
      }
    }
  });
}

// 主函数
console.log(`${colors.blue}================================${colors.reset}`);
console.log(`${colors.blue}  权限系统迁移工具${colors.reset}`);
console.log(`${colors.blue}================================${colors.reset}\n`);

const srcDir = path.join(__dirname, '../src');
console.log(`扫描目录: ${srcDir}\n`);

scanDirectory(srcDir);

console.log(`\n${colors.blue}================================${colors.reset}`);
console.log(`${colors.green}迁移完成!${colors.reset}`);
console.log(`${colors.blue}================================${colors.reset}`);
console.log(`扫描文件: ${stats.scanned}`);
console.log(`修改文件: ${stats.modified}`);
console.log(`跳过文件: ${stats.skipped}`);
console.log(`错误数量: ${stats.errors}`);
console.log(`\n${colors.yellow}注意: 请手动检查修改后的文件，确保逻辑正确${colors.reset}`);
console.log(`${colors.yellow}建议: 运行 'npm run build' 检查是否有编译错误${colors.reset}`);
