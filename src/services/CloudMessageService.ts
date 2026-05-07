/**
 * 前台消息服务
 * 为前台页面提供消息数据的读取和管理服务
 */
import { dbService } from './cloudBaseService'
// @ts-ignore
import { tcbService } from './tcbService'

// 消息类型
export type MessageType = 'system' | 'notice' | 'audit' | 'order' | 'course' | 'certificate'

// 消息优先级
export type MessagePriority = 'low' | 'medium' | 'high'

// 消息状态
export type MessageStatus = 'unread' | 'read'

// 消息接口
export interface Message {
  id: string
  userId?: string      // 用户ID（可选，支持群发）
  phone?: string       // 用户手机号
  _openid?: string     // 微信OpenID
  type: MessageType
  title: string
  content: string
  priority: MessagePriority
  status: MessageStatus
  link?: string        // 点击跳转链接
  linkText?: string    // 链接文本
  relatedId?: string   // 关联ID（如订单ID、报班ID等）
  relatedType?: string // 关联类型（如 order, registration, class 等）
  isSystem: boolean    // 是否系统消息
  readAt?: string      // 阅读时间
  createdAt: string
  updatedAt?: string
}

// 分页查询结果
interface PaginatedMessages {
  data: Message[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// 前台消息服务
export const CloudMessageService = {
  collection: 'messages',

  /**
   * 获取用户的消息列表
   * 用户可以看到：
   * 1. 发送给全体用户的消息 (isSystem: true)
   * 2. 发送给指定手机号的消息 (phone 匹配)
   * 3. 发送给指定用户ID的消息 (userId 匹配)
   * 4. 发送给指定 OpenID 的消息 (_openid 匹配)
   */
  async getMessages(params: {
    userId?: string
    phone?: string
    _openid?: string
    type?: MessageType
    status?: MessageStatus
    page?: number
    pageSize?: number
  }): Promise<PaginatedMessages> {
    try {
      const { 
        userId, 
        phone, 
        _openid, 
        type, 
        status, 
        page = 1, 
        pageSize = 20 
      } = params

      // 获取所有消息
      let allData = await dbService.getAll(this.collection)
      
      // 前端过滤：用户只能看到：
      // 1. 全体用户消息 (isSystem: true)
      // 2. 发送给指定手机号的消息 (phone 匹配)
      // 3. 发送给指定用户ID的消息 (userId 匹配)
      // 4. 发送给指定 OpenID 的消息 (_openid 匹配)
      allData = allData.filter((item: any) => {
        // 全体用户消息
        if (item.isSystem === true) return true
        
        // 用户自己的消息
        if (phone && item.phone === phone) return true
        if (_openid && item._openid === _openid) return true
        if (userId && item.userId === userId) return true
        
        return false
      })

      // 类型筛选
      if (type) {
        allData = allData.filter((item: any) => item.type === type)
      }

      // 状态筛选
      if (status) {
        allData = allData.filter((item: any) => item.status === status)
      }

      // 排序（createdAt 降序）
      allData.sort((a: any, b: any) => {
        const timeA = new Date(a.createdAt || 0).getTime()
        const timeB = new Date(b.createdAt || 0).getTime()
        return timeB - timeA
      })

      // 分页
      const skip = (page - 1) * pageSize
      const paginatedData = allData.slice(skip, skip + pageSize)
      const total = allData.length

      return {
        data: paginatedData.map((item: any) => this.formatMessage(item)),
        total,
        page,
        pageSize,
        hasMore: skip + pageSize < total
      }
    } catch (error) {
      console.error('获取消息列表失败:', error)
      return { data: [], total: 0, page: 1, pageSize: 20, hasMore: false }
    }
  },

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(params: {
    userId?: string
    phone?: string
    _openid?: string
    type?: MessageType
  }): Promise<number> {
    try {
      const { userId, phone, _openid, type } = params
      
      // 获取所有消息
      let allData = await dbService.getAll(this.collection)
      
      // 过滤用户可见的消息
      allData = allData.filter((item: any) => {
        // 全体用户消息
        if (item.isSystem === true) return true
        
        // 用户自己的消息
        if (phone && item.phone === phone) return true
        if (_openid && item._openid === _openid) return true
        if (userId && item.userId === userId) return true
        
        return false
      })

      // 未读筛选
      allData = allData.filter((item: any) => item.status === 'unread')

      // 类型筛选
      if (type) {
        allData = allData.filter((item: any) => item.type === type)
      }

      return allData?.length || 0
    } catch (error) {
      console.error('获取未读消息数量失败:', error)
      return 0
    }
  },

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      await dbService.update(this.collection, messageId, {
        status: 'read',
        readAt: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('标记消息已读失败:', error)
      return false
    }
  },

  /**
   * 批量标记消息为已读
   */
  async markAllAsRead(params: {
    userId?: string
    phone?: string
    _openid?: string
  }): Promise<boolean> {
    try {
      const { userId, phone, _openid } = params
      
      // 获取所有未读消息
      let allUnreadMessages = await dbService.getAll(this.collection)
      
      // 过滤用户可见的未读消息
      allUnreadMessages = allUnreadMessages.filter((item: any) => {
        if (item.status !== 'unread') return false
        
        // 全体用户消息
        if (item.isSystem === true) return true
        
        // 用户自己的消息
        if (phone && item.phone === phone) return true
        if (_openid && item._openid === _openid) return true
        if (userId && item.userId === userId) return true
        
        return false
      })

      if (allUnreadMessages && allUnreadMessages.length > 0) {
        const now = new Date().toISOString()
        // 逐条更新
        for (const msg of allUnreadMessages) {
          await dbService.update(this.collection, msg._id, {
            status: 'read',
            readAt: now
          })
        }
      }

      return true
    } catch (error) {
      console.error('批量标记已读失败:', error)
      return false
    }
  },

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      await dbService.delete(this.collection, messageId)
      return true
    } catch (error) {
      console.error('删除消息失败:', error)
      return false
    }
  },

