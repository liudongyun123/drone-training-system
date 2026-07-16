/**
 * 一次性数据回填脚本：learning_progress → user_progress
 * ---------------------------------------------------------------------------
 * 背景：
 *   原学习进度存在两套并行集合：
 *     - learning_progress：按 _openid 标识（HTTP/手机号登录下 _openid 恒空，导致进度不可见/写不进）
 *     - user_progress：按 phone 标识（课程/课时进度统一落此处）
 *   本次改造已将 api-course / Web / 小程序的学习路径进度全部改读写 user_progress（phone 主键），
 *   并删除了 learning_progress 的全部云函数 action。本脚本负责把历史 learning_progress 数据
 *   迁移进 user_progress，使其按手机号可被三端正确读取。
 *
 * 运行环境：
 *   需在拥有 CloudBase 访问凭证的环境执行（与 db-optimize / rename-collections 等脚本一致）。
 *   例如：TCB_ENV_ID=rcwljy-5ghmq2ex26764978 node scripts/migrate-learning-progress.mjs
 *   如需一并合并 user_progress 内的重复记录（同 phone+courseId+lessonId 的学员端/后台端双记录），
 *   追加 --dedup 参数：node scripts/migrate-learning-progress.mjs --dedup
 *
 * 安全：
 *   - 只新增/更新 user_progress，不删除 learning_progress（保留作备份，确认无误后由运维手动删除）。
 *   - 无法解析出手机号的记录（无 phone / 无法通过 userId/_openid 反查 members）会被跳过并计数。
 */
import cloudbase from '@cloudbase/node-sdk'

const env = process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978'
const app = cloudbase.init({ env })
const db = app.database()
const _ = db.command

const BATCH = 100
const DO_DEDUP = process.argv.includes('--dedup')

async function queryAll(collection, where = {}) {
  const all = []
  let skip = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await db.collection(collection).where(where).limit(BATCH).skip(skip).get()
    const list = res.data || []
    all.push(...list)
    if (list.length < BATCH) break
    skip += BATCH
  }
  return all
}

async function resolvePhone(doc) {
  if (doc.phone) return doc.phone
  const or = []
  if (doc.userId) or.push({ userId: doc.userId })
  if (doc._openid) or.push({ _openid: doc._openid }, { openid: doc._openid })
  if (or.length === 0) return ''
  try {
    const m = await db.collection('members').where(_.or(or)).limit(1).get()
    return m.data?.[0]?.phone || ''
  } catch {
    return ''
  }
}

function toUserProgressRecord(doc, phone, now) {
  const isPath = !!doc.pathId
  const progress = typeof doc.progress === 'number' ? doc.progress : (doc.overallProgress || 0)
  const completed =
    doc.completed === true ||
    (typeof doc.progress === 'number' && doc.progress >= 100) ||
    doc.status === 'completed'
  const status = doc.status ||
    (completed ? 'completed' : progress > 0 ? 'in_progress' : 'not_started')
  return {
    phone,
    userId: doc.userId || '',
    _openid: doc._openid || '',
    courseId: doc.courseId || '',
    lessonId: doc.lessonId || '',
    pathId: doc.pathId || '',
    type: isPath ? 'path' : (doc.type || 'lesson'),
    status,
    progress,
    watchProgress: progress,
    completed,
    videoProgress: progress,
    completedCourses: doc.completedCourses || [],
    currentCourse: doc.currentCourse || '',
    startedAt: doc.startedAt || now,
    completedAt: doc.completedAt || (completed ? now : undefined),
    lastStudyTime: doc.lastStudyTime || doc.lastStudyAt || doc.updatedAt || now,
    updatedAt: now,
    createdAt: doc.createdAt || now,
  }
}

async function migrate() {
  console.log('[migrate] 读取 learning_progress ...')
  const docs = await queryAll('learning_progress')
  console.log(`[migrate] 共 ${docs.length} 条`)

  let migrated = 0
  let skipped = 0
  for (const doc of docs) {
    const phone = await resolvePhone(doc)
    if (!phone) {
      skipped++
      continue
    }
    const now = Date.now()
    const rec = toUserProgressRecord(doc, phone, now)
    const where = rec.pathId
      ? { phone, pathId: rec.pathId }
      : { phone, courseId: rec.courseId, lessonId: rec.lessonId }

    const existing = await db.collection('user_progress').where(where).limit(1).get()
    if (existing.data && existing.data.length > 0) {
      const { phone: _p, userId: _u, _openid: _o, createdAt: _c, type: _t, ...rest } = rec
      await db.collection('user_progress').doc(existing.data[0]._id).update(rest)
    } else {
      await db.collection('user_progress').add({ data: rec })
    }
    migrated++
  }
  console.log(`[migrate] 完成：迁移 ${migrated} 条，跳过(无手机号) ${skipped} 条`)
}

async function dedupUserProgress() {
  console.log('[dedup] 扫描 user_progress 重复记录（同 phone+courseId+lessonId）...')
  const docs = await queryAll('user_progress', {})
  const groups = new Map()
  for (const d of docs) {
    if (d.pathId || !d.courseId || !d.lessonId) continue
    const key = `${d.phone || ''}|${d.courseId}|${d.lessonId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(d)
  }
  let removed = 0
  for (const [, items] of groups) {
    if (items.length <= 1) continue
    // 保留信息最全者（优先有 progress 数值 / 有 userName），其余删除
    const score = (x) =>
      (typeof x.progress === 'number' ? 2 : 0) +
      (x.userName || x.userPhone ? 1 : 0) +
      (x.watchProgress ? 1 : 0)
    items.sort((a, b) => score(b) - score(a))
    const [, ...dups] = items
    for (const dup of dups) {
      if (dup._id) {
        await db.collection('user_progress').doc(dup._id).remove()
        removed++
      }
    }
  }
  console.log(`[dedup] 合并重复记录 ${removed} 条`)
}

async function main() {
  await migrate()
  if (DO_DEDUP) await dedupUserProgress()
  console.log('[migrate] learning_progress 保留作备份，未删除。确认无误后可手动删除该集合。')
}

main().catch((e) => {
  console.error('[migrate] 失败:', e)
  process.exit(1)
})
