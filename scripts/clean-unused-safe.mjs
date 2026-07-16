#!/usr/bin/env node
/**
 * 安全清理 TS6133（声明了但未使用）。
 *
 * 安全策略（绝不依赖 AST 跨度运算，避免破坏其他行/合并模块说明符）：
 *   1. 对每个 TS6133，先用「全词匹配」统计该标识符在文件中的出现次数。
 *   2. 仅当出现次数 === 1（即仅声明处，绝无其它引用）才删除 —— 一旦被使用就跳过。
 *   3. import 说明符：对所在行做保守的正则替换（删 `name` + 相邻逗号，清理空 `{}`）。
 *   4. 默认/命名空间导入（独占行）：整行删除。
 *   5. 简单局部变量（`const x =` / `let x =` / `var x =`，无解构）：整行删除。
 *   6. 解构绑定（`const [a,b]` / `const {a,b}`）：跳过，交人工处理（避免误删已用兄弟）。
 *
 * 用法：node scripts/clean-unused-safe.mjs [--dry]
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');

let raw = '';
try {
  raw = execSync('npx tsc --noEmit', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: ROOT,
  });
} catch (e) {
  raw = (e && e.stdout) || '';
}
const lines = raw.split('\n').filter((l) => /error TS6133/.test(l));
const RE =
  /^(.+?)\((\d+),(\d+)\):\s*error TS6133:\s*'([^']+)' is declared but its value is never read\./;
const errors = [];
for (const l of lines) {
  const m = l.match(RE);
  if (m) errors.push({ file: m[1], line: +m[2], col: +m[3], name: m[4] });
}
console.log(`🔍 发现 ${errors.length} 个 TS6133`);

const byFile = new Map();
for (const e of errors) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

const report = [];
let handled = 0;

function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const [file, errs] of byFile) {
  const abs = join(ROOT, file);
  let source;
  try {
    source = readFileSync(abs, 'utf8');
  } catch {
    report.push({ file, reason: 'read fail' });
    continue;
  }
  const allLines = source.split('\n');

  // 逐行记录动作：null=不变，{type:'replace',text}|{type:'delete'}
  const actions = new Array(allLines.length).fill(null);

  for (const e of errs) {
    const lnIdx = e.line - 1;
    if (lnIdx < 0 || lnIdx >= allLines.length) {
      report.push({ file, line: e.line, name: e.name, reason: '行越界' });
      continue;
    }
    const lineText = allLines[lnIdx];

    // 全词出现次数（文件级）
    const wc = (
      source.match(new RegExp('\\b' + esc(e.name) + '\\b', 'g')) || []
    ).length;
    if (wc !== 1) {
      report.push({
        file,
        line: e.line,
        name: e.name,
        reason: `出现 ${wc} 次（非独占，跳过以保证安全）`,
      });
      continue;
    }

    const isImportLine =
      /^\s*import\b/.test(lineText) ||
      /\bfrom\s*['"]/.test(lineText) ||
      /^\s*[\w$]+(?:\s+as\s+[\w$]+)?\s*,?\s*$/.test(lineText) ||
      /^\s*\}\s*(?:from\s+['"][^'"]+['"])?\s*;?\s*$/.test(lineText);

    if (isImportLine) {
      // 默认独占导入：import Def from 'x'（无花括号）
      if (/^\s*import\s+[\w$]+\s+from\s/.test(lineText) && !/\{/.test(lineText)) {
        actions[lnIdx] = { type: 'delete' };
        handled++;
        continue;
      }
      // 命名空间：import * as NS from 'x'
      if (/^\s*import\s+\*\s+as\s+[\w$]+/.test(lineText)) {
        actions[lnIdx] = { type: 'delete' };
        handled++;
        continue;
      }
      // 具名说明符：完整匹配 `Original as Alias`（name 可能是原名或别名），删整段 + 相邻逗号
      const specRe = new RegExp(
        '(,\\s*)?(?:[\\w$]+\\s+as\\s+)?' +
          esc(e.name) +
          '(?:\\s+as\\s+[\\w$]+)?\\s*,?'
      );
      let newLine = lineText.replace(specRe, '$1');
      // 清理可能产生的空结构
      newLine = newLine
        .replace(/\{\s*,/, '{')
        .replace(/,\s*\}/, '}')
        .replace(/,\s*,/g, ',')
        .replace(/\{\s*\}/, '{}')
        .replace(/\s+,/g, ',')
        .trimEnd();
      // 若该行已无任何内容（多行 import 中独占一行的说明符）→ 整行删除
      if (newLine.trim() === '') {
        actions[lnIdx] = { type: 'delete' };
      } else {
        actions[lnIdx] = { type: 'replace', text: newLine };
      }
      handled++;
      continue;
    }

    // 局部变量：仅当「无解构」的简单声明才整行删除
    const isSimpleVar = new RegExp(
      '^\\s*(?:const|let|var)\\s+' + esc(e.name) + '\\s*='
    ).test(lineText);
    const hasDestructuring = /[\[\{]/.test(lineText);
    if (isSimpleVar && !hasDestructuring) {
      actions[lnIdx] = { type: 'delete' };
      handled++;
      continue;
    }

    report.push({
      file,
      line: e.line,
      name: e.name,
      reason: '解构/复杂声明（交人工）',
    });
  }

  const outLines = [];
  for (let i = 0; i < allLines.length; i++) {
    const a = actions[i];
    if (!a) {
      outLines.push(allLines[i]);
    } else if (a.type === 'delete') {
      // 删整行
    } else if (a.type === 'replace') {
      outLines.push(a.text);
    }
  }
  if (!DRY) writeFileSync(abs, outLines.join('\n'), 'utf8');
  console.log(`✂️  ${file}: 处理 ${errs.length} 处`);
}

console.log(`\n✅ 安全处理 ${handled} 处；需人工处理 ${report.length} 处`);
if (report.length) {
  console.log('--- 需人工处理 ---');
  for (const r of report)
    console.log(`  ${r.file}:${r.line ?? ''} '${r.name ?? ''}' -> ${r.reason}`);
  writeFileSync(
    join(ROOT, 'scripts/ts6133-unresolved.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
}
