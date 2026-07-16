/**
 * 一次性清理脚本：把 practiceRecords 中历史存错的 targetName（乱码/旧名称）
 * 按 targetId 回写为当前真实题库 / 模拟考试的名称。
 *
 * 与前端 practice.ts 的修正逻辑保持一致：
 *  - 题库练习 → questionBanks 的 name || title
 *  - 模拟考试 → exams 的 title || name
 *  - 取不到对应题库/考试时不动该行（避免误写成空串，非破坏性）
 *
 * 仅更新 targetName 字段，绝不删除任何数据。
 *
 * 运行方式（需 Node18+ 且能访问 CloudBase 环境）：
 *    TCB_ENV_ID=rcwljy-5ghmq2ex26764978 \
 *    TCB_SECRET_ID=<你的SecretId> TCB_SECRET_KEY=<你的SecretKey> \
 *    node scripts/db-migration/clean-practice-records.cjs
 *
 * 预览（只统计不写库）：
 *    DRY_RUN=1 TCB_ENV_ID=... TCB_SECRET_ID=... TCB_SECRET_KEY=... \
 *    node scripts/db-migration/clean-practice-records.cjs
 *
 * 注意：本脚本不会自动执行，需人工在可访问生产环境的位置运行。
 */
const ENV_ID = process.env.TCB_ENV_ID || ''
const SECRET_ID = process.env.TCB_SECRET_ID || ''
const SECRET_KEY = process.env.TCB_SECRET_KEY || ''
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'

if (!ENV_ID) {
  console.error('[clean] 缺少环境变量 TCB_ENV_ID，已中止。')
  process.exit(1)
}
if (!SECRET_ID || !SECRET_KEY) {
  console.error('[clean] 缺少凭证：请先导出 TCB_SECRET_ID / TCB_SECRET_KEY（或在本机执行 `cloudbase login` 后改用 CLI 会话）。')
  process.exit(1)
}

let tcb
try {
  tcb = require('@cloudbase/node-sdk')
} catch (e) {
  console.error('[clean] 未安装 @cloudbase/node-sdk，请先 npm i @cloudbase/node-sdk')
  process.exit(1)
}

const app = tcb.init({ env: ENV_ID, secretId: SECRET_ID, secretKey: SECRET_KEY })
const db = app.database()
const _ = db.command
const BATCH = 100

async function loadAll(collection) {
  const map = {}
  let cursor = null
  while (true) {
    let q = db.collection(collection).limit(BATCH)
    if (cursor) q = q.where({ _id: _.gt(cursor) })
    const res = await q.get()
    const list = res.data || []
    if (list.length === 0) break
    for (const doc of list) {
      const name = doc.name || doc.title || ''
      if (name) map[doc._id] = name
    }
    cursor = list[list.length - 1]._id
    if (list.length < BATCH) break
  }
  return map
}

async function main() {
  console.log(`[clean] 开始${DRY_RUN ? '（预览模式，不写库）' : ''}，目标环境:`, ENV_ID)

  const bankMap = await loadAll('questionBanks')
  const examMap = await loadAll('exams')
  console.log(`[clean] 已加载题库 ${Object.keys(bankMap).length} 个、考试 ${Object.keys(examMap).length} 个`)

  let cursor = null
  let scanned = 0
  let fixed = 0
  let skipped = 0

  while (true) {
    let q = db.collection('practiceRecords').limit(BATCH)
    if (cursor) q = q.where({ _id: _.gt(cursor) })
    const res = await q.get()
    const list = res.data || []
    if (list.length === 0) break

    for (const r of list) {
      scanned++
      const targetId = r.targetId || r.bankId || r.examId || ''
      let correctName = r.type === 'exam' ? (examMap[targetId] || '') : (bankMap[targetId] || '')

      // 按 targetId 找不到时，尝试对存储的 targetName 做 URL 解码
      // （历史数据曾把 encodeURIComponent 结果直接存入，表现为乱码）
      if (!correctName && r.targetName) {
        try {
          const decoded = decodeURIComponent(r.targetName)
          if (decoded !== r.targetName && !decoded.includes('%')) correctName = decoded
        } catch (e) {
          // 解码失败则保持原值
        }
      }

      if (!correctName) {
        skipped++ // 找不到对应题库/考试，跳过不动
        continue
      }
      if (r.targetName === correctName) {
        skipped++ // 名称已正确，无需处理
        continue
      }
      if (DRY_RUN) {
        console.log(`[clean][DRY] ${r._id} (${r.type}) ${JSON.stringify(r.targetName)} -> ${correctName}`)
      } else {
        await db.collection('practiceRecords').doc(r._id).update({ targetName: correctName })
      }
      fixed++
    }

    cursor = list[list.length - 1]._id
    if (list.length < BATCH) break
  }

  console.log(`[clean] 完成：扫描 ${scanned} 条，待修正/已修正 ${fixed} 条，跳过（名称正确/无对应题库）${skipped} 条。`)
  if (DRY_RUN) console.log('[clean] 预览模式未写库。去掉 DRY_RUN 重新运行以真正回写。')
}

main().catch((e) => {
  console.error('[clean] 失败:', e && e.message)
  process.exit(1)
})
