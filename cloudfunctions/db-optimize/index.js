/**
 * 数据库优化脚本
 * 
 * 功能：
 * 1. 清理冗余集合（使用频率 < 3 的）
 * 2. 创建缺失的业务集合
 * 3. 创建索引优化查询性能
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// ============================================
// 配置：集合定义
// ============================================

/**
 * 需要保留的核心集合（使用频率 >= 3）
 */
const CORE_COLLECTIONS = [
  'courses',           // 课程 (139)
  'classes',           // 班级 (123)
  'transfer_requests', // 转账请求 (111)
  'orders',            // 订单 (87)
  'users',             // 用户 (53)
  'course_schedules',  // 课程排课 (52)
  'teachers',          // 教师 (41)
  'enrollments',       // 报名记录 (34)
  'registrations',     // 注册报名 (32)
  'sessions',          // 会话 (30)
  'lessons',           // 课时 (26)
  'course_permissions', // 课程权限 (25)
  'examAttempts',      // 考试尝试 (16)
  'class_members',     // 班级成员 (14)
  'user_progress',     // 用户进度 (13)
  'learning_progress', // 学习进度 (13)
  'user_roles',        // 用户角色 (10)
  'products',          // 商品 (9)
  'learning_paths',    // 学习路径 (9)
  'coupons',           // 优惠券 (9)
  'banners',           // 横幅 (9)
  'audit_logs',        // 审计日志 (9)
  'members',           // 会员 (8)
  'exams',             // 考试 (8)
  'cart',              // 购物车 (8)
  'notices',           // 通知 (7)
  'categories',        // 分类 (7)
  'payments',          // 支付 (6)
  'students',          // 学生 (5)
  'sms_codes',         // 短信验证码 (5)
  'class_schedules',   // 班级排课 (5)
  'bankQuestions',     // 银行问题 (5)
  'teacher_profiles',  // 教师档案 (4)
  'subscriptions',     // 订阅 (4)
  'product_categories', // 商品分类 (4)
  'favorites',         // 收藏 (4)
  'admins',            // 管理员 (4)
  'systemConfig',      // 系统配置 (3)
  'questionBanks',     // 题库 (3)
  'user_profiles',     // 用户档案 (2)
  'training_certificates', // 培训证书 (2)
  'sources',           // 来源 (2)
  'schedule_changes',  // 排课变更 (2)
  'product_skus',     // 商品 SKU (2)
  'attendance_records', // 出勤记录 (2)
]

/**
 * 需要清理的冗余集合（使用频率 < 3）
 */
const DEPRECATED_COLLECTIONS = [
  'featuredCourses',   // 精选课程 - 可用 banners 代替
  'featuredClasses',   // 精选班级 - 可用 banners 代替
  'exam_results',      // 考试结果 - 与 examAttempts 重复
]

/**
 * 需要新增的集合
 */
