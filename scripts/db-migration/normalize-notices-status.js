#!/usr/bin/env node
/**
 * 一次性非破坏性归一化脚本：把历史 notices 的 active/inactive 状态归一为 published/draft
 * ----------------------------------------------------------------------------
 * 背景：notices 集合的规范状态是 published / draft / expired（前端 CloudNoticeService
 *       按 status:'published' 过滤，过期用 expiresAt 判断）。但内容配置模块的公告 Tab
 *       历史上复用了通用的 active/inactive 开关写入，导致这部分公告在写端是 active/
 *       inactive，前端按 published 过滤时永远看不到 —— 即"公告功能 bug"。
 *
 * 本脚本扫描 notices，把遗留的：
 *   - status === 'active'    → published  （原意是"开启展示"）
 *   - status === 'inactive'  → draft      （原意是"关闭/未发布"）
 * 归一回去。status 已是 published/draft/expired 或缺失的，一律跳过（幂等，可重复运行）。
 *
 * 安全原则：
 *   - 绝不做破坏性删除。
 *   - 仅 update status 字段；不触碰其它字段。
 *   - 默认先 --dry-run 统计，确认无误再加真实执行。
 *
 * 用法：
 *   node scripts/db-migration/normalize-notices-status.js            # 执行写入
 *   node scripts/db-migration/normalize-notices-status.js --dry-run  # 仅统计，不写入
 */

'use strict'

const DB_INIT_URL =
  process.env.DB_INIT_URL ||
  'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'

const DRY_RUN = process.argv.includes('--dry-run')

// 遗留状态 → 规范状态 映射
const MAP = { active: 'published', inactive: 'draft' }

async function dbInit(action, payload = {}) {
  const res = await fetch(DB_INIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

async function queryAll(collection, where) {
  let skip = 0
  const limit = 100
  const all = []
  for (let p = 0; p < 1000; p++) {
    const r = await dbInit('query', { collection, where, useOperators: true, skip, limit })
    const list = (r && r.data) || []
    all.push(...list)
    if (list.length < limit) break
    skip += limit
  }
  return all
}

async function updateDoc(collection, _id, data) {
  return dbInit('update', { collection, _id, data })
}

async function normalize() {
  console.log('==================================================')
  console.log(' 归一化历史 notices 的 active/inactive → published/draft')
  console.log(' 端点:', DB_INIT_URL)
  console.log(' 模式:', DRY_RUN ? 'DRY-RUN（仅统计，不写入）' : '执行写入')
  console.log('==================================================\n')

  const notices = await queryAll('notices', {})
  console.log(`[1/2] notices 总数: ${notices.length}`)

  let toFix = 0
  let skipped = 0
  const fixed = []
  const errors = []

  console.log('[2/2] 比对并归一化 ...')
  for (const n of notices) {
    const s = n.status
    if (!(s in MAP)) {
      skipped++
      continue
    }
    const newStatus = MAP[s]
    toFix++
    if (DRY_RUN) {
      console.log(`   · [dry] ${n._id}  status ${s} → ${newStatus}  (${n.title || ''})`)
      fixed.push(n._id)
      continue
    }
    try {
      await updateDoc('notices', n._id, { status: newStatus })
      fixed.push(n._id)
      console.log(`   · [ok]  ${n._id}  status ${s} → ${newStatus}  (${n.title || ''})`)
    } catch (e) {
      errors.push({ _id: n._id, err: e.message })
      console.log(`   · [ERR] ${n._id}  ${e.message}`)
    }
  }

  console.log('\n--------------------------------------------------')
  console.log(`待归一化: ${toFix}`)
  console.log(`已处理:   ${fixed.length}`)
  console.log(`跳过(已是规范状态/缺失): ${skipped}`)
  if (errors.length) console.log(`失败:     ${errors.length}`)
  console.log('--------------------------------------------------')
  if (DRY_RUN) console.log('（DRY-RUN 完成，未写入。去掉 --dry-run 重新运行以执行。）')
  else console.log('归一化完成。请在后台确认公告列表/前端展示已恢复。')
  console.log('==================================================\n')
}

normalize().catch((e) => {
  console.error('归一化失败:', e)
  process.exit(1)
})
