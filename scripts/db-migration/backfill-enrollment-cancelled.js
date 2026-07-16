#!/usr/bin/env node
/**
 * 一次性非破坏性回填脚本：补齐历史移出/退课学员的同步标记
 * ----------------------------------------------------------------------------
 * 背景：v20260715 起，removeMember 会做两件事让小程序端与管理后台一致：
 *   1) 把该学员对应班级订单（orders, orderType='class'）打 enrollmentCancelled=true，
 *      供小程序 getMyEnrollments 过滤掉已取消报名的班级；
 *   2) 收回该学员在该班的全部课程视频权限（course_permissions, phone+classId）。
 *
 * 上线前的存量「已取消(cancelled)/已退课(dropped)」enrollments 没有这些联动，
 * 导致小程序重新部署后（http.ts 已加 !item.enrollmentCancelled 过滤）仍会显示这些老学员。
 *
 * 本脚本扫描 cancelled/dropped enrollments → 为它们的班级订单补 enrollmentCancelled=true、
 * 并收回该班课程视频权限。与 removeMember 的处理保持一致。
 *
 * 安全原则：
 *   - 绝不删除任何数据（不调用 delete）。
 *   - 幂等：订单已有 enrollmentCancelled=true、或视频权限已 revoked 则跳过。
 *   - 仅处理已取消/已退课的 enrollments（status ∈ cancelled/dropped，且有 classId）。
 *
 * 用法：
 *   node scripts/db-migration/backfill-enrollment-cancelled.js            # 执行回填
 *   node scripts/db-migration/backfill-enrollment-cancelled.js --dry-run  # 仅统计，不写入
 *
 * 依赖：仅需网络可访问 db-init 云函数 HTTP 端点（与生产后台同一入口，无需密钥）。
 * 可通过环境变量 DB_INIT_URL 覆盖目标端点。
 */

'use strict'

const DB_INIT_URL =
  process.env.DB_INIT_URL ||
  'https://rcwljy-5ghmq2ex26764978.service.tcloudbase.com/db-init'

// 与 removeMember 相关的已移出状态
const REMOVED_STATUSES = ['cancelled', 'dropped']

const DRY_RUN = process.argv.includes('--dry-run')

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

// 分页拉取某集合全部匹配记录
async function queryAll(collection, where) {
  let skip = 0
  const limit = 100
  const all = []
  for (let page = 0; page < 1000; page++) {
    const r = await dbInit('query', {
      collection,
      where,
      useOperators: true,
      skip,
      limit,
      orderBy: 'updatedAt',
      order: 'desc',
    })
    const list = (r && r.data) || []
    all.push(...list)
    if (list.length < limit) break
    skip += limit
  }
  return all
}

function memberBase(enr) {
  const phone = enr.phone || enr.studentPhone || ''
  return { phone }
}

async function backfill() {
  console.log('==================================================')
  console.log(' 历史移出/退课学员 同步标记回填脚本')
  console.log(' 端点:', DB_INIT_URL)
  console.log(' 模式:', DRY_RUN ? 'DRY-RUN（仅统计，不写入）' : '执行写入')
  console.log('==================================================\n')

  console.log('[1/4] 读取已取消/已退课的 enrollments ...')
  const enrollments = await queryAll('enrollments', {
    status: { $in: REMOVED_STATUSES },
  })
  const target = enrollments.filter((e) => e.classId)
  console.log(`   命中 ${enrollments.length} 条已移出报名，其中 ${target.length} 条有 classId（纳入回填）\n`)

  let orderMarked = 0
  let orderSkipped = 0
  let videoRevoked = 0
  let videoSkipped = 0
  let skippedNoPhone = 0
  let errors = []

  console.log('[2/4] 逐条补齐订单 enrollmentCancelled 标记 ...')
  for (let i = 0; i < target.length; i++) {
    const enr = target[i]
    const { phone } = memberBase(enr)
    if (!phone) {
      skippedNoPhone++
      continue
    }
    const orders = await queryAll('orders', {
      phone,
      classId: enr.classId,
      orderType: 'class',
    })
    for (const o of orders) {
      if (o.enrollmentCancelled === true) {
        orderSkipped++
        continue
      }
      if (DRY_RUN) {
        orderMarked++
        if (i < 20) console.log(`   + 待标记订单: order=${o._id} class=${enr.classId} phone=${phone}`)
      } else {
        try {
          await dbInit('update', {
            collection: 'orders',
            id: o._id,
            data: { enrollmentCancelled: true, updatedAt: new Date().toISOString() },
          })
          orderMarked++
          if (i < 20) console.log(`   + 已标记订单: order=${o._id} class=${enr.classId} phone=${phone}`)
        } catch (e) {
          errors.push(`订单标记失败 order=${o._id}: ${e.message}`)
        }
      }
    }
  }

  console.log('\n[3/4] 逐条收回该班课程视频权限 ...')
  for (let i = 0; i < target.length; i++) {
    const enr = target[i]
    const { phone } = memberBase(enr)
    if (!phone) continue
    const perms = await queryAll('course_permissions', {
      phone,
      classId: enr.classId,
    })
    for (const p of perms) {
      const alreadyRevoked = p.status === 'revoked' || (p.videoAccess && p.videoAccess.enabled === false)
      if (alreadyRevoked) {
        videoSkipped++
        continue
      }
      if (DRY_RUN) {
        videoRevoked++
        if (i < 20) console.log(`   ~ 待收回视频: perm=${p._id} course=${p.courseId} phone=${phone}`)
      } else {
        try {
          await dbInit('update', {
            collection: 'course_permissions',
            id: p._id,
            data: {
              status: 'revoked',
              revokedAt: new Date().toISOString(),
              videoAccess: { ...(p.videoAccess || {}), enabled: false },
              updatedAt: new Date().toISOString(),
            },
          })
          videoRevoked++
          if (i < 20) console.log(`   ~ 已收回视频: perm=${p._id} course=${p.courseId} phone=${phone}`)
        } catch (e) {
          errors.push(`视频收回失败 perm=${p._id}: ${e.message}`)
        }
      }
    }
  }

  console.log('\n[4/4] 汇总')
  console.log('--------------------------------------------------')
  console.log(` 扫描已移出报名(有班级): ${target.length}`)
  console.log(` 订单标记 enrollmentCancelled: ${orderMarked}（跳过已标记 ${orderSkipped}）`)
  console.log(` 收回班级视频权限:           ${videoRevoked}（跳过已收回 ${videoSkipped}）`)
  console.log(` 跳过(无手机号):            ${skippedNoPhone}`)
  console.log(` 错误:                      ${errors.length}`)
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