const NEW_COLLECTIONS = [
  {
    name: 'learning_paths',
    description: '学习路径',
    schema: {
      name: '学习路径名称',
      description: '路径描述',
      coverUrl: '封面图',
      level: 'beginner|intermediate|advanced',
      courses: [], // 课程 ID 数组
      totalHours: 0,
      skills: [], // 技能标签
      learnerCount: 0,
      status: 'draft|published',
      sort: 0,
    },
    indexes: [
      { name: 'idx_status_level', fields: ['status', 'level'] },
      { name: 'idx_sort', fields: ['sort', 'createdAt'] },
    ]
  },
  {
    name: 'certificates',
    description: '证书',
    schema: {
      name: '证书名称',
      courseId: '关联课程ID',
      courseName: '课程名称',
      issuedAt: '颁发日期',
      certificateNo: '证书编号',
      pdfUrl: '证书PDF链接',
      verified: false,
      status: 'active|revoked',
    },
    indexes: [
      { name: 'idx_user', fields: ['_openid', 'issuedAt'] },
      { name: 'idx_course', fields: ['courseId'] },
      { name: 'idx_certificateNo', fields: ['certificateNo'], unique: true },
    ]
  },
  {
    name: 'user_settings',
    description: '用户设置',
    schema: {
      pushEnabled: true,
      emailEnabled: false,
      theme: 'light',
      language: 'zh-CN',
      notificationPreferences: {},
    },
    indexes: [
      { name: 'idx_user', fields: ['_openid'] },
    ]
  },
  {
    name: 'notifications',
    description: '通知消息',
    schema: {
      type: 'system|order|learning|activity',
      title: '通知标题',
      content: '通知内容',
      data: {},
      read: false,
      expireAt: null,
    },
    indexes: [
      { name: 'idx_user_read', fields: ['_openid', 'read', 'createdAt'] },
      { name: 'idx_expire', fields: ['expireAt'] },
    ]
  },
  {
    name: 'daily_stats',
    description: '每日统计',
    schema: {
      date: '日期YYYY-MM-DD',
      newUsers: 0,
      activeUsers: 0,
      newOrders: 0,
      totalRevenue: 0,
      newCourses: 0,
      newEnrollments: 0,
    },
    indexes: [
      { name: 'idx_date', fields: ['date'], unique: true },
    ]
  },
]

// ============================================
// 工具函数
// ============================================

/**
 * 检查集合是否存在
 */
async function collectionExists(collectionName) {
  try {
    const result = await db.collection(collectionName).limit(1).get()
    return true
  } catch (e) {
    if (e.code === 'DATABASE_COLLECTION_NOT_EXIST') {
      return false
    }
    throw e
  }
}

/**
 * 创建集合（通过添加临时数据）
 */
async function createCollection(collectionName, tempData = {}) {
  console.log(`  创建集合: ${collectionName}`)
  
  try {
    const exists = await collectionExists(collectionName)
    if (exists) {
      console.log(`    ✓ 已存在`)
      return { success: true, collection: collectionName, action: 'exists' }
    }

    // 添加临时数据创建集合
    const result = await db.collection(collectionName).add({
      data: {
        ...tempData,
        _temp: true,
        createdAt: new Date().toISOString(),
      }
    })

    // 清理临时数据
    await db.collection(collectionName).doc(result.id).remove()
    console.log(`    ✓ 创建成功`)
    
    return { success: true, collection: collectionName, action: 'created' }
  } catch (error) {
    console.error(`    ✗ 失败: ${error.message}`)
    return { success: false, collection: collectionName, error: error.message }
  }
}

/**
 * 删除集合
 */
async function deleteCollection(collectionName) {
  console.log(`  删除集合: ${collectionName}`)
  
  try {
    const exists = await collectionExists(collectionName)
    if (!exists) {
      console.log(`    ✓ 不存在，跳过`)
      return { success: true, collection: collectionName, action: 'not_exists' }
    }

    // 查询所有文档
    const batchSize = 100
    let deletedCount = 0
    
    while (true) {
      const result = await db.collection(collectionName)
        .limit(batchSize)
        .get()
      
      if (result.data.length === 0) break
      
      for (const doc of result.data) {
        await db.collection(collectionName).doc(doc._id).remove()
        deletedCount++
      }
    }
    
    console.log(`    ✓ 已删除 ${deletedCount} 条记录`)
    return { success: true, collection: collectionName, action: 'deleted', count: deletedCount }
  } catch (error) {
    console.error(`    ✗ 失败: ${error.message}`)
    return { success: false, collection: collectionName, error: error.message }
  }
}

/**
 * 创建索引
 */
