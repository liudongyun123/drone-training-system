/**
 * api-datacheck 云函数
 * 引用完整性检查 / 修复（覆盖所有模块）
 *
 * 原理：
 *   1. 收集全库所有集合的 _id，建立全局 _id 总表 ALL_IDS。
 *   2. 扫描每个集合里"以 Id / Ids 结尾"的字段（外键候选），
 *      引用值不在 ALL_IDS 中即为"孤儿引用"（主键/外键错配）。
 *   3. 自动覆盖所有集合，新增模块无需手工维护关系表。
 *
 * 调用：
 *   POST /api-datacheck  { "action": "check" }
 *   POST /api-datacheck  { "action": "repair", "mode": "delete" }  // 删除孤儿子记录
 *   POST /api-datacheck  { "action": "repair", "mode": "unlink" }  // 外键置空
 */

const cloudbase = require('@cloudbase/node-sdk')
const app = cloudbase.init({ env: process.env.TCB_ENV_ID || 'rcwljy-5ghmq2ex26764978' })
const db = app.database()
const _ = db.command

const COLLECTIONS = [
  'attendance', 'attendance_records', 'banners', 'cart', 'categories',
  'certificates', 'class_categories', 'class_members', 'class_schedules',
  'classes', 'comments', 'contracts', 'coupon_users', 'coupons',
  'courseCategories', 'course_categories', 'course_permissions',
  'course_progress', 'course_schedules', 'courses', 'daily_stats',
  'enrollments', 'examAttempts', 'exam_records', 'exam_results', 'exams',
  'faq', 'favoriteQuestions', 'favorites', 'featuredClasses',
  'featuredCourses', 'featuredLearningPaths', 'feedback', 'groupBuys',
  'learning_path_categories', 'learning_paths', 'learning_progress',
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
// ⚠️ 重要：本系统的「用户层主键」是手机号（phone）/ 用户编码（user_001、student005 等），
// 并不是文档 _id。因此所有「用户标识字段」的值都是手机号/编码，绝不能当作指向 _id 的外键，
// 必须全部列入 SKIP_FIELDS，否则会把合法的手机号/编码记录误判为孤儿并误删。
// 真正的文档外键（指向 _id）只有：courseId、classId、lessonId、scheduleId、chapterId、
//   bankId、questionId、examId、orderId、categoryId、levelId、productId、
//   certificateId、contractId、couponId、permissionId、enrollmentId、registrationId、
//   learningPathId、sourceId、parentId、relatedId 等。
const SKIP_FIELDS = new Set([
  // —— 用户/人员标识字段：存的是手机号或用户编码，不是 _id（必须跳过） ——
  'userId', 'studentId', 'memberId', 'teacherId', 'customerId', 'ownerId',
  'fromUserId', 'toUserId', 'applicantId', 'senderId', 'receiverId',
  'inviterId', 'referrerId', 'promoterId', 'parentUserId', 'bindUserId',
  'agentId', 'tutorId', 'wechatId', 'followerId',
  // —— 其它非 _id 标识/业务字段 ——
  'sourceId', 'openid', 'phone', 'unionId', 'appId', 'orderNo', 'code',
  'videoUrl', 'coverImage', 'cover', 'fileID', 'fileId', 'url', 'link',
  'image', 'avatar', 'thumb', 'configId', 'templateId', 'sessionId',
  'wxOpenid', 'mpOpenid', 'creatorId', 'updaterId', 'operatorId', 'replyToId',
  'auditId', 'id', '_id', 'category', 'level', 'status', 'type',
  'title', 'name', 'remark', 'address', 'description', 'content', 'token'
])

const FK_SUFFIX = /Ids?$/

function isFkField(key) {
  if (SKIP_FIELDS.has(key)) return false
  return FK_SUFFIX.test(key)
}

async function fetchAllIds(collection) {
  const ids = new Set()
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
      if (d._id != null) ids.add(String(d._id))
    }
    if (list.length < LIMIT) break
    offset += LIMIT
  }
  return ids
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

async function runCheck(repairMode) {
  // 第 1 步：建立全库 _id 总表
  const ALL_IDS = new Set()
  for (const c of COLLECTIONS) {
    try {
      const ids = await fetchAllIds(c)
      ids.forEach((id) => ALL_IDS.add(id))
    } catch (e) {
      // 集合可能不存在，忽略
    }
  }

  // 第 2 步：扫描外键孤儿引用
  const result = await scanOrphans(ALL_IDS)
  const report = result.report
  let orphanDocs = result.orphanDocs

  let repaired = 0
  // 迭代修复：删除孤儿文档后，其下游引用方会变成新的孤儿，
  // 因此需要多轮扫描直到无孤儿为止（最多 20 轮，防止异常死循环）。
  let iteration = 0
  while (repairMode && orphanDocs.length > 0 && iteration < 20) {
    iteration++
    for (const od of orphanDocs) {
      try {
        if (repairMode === 'delete') {
          await db.collection(od.collection).doc(od._id).remove()
        } else if (repairMode === 'unlink') {
          const update = {}
          for (const f of Object.keys(od.fixes)) update[f] = null
          await db.collection(od.collection).doc(od._id).update(update)
        }
        repaired++
      } catch (e) {
        // 忽略单条失败，继续
      }
    }
    // 重新扫描，捕获级联产生的孤儿
    const next = await scanOrphans(ALL_IDS)
    orphanDocs = next.orphanDocs
  }

  let totalOrphans = report.reduce((s, r) => s + r.count, 0)
  return {
    totalIds: ALL_IDS.size,
    scannedCollections: COLLECTIONS.length,
    orphanFieldCount: report.length,
    orphanDocCount: orphanDocs.length,
    totalOrphans,
    repaired,
    repairMode: repairMode || null,
    report
  }
}

// 在全库 _id 总表基础上，扫描所有集合的外键孤儿引用
async function scanOrphans(ALL_IDS) {
  const report = []
  const orphanDocs = []

  for (const c of COLLECTIONS) {
    let sampleFields = null
    try {
      const one = await db.collection(c).limit(1).get()
      if (one.data && one.data[0]) {
        const keys = Object.keys(one.data[0]).filter(isFkField)
        if (keys.length === 0) continue
        sampleFields = { _id: true }
        keys.forEach((k) => (sampleFields[k] = true))
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

    const fieldStats = {}
    const docFixes = {}

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

  return { report, orphanDocs }
}

function parseEvent(event) {
  if (!event) return {}
  if (event.body) {
    try {
      return typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    } catch (e) {
      return {}
    }
  }
  return event
}

exports.main = async (event, context) => {
  const body = parseEvent(event)
  const action = body.action

  if (action === 'check' || action === 'repair') {
    const repairMode = action === 'repair' ? body.mode || 'delete' : null
    const result = await runCheck(repairMode)
    return { code: 0, success: true, data: result }
  }

  return { code: 400, success: false, error: 'unknown action: ' + action }
}
