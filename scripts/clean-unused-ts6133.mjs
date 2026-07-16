#!/usr/bin/env node
/**
 * 自动清理 TS6133（声明了但未使用）错误。
 *
 * 方法：运行 `tsc --noEmit` 收集所有 TS6133 错误，利用 TypeScript 编译器 API
 * 定位每个未使用标识符的 AST 节点并精确删除：
 *   - import 具名说明符（多行删整行；单行删标识符+相邻逗号）
 *   - import 默认 / 命名空间说明符（删除整条 import 语句）
 *   - 简单局部变量声明（单声明、无副作用初始化）→ 删除整条语句
 *
 * 不做删除的情况会写入 report，供人工处理：
 *   - 带有 CallExpression/NewExpression 初始化的变量（可能含副作用）
 *   - 解构 / 多声明列表中的某一项
 *
 * 用法：
 *   node scripts/clean-unused-ts6133.mjs            # 执行清理并写回文件
 *   node scripts/clean-unused-ts6133.mjs --dry      # 只报告，不写回
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');

// 1. 收集 TS6133 错误
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

// 2. 解析为 { file, line, col, name }
const RE = /^(.+?)\((\d+),(\d+)\):\s*error TS6133:\s*'([^']+)' is declared but its value is never read\./;
const errors = [];
for (const l of lines) {
  const m = l.match(RE);
  if (m) errors.push({ file: m[1], line: +m[2], col: +m[3], name: m[4] });
}
console.log(`🔍 发现 ${errors.length} 个 TS6133 错误`);

// 3. 按文件分组
const byFile = new Map();
for (const e of errors) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}

const report = []; // 未自动处理的条目
let handled = 0;

for (const [file, errs] of byFile) {
  const abs = join(ROOT, file);
  let source;
  try {
    source = readFileSync(abs, 'utf8');
  } catch {
    report.push({ file, reason: '文件读取失败' });
    continue;
  }
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const text = sf.text;
  const lineStarts = sf.getLineStarts();

  // 计算待删除的 [start, end] 区间（基于原始 source 偏移）
  const spans = [];
  for (const e of errs) {
    const pos = sf.getPositionOfLineAndCharacter(e.line - 1, e.col - 1);
    // 找到包含 pos 的最深节点
    let found = null;
    function visit(n) {
      const start = n.getStart(sf, undefined);
      const end = n.getEnd();
      if (pos >= start && pos < end) {
        found = n;
        ts.forEachChild(n, visit);
      }
    }
    visit(sf);
    if (!found) {
      report.push({ file, line: e.line, name: e.name, reason: '未定位节点' });
      continue;
    }
    const parent = found.parent;
    try {

    // 通用：删除一个"具名元素"（import 说明符 / 解构绑定元素）。
    // 若该元素独占一行 → 删除整行；否则行内删除「标识符 + 相邻逗号」。
    function elementDeleteSpans(identNode) {
      const name = e.name;
      const lineStart = lineStarts[e.line - 1];
      const nl = text.indexOf('\n', lineStart);
      const lineEnd = nl >= 0 ? nl : text.length;
      const lineText = text.slice(lineStart, lineEnd);
      const onlyThis = new RegExp(
        '^\\s*' + escapeRegex(name) + '\\s*,?\\s*$'
      ).test(lineText);
      if (onlyThis) {
        return [lineStart, nl >= 0 ? nl + 1 : text.length];
      }
      let s = identNode.getStart(sf, undefined);
      let en = identNode.getEnd();
      let i = en;
      while (i < text.length && /\s/.test(text[i])) i++;
      if (text[i] === ',') en = i + 1;
      else {
        let j = s - 1;
        while (j >= 0 && /\s/.test(text[j])) j--;
        if (text[j] === ',') s = j;
      }
      return [s, en];
    }

    // 默认导入：import Def ... —— AST 中 Def 是 ImportClause.name（Identifier）
    if (
      parent &&
      parent.kind === ts.SyntaxKind.ImportClause &&
      parent.name === found
    ) {
      const decl = findEnclosing(found, ts.isImportDeclaration);
      const clause = decl.importClause;
      if (clause && clause.namedBindings) {
        // import Def, { ... } → 仅删除 Def 及紧随逗号
        let s = found.getStart(sf, undefined);
        let en = found.getEnd();
        let i = en;
        while (i < text.length && /\s/.test(text[i])) i++;
        if (text[i] === ',') en = i + 1;
        spans.push([s, en]);
      } else {
        const start = decl.getStart(sf, undefined);
        let nl = text.indexOf('\n', decl.getEnd());
        spans.push([start, nl >= 0 ? nl + 1 : decl.getEnd()]);
      }
      handled++;
      continue;
    }

    // 命名空间导入：import * as NS ...
    if (parent && parent.kind === ts.SyntaxKind.NamespaceImport) {
      const decl = findEnclosing(found, ts.isImportDeclaration);
      const start = decl.getStart(sf, undefined);
      let nl = text.indexOf('\n', decl.getEnd());
      spans.push([start, nl >= 0 ? nl + 1 : decl.getEnd()]);
      handled++;
      continue;
    }

    // import 具名说明符
    if (parent && parent.kind === ts.SyntaxKind.ImportSpecifier) {
      spans.push(elementDeleteSpans(found));
      handled++;
      continue;
    }

    // 解构绑定元素（const {a, b} / const [a, b] 或函数参数）
    if (parent && parent.kind === ts.SyntaxKind.BindingElement) {
      const pattern = parent.parent;
      const decl = findEnclosing(
        found,
        (n) => ts.isVariableDeclaration(n) || ts.isParameter(n)
      );
      if (!decl) {
        report.push({
          file,
          line: e.line,
          name: e.name,
          reason: '绑定元素不在声明/参数中',
        });
        continue;
      }
      const isObject = pattern.kind === ts.SyntaxKind.ObjectBindingPattern;
      const elements = pattern.elements;
      const isLast = elements[elements.length - 1] === parent;
      const isSingle = elements.length === 1;
      if (isSingle) {
        if (ts.isVariableDeclaration(decl)) {
          const statement = decl.parent.parent;
          const start = statement.getStart(sf, undefined);
          let nl = text.indexOf('\n', statement.getEnd());
          spans.push([start, nl >= 0 ? nl + 1 : statement.getEnd()]);
        } else {
          spans.push(elementDeleteSpans(found));
        }
        handled++;
        continue;
      }
      if (isObject) {
        spans.push(elementDeleteSpans(found));
        handled++;
        continue;
      }
      // 数组解构：末位 → 删元素+逗号；非末位 → 仅删标识符（形成空位 , , 保留索引）
      if (isLast) {
        spans.push(elementDeleteSpans(found));
      } else {
        spans.push([found.getStart(sf, undefined), found.getEnd()]);
      }
      handled++;
      continue;
    }

    // 局部变量声明（简单声明）
    if (parent && parent.kind === ts.SyntaxKind.VariableDeclaration) {
      const decl = parent;
      const list = decl.parent;
      const statement = list.parent;
      const isSingle = list.declarations.length === 1;
      const isStmt = ts.isVariableStatement(statement);
      const init = decl.initializer;
      const risky = init && isEffectHook(init);
      if (isSingle && isStmt && !risky) {
        const start = statement.getStart(sf, undefined);
        let nl = text.indexOf('\n', statement.getEnd());
        spans.push([start, nl >= 0 ? nl + 1 : statement.getEnd()]);
        handled++;
        continue;
      }
    report.push({
      file,
      line: e.line,
      name: e.name,
      reason: risky
        ? 'effect hook 调用（有副作用）'
        : '解构/多声明列表',
    });
    continue;
  }

  // 顶级函数声明（function foo() {}）未使用 → 删除整段
  if (parent && parent.kind === ts.SyntaxKind.FunctionDeclaration) {
    const start = parent.getStart(sf, undefined);
    let nl = text.indexOf('\n', parent.getEnd());
    spans.push([start, nl >= 0 ? nl + 1 : parent.getEnd()]);
    handled++;
    continue;
  }

  report.push({
      file,
      line: e.line,
      name: e.name,
      reason: '非常规节点类型',
    });
    } catch (err) {
      report.push({
        file,
        line: e.line,
        name: e.name,
        reason: '处理异常: ' + (err && err.message),
      });
    }
  }

  if (spans.length === 0) continue;
  // 按 start 降序排序，从后往前删，保持偏移有效
  spans.sort((a, b) => b[0] - a[0]);
  let out = source;
  for (const [s, e] of spans) {
    out = out.slice(0, s) + out.slice(e);
  }
  if (!DRY) writeFileSync(abs, out, 'utf8');
  console.log(`✂️  ${file}: 删除 ${spans.length} 处`);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findEnclosing(node, pred) {
  let n = node;
  while (n) {
    if (pred(n)) return n;
    n = n.parent;
  }
  return null;
}

function isEffectHook(node) {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) {
    return ['useEffect', 'useLayoutEffect', 'useInsertionEffect'].includes(
      callee.text
    );
  }
  return false;
}

console.log(`\n✅ 自动处理 ${handled} 处；需人工处理 ${report.length} 处`);
if (report.length) {
  console.log('--- 需人工处理 ---');
  for (const r of report) {
    console.log(`  ${r.file}:${r.line} '${r.name}' -> ${r.reason}`);
  }
  writeFileSync(
    join(ROOT, 'scripts/ts6133-unresolved.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
}
