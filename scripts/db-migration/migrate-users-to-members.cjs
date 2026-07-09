/**
 * 一次性迁移脚本：将遗留 users 集合中「从未登录、members 中不存在」的文档
 * 按手机号去重并入 members（规范集合）。
 *
 * 设计原则（非破坏性）：
 *  - 只读取 users，只向 members 追加缺失记录；
 *  - 绝不删除 users 中的任何数据；
 *  - 以 phone 为去重键（与 api-auth 登录时自动迁移逻辑一致）。
 *
 * 运行方式（需 Node18+ 且能访问 CloudBase 环境）：
 *    TCB_ENV_ID=rcwljy-5ghmq2ex26764978 \
 *    TCB_SECRET_ID=<你的SecretId> TCB_SECRET_KEY=<你的SecretKey> \
 *    node scripts/db-migration/migrate-users-to-members.cjs
 * 或在本机先 `cloudbase login` 后再执行（CLI 会话有效时可不传 Secret）。
 *
 * 注意：本脚本不会自动执行，需人工在可访问生产环境的位置运行。
 */
const fs = require('fs')
const path = require('path')

const ENV_ID = process.env.TCB_ENV_ID || ''
const SECRET_ID = process.env.TCB_SECRET_ID || ''
const SECRET_KEY = process.env.TCB_SECRET_KEY || ''
if (!ENV_ID) {
  console.error('[migrate] 缺少环境变量 TCB_ENV_ID，已中止。')
  process.exit(1)
}
if (!SECRET_ID || !SECRET_KEY) {
  console.error('[migrate] 缺少凭证：请先导出 TCB_SECRET_ID / TCB_SECRET_KEY（或在本机执行 `cloudbase login` 后改用 CLI 会话）。')
  process.exit(1)
}

let tcb
try {
  tcb = require('@cloudbase/node-sdk')
} catch (e) {
  console.error('[migrate] 未安装 @cloudbase/node-sdk，请先 npm i @cloudbase/node-sdk')
  process.exit(1)
}

const app = tcb.init({ env: ENV_ID, secretId: SECRET_ID, secretKey: SECRET_KEY })
const db = app.database()

const BATCH = 100

async function main() {
  console.log('[migrate] 开始，目标环境:', ENV_ID)

  let cursor = null
  let scanned = 0
  let migrated = 0
  let skipped = 0

  while (true) {
    let query = db.collection('users').limit(BATCH)
    if (cursor) query = query.where({ _id: db.command.gt(cursor) })
    const res = await query.get()
    const list = res.data || []
    if (list.length === 0) break

    for (const u of list) {
      scanned++
      const phone = u.phone || ''
      if (!phone) {
        skipped++
        continue
      }
      const exist = await db
        .collection('members')
        .where({ phone })
        .limit(1)
        .get()
      if (exist.data && exist.data.length > 0) {
        skipped++ // members 中已存在，跳过
        continue
      }
      const now = new Date().toISOString()
      await db.collection('members').add({
        name: u.username || u.name || phone,
        phone,
        password: u.password || '',
        role: u.role || 'student',
        status: u.status || 'active',
        source: 'migration-users',
        type: 'user',
        profile: u.profile || {},
        stats: u.stats || {
          totalHours: 0,
          completedCourses: 0,
          examAttempts: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
        enrolledCourses: u.enrolledCourses || [],
        completedCourses: u.completedCourses || [],
        createdAt: u.createdAt || now,
        updatedAt: now,
        lastLoginAt: u.lastLoginAt || now,
      })
      migrated++
    }

    cursor = list[list.length - 1]._id
    if (list.length < BATCH) break
  }

  console.log(
    `[migrate] 完成：扫描 ${scanned} 条 users，并入 members ${migrated} 条，跳过（已存在/无手机号）${skipped} 条。`
  )
  console.log('[migrate] users 集合未被修改，可安全保留或后续人工清理。')
}

main().catch(e => {
  console.error('[migrate] 失败:', e && e.message)
  process.exit(1)
})