async function createIndex(collectionName, indexDef) {
  try {
    await db.collection(collectionName).createIndex({
      name: indexDef.name,
      fields: indexDef.fields,
      unique: indexDef.unique || false,
    })
    console.log(`    ✓ 索引 ${indexDef.name}`)
    return { success: true }
  } catch (error) {
    if (error.code === 'DATABASE_INDEX_ALREADY_EXIST') {
      console.log(`    - 索引 ${indexDef.name} 已存在`)
      return { success: true, action: 'exists' }
    }
    console.error(`    ✗ 索引 ${indexDef.name} 失败: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// ============================================
// 主函数
// ============================================

exports.main = async (event, context) => {
  const { action } = event

  console.log('='.repeat(60))
  console.log('数据库优化任务')
  console.log('='.repeat(60))
  console.log()

  const results = {
    created: [],
    deleted: [],
    indexed: [],
    errors: [],
  }

  try {
    // 1. 创建新集合
    if (action === 'create' || action === 'all') {
      console.log('【1】创建新集合')
      console.log('-'.repeat(40))
      
      for (const coll of NEW_COLLECTIONS) {
        const result = await createCollection(coll.name, coll.schema)
        if (result.success) {
          results.created.push(result)
        } else {
          results.errors.push(result)
        }
        
        // 创建索引
        if (result.success && coll.indexes) {
          for (const idx of coll.indexes) {
            const idxResult = await createIndex(coll.name, idx)
            if (idxResult.success) {
              results.indexed.push({ collection: coll.name, index: idx.name })
            }
          }
        }
      }
      console.log()
    }

    // 2. 删除冗余集合
    if (action === 'delete' || action === 'all') {
      console.log('【2】删除冗余集合')
      console.log('-'.repeat(40))
      
      for (const collName of DEPRECATED_COLLECTIONS) {
        const result = await deleteCollection(collName)
        if (result.success) {
          results.deleted.push(result)
        } else {
          results.errors.push(result)
        }
      }
      console.log()
    }

    // 3. 为核心集合创建索引
    if (action === 'index' || action === 'all') {
      console.log('【3】优化核心集合索引')
      console.log('-'.repeat(40))
      
      const indexConfigs = {
        courses: [
          { name: 'idx_status', fields: ['status'] },
          { name: 'idx_category', fields: ['categoryId', 'status'] },
          { name: 'idx_level', fields: ['level', 'status'] },
          { name: 'idx_price', fields: ['price', 'status'] },
        ],
        classes: [
          { name: 'idx_status', fields: ['status'] },
          { name: 'idx_category', fields: ['categoryId', 'status'] },
          { name: 'idx_startDate', fields: ['startDate', 'status'] },
        ],
        orders: [
          { name: 'idx_user', fields: ['_openid', 'createdAt'] },
          { name: 'idx_status', fields: ['status', 'createdAt'] },
          { name: 'idx_course', fields: ['courseId', 'status'] },
        ],
        learning_progress: [
          { name: 'idx_user_course', fields: ['_openid', 'courseId'] },
          { name: 'idx_lastStudy', fields: ['lastStudyAt'] },
        ],
        lessons: [
          { name: 'idx_course', fields: ['courseId', 'sort'] },
        ],
      }

      for (const [collName, indexes] of Object.entries(indexConfigs)) {
        console.log(`  ${collName}:`)
        for (const idx of indexes) {
          const result = await createIndex(collName, idx)
          if (result.success) {
            results.indexed.push({ collection: collName, index: idx.name })
          }
        }
      }
      console.log()
    }

  } catch (error) {
    console.error('执行失败:', error)
    results.errors.push({ error: error.message })
  }

  // 输出总结
  console.log('='.repeat(60))
  console.log('执行完成')
  console.log('='.repeat(60))
  console.log()
  console.log(`创建集合: ${results.created.length} 个`)
  console.log(`删除集合: ${results.deleted.length} 个`)
  console.log(`创建索引: ${results.indexed.length} 个`)
  console.log(`失败操作: ${results.errors.length} 个`)
  console.log()

  if (results.errors.length > 0) {
    console.log('错误详情:')
    results.errors.forEach(e => console.log(`  - ${JSON.stringify(e)}`))
  }

  return {
    code: 0,
    message: '完成',
    data: results,
  }
}
