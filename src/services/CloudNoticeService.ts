/**
 * 前台公告服务
 * 为前台页面提供公告数据的读取服务
 */
import { dbService } from './cloudBaseService'

// 公告接口
export interface Notice {
  id: string
  title: string
  content: string
  type: 'system' | 'activity' | 'update' | 'important'
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'published' | 'expired'
  target: 'all' | 'vip' | 'new'
  startTime?: string
  endTime?: string
  views: number
  createdAt: string
  updatedAt?: string
}

// 前台公告服务
export const CloudNoticeService = {
  collection: 'notices',

  // 获取已发布的公告列表
  async getPublishedNotices(params?: { limit?: number; type?: string }): Promise<Notice[]> {
    try {
      const { limit = 10, type } = params || {}
      const query: any = { status: 'published' }

      // 过滤过期公告
      const now = new Date().toISOString()
      query.$or = [
        { endTime: { $exists: false } },
        { endTime: '' },
        { endTime: { $gte: now } }
      ]

      if (type) {
        query.type = type
      }

      // @ts-ignore
      const data = await dbService.getAll(this.collection, query, { limit })

      return (data || []).map((item: any) => ({
        id: item._id,
        title: item.title,
        content: item.content,
        type: item.type || 'system',
        priority: item.priority || 'medium',
        status: item.status,
        target: item.target || 'all',
        startTime: item.startTime,
        endTime: item.endTime,
        views: item.views || 0,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
    } catch (error) {
      console.error('获取公告列表失败:', error)
      return []
    }
  },

  // 获取公告详情
  async getNoticeById(id: string): Promise<Notice | null> {
    try {
      const data = await dbService.getById(this.collection, id)
      if (!data) return null

      // 增加浏览次数
      await dbService.update(this.collection, id, {
        views: (data.views || 0) + 1
      })

      return {
        id: data._id,
        title: data.title,
        content: data.content,
        type: data.type || 'system',
        priority: data.priority || 'medium',
        status: data.status,
        target: data.target || 'all',
        startTime: data.startTime,
        endTime: data.endTime,
        views: (data.views || 0) + 1,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    } catch (error) {
      console.error('获取公告详情失败:', error)
      return null
    }
  },

  // 获取重要公告
  async getImportantNotices(): Promise<Notice[]> {
    try {
      const query = {
        status: 'published',
        priority: 'high',
        $or: [
          { endTime: { $exists: false } },
          { endTime: '' },
          { endTime: { $gte: new Date().toISOString() } }
        ]
      }
      // @ts-ignore
      const data = await dbService.getAll(this.collection, query, { limit: 5 })

      return (data || []).map((item: any) => ({
        id: item._id,
        title: item.title,
        content: item.content,
        type: item.type,
        priority: item.priority,
        views: item.views || 0,
        createdAt: item.createdAt,
      }))
    } catch (error) {
      console.error('获取重要公告失败:', error)
      return []
    }
  },

  // 获取未读公告数量
  async getUnreadCount(): Promise<number> {
    try {
      const notices = await this.getPublishedNotices({ limit: 20 })
      return notices.length
    } catch (error) {
      console.error('获取未读公告数量失败:', error)
      return 0
    }
  },

  // 获取弹窗公告
  async getPopupNotice(): Promise<{ success: boolean; data: Notice | null }> {
    try {
      const now = new Date().toISOString()
      
      // 查询条件：已发布、启用弹窗、当前在有效期内
      const query = {
        status: 'published',
        showAsPopup: true,
        isPopupEnabled: true,
        // 检查时间范围
        $and: [
          {
            $or: [
              { startTime: { $exists: false } },
              { startTime: '' },
              { startTime: { $lte: now } }
            ]
          },
          {
            $or: [
              { endTime: { $exists: false } },
              { endTime: '' },
              { endTime: { $gte: now } }
            ]
          }
        ]
      }
      
      // @ts-ignore
      const data = await dbService.getAll(this.collection, query, { limit: 1 })
      
      if (!data || data.length === 0) {
        return { success: true, data: null }
      }
      
      const item = data[0]
      return {
        success: true,
        data: {
          id: item._id,
          title: item.title,
          content: item.content,
          type: item.noticeType || item.type || 'general',
          priority: item.priority || 'medium',
          status: item.status,
          target: item.target || 'all',
          startTime: item.startTime,
          endTime: item.endTime,
          views: item.views || 0,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          // @ts-ignore
          linkType: item.linkType || 'none',
          linkId: item.linkId,
          linkUrl: item.linkUrl,
          linkText: item.linkText,
          popupStyle: item.popupStyle || 'modal',
          showAsPopup: item.showAsPopup,
          isPopupEnabled: item.isPopupEnabled,
        }
      }
    } catch (error) {
      console.error('获取弹窗公告失败:', error)
      return { success: false, data: null }
    }
  }
}