  /**
   * 获取消息详情
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    try {
      const data = await dbService.getById(this.collection, messageId)
      if (!data) return null

      // 如果未读，自动标记为已读
      if (data.status === 'unread') {
        await this.markAsRead(messageId)
      }

      return this.formatMessage(data)
    } catch (error) {
      console.error('获取消息详情失败:', error)
      return null
    }
  },

  /**
   * 格式化消息数据
   */
  formatMessage(item: any): Message {
    return {
      id: item._id,
      userId: item.userId,
      phone: item.phone,
      _openid: item._openid,
      type: item.type || 'system',
      title: item.title || '系统消息',
      content: item.content || '',
      priority: item.priority || 'medium',
      status: item.status || 'unread',
      link: item.link,
      linkText: item.linkText,
      relatedId: item.relatedId,
      relatedType: item.relatedType,
      isSystem: item.isSystem || false,
      readAt: item.readAt,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt
    }
  },

  /**
   * 获取消息类型标签
   */
  getTypeLabel(type: MessageType): string {
    const labels: Record<MessageType, string> = {
      system: '系统通知',
      notice: '公告',
      audit: '审核通知',
      order: '订单通知',
      course: '课程通知',
      certificate: '证书通知'
    }
    return labels[type] || '通知'
  },

  /**
   * 获取消息类型图标
   */
  getTypeIcon(type: MessageType): string {
    const icons: Record<MessageType, string> = {
      system: '🔔',
      notice: '📢',
      audit: '✅',
      order: '📦',
      course: '📚',
      certificate: '🏆'
    }
    return icons[type] || '🔔'
  },

  /**
   * 获取消息类型颜色
   */
  getTypeColor(type: MessageType): string {
    const colors: Record<MessageType, string> = {
      system: 'blue',
      notice: 'purple',
      audit: 'green',
      order: 'amber',
      course: 'indigo',
      certificate: 'rose'
    }
    return colors[type] || 'blue'
  }
}

export default CloudMessageService
