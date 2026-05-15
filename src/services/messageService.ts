// ============================================================================
// 消息通知服务 - 管理后台与小程序的联动
// ============================================================================
import { adminService } from './adminService'

export interface AppMessage {
  _id?: string
  userId?: string
  phone?: string
  openid?: string
  type: 'order' | 'registration' | 'system' | 'announcement'
  title: string
  content: string
  data?: Record<string, any>  // 关联的业务数据
  status: 'unread' | 'read'
  createdAt: string
  readAt?: string
}

export const messageService = {
  collection: 'app_messages',

  /**
   * 发送订单状态变更通知
   */
  async sendOrderNotification(order: {
    _id: string
    orderNo: string
    userId?: string
    phone?: string
    userName?: string
    courseName?: string
    status: string
    totalAmount?: number
  }) {
    const statusTexts: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    }

    const title = '订单状态变更'
    const content = `您的订单 ${order.orderNo} 状态已变更为：${statusTexts[order.status] || order.status}`
    const statusText = statusTexts[order.status] || order.status

    let extraContent = ''
    if (statusText === '已支付') {
      extraContent = `课程《${order.courseName || '未知课程'}》已开通，请前往学习`
    } else if (statusText === '已退款') {
      extraContent = `退款金额将原路返回，请注意查收`
    }

    const message: Partial<AppMessage> = {
      type: 'order',
      title,
      content: content + (extraContent ? '\n' + extraContent : ''),
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        status: order.status,
        courseName: order.courseName,
        amount: order.totalAmount
      },
      status: 'unread',
      createdAt: new Date().toISOString()
    }

    // 根据用户标识设置查找条件
    if (order.phone) {
      message.phone = order.phone
    }
    if (order.userId) {
      message.userId = order.userId
    }

    try {
      const result = await adminService.add(this.collection, message)
      console.log('[消息通知] 订单通知已发送', result)
      return result
    } catch (error) {
      console.error('[消息通知] 发送订单通知失败', error)
      return null
    }
  },

  /**
   * 发送报名审核结果通知
   */
  async sendRegistrationNotification(registration: {
    _id: string
    userId?: string
    phone?: string
    userName?: string
    courseName?: string
    status: 'pending' | 'confirmed' | 'cancelled'
    amount?: number
    notes?: string
  }) {
    const statusTexts: Record<string, string> = {
      pending: '待审核',
      confirmed: '已确认',
      cancelled: '已拒绝'
    }

    const title = '报名审核结果'
    const statusText = statusTexts[registration.status] || registration.status

    let content = `您好 ${registration.userName || ''}，您的报名申请已${statusText}`
    if (registration.courseName) {
      content += `\n课程：《${registration.courseName}》`
    }

    if (registration.status === 'confirmed') {
      content += `\n恭喜！您的报名已通过审核，请按时参加培训`
      if (registration.amount && registration.amount > 0) {
        content += `\n报名费用：¥${registration.amount}`
      }
    } else if (registration.status === 'cancelled') {
      content += `\n如有疑问，请联系客服`
    }

    const message: Partial<AppMessage> = {
      type: 'registration',
      title,
      content,
      data: {
        registrationId: registration._id,
        courseName: registration.courseName,
        status: registration.status,
        amount: registration.amount
      },
      status: 'unread',
      createdAt: new Date().toISOString()
    }

    if (registration.phone) {
      message.phone = registration.phone
    }
    if (registration.userId) {
      message.userId = registration.userId
    }

    try {
      const result = await adminService.add(this.collection, message)
      console.log('[消息通知] 报名通知已发送', result)
      return result
    } catch (error) {
      console.error('[消息通知] 发送报名通知失败', error)
      return null
    }
  },

  /**
   * 发送调课审核结果通知
   */
  async sendTransferNotification(transfer: {
    _id: string
    studentId?: string
    phone?: string
    studentName?: string
    originalCourseName?: string
    status: 'approved' | 'rejected'
    adminReply?: string
  }) {
    const statusTexts: Record<string, string> = {
      approved: '已通过',
      rejected: '已拒绝'
    }

    const title = '调课申请结果'
    const statusText = statusTexts[transfer.status] || transfer.status

    let content = `您好 ${transfer.studentName || ''}，您的调课申请已${statusText}`
    if (transfer.originalCourseName) {
      content += `\n课程：《${transfer.originalCourseName}》`
    }

    if (transfer.status === 'approved') {
      content += `\n您的调课申请已审核通过，请关注新的上课安排`
    } else if (transfer.status === 'rejected') {
      content += `\n拒绝原因：${transfer.adminReply || '无'}`
      content += `\n如有疑问，请联系客服`
    }

    const message: Partial<AppMessage> = {
      type: 'system',
      title,
      content,
      data: {
        transferId: transfer._id,
        courseName: transfer.originalCourseName,
        status: transfer.status,
        adminReply: transfer.adminReply
      },
      status: 'unread',
      createdAt: new Date().toISOString()
    }

    if (transfer.phone) {
      message.phone = transfer.phone
    }
    if (transfer.studentId) {
      message.userId = transfer.studentId
    }

    try {
      const result = await adminService.add(this.collection, message)
      console.log('[消息通知] 调课通知已发送', result)
      return result
    } catch (error) {
      console.error('[消息通知] 发送调课通知失败', error)
      return null
    }
  },

  /**
   * 发送系统公告通知
   */
  async sendAnnouncementNotification(announcement: {
    _id: string
    title: string
    content: string
    type?: string
  }) {
    const message: Partial<AppMessage> = {
      type: 'announcement',
      title: announcement.title,
      content: announcement.content,
      data: {
        announcementId: announcement._id,
        type: announcement.type
      },
      status: 'unread',
      createdAt: new Date().toISOString()
    }

    try {
      // 群发消息时不指定 userId
      const result = await adminService.add(this.collection, message)
      console.log('[消息通知] 公告通知已创建', result)
      return result
    } catch (error) {
      console.error('[消息通知] 创建公告通知失败', error)
      return null
    }
  },

  /**
   * 获取用户消息列表
   */
  async getUserMessages(params: {
    phone?: string
    userId?: string
    status?: string
    page?: number
    pageSize?: number
  }) {
    const query: Record<string, any> = {}
    if (params.phone) query.phone = params.phone
    if (params.userId) query.userId = params.userId
    if (params.status) query.status = params.status

    try {
      const result = await adminService.list(this.collection, query, {
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        orderBy: 'createdAt',
        order: 'desc'
      })
      return result
    } catch (error) {
      console.error('[消息通知] 获取消息列表失败', error)
      return null
    }
  },

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId: string) {
    try {
      const result = await adminService.update(this.collection, messageId, {
        status: 'read',
        readAt: new Date().toISOString()
      })
      return result
    } catch (error) {
      console.error('[消息通知] 标记已读失败', error)
      return null
    }
  },

  /**
   * 统计用户未读消息数
   */
  async getUnreadCount(params: { phone?: string; userId?: string }) {
    const query: Record<string, any> = { status: 'unread' }
    if (params.phone) query.phone = params.phone
    if (params.userId) query.userId = params.userId

    try {
      const result = await adminService.count(this.collection, query)
      return result.data || 0
    } catch (error) {
      console.error('[消息通知] 统计未读消息失败', error)
      return 0
    }
  }
}

