#!/usr/bin/env node
/**
 * check-status-enum.mjs — 状态枚举一致性自检脚本（诊断"写端/读端枚举分裂"类 bug）
 * ----------------------------------------------------------------------------
 * 背景：本项目反复出现一类结构性 bug —— 同一张集合，后台"写入端"和前端"读取端"
 *       使用了不一致的状态枚举，导致数据写进去了但前端过滤不到（典型的：notices
 *       集合规范状态是 published/draft/expired，但内容配置模块的公告 Tab 复用了
 *       通用的 active/inactive 开关，写进 active，前端按 status:'published' 过滤，
 *       公告从此"消失"）。
 *
 * 本脚本静态扫描 src/（可加 --mp 纳入 miniprogram/）。对每个集合，只把"出现在该集合
 * 名引用 ±WINDOW 字符内"的状态字面量归并到该集合（借此排除 collections.ts /
 * Layout.tsx 这类跨集合汇总文件的干扰）。当某个集合同时出现了：
 *   - A 族（active / inactive / disabled / banned）
 *   - B 族（published / draft / expired）
 * 就判定为"疑似枚举分裂"候选，输出供人工复核。
 *
 * 说明：
 *   - 这是"辅助定位"工具，不是精确 oracle。一个文件若同时管理多个集合（如
 *     PageConfigManagement 同时管 banners[active/inactive] 与 notices[published/draft]），
 *     banners 的 'active' 不会因文件里别处的 'published' 而被误判——窗口机制已隔离。
 *   - 输出候选仍需人工结合读端过滤条件确认。一旦确认是真 bug，按
 *     scripts/db-migration/normalize-notices-status.js 思路做存量归一化。
 *
 * 用法：
 *   node scripts/check-status-enum.mjs            # 仅扫 src/
 *   node scripts/check-status-enum.mjs --mp       # 同时扫 miniprogram/
 * 退出码：0 = 未发现候选；1 = 发现候选（可作 CI 提示，但不强制失败）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(ROOT, 'src')
const MP_DIR = path.join(ROOT, 'miniprogram')

const SCAN_MP = process.argv.includes('--mp')
const WINDOW = 250 // 集合名引用 ± 字符内才归并状态字面量

// ---------- 已知集合名 ----------
const COLLECTIONS = [
  'notices', 'banners', 'courses', 'classes', 'learningPaths',
  'members', 'users', 'teachers', 'categories', 'orders', 'products',
  'certificates', 'questionBanks', 'bankQuestions', 'examAttempts',
  'enrollments', 'course_permissions', 'contracts', 'coupons', 'groups',
  'posts', 'comments', 'messages', 'feedbacks', 'schedules', 'attendances',
  'class_members', 'registrations',
]

// A 族：通用开关式状态（与 B 族互斥时通常是 bug 来源）
const FAMILY_A = ['active', 'inactive', 'disabled', 'banned', 'enabled']
// B 族：内容/发布式状态
const FAMILY_B = ['published', 'draft', 'expired']

const A_SET = new Set(FAMILY_A)
const B_SET = new Set(FAMILY_B)

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

// ---------- 扫描：按"集合名引用 ±窗口"归并状态字面量 ----------
const report = {}
for (const c of COLLECTIONS) report[c] = { files: new Set(), a: new Set(), b: new Set() }

function ingestFile(file) {
  const code = fs.readFileSync(file, 'utf8')

  // 收集该文件所有"集合名引用"的位置
  const collRefs = [] // { col, pos }
  for (const c of COLLECTIONS) {
    const re = new RegExp(`['"\`/]${c}['"\`/]|collection\\s*[=:]\\s*['"]${c}['"]|===\\s*['"]${c}['"]`, 'g')
    let m
    while ((m = re.exec(code))) collRefs.push({ col: c, pos: m.index })
  }
  if (collRefs.length === 0) return

  // 收集该文件所有状态字面量位置
  const statusRefs = []
  for (const m of code.matchAll(/['"]([a-z_]+)['"]/g)) {
    const t = m[1]
    if (A_SET.has(t) || B_SET.has(t)) statusRefs.push({ token: t, pos: m.index })
  }
  if (statusRefs.length === 0) return

  // 每个状态字面量，归并到窗口内最近的集合引用
  for (const s of statusRefs) {
    let best = null
    let bestDist = Infinity
    for (const c of collRefs) {
      const d = Math.abs(c.pos - s.pos)
      if (d <= WINDOW && d < bestDist) { best = c; bestDist = d }
    }
    if (!best) continue
    const r = report[best.col]
    r.files.add(file)
    if (A_SET.has(s.token)) r.a.add(s.token)
    else r.b.add(s.token)
  }
}

const files = walk(SRC_DIR, ['.ts', '.tsx', '.js'])
if (SCAN_MP) files.push(...walk(MP_DIR, ['.ts', '.js']))
for (const f of files) ingestFile(f)

// ---------- 输出候选 ----------
const rel = (p) => path.relative(ROOT, p)
const candidates = []
for (const c of COLLECTIONS) {
  const r = report[c]
  if (r.a.size > 0 && r.b.size > 0) {
    candidates.push({ collection: c, files: [...r.files], a: [...r.a], b: [...r.b] })
  }
}

console.log('\n========== 状态枚举一致性自检报告 ==========')
console.log(`扫描目录: src/${SCAN_MP ? ' + miniprogram/' : ''}`)
console.log(`被引用集合数: ${COLLECTIONS.filter((c) => report[c].files.size).length}`)

if (candidates.length === 0) {
  console.log('\n✅ 未发现同时混用 A 族(active/inactive…) 与 B 族(published/draft/expired) 的集合。')
} else {
  console.log(`\n⚠️  发现 ${candidates.length} 个集合疑似"枚举分裂"（需人工复核）：`)
  for (const x of candidates) {
    console.log(`\n  · 集合: ${x.collection}`)
    console.log(`      A 族状态: ${x.a.join(', ')}`)
    console.log(`      B 族状态: ${x.b.join(', ')}`)
    console.log(`      涉及文件(${x.files.length}):`)
    for (const f of x.files) console.log(`        - ${rel(f)}`)
    console.log('      复核建议：确认该集合的"写入端"与"读取端(过滤条件)"是否一致；')
    console.log('                若写 active 但读 published，则公告/内容会不可见 —— 按字典修复并跑归一化脚本。')
  }
  console.log('\nℹ️  注：窗口机制已隔离跨集合汇总文件；如仍有误报，请人工结合读端确认。')
}

console.log('==========================================\n')
process.exit(candidates.length ? 1 : 0)
