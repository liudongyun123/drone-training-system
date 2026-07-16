#!/usr/bin/env node
/**
 * 一次性非破坏性回填脚本：把历史 class_members 成员合并进 enrollments
 * ----------------------------------------------------------------------------
 * 背景：学员管理「按班级」页以 enrollments 为唯一真相源（classMemberService.getClassRoster）。
 * 但历史上班级成员由 registrationService 直接写入 class_members，并未同步生成 enrollments，
 * 导致这部分成员（及仅有 class_members 的班级）在学员管理里"看不到"。
 *
 * 本脚本扫描 class_members，对"在班级里"(status ∈ active/confirmed/pending/enrolled) 且
 * enrollments 中无对应 (classId+phone) 的成员，合成一条 enrollments 记录，使学员管理能加载到。
 *
 * 安全原则：
 *   - 绝不删除（不调用 delete）。
 *   - 仅新增 enrollment；已存在对应 enrollment 的跳过（幂等，可重复运行）。
 *   - status=dropped 的成员视为已退班，不补 enrollment。
 *
 * 用法：
 *   node scripts/db-migration/backfill-enrollments-from-class-members.js            # 执行
 *   node scripts/db-migration/backfill-enrollments-from-class-members.js --dry-run  # 仅统计
 */

'use strict'

const DB_INIT_URL =
  process.env.DB_INIT_URL ||
  'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'

const DRY_RUN = process.argv.includes('--dry-run')

// class_members 中"仍在班级里"的状态 → 需要补 enrollment
const MEMBER_ACTIVE = ['active', 'confirmed', 'enrolled']
// mapping: class_members.status → enrollment.status
function toEnrollmentStatus(s) {
  if (s === 'pending') return 'pending'
  return 'confirmed'
}
// 归一化来源
function normSource(src) {
  if (!src) return 'offline'
  if (['offline_enroll', 'offline', 'registration'].includes(src)) return 'offline'
  if (['online_enroll', 'online', 'online_purchase', 'purchase'].includes(src)) return 'online'
  return 'offline'
}

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

async function backfill() {
  console.log('==================================================')
  console.log(' 把历史 class_members 合并进 enrollments')
  console.log(' 端点:', DB_INIT_URL)
  console.log(' 模式:', DRY_RUN ? 'DRY-RUN（仅统计，不写入）' : '执行写入')
  console.log('==================================================\n')

  const classMembers = await queryAll('class_members', {})
  console.log(`[1/3] class_members 总数: ${classMembers.length}`)

  // 预加载班级信息（courseId / name）
  const classMap = {}
  const classes = await queryAll('classes', {})
  classes.forEach((c) => (classMap[c._id] = c))

  let toCreate = 0
  let skippedDropped = 0
  let skippedNoClass = 0
  const created = []
  const errors = []

  console.log('[2/3] 比对 enrollments ...')
  for (const m of classMembers) {
    const phone = m.phone || m.userPhone || ''
    const classId = m.classId || ''
    if (!classId) { skippedNoClass++; continue }
    if (m.status === 'dropped') { skippedDropped++; continue }
    if (!MEMBER_ACTIVE.includes(m.status) && m.status !== 'pending') { skippedDropped++; continue }
    if (!phone) {
      console.log(`   · 跳过（无手机号）: class_member ${m._id}`)
      continue
    }

    // 是否已存在对应 enrollment
    const exist = await dbInit('query', {
      collection: 'enrollments',
      where: { classId, phone },
      limit: 1,
    })
    if ((exist && exist.data && exist.data.length) || (exist && exist.total > 0)) {
      continue // 已存在，跳过
    }

    const cls = classMap[classId]
    const payload = {
      classId,
      className: m.className || (cls && cls.name) || '',
      courseId: (cls && cls.courseId) || '',
      phone,
      studentPhone: phone,
      studentName: m.studentName || m.userName || '',
      userName: m.studentName || m.userName || '',
      studentId: m.studentId || m.userId || phone,
      userId: m.studentId || m.userId || phone,
      source: normSource(m.source),
      status: toEnrollmentStatus(m.status),
      paymentStatus: 'unpaid',
      access: { videoEnabled: false, offlineMaterials: false },
      enrollmentTime: m.joinedAt || m.enrolledAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _backfilled: true,
      _backfillFrom: 'class_members:' + (m._id || ''),
    }

    if (DRY_RUN) {
      toCreate++
      console.log(`   + 待新增 enrollment: class=${classId} phone=${phone} name=${payload.studentName} status=${payload.status}`)
    } else {
      try {
        await dbInit('add', { collection: 'enrollments', data: payload })
        toCreate++
        created.push(`${classId}|${phone}`)
        console.log(`   + 已新增 enrollment: class=${classId} phone=${phone} name=${payload.studentName}`)
      } catch (e) {
        errors.push(`新增 enrollment 失败 class_member=${m._id}: ${e.message}`)
        console.error(`   ! 失败: ${m._id} - ${e.message}`)
      }
    }
  }

  console.log('\n[3/3] 汇总')
  console.log('--------------------------------------------------')
  console.log(` 扫描 class_members:     ${classMembers.length}`)
  console.log(` 新增 enrollments:       ${toCreate}`)
  console.log(` 跳过(dropped/无效):     ${skippedDropped}`)
  console.log(` 跳过(无 classId):       ${skippedNoClass}`)
  console.log(` 错误:                   ${errors.length}`)
  if (errors.length) errors.slice(0, 20).forEach((e) => console.log('  ! ' + e))
  console.log('--------------------------------------------------')
  console.log(DRY_RUN ? ' DRY-RUN 完成，未写入任何数据。' : ' 回填完成。')
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => { console.error('异常终止:', err); process.exit(1) })
