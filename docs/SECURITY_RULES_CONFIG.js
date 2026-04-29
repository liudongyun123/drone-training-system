/**
 * CloudBase 数据库安全规则配置
 * 
 * 使用方法：
 * 1. 在 CloudBase 控制台 -> 数据库 -> 安全规则 中手动配置
 * 2. 或使用 tcb cli 命令批量导入
 * 
 * 核心原则：
 * - 用户只能读写自己的数据
 * - 管理员可以读写所有数据
 * - 公开数据只允许读取
 */

const SECURITY_RULES = {
  // ==================== 用户私有数据 ====================
  
  orders: {
    // 订单：用户只能看自己的，管理员可以看全部
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.role == 'admin'",
    write: "auth.openid == doc._openid || auth.phone == doc.phone || auth.role == 'admin'",
    create: true,  // 允许创建订单
    delete: "auth.role == 'admin'",  // 只有管理员可删除
  },

  course_permissions: {
    // 课程权限：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.role == 'admin'",  // 只有管理员可以写入（支付成功后由云函数写入）
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  registrations: {
    // 报名记录：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.role == 'admin'",  // 只有管理员可修改（审核等）
    create: true,  // 允许用户提交报名
    delete: "auth.role == 'admin'",
  },

  user_progress: {
    // 学习进度：用户只能读写自己的
    read: "auth.openid == doc._openid || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.openid == doc._openid || auth.openid == doc.userId || auth.role == 'admin'",
    create: true,
    delete: "auth.role == 'admin'",
  },

  learning_progress: {
    // 学习进度（备用表）
    read: "auth.openid == doc._openid || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.openid == doc._openid || auth.openid == doc.userId || auth.role == 'admin'",
    create: true,
    delete: "auth.role == 'admin'",
  },

  transfer_requests: {
    // 调课申请：用户只能看自己的，管理员可看全部
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.studentId || auth.role == 'admin'",
    write: "auth.role == 'admin'",  // 只有管理员可修改状态
    create: true,  // 允许用户提交调课申请
    delete: "auth.role == 'admin'",
  },

  // ==================== 用户基础信息 ====================
  
  members: {
    // 学员信息：用户只能读写自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth._id == doc._id || auth.role == 'admin'",
    write: "auth.openid == doc._openid || auth.phone == doc.phone || auth._id == doc._id || auth.role == 'admin'",
    create: true,  // 允许注册时创建
    delete: "auth.role == 'admin'",
  },

  user_roles: {
    // 用户角色：只有管理员可管理
    read: "auth.role == 'admin'",
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  // ==================== 公开只读数据 ====================
  
  courses: {
    // 课程：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  courseSections: {
    // 课程章节：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  courseLessons: {
    // 课程课时：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  teachers: {
    // 教师信息：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  exams: {
    // 考试试卷：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  examQuestions: {
    // 考题题库：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  examResults: {
    // 考试结果：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.role == 'admin'",
    create: true,  // 允许用户提交考试
    delete: "auth.role == 'admin'",
  },

  questionBanks: {
    // 题库：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  practiceRecords: {
    // 练习记录：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.openid == doc._openid || auth.openid == doc.userId || auth.role == 'admin'",
    create: true,
    delete: "auth.role == 'admin'",
  },

  certificates: {
    // 证书：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  // ==================== 运营数据 ====================
  
  coupons: {
    // 优惠券：所有人可读可用，管理员可管理
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  userCoupons: {
    // 用户领取的优惠券：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.openid == doc.userId || auth.role == 'admin'",
    write: "auth.role == 'admin'",
    create: true,  // 允许用户领取
    delete: "auth.role == 'admin'",
  },

  groupBuys: {
    // 拼团活动：所有人可读，管理员可管理
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  groupBuyRecords: {
    // 拼团记录：用户只能看自己的
    read: "auth.openid == doc._openid || auth.phone == doc.phone || auth.role == 'admin'",
    write: "auth.role == 'admin'",
    create: true,
    delete: "auth.role == 'admin'",
  },

  banners: {
    // 轮播图：所有人可读，管理员可管理
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  notices: {
    // 公告：所有人可读，管理员可管理
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  categories: {
    // 分类：所有人可读，管理员可管理
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  // ==================== 管理数据 ====================
  
  classes: {
    // 班级：所有人可读（用于报名），管理员可管理
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  class_schedules: {
    // 班级排课：学员可读自己的班级课表，管理员可管理
    read: "auth.role == 'admin' || doc.classId in auth.enrolledClassIds",  // 需要在 auth 中注入 enrolledClassIds
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  system_configs: {
    // 系统配置：只有管理员可访问
    read: "auth.role == 'admin'",
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },

  page_configs: {
    // 页面配置：所有人可读，管理员可写
    read: true,
    write: "auth.role == 'admin'",
    create: "auth.role == 'admin'",
    delete: "auth.role == 'admin'",
  },
}

// 导出 JSON 格式（用于 CloudBase 控制台导入）
module.exports = { rules: SECURITY_RULES }

// ========== 使用说明 ==========

/**
 * CloudBase 控制台手动配置步骤：
 * 
 * 1. 打开 CloudBase 控制台 -> 数据库
 * 2. 选择集合 -> 点击"安全规则"
 * 3. 选择"自定义安全规则"
 * 4. 粘贴对应集合的规则
 * 5. 保存
 * 
 * 示例规则格式：
 * {
 *   "read": true,
 *   "write": "auth.role == 'admin'"
 * }
 * 
 * 规则语法说明：
 * - auth.openid: 当前用户的 CloudBase openid
 * - auth.phone: 当前用户的手机号
 * - auth._id: 当前用户的 ID
 * - auth.role: 当前用户的角色（从 user_roles 表获取）
 * - doc._openid: 文档创建者的 openid
 * - doc.phone: 文档中的手机号字段
 * - true/false: 直接允许/拒绝
 * - "条件表达式": 使用 JSONLogic 格式
 */

// ========== 批量配置脚本 ==========

/**
 * 使用 tcb-cli 批量设置安全规则
 * 
 * 1. 安装 tcb-cli:
 *    npm install -g @cloudbase/cli
 * 
 * 2. 登录:
 *    tcb login
 * 
 * 3. 执行以下脚本设置规则：
 */

const SET_RULES_SCRIPT = `
#!/bin/bash
# 设置数据库安全规则

ENV_ID="rcwljy-5ghmq2ex26764978"

# 订单表
tcb database:set-rule --envId $ENV_ID --collection orders \
  --rule '{"read":"auth.openid == doc._openid || auth.phone == doc.phone || auth.role == admin","write":"auth.openid == doc._openid || auth.phone == doc.phone || auth.role == admin","create":true,"delete":"auth.role == admin"}'

# 课程权限表
tcb database:set-rule --envId $ENV_ID --collection course_permissions \
  --rule '{"read":"auth.openid == doc._openid || auth.phone == doc.phone || auth.role == admin","write":"auth.role == admin","create":"auth.role == admin","delete":"auth.role == admin"}'

# 课程表（公开）
tcb database:set-rule --envId $ENV_ID --collection courses \
  --rule '{"read":true,"write":"auth.role == admin","create":"auth.role == admin","delete":"auth.role == admin"}'

echo "安全规则配置完成"
`