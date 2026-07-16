#!/usr/bin/env node
/**
 * 引用完整性检查 / 修复工具（覆盖所有模块）
 *
 * 原理：
 *   1. 先收集全库所有集合的 _id，建立全局 _id 总表 ALL_IDS。
 *   2. 扫描每个集合里"以 Id / Ids 结尾"的字段（外键候选），
 *      将引用值与 ALL_IDS 比对，不在其中的即为"孤儿引用"（主键/外键错配）。
 *   3. 自动覆盖所有集合，新增模块无需手工维护关系表。
 *
 * 用法：
 *   node scripts/check-integrity.mjs                # 仅报告
 *   node scripts/check-integrity.mjs --repair=unlink # 外键置空
 *   node scripts/check-integrity.mjs --repair=delete # 删除孤儿子记录
 *
 * 说明：data 可删，故 delete 模式直接移除孤儿记录；unlink 仅把外键置 null 保留记录。
 */

import cloudbase from '@cloudbase/node-sdk'

const ENV = 'rcwljy-5ghmq2ex26764978'
const SECRET_ID = process.env.TENCENT_SECRET_ID
const SECRET_KEY = process.env.TENCENT_SECRET_KEY

const app = cloudbase.init({
  env: ENV,
  ...(SECRET_ID && SECRET_KEY
    ? { credentials: { secret_id: SECRET_ID, secret_key: SECRET_KEY } }
    : {})
})
const db = app.database()
const _ = db.command

// 全部集合（来自 listCollections）
const COLLECTIONS = [
  'attendance', 'attendance_records', 'banners', 'cart', 'categories',
  'certificates', 'class_categories', 'class_members', 'class_schedules',
  'classes', 'comments', 'contracts', 'coupon_users', 'coupons',
  'courseCategories', 'course_categories', 'course_permissions',
  'course_progress', 'course_schedules', 'courses', 'daily_stats',
  'enrollments', 'examAttempts', 'exam_records', 'exam_results', 'exams',
  'faq', 'favoriteQuestions', 'favorites', 'featuredClasses',
  'featuredCourses', 'featuredLearningPaths', 'feedback', 'groupBuys',
  'learning_path_categories', 'learning_paths',
  'lesson_progress', 'lessons', 'levels', 'liveStreams', 'members',
  'messages', 'notices', 'notifications', 'orders', 'pageConfig',
  'page_configs', 'practiceRecords', 'product_categories', 'products',
  'promotions', 'questionBanks', 'question_banks', 'questions',
  'registrations', 'reviews', 'schedule_changes', 'schedules',
  'search_history', 'search_hot', 'sessions', 'sources', 'statistics_daily',
  'statistics_teacher', 'studyProgress', 'systemConfig', 'system_config',
  'teacher_profiles', 'teachers', 'transfer_requests', 'user_profiles',
  'user_progress', 'user_roles', 'user_sessions', 'user_settings', 'users',
  'wrongQuestions'
]

// 明确不是文档 _id 引用的字段（跳过）
const SKIP_FIELDS = new Set([
  'sourceId', 'openid', 'phone', 'unionId', 'appId', 'orderNo', 'code',
  'videoUrl', 'coverImage', 'cover', 'fileID', 'fileId', 'url', 'link',
  'image', 'avatar', 'thumb', 'configId', 'templateId', 'sessionId',
  'wxOpenid', 'mpOpenid', 'creatorId', 'updaterId', 'operatorId', 'replyToId',
  'auditId', 'wxOpenid', 'id', '_id', 'category', 'level', 'status', 'type',
  'title', 'name', 'remark', 'address', 'description', 'content', 'token'
])

const FK_SUFFIX = /Ids?$/ // 匹配 Id 或 Ids

function isFkField(key) {
  if (SKIP_FIELDS.has(key)) return false
  return FK_SUFFIX.test(key)
}

async function fetchAllIds(collection) {
  const ids = new Set()
  const idToColl = new Map()
  let offset = 0
  const LIMIT = 200
  while (true) {
    const res = await db
      .collection(collection)
      .field({ _id: true })
      .skip(offset)
      .limit(LIMIT)
      .get()
    const list = res.data || []
    for (const d of list) {
      if (d._id != null) {
        ids.add(String(d._id))
        idToColl.set(String(d._id), collection)
      }
    }
    if (list.length < LIMIT) break
    offset += LIMIT
  }
  return { ids, idToColl }
}

async function fetchDocs(collection, fields) {
  const docs = []
  let offset = 0
  const LIMIT = 200
  while (true) {
    const res = await db
      .collection(collection)
      .field(fields)
      .skip(offset)
      .limit(LIMIT)
      .get()
    const list = res.data || []
    docs.push(...list)
    if (list.length < LIMIT) break
    offset += LIMIT
  }
  return docs
}

