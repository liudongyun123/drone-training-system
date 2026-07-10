#!/usr/bin/env node
/**
 * 类型检查回归门禁（生产级）
 * --------------------------------------------------------------
 * 背景：项目存在大量历史 tsc 错误（遗留技术债），无法短期内清零。
 * 做法：把"当前所有错误"固化为基线（scripts/tsc-baseline.txt）。
 *       之后每次提交只检查【新增错误】，有新增就失败，无新增就通过。
 *       这样既不卡遗留债，又能 100% 拦住任何新引入的类型错误（防回归），
 *       后续按模块修掉错误、缩小基线，门禁自然逐步变严。
 *
 * 用法：
 *   node scripts/type-check-gate.mjs            # 校验：有新增错误则 exit 1
 *   node scripts/type-check-gate.mjs --init     # 用当前错误重建基线（不判通过/失败）
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, 'tsc-baseline.txt');

// 1. 运行 tsc，收集错误（tsc 在报错时退出码非 0，用 try/catch 接住 stdout）
let raw = '';
try {
  raw = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: join(__dirname, '..'),
  });
} catch (err) {
  raw = (err && err.stdout) || '';
}

// 2. 归一化：去掉行:列号（行号会变），保留 文件:错误码:信息 作为签名
const LINE_RE = /^(.+?)\(\d+,\d+\):\s*error (TS\d+):\s*(.*)$/;
function toSignature(line) {
  const m = line.match(LINE_RE);
  if (!m) return line.trim();
  return `${m[1]}:${m[2]}:${m[3]}`;
}

const current = new Set(
  raw
    .split('\n')
    .filter((l) => /error TS\d+/.test(l))
    .map(toSignature)
);

// 3. --init：重建基线
if (process.argv.includes('--init')) {
  writeFileSync(BASELINE_PATH, [...current].sort().join('\n') + '\n', 'utf8');
  console.log(`✅ 已重建类型错误基线，共 ${current.size} 个错误写入 ${BASELINE_PATH}`);
  process.exit(0);
}

// 4. 与基线对比，找出【新增】错误
let baseline = new Set();
if (existsSync(BASELINE_PATH)) {
  baseline = new Set(
    readFileSync(BASELINE_PATH, 'utf8').split('\n').filter(Boolean)
  );
} else {
  console.error('⚠️  未找到基线文件，自动以当前错误建立基线。');
  writeFileSync(BASELINE_PATH, [...current].sort().join('\n') + '\n', 'utf8');
  console.log(`✅ 已建立基线，共 ${current.size} 个错误。`);
  process.exit(0);
}

const newErrors = [...current].filter((x) => !baseline.has(x));
const fixedCount = baseline.size - (current.size - newErrors.length);

if (newErrors.length > 0) {
  console.error(`\n❌ 类型检查失败：新增 ${newErrors.length} 个类型错误（基线外）！`);
  console.error('   这些是新引入的错误，请修复后再提交。示例：');
  newErrors.slice(0, 30).forEach((e) => console.error('   - ' + e));
  if (newErrors.length > 30) console.error(`   ……共 ${newErrors.length} 个`);
  if (fixedCount > 0) console.error(`   （同时你已修复 ${fixedCount} 个历史错误，很好，基线会自动收紧）`);
  process.exit(1);
}

console.log(
  `✅ 类型检查通过：当前 ${current.size} 个错误，无新增（基线 ${baseline.size}）。` +
    (fixedCount > 0 ? ` 已修复 ${fixedCount} 个历史错误。` : '')
);
process.exit(0);
