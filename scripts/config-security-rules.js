/**
 * CloudBase 数据库安全规则配置脚本
 *
 * 使用方法：
 * 1. 在 CloudBase 控制台打开：https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/db/doc
 * 2. 按照下面的清单逐个配置安全规则
 *
 * 或者使用 CloudBase CLI：
 * tcb database:security:rules:update <集合名> --file <规则文件路径>
 */

// ==================== 标准安全规则 ====================

/**
 * 标准安全规则（适用于 users, courses, orders, coupons, roles 等）
 * - 已登录用户可读
 * - 禁止直接写入（必须通过云函数）
 */
const STANDARD_RULE = {
  read: "auth != null",
  write: "false"
}

/**
 * 用户私有数据规则（适用于 cart）
 * - 只有数据所有者可以读写
 */
const PRIVATE_DATA_RULE = {
  read: "auth != null && doc._openid == auth.openid",
  write: "auth != null && doc._openid == auth.openid"
}

// ==================== 集合配置清单 ====================

/**
 * 需要配置安全规则的集合列表
 * 按优先级排序
 */
const COLLECTIONS = [
  // ===== 高优先级（核心功能）=====
  {
    name: 'users',
    description: '用户信息',
    rule: STANDARD_RULE,
    priority: 'high'
  },
  {
    name: 'courses',
    description: '课程信息',
    rule: STANDARD_RULE,
    priority: 'high'
  },
  {
    name: 'orders',
    description: '订单',
    rule: STANDARD_RULE,
    priority: 'high'
  },
  {
    name: 'coupons',
    description: '优惠券',
    rule: STANDARD_RULE,
    priority: 'high'
  },
  {
    name: 'roles',
    description: '角色',
    rule: STANDARD_RULE,
    priority: 'high'
  },
  {
    name: 'question_banks',
    description: '题库',
    rule: STANDARD_RULE,
    priority: 'high',
    note: '可能需要先创建集合'
  },

  // ===== 中优先级（扩展功能）=====
  {
    name: 'notifications',
    description: '通知',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'member_levels',
    description: '会员等级',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'banners',
    description: '横幅广告',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'notices',
    description: '公告',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'schedules',
    description: '课程表',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'comments',
    description: '评论',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'system_logs',
    description: '系统日志',
    rule: STANDARD_RULE,
    priority: 'medium'
  },
  {
    name: 'system_settings',
    description: '系统设置',
    rule: STANDARD_RULE,
    priority: 'medium'
  },

  // ===== 低优先级（其他功能）=====
  {
    name: 'chapters',
    description: '课程章节',
    rule: STANDARD_RULE,
    priority: 'low'
  },
  {
    name: 'exams',
    description: '试卷/考试',
    rule: STANDARD_RULE,
    priority: 'low'
  },
  {
    name: 'learning_paths',
    description: '学习路径',
    rule: STANDARD_RULE,
    priority: 'low'
  },
  {
    name: 'practice_records',
    description: '练习记录',
    rule: STANDARD_RULE,
    priority: 'low'
  }
]

// ==================== 生成配置文件 ====================

/**
 * 为每个集合生成安全规则 JSON 文件
 * 可以用于 CloudBase CLI 或手动配置
 */

function generateRuleFile(collection) {
  return JSON.stringify(collection.rule, null, 2)
}

// 打印所有集合的配置
console.log('='.repeat(80))
console.log('CloudBase 数据库安全规则配置清单')
console.log('='.repeat(80))
console.log()

console.log('📋 需要配置的集合总数:', COLLECTIONS.length)
console.log()

// 按优先级分组
const highPriority = COLLECTIONS.filter(c => c.priority === 'high')
const mediumPriority = COLLECTIONS.filter(c => c.priority === 'medium')
const lowPriority = COLLECTIONS.filter(c => c.priority === 'low')

