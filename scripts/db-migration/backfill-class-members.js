#!/usr/bin/env node
/**
 * 一次性非破坏性回填脚本：补齐 class_members 镜像
 * ----------------------------------------------------------------------------
 * 背景：v20260714 起，enrollments 成为班级名单的「唯一真相源」，class_members
 * 降级为派生镜像（小程序 class-detail 按 classId+phone 读取班级成员/视频权限）。
 * 上线前的存量 enrollments 没有对应的 class_members 镜像，会导致小程序老班级/老学员
 * 的权限判断为空。本脚本扫描在读 enrollments → 确保 class_members 存在对应镜像。
 *
 * 安全原则：
 *   - 绝不删除任何数据（不调用 delete）。
 *   - 幂等：已存在 active 镜像则跳过；缺失则新增；状态非 active 则置回 active。
 *   - 仅处理「在班级名单里」的 enrollments（status ∈ active/confirmed/learning）。
 *
 * 与 classMemberService._mirrorConfirm 字段约定保持一致（phone/userPhone、studentId/userId、
 * studentName/userName 双写，保证小程序按 classId+phone 命中）。
 *
 * 用法：
 *   node scripts/db-migration/backfill-class-members.js            # 执行回填
 *   node scripts/db-migration/backfill-class-members.js --dry-run  # 仅统计，不写入
 *
 * 依赖：仅需网络可访问 db-init 云函数 HTTP 端点（与生产后台同一入口，无需密钥）。
 * 可通过环境变量 DB_INIT_URL 覆盖目标端点。
 */

'use strict'

const DB_INIT_URL =
  process.env.DB_INIT_URL ||
  'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'

// 与 classMemberService.ROSTER_STATUSES 保持一致
const ROSTER_STATUSES = ['active', 'confirmed', 'learning']

const DRY_RUN = process.argv.includes('--dry-run')

// ============ 底层：复用生产后台的 db-init 端点 ============
async function dbInit(action, payload = {}) {
  const res = await fetch(DB_INIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for action=${action}`)
  }
  return res.json()
}

// 分页拉取某集合全部匹配记录（db-init 单次 limit 上限 100）
async function queryAll(collection, where) {
  let skip = 0
  const limit = 100
  const all = []
  // 安全上限，防止异常死循环
  for (let page = 0; page < 1000; page++) {
    const r = await dbInit('query', {
      collection,
      where,
      useOperators: true,
      skip,
      limit,
      orderBy: 'createdAt',
      order: 'desc',
    })
    const list = (r && r.data) || []
    all.push(...list)
    if (list.length < limit) break
    skip += limit
  }
  return all
}

// 成员基础字段（与 classMemberService._memberBase 一致）
function memberBase(enr) {
  const phone = enr.phone || enr.studentPhone || ''
  const userId = enr.studentId || enr.userId || phone
  const name = enr.studentName || enr.userName || ''
  return { phone, userId, name }
}

// 查找该生在该班的 class_members 镜像（兼容 phone / userPhone 两种历史字段）
async function findClassMember(classId, phone) {
  if (!classId || !phone) return null
  const r = await dbInit('query', {
    collection: 'class_members',
    where: {
      classId,
      $or: [{ phone }, { userPhone: phone }],
    },
    useOperators: true,
    limit: 1,
  })
  const list = (r && r.data) || []
  return list.length ? list[0] : null
}

async function backfill() {
  console.log('==================================================')
  console.log(' class_members 镜像回填脚本')
  console.log(' 端点:', DB_INIT_URL)
  console.log(' 模式:', DRY_RUN ? 'DRY-RUN（仅统计，不写入）' : '执行写入')
  console.log('==================================================\n')

  console.log('[1/3] 读取在读 enrollments ...')
  const enrollments = await queryAll('enrollments', {
    status: { $in: ROSTER_STATUSES },
  })
  // 只处理有 classId 的（在班级名单里）
  const roster = enrollments.filter((e) => e.classId)
  console.log(`   命中 ${enrollments.length} 条在读报名，其中 ${roster.length} 条有 classId（纳入回填）\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  let alreadyOk = 0
  const errors = []

  console.log('[2/3] 逐条比对 class_members 镜像 ...')
  for (let i = 0; i < roster.length; i++) {
    const enr = roster[i]
    const { phone, userId, name } = memberBase(enr)

    if (!phone) {
      skipped++
      if (DRY_RUN || (i < 10)) console.log(`   · 跳过（无手机号）: enrollment ${enr._id}`)
      continue
    }

    const existing = await findClassMember(enr.classId, phone)

    if (!existing) {
      // 缺失 → 新增镜像
      const payload = {
        classId: enr.classId,
        className: enr.className || '',
        userId,
        studentId: userId,
        userPhone: phone,
        phone,
        userName: name,
        studentName: name,
        source: ['online', 'offline'].includes(enr.source) ? enr.source : 'offline',
        status: 'active',
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _backfilled: true,
        _backfillFrom: 'enrollments:' + (enr._id || ''),
      }
      if (DRY_RUN) {
        created++
        if (i < 20) console.log(`   + 待新增: class=${enr.classId} phone=${phone} name=${name}`)
      } else {
        try {
          await dbInit('add', { collection: 'class_members', data: payload })
          created++
          if (i < 20) console.log(`   + 已新增: class=${enr.classId} phone=${phone} name=${name}`)
        } catch (e) {
          errors.push(`新增失败 enrollment=${enr._id}: ${e.message}`)
          console.error(`   ! 新增失败: ${enr._id} - ${e.message}`)
        }
      }
      continue
    }

    // 已存在：仅在状态非 active 时置回 active（并补齐姓名）
    if (existing.status === 'active') {
      alreadyOk++
      continue
    }
    if (DRY_RUN) {
      updated++
      if (i < 20) console.log(`   ~ 待修复: class=${enr.classId} phone=${phone} 原status=${existing.status}`)
    } else {
      try {
        await dbInit('update', {
          collection: 'class_members',
          id: existing._id,
          data: {
            status: 'active',
            userName: name,
            studentName: name,
            updatedAt: new Date().toISOString(),
          },
        })
        updated++
        if (i < 20) console.log(`   ~ 已修复: class=${enr.classId} phone=${phone} 原status=${existing.status}`)
      } catch (e) {
        errors.push(`修复失败 class_member=${existing._id}: ${e.message}`)
        console.error(`   ! 修复失败: ${existing._id} - ${e.message}`)
      }
    }
  }

  console.log('\n[3/3] 汇总')
  console.log('--------------------------------------------------')
  console.log(` 扫描在读报名(有班级): ${roster.length}`)
  console.log(` 新增镜像:            ${created}`)
  console.log(` 修复状态(非active): ${updated}`)
  console.log(` 原本已正确(active):  ${alreadyOk}`)
  console.log(` 跳过(无手机号):      ${skipped}`)
  console.log(` 错误:                ${errors.length}`)
  if (errors.length) {
    console.log('--------------------------------------------------')
    errors.slice(0, 20).forEach((e) => console.log('  ! ' + e))
  }
  console.log('--------------------------------------------------')
  console.log(DRY_RUN ? ' DRY-RUN 完成，未写入任何数据。' : ' 回填完成。')
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('回填脚本异常终止:', err)
    process.exit(1)
  })
