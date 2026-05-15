// api-message 云函数 - 消息推送服务 v2.0
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// ============================================
// 消息类型配置
// ============================================
const MESSAGE_TYPES = {
  system: { label: '系统通知', icon: '⚙️', color: '#2563eb' },
  notice: { label: '公告', icon: '📢', color: '#7c3aed' },
  audit: { label: '审核通知', icon: '✅', color: '#059669' },
  order: { label: '订单通知', icon: '🛒', color: '#d97706' },
  course: { label: '课程通知', icon: '📚', color: '#4f46e5' },
  certificate: { label: '证书通知', icon: '🏆', color: '#dc2626' },
  transfer: { label: '调课通知', icon: '🔄', color: '#7c3aed' }
}

// 模板消息类型配置（微信订阅消息）
const TEMPLATE_TYPES = {
  class_reminder: {
    name: '开班提醒',
    templateId: '',
    description: '培训开班前提醒学员按时参加'
  },
  exam_notice: {
    name: '考试通知',
    templateId: '',
    description: '考试时间、地点及注意事项通知'
  },
  course_update: {
    name: '课程更新',
    templateId: '',
    description: '课程内容更新通知学员'
  },
  certificate_issue: {
    name: '证书颁发',
    templateId: '',
    description: '学员通过考试后颁发证书通知'
  }
}

// ============================================
// 发送站内消息（核心功能）
// ============================================

/**
 * 发送站内消息到 messages 集合
 * @param {object} params
 * @param {string} params.phone - 用户手机号
 * @param {string} params.openid - 用户 openid（可选，与 phone 二选一）
 * @param {string} params.type - 消息类型
 * @param {string} params.title - 消息标题
 * @param {string} params.content - 消息内容
 * @param {string} params.priority - 优先级：low/medium/high
 * @param {string} params.link - 点击跳转链接
 * @param {string} params.linkText - 链接显示文本
 * @param {string} params.relatedId - 关联业务ID
 * @param {string} params.relatedType - 关联业务类型
 */
async function sendMessage(params) {
  const {
    phone,
    openid,
    type = 'system',
    title,
    content,
    priority = 'medium',
    link = '',
    linkText = '',
    relatedId = '',
    relatedType = ''
  } = params

  if (!phone && !openid) {
    return { code: 400, msg: '缺少用户标识（phone 或 openid）' }
  }
  if (!title) {
    return { code: 400, msg: '缺少消息标题' }
  }
  if (!content) {
    return { code: 400, msg: '缺少消息内容' }
  }

  const now = new Date()

  const message = {
    phone: phone || '',
    _openid: openid || '',
    type,
    title: title.trim(),
    content: content.trim(),
    priority,
    status: 'unread',
    isSystem: true,
    link: link || undefined,
    linkText: linkText || undefined,
    relatedId: relatedId || undefined,
    relatedType: relatedType || undefined,
    createdAt: now,
    updatedAt: now
  }

  try {
    const result = await db.collection('messages').add({ data: message })
    return {
      code: 0,
      msg: '发送成功',
      data: {
        _id: result._id,
        ...message
      }
    }
  } catch (err) {
    console.error('sendMessage error:', err)
    return { code: 500, msg: `发送失败: ${err.message}` }
  }
}

/**
 * 批量发送站内消息
 * @param {object} params
 * @param {array} params.phones - 用户手机号列表
 * @param {string} params.type - 消息类型
 * @param {string} params.title - 消息标题
 * @param {string} params.content - 消息内容
 * @param {string} params.priority - 优先级
 */
async function sendBatchMessage(params) {
  const {
    phones = [],
    type = 'notice',
    title,
    content,
    priority = 'medium',
    link = '',
    linkText = ''
  } = params

  if (!phones || phones.length === 0) {
    return { code: 400, msg: '缺少目标用户列表' }
  }
  if (!title || !content) {
    return { code: 400, msg: '缺少标题或内容' }
  }

  const now = new Date()
  const messages = phones.map(phone => ({
    phone,
    type,
    title: title.trim(),
    content: content.trim(),
    priority,
    status: 'unread',
    isSystem: true,
    link: link || undefined,
    linkText: linkText || undefined,
    createdAt: now,
    updatedAt: now
  }))

  try {
    const result = await db.collection('messages').add({ data: messages })
    return {
      code: 0,
      msg: `成功发送 ${messages.length} 条消息`,
      data: {
        count: messages.length,
        ids: result._id ? [result._id] : []
      }
    }
  } catch (err) {
    console.error('sendBatchMessage error:', err)
    return { code: 500, msg: `批量发送失败: ${err.message}` }
  }
}

// ============================================
// 业务场景自动通知
// ============================================

/**
 * 调课申请审核通知
 * @param {object} params
 * @param {string} params.phone - 学员手机号
 * @param {string} params.studentName - 学员姓名
 * @param {string} params.status - approved/rejected
 * @param {string} params.originalCourse - 原课程名称
 * @param {string} params.reply - 管理员回复
 */