console.log('🔥 高优先级（核心功能）:', highPriority.length, '个')
console.log('🔧 中优先级（扩展功能）:', mediumPriority.length, '个')
console.log('🔵 低优先级（其他功能）:', lowPriority.length, '个')
console.log()

// 打印高优先级集合
console.log('='.repeat(80))
console.log('🔥 高优先级集合（必须配置）')
console.log('='.repeat(80))
console.log()

highPriority.forEach((collection, index) => {
  console.log(`${index + 1}. ${collection.name} - ${collection.description}`)
  console.log(`   集合名称: "${collection.name}"`)
  if (collection.note) {
    console.log(`   ⚠️ 注意: ${collection.note}`)
  }
  console.log(`   安全规则:`)
  console.log(`   ${JSON.stringify(collection.rule, null, 2)}`)
  console.log()
})

// 打印中优先级集合
console.log('='.repeat(80))
console.log('🔧 中优先级集合（建议配置）')
console.log('='.repeat(80))
console.log()

mediumPriority.forEach((collection, index) => {
  console.log(`${index + 1}. ${collection.name} - ${collection.description}`)
  console.log(`   安全规则:`)
  console.log(`   ${JSON.stringify(collection.rule, null, 2)}`)
  console.log()
})

// 打印低优先级集合
console.log('='.repeat(80))
console.log('🔵 低优先级集合（可选配置）')
console.log('='.repeat(80))
console.log()

lowPriority.forEach((collection, index) => {
  console.log(`${index + 1}. ${collection.name} - ${collection.description}`)
  console.log(`   安全规则:`)
  console.log(`   ${JSON.stringify(collection.rule, null, 2)}`)
  console.log()
})

// ==================== 配置说明 ====================

console.log('='.repeat(80))
console.log('📖 配置说明')
console.log('='.repeat(80))
console.log()

console.log('方法 1: 通过控制台手动配置（推荐）')
console.log('-----------------------------------')
console.log('1. 打开控制台: https://tcb.cloud.tencent.com/dev?envId=rcwljy-5ghmq2ex26764978#/db/doc')
console.log('2. 点击集合名称（如 "users"）')
console.log('3. 点击"安全规则"标签')
console.log('4. 点击"编辑规则"')
console.log('5. 复制上面的 JSON 配置')
console.log('6. 粘贴到编辑器')
console.log('7. 点击"保存"')
console.log('8. 等待 2-5 分钟让规则生效')
console.log('9. 刷新浏览器页面测试')
console.log()

console.log('方法 2: 使用 CloudBase CLI')
console.log('-----------------------------------')
console.log('1. 安装 CloudBase CLI: npm install -g @cloudbase/cli')
console.log('2. 登录: tcb login')
console.log('3. 创建规则文件（保存为 rules.json）:')
console.log(JSON.stringify(STANDARD_RULE, null, 2))
console.log('4. 配置规则: tcb database:security:rules:update users --file rules.json')
console.log('5. 对其他集合重复此操作')
console.log()

console.log('⚠️ 重要提示')
console.log('----------')
console.log('- 对于 question_banks 集合，可能需要先在控制台创建')
console.log('- 配置完成后，等待 2-5 分钟让规则生效')
console.log('- 强制刷新浏览器页面（Ctrl+Shift+R 或 Cmd+Shift+R）')
console.log('- 检查控制台是否还有 PERMISSION_DENIED 错误')
console.log()

console.log('✅ 配置完成标志')
console.log('--------------')
console.log('- 浏览器控制台显示 "(匿名)"')
console.log('- 不再有 PERMISSION_DENIED 错误')
console.log('- 管理后台可以正常加载数据')
console.log('- 可以正常添加、编辑、删除数据')
console.log()

console.log('='.repeat(80))
console.log('🚀 立即开始配置吧！')
console.log('='.repeat(80))

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COLLECTIONS,
    STANDARD_RULE,
    PRIVATE_DATA_RULE
  }
}
