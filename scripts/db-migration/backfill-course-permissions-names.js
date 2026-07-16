#!/usr/bin/env node
/**
 * 一次性非破坏性回填脚本：把学员名称补回 course_permissions
 * ----------------------------------------------------------------------------
 * 背景：course_permissions 历史数据只存 phone/openid，没有 userName/userId。
 * 学员管理「按课程（购课人员）」页需要名称。本脚本按 phone 关联 members，
 * 把 member.name / member._id 写回 course_permissions 的 userName / userId 字段。
 *
 * 安全：仅补充缺失的 userName/userId（已存在则不覆盖）；绝不删除。
 * 用法：
 *   node scripts/db-migration/backfill-course-permissions-names.js            # 执行
 *   node scripts/db-migration/backfill-course-permissions-names.js --dry-run  # 仅统计
 */
'use strict'
const DB_INIT_URL = process.env.DB_INIT_URL || 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'
const DRY_RUN = process.argv.includes('--dry-run')

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
  console.log('=== 补回 course_permissions 学员名称 ===', DRY_RUN ? '(DRY-RUN)' : '(执行)')
  const perms = await queryAll('course_permissions', {})
  const members = await queryAll('members', {})
  const mMap = new Map()
  members.forEach(m => { if (m.phone) mMap.set(m.phone, m) })

  let filled = 0, skipped = 0, noMember = 0
  for (const p of perms) {
    const m = p.phone ? mMap.get(p.phone) : null
    if (!m) { noMember++; continue }
    const name = m.name || ''
    const uid = m._id || ''
    if (p.userName && p.userId) { skipped++; continue }
    if (DRY_RUN) {
      filled++
      console.log(`  + 待补: phone=${p.phone} → userName=${name}`)
    } else {
      const patch = {}
      if (!p.userName) patch.userName = name
      if (!p.userId) patch.userId = uid
      patch.updatedAt = new Date().toISOString()
      try {
        await dbInit('update', { collection: 'course_permissions', id: p._id, data: patch })
        filled++
        console.log(`  + 已补: phone=${p.phone} → userName=${name}`)
      } catch (e) {
        console.error(`  ! 失败 ${p._id}: ${e.message}`)
      }
    }
  }
  console.log(`\n完成。补充: ${filled}, 跳过(已有): ${skipped}, 无匹配会员: ${noMember}`)
})().catch(e => { console.error(e); process.exit(1) })