async function main() {
  const repairMode = process.argv.find((a) => a.startsWith('--repair='))
    ? process.argv.find((a) => a.startsWith('--repair=')).split('=')[1]
    : null

  console.log('🔍 开始引用完整性检查...')
  console.log(`环境: ${ENV}  修复模式: ${repairMode || '仅报告'}\n`)

  // 第 1 步：建立全库 _id 总表
  const ALL_IDS = new Set()
  const ID_TO_COLL = new Map()
  for (const c of COLLECTIONS) {
    try {
      const { ids, idToColl } = await fetchAllIds(c)
      ids.forEach((id) => {
        ALL_IDS.add(id)
        if (!ID_TO_COLL.has(id)) ID_TO_COLL.set(id, c)
      })
    } catch (e) {
      // 集合可能不存在，忽略
    }
  }
  console.log(`📦 已载入全库 _id 总数: ${ALL_IDS.size}\n`)

  // 第 2 步：逐集合扫描外键
  const report = [] // { collection, field, orphanCount, samples: [{_id, value}] }
  const orphanDocs = [] // { collection, _id, fixes: {field: value} }

  for (const c of COLLECTIONS) {
    // 先取一条样本，确定有哪些外键字段（避免全量拉大字段）
    let sampleFields = null
    try {
      const one = await db.collection(c).limit(1).get()
      if (one.data && one.data[0]) {
        const keys = Object.keys(one.data[0]).filter(isFkField)
        if (keys.length === 0) continue
        sampleFields = {}
        keys.forEach((k) => (sampleFields[k] = true))
        sampleFields._id = true
      } else {
        continue
      }
    } catch (e) {
      continue
    }

    let docs = []
    try {
      docs = await fetchDocs(c, sampleFields)
    } catch (e) {
      continue
    }

    const fieldStats = {} // field -> { count, samples }
    const docFixes = {} // _id -> { field: value }

    for (const doc of docs) {
      for (const field of Object.keys(sampleFields)) {
        if (field === '_id') continue
        const val = doc[field]
        if (val == null) continue
        const values = Array.isArray(val) ? val : [val]
        for (const v of values) {
          if (v == null || v === '') continue
          const sv = String(v)
          if (!ALL_IDS.has(sv)) {
            if (!fieldStats[field]) fieldStats[field] = { count: 0, samples: [] }
            fieldStats[field].count++
            if (fieldStats[field].samples.length < 5) {
              fieldStats[field].samples.push({ _id: doc._id, value: sv })
            }
            if (!docFixes[doc._id]) docFixes[doc._id] = {}
            docFixes[doc._id][field] = sv
          }
        }
      }
    }

    if (Object.keys(fieldStats).length > 0) {
      for (const [field, stat] of Object.entries(fieldStats)) {
        report.push({ collection: c, field, ...stat })
      }
      for (const [_id, fixes] of Object.entries(docFixes)) {
        orphanDocs.push({ collection: c, _id, fixes })
      }
    }
  }

  // 输出报告
  console.log('='.repeat(70))
  console.log('📋 孤儿引用报告（外键值不存在于任何集合的 _id）')
  console.log('='.repeat(70))
  if (report.length === 0) {
    console.log('✅ 未发现主键/外键错配，数据引用完整。')
  } else {
    let totalOrphans = 0
    for (const r of report) {
      totalOrphans += r.count
      console.log(
        `\n[${r.collection}] 字段 ${r.field} : ${r.count} 条孤儿引用`
      )
      for (const s of r.samples) {
        console.log(`   - doc._id=${s._id}  =>  ${r.field}=${s.value}`)
      }
    }
    console.log('\n' + '='.repeat(70))
    console.log(
      `合计: ${report.length} 个(集合×字段) 出现错配，涉及 ${orphanDocs.length} 条文档、${totalOrphans} 处孤儿引用。`
    )
  }

  // 修复
  if (repairMode && orphanDocs.length > 0) {
    console.log('\n' + '='.repeat(70))
    console.log(`🛠 执行修复模式: ${repairMode}`)
    console.log('='.repeat(70))
    let done = 0
    for (const od of orphanDocs) {
      try {
        if (repairMode === 'delete') {
          await db.collection(od.collection).doc(od._id).remove()
        } else if (repairMode === 'unlink') {
          const update = {}
          for (const f of Object.keys(od.fixes)) update[f] = null
          await db.collection(od.collection).doc(od._id).update(update)
        }
        done++
      } catch (e) {
        console.error(`修复失败 ${od.collection}/${od._id}:`, e.message)
      }
    }
    console.log(`✅ 已处理 ${done}/${orphanDocs.length} 条孤儿文档。`)
  } else if (repairMode) {
    console.log('✅ 无需修复。')
  }

  console.log('\n完成。')
}

main().catch((e) => {
  console.error('检查器异常:', e)
  process.exit(1)
})
