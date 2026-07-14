/**
 * 一次性清理脚本：删除 E2E 测试在 course_permissions 中产生的 class_gift 残留。
 *
 * 安全策略（最小侵入）：
 *  - 仅删除 status === 'revoked' 的记录（E2E 测试“撤销”步骤的产物，对业务已无影响）；
 *  - 绝不删除 status === 'active' 的记录（避免误删管理员真实赠送的可用权限）；
 *  - 按 phone 精确命中，默认只处理测试涉及学员。
 *
 * 运行（需能访问 CloudBase 环境）：
 *   TCB_ENV_ID=rcwljy-5ghmq2ex26764978 \
 *   TCB_SECRET_ID=<SecretId> TCB_SECRET_KEY=<SecretKey> \
 *   node scripts/cleanup-e2e-gifts.cjs --phone=17628157097        # dry-run 打印
 *   node scripts/cleanup-e2e-gifts.cjs --phone=17628157097 --apply # 真正删除
 *
 * 若不传 TCB_SECRET_ID/KEY，且本机已 `cloudbase login`，也可直接连。
 */
const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978'
const SECRET_ID = process.env.TCB_SECRET_ID || ''
const SECRET_KEY = process.env.TCB_SECRET_KEY || ''

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const PHONE = (args.find((a) => a.startsWith('--phone=')) || '--phone=17628157097').split('=')[1]

const app = SECRET_ID && SECRET_KEY
  ? cloudbase.init({ env: ENV_ID, secretId: SECRET_ID, secretKey: SECRET_KEY })
  : cloudbase.init({ env: ENV_ID })
const db = app.database()

async function main() {
  console.log(`[cleanup] 环境=${ENV_ID} phone=${PHONE} apply=${APPLY}`)
  const res = await db
    .collection('course_permissions')
    .where({ phone: PHONE, source: 'class_gift', status: 'revoked' })
    .limit(1000)
    .get()
  const list = res.data || []
  console.log(`[cleanup] 命中 revoked 的 class_gift 记录：${list.length} 条`)
  for (const r of list) {
    console.log(
      `  - _id=${r._id} course=${r.courseName || r.courseId} classId=${r.classId} ` +
      `status=${r.status} createdAt=${r.createdAt || r._createTime}`
    )
  }

  if (!APPLY) {
    console.log('[cleanup] （dry-run）未执行删除，加 --apply 执行。')
    return
  }
  for (const r of list) {
    await db.collection('course_permissions').doc(r._id).remove()
    console.log(`[cleanup] 已删除 ${r._id}`)
  }
  console.log('[cleanup] 完成。')
}

main().catch((e) => {
  console.error('[cleanup] 失败：', e && e.message ? e.message : e)
  process.exit(1)
})