async function notifyTransferResult(params) {
  const {
    phone,
    studentName = '',
    status,
    originalCourse = '',
    reply = ''
  } = params

  if (!phone) {
    return { code: 400, msg: '缺少手机号' }
  }

  const isApproved = status === 'approved'
  const title = isApproved ? '🎉 调课申请已通过' : '❌ 调课申请未通过'
  const content = isApproved
    ? `您好${studentName ? ' ' + studentName : ''}，您的调课申请已通过审核。\n原课程：${originalCourse}\n${reply ? '管理员回复：' + reply : '请按新安排准时参加培训。'}`
    : `您好${studentName ? ' ' + studentName : ''}，很抱歉，您的调课申请未通过。\n原课程：${originalCourse}\n原因：${reply || '请联系管理员了解详情'}`

  return sendMessage({
    phone,
    type: 'transfer',
    title,
    content,
    priority: isApproved ? 'medium' : 'high',
    link: '/pages/transfer-request/transfer-request',
    linkText: '查看详情',
    relatedType: 'transfer'
  })
}

/**
 * 订单状态变更通知
 * @param {object} params
 * @param {string} params.phone - 用户手机号
 * @param {string} params.orderId - 订单ID
 * @param {string} params.status - 订单状态
 * @param {string} params.goodsName - 商品名称
 * @param {string} params.amount - 金额
 */
async function notifyOrderStatus(params) {
  const {
    phone,
    orderId = '',
    status,
    goodsName = '',
    amount = ''
  } = params

  if (!phone) {
    return { code: 400, msg: '缺少手机号' }
  }

  const statusMap = {
    pending: { label: '待支付', title: '📋 订单待支付提醒' },
    paid: { label: '已支付', title: '✅ 订单支付成功' },
    shipped: { label: '已发货', title: '🚚 商品已发货' },
    completed: { label: '已完成', title: '🎉 订单已完成' },
    cancelled: { label: '已取消', title: '❌ 订单已取消' }
  }

  const statusInfo = statusMap[status] || { label: status, title: '📋 订单状态更新' }

  let content = `您的订单已更新为"${statusInfo.label}"。\n商品：${goodsName}`
  if (amount) {
    content += `\n金额：¥${amount}`
  }
  if (status === 'paid') {
    content += '\n感谢您的购买，我们将尽快为您发货。'
  } else if (status === 'shipped') {
    content += '\n请注意查收快递，如有疑问请联系客服。'
  }

  return sendMessage({
    phone,
    type: 'order',
    title: statusInfo.title,
    content,
    priority: status === 'pending' ? 'high' : 'medium',
    link: '/pages/my-orders/my-orders',
    linkText: '查看订单',
    relatedId: orderId,
    relatedType: 'order'
  })
}

/**
 * 证书颁发通知
 * @param {object} params
 * @param {string} params.phone - 用户手机号
 * @param {string} params.userName - 用户姓名
 * @param {string} params.certificateName - 证书名称
 * @param {string} params.certificateId - 证书ID
 */
async function notifyCertificate(params) {
  const {
    phone,
    userName = '',
    certificateName = '',
    certificateId = ''
  } = params

  if (!phone) {
    return { code: 400, msg: '缺少手机号' }
  }

  return sendMessage({
    phone,
    type: 'certificate',
    title: '🏆 恭喜！您的证书已生成',
    content: `恭喜${userName ? ' ' + userName : '您'}！\n您已成功获得《${certificateName}》。\n证书可在"我的证书"中查看和下载。`,
    priority: 'high',
    link: '/pages/my-certificates/my-certificates',
    linkText: '立即查看',
    relatedId: certificateId,
    relatedType: 'certificate'
  })
}

/**
 * 培训班报名成功通知
 * @param {object} params
 * @param {string} params.phone - 用户手机号
 * @param {string} params.userName - 用户姓名
 * @param {string} params.className - 培训班名称
 * @param {string} params.classId - 培训班ID
 * @param {string} params.startDate - 开班日期
 * @param {string} params.location - 培训地点
 */
async function notifyClassEnrollment(params) {
  const {
    phone,
    userName = '',
    className = '',
    classId = '',
    startDate = '',
    location = ''
  } = params

  if (!phone) {
    return { code: 400, msg: '缺少手机号' }
  }

  let content = `恭喜${userName ? ' ' + userName : '您'}！\n您已成功报名《${className}》。`
  if (startDate) {
    content += `\n开班时间：${startDate}`
  }
  if (location) {
    content += `\n培训地点：${location}`
  }
  content += '\n请按时参加培训，祝您学有所成！'

  return sendMessage({
    phone,
    type: 'course',
    title: '🎓 培训班报名成功',
    content,
    priority: 'high',
    link: '/pages/my-classes/my-classes',
    linkText: '查看详情',
    relatedId: classId,
    relatedType: 'class'
  })
}

/**
 * 系统公告通知
 * @param {object} params
 * @param {array} params.phones - 目标用户列表（为空则发给所有用户）
 * @param {string} params.title - 公告标题
 * @param {string} params.content - 公告内容
 * @param {string} params.priority - 优先级
 */
