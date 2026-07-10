#!/usr/bin/env node
/**
 * check-contract.mjs — 前端/小程序 → 云函数「(函数, action)」契约自检脚本
 *
 * 目的：静态扫描前端（src/）与小程序（miniprogram/）对云函数的调用，
 *       并与各 cloudfunctions/api-* 云函数在 dispatch 中实际声明的 action 比对，
 *       自动发现「前端调用了但云函数未实现」的契约缺口（即 B1/B3/B4 类 bug）。
 *
 * 用法：node scripts/check-contract.mjs
 * 退出码：0 = 全部契约一致；1 = 存在缺失契约（可作为 CI 门禁）。
 *
 * 说明：
 * - 只解析字面量 action（如 'getList'）；动态拼装的 action（变量）会被跳过并列出。
 * - api-message 为 Event 类型云函数，仅被云函数内部 app.callFunction 调用，
 *   不被前端直接调用，因此不纳入前端契约校验（其 case 仍会被统计但不判缺失）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const MP_DIR = path.join(ROOT, 'miniprogram')
const CF_DIR = path.join(ROOT, 'cloudfunctions')

// ---------- 工具：递归收集源码文件 ----------
function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'lib', 'utils_old'].includes(entry.name)) continue
      walk(p, exts, out)
    } else if (exts.includes(path.extname(entry.name))) {
      out.push(p)
    }
  }
  return out
}

// ---------- 工具：在窗口内查找字面量 action ----------
function findLiteralAction(windowStr) {
  const m = windowStr.match(/action\s*:\s*['"]([\w-]+)['"]/)
  return m ? m[1] : null
}

// ---------- 1. 扫描云函数声明的 action ----------
function collectDeclaredActions() {
  const declared = {} // fnName -> Set(action)
  if (!fs.existsSync(CF_DIR)) return declared
  for (const entry of fs.readdirSync(CF_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^api-/.test(entry.name)) continue
    const idxPath = path.join(CF_DIR, entry.name, 'index.js')
    if (!fs.existsSync(idxPath)) continue
    const code = fs.readFileSync(idxPath, 'utf8')
    const actions = new Set()
    // case 'action':  / case "action":
    for (const m of code.matchAll(/case\s+['"]([\w-]+)['"]\s*:/g)) actions.add(m[1])
    // action === 'x' / action !== 'y'
    for (const m of code.matchAll(/action\s*[!=]==?\s*['"]([\w-]+)['"]/g)) actions.add(m[1])
    // ['x','y'].includes(action) 形式的白名单 dispatch（如 api-upload）
    for (const m of code.matchAll(/['"]([\w-]+)['"]\s*\]\.includes\(\s*action/g)) actions.add(m[1])
    declared[entry.name] = actions
  }
  return declared
}

// ---------- 2. 扫描前端（Web）调用 ----------
function scanWeb() {
  const calls = [] // { fn, action, file, line }
  const files = walk(SRC_DIR, ['.ts', '.tsx', '.js'])
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8')
    const lines = code.split('\n')
    // adminService.callFunction('api-x', { action: 'literal' })
    const re = /callFunction\(\s*['"]api-([\w-]+)['"]/g
    let m
    while ((m = re.exec(code))) {
      const start = m.index
      const win = code.slice(start, start + 600)
      const action = findLiteralAction(win)
      const line = code.slice(0, start).split('\n').length
      calls.push({ fn: 'api-' + m[1], action, file: f, line, dynamic: !action })
    }
  }
  return calls
}

// ---------- 3. 扫描小程序调用 ----------
function scanMiniProgram() {
  const calls = []
  const files = walk(MP_DIR, ['.ts', '.js'])
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8')
    const start0 = code.length
    // callApiX('action', data)  -> api-x
    const re1 = /callApi([A-Z]\w*)\(\s*['"]([\w-]+)['"]/g
    let m
    while ((m = re1.exec(code))) {
      const x = m[1] // 例如 Order / User / Course
      const fn = 'api-' + x.charAt(0).toLowerCase() + x.slice(1)
      const line = code.slice(0, m.index).split('\n').length
      calls.push({ fn, action: m[2], file: f, line, dynamic: false })
    }
    // request('/api-x', 'POST', { action: 'literal' })
    const re2 = /request\(\s*['"]\/api-([\w-]+)['"]/g
    while ((m = re2.exec(code))) {
      const start = m.index
      const win = code.slice(start, start + 600)
      const action = findLiteralAction(win)
      const line = code.slice(0, start).split('\n').length
      calls.push({ fn: 'api-' + m[1], action, file: f, line, dynamic: !action })
    }
  }
  return calls
}

// ---------- 主流程 ----------
const declared = collectDeclaredActions()
const webCalls = scanWeb()
const mpCalls = scanMiniProgram()
const allCalls = [...webCalls, ...mpCalls]

const missing = []
const seen = new Set()
const dynamicCalls = []

for (const c of allCalls) {
  if (!c.action) {
    dynamicCalls.push(c)
    continue
  }
  const key = `${c.fn}::${c.action}`
  if (seen.has(key)) continue
  seen.add(key)
  const set = declared[c.fn]
  if (!set) {
    missing.push({ ...c, reason: `云函数 ${c.fn} 不存在` })
  } else if (!set.has(c.action)) {
    missing.push({ ...c, reason: `云函数 ${c.fn} 未声明 action '${c.action}'` })
  }
}

// ---------- 输出报告 ----------
const rel = (p) => path.relative(ROOT, p)
console.log('\n========== 云函数契约自检报告 ==========')
console.log(`已扫描云函数: ${Object.keys(declared).length} 个`)
console.log(`已收集前端/小程序调用: ${allCalls.length} 处 (去重后 ${seen.size} 个唯一契约)`)

if (missing.length) {
  console.log(`\n❌ 发现 ${missing.length} 处契约缺口 (B1/B3/B4 类 bug)：`)
  for (const x of missing) {
    console.log(`  - ${x.fn} / ${x.action}`)
    console.log(`      位置: ${rel(x.file)}:${x.line}`)
    console.log(`      原因: ${x.reason}`)
  }
} else {
  console.log('\n✅ 所有字面量调用的 (云函数, action) 均已在对应云函数的 dispatch 中声明。')
}

if (dynamicCalls.length) {
  console.log(`\n⚠️  跳过 ${dynamicCalls.length} 处动态 action（非字面量，需人工确认）：`)
  for (const x of dynamicCalls) {
    console.log(`  - ${x.fn} @ ${rel(x.file)}:${x.line}`)
  }
}

// 反向：已声明但从未被前端调用的 action（疑似死代码，仅供参考）
const calledKeys = new Set([...allCalls.filter(c => c.action).map(c => `${c.fn}::${c.action}`)])
const deadActions = []
for (const [fn, set] of Object.entries(declared)) {
  for (const a of set) {
    if (!calledKeys.has(`${fn}::${a}`)) deadActions.push(`${fn}/${a}`)
  }
}
if (deadActions.length) {
  console.log(`\nℹ️  已声明但前端未直接调用的 action（可能为死代码或内部调用，仅供参考，共 ${deadActions.length} 个）：`)
  console.log('   ' + deadActions.join(', '))
}

console.log('==========================================\n')

process.exit(missing.length ? 1 : 0)
