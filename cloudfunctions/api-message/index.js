// api-message 云函数 - 消息推送服务
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 模板消息类型配置
const TEMPLATE_TYPES = {
  class_reminder: {
    name: '开班提醒',
    // 需要在小程序后台申请模板后填入真实 templateId
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

/**
 * 订阅消息模板
 * @param {string} userId - 用户ID
 * @param {string} templateType - 模板类型
 * @param {string} templateId - 微信模板ID（可选，覆盖默认配置）
 */
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

  // 检查是否已订阅，避免重复
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

/**
 * 发送小程序订阅消息
 * @param {string} userId - 接收用户 openId
 * @param {string} templateType - 模板类型
 * @param {object} data - 模板数据，如 { thing1: { value: 'xxx' } }
 * @param {string} page - 点击消息跳转的小程序页面路径
 * @param {string} templateId - 自定义模板ID（可选）
 */
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

  if (!data || typeof data !== 'object') {
    return { code: 400, msg: '缺少模板数据' }
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
      miniprogramState: 'formal' // formal | trial | developer
    })

    // errcode 43101 = 用户未订阅或订阅已过期
    if (result.errcode === 43101) {
      return {
        code: 43101,
        msg: '用户未订阅该消息或订阅已过期，需引导用户重新授权',
        errcode: result.errcode
      }
    }

    if (result.errcode !== 0) {
      return {
        code: result.errcode,
        msg: `发送失败: ${result.errmsg}`,
        errcode: result.errcode,
        errmsg: result.errmsg
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

/**
 * 获取用户订阅列表
 * @param {string} userId - 用户ID
 * @param {string} status - 筛选状态（可选）
 * @param {number} page - 页码，从1开始
 * @param {number} pageSize - 每页条数
 */
async function getList(params) {
  const { userId, status, page = 1, pageSize = 20 } = params

  if (!userId) {
    return { code: 400, msg: '缺少用户ID' }
  }

  const where = { userId }
  if (status) {
    where.status = status
  }

  const skip = (page - 1) * pageSize

  const [listResult, countResult] = await Promise.all([
    db.collection('subscriptions')
      .where(where)
      .orderBy('subscribedAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get(),
    db.collection('subscriptions')
      .where(where)
      .count()
  ])

  return {
    code: 0,
    msg: 'ok',
    data: {
      list: listResult.data,
      total: countResult.total,
      page,
      pageSize
    }
  }
}

// 主入口
exports.main = async (event, context) => {
  const { OPENID: openId } = cloud.getWXContext()
  const { action, ...params } = event

  // 如果参数中没传 userId，自动使用当前调用者的 openId
  if (!params.userId && action !== 'sendTemplate') {
    params.userId = openId
  }

  switch (action) {
    case 'subscribe':
      return subscribe(params)
    case 'sendTemplate':
      return sendTemplate(params)
    case 'getList':
      return getList(params)
    default:
      return {
        code: 400,
        msg: `未知 action: ${action}`,
        availableActions: ['subscribe', 'sendTemplate', 'getList']
      }
  }
}