/**
 * 配置版本号管理
 * 用于小程序端检测配置变化
 */
export const configVersionService = {
  collection: 'system_config',

  /**
   * 获取配置版本号
   */
  async getVersion(key: string = 'page_config'): Promise<number> {
    try {
      const result = await adminService.list(this.collection, {
        key
      }, { limit: 1 })
      
      if (result.code === 0 && result.data?.list?.length > 0) {
        return result.data.list[0].version || 1
      }
      return 1
    } catch (error) {
      console.error('[配置版本] 获取版本失败', error)
      return 1
    }
  },

  /**
   * 更新配置版本号
   */
  async updateVersion(key: string = 'page_config'): Promise<number> {
    try {
      const result = await adminService.list(this.collection, {
        key
      }, { limit: 1 })
      
      const newVersion = (Date.now() % 1000000)  // 使用时间戳作为版本号
      
      if (result.code === 0 && result.data?.list?.length > 0) {
        // 更新现有记录
        await adminService.update(this.collection, result.data.list[0]._id, {
          version: newVersion,
          updatedAt: new Date().toISOString()
        })
      } else {
        // 创建新记录
        await adminService.add(this.collection, {
          key,
          version: newVersion,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
      
      console.log('[配置版本] 已更新为', newVersion)
      return newVersion
    } catch (error) {
      console.error('[配置版本] 更新版本失败', error)
      return 1
    }
  }
}
