/**
 * 初始化字典配置云函数
 * 用于设置 systemConfig 集合中的 dictionaries 数据
 */

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 默认字典配置
const DEFAULT_DICTIONARIES = {
  // 订单状态
  orderStatus: {
    pending: { text: '待支付', color: 'bg-yellow-100 text-yellow-700' },
    paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
    completed: { text: '已完成', color: 'bg-blue-100 text-blue-700' },
    cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-700' },
    refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
  },

  // 支付状态
  paymentStatus: {
    unpaid: { text: '未支付', color: 'bg-yellow-100 text-yellow-700' },
    paid: { text: '已支付', color: 'bg-green-100 text-green-700' },
    refunded: { text: '已退款', color: 'bg-purple-100 text-purple-700' },
    failed: { text: '支付失败', color: 'bg-red-100 text-red-700' },
  },

  // 报名状态
  enrollmentStatus: {
    active: { text: '正常', color: 'bg-green-100 text-green-700' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
    pending: { text: '待审核', color: 'bg-yellow-100 text-yellow-700' },
    confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-700' },
    suspended: { text: '已暂停', color: 'bg-orange-100 text-orange-700' },
    dropped: { text: '已退学', color: 'bg-red-100 text-red-700' },
    completed: { text: '已结业', color: 'bg-blue-100 text-blue-700' },
  },

  // 班级状态
  classStatus: {
    draft: { text: '草稿', color: 'bg-gray-100 text-gray-700' },
    enrolling: { text: '招生中', color: 'bg-green-100 text-green-700' },
    in_progress: { text: '进行中', color: 'bg-blue-100 text-blue-700' },
    completed: { text: '已结课', color: 'bg-gray-100 text-gray-700' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  },

  // 课表状态
  scheduleStatus: {
    scheduled: { text: '已排课', color: 'bg-blue-100 text-blue-700' },
    completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  },

  // 来源类型
  enrollmentSource: {
    online_purchase: { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
    online_enroll: { text: '线上报名', color: 'bg-cyan-100 text-cyan-700' },
    offline_enroll: { text: '线下报名', color: 'bg-orange-100 text-orange-700' },
    hybrid: { text: '混合用户', color: 'bg-purple-100 text-purple-700' },
  },

  // 调课类型
  transferTypes: {
    time: { text: '时间调整', color: 'text-blue-600', bg: 'bg-blue-50' },
    teacher: { text: '更换老师', color: 'text-purple-600', bg: 'bg-purple-50' },
    location: { text: '更换场地', color: 'text-green-600', bg: 'bg-green-50' },
    course: { text: '更换课程', color: 'text-orange-600', bg: 'bg-orange-50' },
    leave: { text: '请假补课', color: 'text-gray-600', bg: 'bg-gray-50' },
  },

  // 调课状态
  transferStatus: {
    pending: { text: '待审核', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    approved: { text: '已通过', color: 'text-green-600', bg: 'bg-green-50' },
    rejected: { text: '已拒绝', color: 'text-red-600', bg: 'bg-red-50' },
    cancelled: { text: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
  },

  // 出勤状态
  attendanceStatus: {
    present: { text: '出勤', color: 'bg-green-100 text-green-700' },
    absent: { text: '缺勤', color: 'bg-red-100 text-red-700' },
    late: { text: '迟到', color: 'bg-yellow-100 text-yellow-700' },
    leave: { text: '请假', color: 'bg-blue-100 text-blue-700' },
  },

  // 会员类型
  memberType: {
    user: { text: '普通用户', color: 'bg-gray-100 text-gray-700' },
    student: { text: '学员', color: 'bg-blue-100 text-blue-700' },
    enterprise: { text: '企业用户', color: 'bg-purple-100 text-purple-700' },
  },

  // 会员状态
  memberStatus: {
    active: { text: '正常', color: 'bg-green-100 text-green-700' },
    disabled: { text: '已禁用', color: 'bg-red-100 text-red-700' },
  },

  // 会员来源
  memberSource: {
    purchase: { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
    enrollment: { text: '线下报班', color: 'bg-orange-100 text-orange-700' },
    admin_grant: { text: '管理员授权', color: 'bg-purple-100 text-purple-700' },
    wechat: { text: '微信注册', color: 'bg-green-100 text-green-700' },
  },

  // 课程等级 - 按体系分组
  courseLevels: [
    // 人社培训等级
    { value: '初级工', label: '初级工', badgeColor: 'badge-success', source: 'RENSHE' },
    { value: '中级工', label: '中级工', badgeColor: 'badge-warning', source: 'RENSHE' },
    { value: '高级工', label: '高级工', badgeColor: 'badge-error', source: 'RENSHE' },
    { value: '技师', label: '技师', badgeColor: 'badge-primary', source: 'RENSHE' },
    { value: '高级技师', label: '高级技师', badgeColor: 'badge-secondary', source: 'RENSHE' },
    // CAAC证书等级
    { value: '视距内驾驶员', label: '视距内驾驶员', badgeColor: 'badge-success', source: 'CAAC' },
    { value: '超视距驾驶员', label: '超视距驾驶员(机长)', badgeColor: 'badge-warning', source: 'CAAC' },
    { value: '教员', label: '教员', badgeColor: 'badge-error', source: 'CAAC' },
  ],

  // 培训班等级 - 按体系分组
  classLevels: [
    // 人社培训等级
    { value: '入门班', label: '入门班', badgeColor: 'badge-success', source: 'RENSHE' },
    { value: '基础班', label: '基础班', badgeColor: 'badge-info', source: 'RENSHE' },
    { value: '进阶班', label: '进阶班', badgeColor: 'badge-warning', source: 'RENSHE' },
    { value: '高级班', label: '高级班', badgeColor: 'badge-error', source: 'RENSHE' },
    { value: '考证班', label: '考证班', badgeColor: 'badge-primary', source: 'RENSHE' },
    // CAAC培训班等级
    { value: 'CAAC入门班', label: 'CAAC入门班', badgeColor: 'badge-success', source: 'CAAC' },
    { value: 'CAAC基础班', label: 'CAAC基础班', badgeColor: 'badge-info', source: 'CAAC' },
    { value: 'CAAC进阶班', label: 'CAAC进阶班', badgeColor: 'badge-warning', source: 'CAAC' },
    { value: 'CAAC高级班', label: 'CAAC高级班', badgeColor: 'badge-error', source: 'CAAC' },
    { value: 'CAAC考证班', label: 'CAAC考证班', badgeColor: 'badge-primary', source: 'CAAC' },
  ],

  // 题库分类
  questionBankCategories: [
    { value: '', label: '全部' },
    { value: '理论', label: '理论' },
    { value: '法规', label: '法规' },
    { value: '实操', label: '实操' },
    { value: '安全', label: '安全' },
    { value: '考证', label: '考证' },
  ],

  // 题库难度
  questionBankLevels: [
    { value: 'easy', label: '简单' },
    { value: 'medium', label: '中等' },
    { value: 'hard', label: '困难' },
  ],

  // 消息类型
  messageTypes: [
    { key: 'system', label: '系统通知', color: 'bg-blue-100 text-blue-700' },
    { key: 'course', label: '课程通知', color: 'bg-green-100 text-green-700' },
    { key: 'order', label: '订单通知', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'class', label: '班级通知', color: 'bg-purple-100 text-purple-700' },
    { key: 'exam', label: '考试通知', color: 'bg-red-100 text-red-700' },
  ],

  // 消息优先级
  messagePriorities: [
    { key: 'low', label: '低', color: 'bg-gray-100 text-gray-700' },
    { key: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'high', label: '高', color: 'bg-red-100 text-red-700' },
  ],

  // 学习路径分类等级映射 - 按体系配置每个分类的等级
  learningPathCategories: {
    RENSHE: {
      '植保无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '航拍无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '物流无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '安防无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '测绘无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '巡检无人机': ['初级工', '中级工', '高级工', '技师', '高级技师'],
      '装调检修工': ['初级工', '中级工', '高级工', '技师', '高级技师'],
    },
    CAAC: {
      '多旋翼': ['视距内驾驶员', '超视距驾驶员', '教员'],
      '固定翼': ['视距内驾驶员', '超视距驾驶员', '教员'],
      '直升机': ['视距内驾驶员', '超视距驾驶员', '教员'],
      '垂直起降固定翼': ['视距内驾驶员', '超视距驾驶员', '教员'],
    },
  },
}

exports.main = async (event, context) => {
  console.log('[init-dictionaries] 开始初始化字典配置...')

  try {
    // 查询是否已存在 dictionaries 配置
    const existing = await db.collection('systemConfig')
      .where({ type: 'dictionaries' })
      .limit(1)
      .get()

    const now = new Date().toISOString()

    if (existing.data && existing.data.length > 0) {
      // 已存在，更新配置（保留现有数据，只添加缺失的字段）
      const existingDicts = existing.data[0].dictionaries || {}
      const mergedDicts = {
        ...DEFAULT_DICTIONARIES,
        ...existingDicts,
        // 合并 learningPathCategories
        learningPathCategories: {
          ...DEFAULT_DICTIONARIES.learningPathCategories,
          ...(existingDicts.learningPathCategories || {}),
        },
        // 合并 courseLevels
        courseLevels: existingDicts.courseLevels?.length > 0 
          ? existingDicts.courseLevels 
          : DEFAULT_DICTIONARIES.courseLevels,
        // 合并 classLevels
        classLevels: existingDicts.classLevels?.length > 0 
          ? existingDicts.classLevels 
          : DEFAULT_DICTIONARIES.classLevels,
      }

      await db.collection('systemConfig').doc(existing.data[0]._id).update({
        dictionaries: mergedDicts,
        updatedAt: now,
      })

      console.log('[init-dictionaries] 字典配置已更新')
      return {
        code: 0,
        message: '字典配置已更新',
        data: mergedDicts,
      }
    } else {
      // 不存在，创建新配置
      await db.collection('systemConfig').add({
        data: {
          type: 'dictionaries',
          dictionaries: DEFAULT_DICTIONARIES,
          createdAt: now,
          updatedAt: now,
        },
      })

      console.log('[init-dictionaries] 字典配置已创建')
      return {
        code: 0,
        message: '字典配置已创建',
        data: DEFAULT_DICTIONARIES,
      }
    }
  } catch (error) {
    console.error('[init-dictionaries] 初始化失败:', error)
    return {
      code: -1,
      message: '初始化失败: ' + error.message,
      error: error.message,
    }
  }
}
