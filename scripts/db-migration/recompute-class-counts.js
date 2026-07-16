#!/usr/bin/env node
/**
 * 一次性脚本：按 enrollments 真相源重算各班级在读人数（capacity.enrolled/confirmed、enrolledCount）
 * 安全、幂等：仅更新计数，不删除任何数据。
 * 用法：
 *   node scripts/db-migration/recompute-class-counts.js            # 执行
 *   node scripts/db-migration/recompute-class-counts.js --dry-run  # 仅统计
 */
'use strict'
const DB_INIT_URL = process.env.DB_INIT_URL || 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'
const DRY_RUN = process.argv.includes('--dry-run')
const ROSTER_STATUSES = ['active', 'confirmed', 'learning']

async function dbInit(action, payload = {}) {
  const res = await fetch(DB_INIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}
async function queryAll(collection, where) {
  let skip = 0; const limit = 100; const all = []
  for (let p = 0; p < 1000; p++) {
    const r = await dbInit('query', { collection, where, useOperators: true, skip, limit })
    const list = (r && r.data) || []; all.push(...list)
    if (list.length < limit) break; skip += limit
  }
  return all
}
;(async () => {
  console.log('=== 重算班级在读人数 ===', DRY_RUN ? '(DRY-RUN)' : '(执行)')
  const classes = await queryAll('classes', {})
  const enrollments = await queryAll('enrollments', {})

  // 统计每个 classId 的在读人数
  const countByClass = {}
  for (const e of enrollments) {
    if (!e.classId) continue
    if (!ROSTER_STATUSES.includes(e.status)) continue
    countByClass[e.classId] = (countByClass[e.classId] || 0) + 1
  }

  let changed = 0
  for (const c of classes) {
    const newEnrolled = countByClass[c._id] || 0
    const oldEnrolled = (c.capacity && (c.capacity.enrolled ?? c.capacity.confirmed)) ?? c.enrolledCount ?? 0
    const max = (c.capacity && c.capacity.max) ?? c.maxStudents ?? 0
    const patch = {
      capacity: { ...(c.capacity || {}), enrolled: newEnrolled, confirmed: newEnrolled, max },
      enrolledCount: newEnrolled,
      maxStudents: max,
      updatedAt: new Date().toISOString(),
    }
    if (oldEnrolled !== newEnrolled) {
      changed++
      console.log(`  ${c.name || c._id}: ${oldEnrolled} → ${newEnrolled} (max=${max})`)
      if (!DRY_RUN) await dbInit('update', { collection: 'classes', id: c._id, data: patch })
    } else {
      console.log(`  ${c.name || c._id}: 不变 (${newEnrolled})`)
    }
  }
  console.log(`\n完成。变更班级数: ${changed}`)
})().catch(e => { console.error(e); process.exit(1) })
