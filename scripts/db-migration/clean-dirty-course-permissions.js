#!/usr/bin/env node
/**
 * 清理 course_permissions 中的脏记录（openid / "undefined" 误当 phone 写入的垃圾）
 * ----------------------------------------------------------------------------
 * 依据：视频权限校验按真实手机号 phone（lesson-player.ts: where:{phone,courseId}）。
 *       这些记录的 phone 不是合法手机号，无法被任何真实用户匹配，属无效垃圾，删除
 *       不影响任何真实功能。合法手机号但名称缺失的记录（真实购课权限）一律保留。
 *
 * 安全：删除前重新按 id 查询并二次校验 phone 仍非法，避免误删真实记录。
 * 用法：
 *   node scripts/db-migration/clean-dirty-course-permissions.js          # 执行清理
 *   node scripts/db-migration/clean-dirty-course-permissions.js --dry-run # 仅统计
 */
'use strict'
const DB_INIT_URL = process.env.DB_INIT_URL || 'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'
const DRY_RUN = process.argv.includes('--dry-run')
const TARGET_IDS = [
  '38fda8636a4cac0c00735f6e5f5b788f', // phone=7d17c2c... (openid 误当 phone)
  '482e95cf69fbfffa0141bef1083f5b07', // phone="undefined"（破损空记录）
]
const isPhone = (v) => typeof v === 'string' && /^1\d{10}$/.test(v)

async function dbInit(action, payload = {}) {
  const res = await fetch(DB_INIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

;(async () => {
  console.log('=== 清理 course_permissions 脏记录 ===', DRY_RUN ? '(DRY-RUN)' : '(执行)')
  const r = await dbInit('query', { collection: 'course_permissions', where: { _id: { $in: TARGET_IDS } }, useOperators: true, limit: 100 })
  const list = (r && r.data) || []
  const found = new Map(list.map(d => [d._id, d]))

  let deleted = 0
  for (const id of TARGET_IDS) {
    const rec = found.get(id)
    if (!rec) { console.log(`  - 跳过(不存在): ${id}`); continue }
    if (isPhone(rec.phone)) {
      console.log(`  ! 跳过(phone 合法，疑似真实记录): ${id} phone=${rec.phone}`)
      continue
    }
    console.log(`  * 待删: ${id}`)
    console.log(`      phone=${rec.phone}  userName=${rec.userName || '(空)'}  courseId=${rec.courseId || '(空)'}  classId=${rec.classId || '(空)'}`)
    if (DRY_RUN) { deleted++; continue }
    const del = await dbInit('delete', { collection: 'course_permissions', id })
    console.log(`      -> 删除结果: deleted=${del.deleted} code=${del.code}`)
    deleted++
  }
  console.log(`\n完成。实际删除: ${deleted}`)
})().catch(e => { console.error(e); process.exit(1) })