async function sendNotice(params) {
  const {
    phones = [],
    title,
    content,
    priority = 'medium'
  } = params

  if (!title || !content) {
    return { code: 400, msg: '缺少标题或内容' }
  }

  if (phones && phones.length > 0) {
    // 发送给指定用户
    return sendBatchMessage({
      phones,
      type: 'notice',
      title,
      content,
      priority
    })
  } else {
    // 发送给全体用户 - 查询所有用户
    try {
      const usersResult = await db.collection('users').field({ phone: true }).limit(1000).get()
      const allPhones = usersResult.data.map(u => u.phone).filter(p => p)

      if (allPhones.length === 0) {
        return { code: 0, msg: '当前无注册用户，公告已保存', data: { count: 0 } }
      }

      return sendBatchMessage({
        phones: allPhones,
        type: 'notice',
        title,
        content,
        priority
      })
    } catch (err) {
      console.error('sendNotice error:', err)
      return { code: 500, msg: `发送公告失败: ${err.message}` }
    }
  }
}

// ============================================
// 订阅消息相关（保留原有功能）
// ============================================

async function subscribe(params) {
  const { userId, templateType, templateId: customTemplateId } = params

  if (!userId) {
    return { code: 400, msg: '缺少用户ID' }
  }

  if (!templateType || !TEMPLATE_TYPES[templateType]) {
    return {
      code: 400,
      msg: '无效的模板类型',
      availableTypes: Object.keys(TEMPLATE_TYPES)
    }
  }

  const templateConfig = TEMPLATE_TYPES[templateType]
  const templateId = customTemplateId || templateConfig.templateId

  if (!templateId) {
    return { code: 400, msg: `模板类型 ${templateType} 尚未配置 templateId` }
  }

  const existing = await db.collection('subscriptions')
    .where({ userId, templateType, status: 'active' })
    .get()

  if (existing.data.length > 0) {
    return { code: 409, msg: '已订阅该模板类型', data: existing.data[0] }
  }

  const now = new Date()
  const record = {
    userId,
    templateType,
    templateId,
    templateName: templateConfig.name,
    subscribedAt: now,
    status: 'active'
  }

  const { _id } = await db.collection('subscriptions').add({ data: record })

  return {
    code: 0,
    msg: '订阅成功',
    data: { _id, ...record }
  }
}

async function sendTemplate(params) {
  const { userId, templateType, data, page, templateId: customTemplateId } = params

  if (!userId) {
    return { code: 400, msg: '缺少用户ID (openId)' }
  }

  if (!templateType || !TEMPLATE_TYPES[templateType]) {
    return {
      code: 400,
      msg: '无效的模板类型',
      availableTypes: Object.keys(TEMPLATE_TYPES)
    }
  }

  const templateConfig = TEMPLATE_TYPES[templateType]
  const templateId = customTemplateId || templateConfig.templateId

  if (!templateId) {
    return { code: 400, msg: `模板类型 ${templateType} 尚未配置 templateId` }
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: userId,
      templateId,
      page: page || '',
      data,
      miniprogramState: 'formal'
    })

    if (result.errcode === 43101) {
      return {
        code: 43101,
        msg: '用户未订阅该消息或订阅已过期，需引导用户重新授权'
      }
    }

    if (result.errcode !== 0) {
      return {
        code: result.errcode,
        msg: `发送失败: ${result.errmsg}`
      }
    }

    return {
      code: 0,
      msg: '发送成功',
      data: result
    }
  } catch (err) {
    console.error('sendTemplate error:', err)
    return { code: 500, msg: `发送异常: ${err.message}` }
  }
}

// ============================================
// 主入口
// ============================================

exports.main = async (event, context) => {
  const { OPENID: openId } = cloud.getWXContext()
  const { action, ...params } = event

  console.log(`[api-message] action: ${action}`, params)

  try {
    switch (action) {
      // 站内消息
      case 'sendMessage':
        return sendMessage(params)
      case 'sendBatchMessage':
        return sendBatchMessage(params)
      case 'sendNotice':
        return sendNotice(params)

      // 业务场景通知
      case 'notifyTransferResult':
        return notifyTransferResult(params)
      case 'notifyOrderStatus':
        return notifyOrderStatus(params)
      case 'notifyCertificate':
        return notifyCertificate(params)
      case 'notifyClassEnrollment':
        return notifyClassEnrollment(params)

      // 订阅消息
      case 'subscribe':
        return subscribe(params)
      case 'sendTemplate':
        return sendTemplate(params)

      default:
        return {
          code: 400,
          msg: `未知 action: ${action}`,
          availableActions: [
            'sendMessage',
            'sendBatchMessage',
            'sendNotice',
            'notifyTransferResult',
            'notifyOrderStatus',
            'notifyCertificate',
            'notifyClassEnrollment',
            'subscribe',
            'sendTemplate'
          ]
        }
    }
  } catch (err) {
    console.error('[api-message] error:', err)
    return { code: 500, msg: `服务异常: ${err.message}` }
  }
}
