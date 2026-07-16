#!/usr/bin/env node
/**
 * check-field-consistency.mjs — 字段别名一致性自检（advisory）
 * ----------------------------------------------------------------------------
 * 背景：本项目存在"同一语义字段在读端/写端用不同名字"的历史坑，例如：
 *   - orders 的订单类型：写端双写 orderType + type，读端必须按 orderType 查询
 *   - notices 的类型：需同时写 noticeType 与 type
 *   - orders 金额：finalAmount / totalAmount / amount / totalPrice 需 getOrderAmount 兼容
 *   - classes 容量：capacity{max,enrolled,confirmed} 与 maxStudents/enrolledCount 两种格式
 * 这类问题纯静态无法判对错（都是合法字段名），因此本脚本不做"判错"，而是基于
 * 【已知别名字典】输出每个别名在各文件的分布，作为 advisory，便于人工交叉核对：
 *   写端是否"双写全部别名"、读端是否"对所有别名做兜底"。
 *
 * 用法：
 *   node scripts/check-field-consistency.mjs            # 扫 src/
 *   node scripts/check-field-consistency.mjs --mp       # 同时扫 miniprogram/
 *   node scripts/check-field-consistency.mjs --full     # 展开每个别名的文件清单
 * 退出码：恒为 0（advisory，不阻断提交）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const MP_DIR = path.join(ROOT, 'miniprogram')

const ARGS = process.argv.slice(2)
const SCAN_MP = ARGS.includes('--mp')
const FULL = ARGS.includes('--full')

// ---------- 已知字段别名组（来自项目历史踩坑） ----------
// 每组：{ name, fields[], note }
//   - fields：语义相同、需保持一致（写端双写 / 读端兜底）的字段名
//   - note：人工核对时的关键提示
const ALIAS_GROUPS = [
  {
    name: '订单类型 (orders)',
    fields: ['orderType', 'type'],
    note: '写端须双写 orderType+type；读端按 orderType 查询、兜底 type。',
  },
  {
    name: '订单金额 (orders)',
    fields: ['finalAmount', 'totalAmount', 'amount', 'totalPrice'],
    note: '读取金额统一走 getOrderAmount(o) 兼容四种字段，勿只读单一字段。',
  },
  {
    name: '公告类型 (notices)',
    fields: ['noticeType', 'type'],
    note: '公告保存须同时写 noticeType 与 type（与公告管理模块一致）。',
  },
  {
    name: '班级容量 (classes)',
    fields: ['maxStudents', 'enrolledCount', 'capacity'],
    note: '两种格式并存：capacity{max,enrolled,confirmed} 与 maxStudents/enrolledCount，读写都要兼容。',
  },
  {
    name: '报班集合名',
    fields: ['enrollments', 'registrations'],
    note: 'MyOrders/报班记录读集合是 enrollments（不是 registrations）；registrations 为历史遗留。',
  },
  {
    name: '成员集合名',
    fields: ['members', 'users'],
    note: 'members 为主集合；users 为历史迁移配对，api-auth 登录时 members 查不到再回退 users。',
  },
]

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

const files = walk(SRC_DIR, ['.ts', '.tsx', '.js'])
if (SCAN_MP) files.push(...walk(MP_DIR, ['.ts', '.js']))

// ---------- 统计每个字段出现的文件与次数 ----------
// fieldStats: field -> Map(file -> count)
const fieldStats = new Map()
const ALL_FIELDS = new Set(ALIAS_GROUPS.flatMap((g) => g.fields))
for (const f of ALL_FIELDS) fieldStats.set(f, new Map())

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8')
  for (const field of ALL_FIELDS) {
    // 仅统计"字段用法"形态，降噪（排除 TS 类型注解 `: SomeType`、import 等）：
    //   .field            属性访问
    //   field:            对象属性/接口字段定义
    //   'field' / "field" 字符串键 / 集合名字面量
    const patterns = [
      new RegExp(`\\.${field}\\b`, 'g'),
      new RegExp(`\\b${field}\\s*:`, 'g'),
      new RegExp(`['"]${field}['"]`, 'g'),
    ]
    let n = 0
    for (const re of patterns) n += (code.match(re) || []).length
    if (n > 0) fieldStats.get(field).set(file, n)
  }
}

// ---------- 输出报告 ----------
const rel = (p) => path.relative(ROOT, p)
console.log('\n========== 字段别名一致性报告 (advisory) ==========')
console.log(`扫描目录: src/${SCAN_MP ? ' + miniprogram/' : ''}`)

for (const g of ALIAS_GROUPS) {
  console.log(`\n· ${g.name}`)
  const perField = g.fields.map((fld) => {
    const m = fieldStats.get(fld)
    const files = [...m.keys()]
    const total = [...m.values()].reduce((a, b) => a + b, 0)
    return { fld, files, total }
  })
  for (const pf of perField) {
    console.log(`    ${pf.fld.padEnd(14)} 出现 ${String(pf.total).padStart(4)} 次 / ${pf.files.length} 个文件`)
    if (FULL && pf.files.length) {
      for (const f of pf.files) console.log(`        - ${rel(f)}`)
    }
  }
  // 提示：若某组里有别名"从未出现"，或分布明显偏斜，可能是遗漏兜底
  const zero = perField.filter((pf) => pf.total === 0).map((pf) => pf.fld)
  if (zero.length) {
    console.log(`    ⚠️  未出现的别名: ${zero.join(', ')}（若语义需要，检查是否遗漏双写/读取）`)
  }
  console.log(`    ℹ️  ${g.note}`)
}

console.log('\n提示：本报告为 advisory（不判对错、不阻断）。核对要点：')
console.log('  1) 写端是否把同组别名"全部写入"（双写），避免读端按另一个名字查不到；')
console.log('  2) 读端是否对同组别名"做兜底"（如 o.orderType || o.type、getOrderAmount）。')
console.log('用 --full 展开每个别名的文件清单，逐一核对读/写端。')
console.log('==================================================\n')

process.exit(0)
