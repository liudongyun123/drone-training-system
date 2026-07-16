#!/usr/bin/env node
/**
 * health-check.mjs — 无人机培训系统「一键体检」编排器
 * ----------------------------------------------------------------------------
 * 把项目里已有的静态检测关卡串成一次运行，输出 consolidated 报告，用于快速
 * 找出"写端/读端不一致""契约缺口""新增类型错误"等可静态探测的 bug。
 *
 * 包含关卡：
 *   1. check-contract.mjs      云函数契约自检（前端调用的 (函数,action) 云函数是否都实现）
 *   2. check-status-enum.mjs   状态枚举一致性（集合写/读端状态枚举是否分裂）
 *   3. type-check-gate.mjs     类型回归门禁（是否有新增类型错误，含字段名不一致）
 *
 * 严重级别：
 *   - FAIL：确属 bug，应修复（契约缺口、新增类型错误）
 *   - WARN：疑似问题，需人工复核（状态枚举候选可能误报）
 *   - PASS：通过
 *
 * 用法：
 *   node scripts/health-check.mjs            # 运行全部关卡
 *   node scripts/health-check.mjs --mp       # 状态枚举扫描同时纳入 miniprogram/
 *   node scripts/health-check.mjs --quiet    # 仅输出关卡结论，不打印各脚本详细输出
 *
 * 退出码：0 = 无 FAIL（WARN 不阻断）；1 = 存在 FAIL（可作 CI / 提交前门禁）。
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const ARGS = process.argv.slice(2)
const MP = ARGS.includes('--mp')
const QUIET = ARGS.includes('--quiet')

// ---------- 关卡定义 ----------
const CHECKS = [
  {
    key: 'contract',
    name: '云函数契约自检',
    severity: 'FAIL', // 契约缺口是确属 bug（B1/B3/B4 类）
    desc: '前端/小程序调用的 (函数, action) 是否都在云函数 dispatch 中实现',
    cmd: ['node', join(__dirname, 'check-contract.mjs')],
  },
  {
    key: 'status-enum',
    name: '状态枚举一致性',
    severity: 'WARN', // 候选需人工复核，可能误报
    desc: '集合写端/读端状态枚举是否分裂（如 notices 的 active↔published）',
    cmd: ['node', join(__dirname, 'check-status-enum.mjs'), ...(MP ? ['--mp'] : [])],
  },
  {
    key: 'type-gate',
    name: '类型回归门禁',
    severity: 'FAIL', // 新增类型错误必须拦住
    desc: '是否有新增 TypeScript 错误（字段名不一致等防回归）',
    cmd: ['node', join(__dirname, 'type-check-gate.mjs')],
  },
]

// ---------- 运行单个关卡 ----------
function runCheck(check) {
  const res = spawnSync(check.cmd[0], check.cmd.slice(1), {
    encoding: 'utf8',
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const out = (res.stdout || '') + (res.stderr || '')
  const ok = res.status === 0
  return { ...check, ok, out, status: res.status ?? -1 }
}

// ---------- 主流程 ----------
console.log('\n╔══════════════════════════════════════════════════════════╗')
console.log('║        无人机培训系统 · 一键体检 (health-check)           ║')
console.log('╚══════════════════════════════════════════════════════════╝\n')

const results = CHECKS.map(runCheck)
let fails = 0
let warns = 0

for (const r of results) {
  const level = r.ok ? 'PASS' : r.severity
  if (level === 'FAIL') fails++
  if (level === 'WARN') warns++

  const icon = level === 'PASS' ? '✅' : level === 'WARN' ? '⚠️ ' : '❌'
  console.log(`${icon} [${level}] ${r.name} — ${r.desc}`)
  if (!QUIET) {
    const indented = r.out
      .split('\n')
      .map((l) => (l ? '      ' + l : l))
      .join('\n')
    console.log(indented)
    console.log('')
  }
}

// ---------- 汇总 ----------
console.log('──────────────────────────────────────────────────────────')
console.log(`关卡总数: ${results.length}  |  PASS: ${results.length - fails - warns}  |  WARN: ${warns}  |  FAIL: ${fails}`)
if (fails > 0) {
  console.log('\n❌ 存在必须修复的问题（FAIL）。请按上面各关卡输出定位并修复后重跑。')
} else if (warns > 0) {
  console.log('\n⚠️  无阻断性错误，但存在需人工复核的候选（WARN）。确认非误报后再决定是否修复。')
} else {
  console.log('\n✅ 全部通过。未检出可静态探测的 bug。')
}
console.log('──────────────────────────────────────────────────────────\n')
console.log('提示：业务/逻辑类 bug（如 api-order 重复下单拦截、退款审核分支）静态扫不出，')
console.log('      需结合 e2e/ 端到端用例与人工走查云函数核心分支。详见 docs/BUG_HUNTING.md。\n')

process.exit(fails > 0 ? 1 : 0)
