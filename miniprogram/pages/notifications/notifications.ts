// pages/notifications/notifications.ts
// 消息通知页面

import { dbQuery, callFunction } from '../../utils/http'
import { checkLogin, getPhone, formatDate } from '../../utils/util'
import logger from '../../utils/logger'

// 消息类型配置
const MESSAGE_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  system: { label: '系统通知', icon: '⚙️', color: '#2563eb' },
  notice: { label: '公告', icon: '📢', color: '#7c3aed' },
  audit: { label: '审核通知', icon: '✅', color: '#059669' },
  order: { label: '订单通知', icon: '🛒', color: '#d97706' },
  course: { label: '课程通知', icon: '📚', color: '#4f46e5' },
  certificate: { label: '证书通知', icon: '🏆', color: '#dc2626' }
}

interface Message {
  _id: string
  type: string
  title: string
  content: string
  status: string
  link?: string
  linkText?: string
  priority: string
  createdAt: string
  readAt?: string
}

Page({
  data: {
    isLoggedIn: false,
    messages: [] as Message[],
    loading: false,
    refreshing: false,
    currentTab: 'all',
    tabs: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'system', label: '系统', count: 0 },
      { key: 'notice', label: '公告', count: 0 },
      { key: 'audit', label: '审核', count: 0 },
      { key: 'order', label: '订单', count: 0 }
    ],
    stats: {
      total: 0,
      unread: 0
    },
    selectedMessage: null as Message | null,
    showDetail: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '消息通知' })
    
    if (!checkLogin()) {
      this.setData({ isLoggedIn: false })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    
    this.setData({ isLoggedIn: true })
    this.loadMessages()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadMessages()
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadMessages().then(() => {
      wx.stopPullDownRefresh()
      this.setData({ refreshing: false })
    })
  },

  // 切换 Tab
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    
    this.setData({ currentTab: tab, messages: [] })
    this.loadMessages()
  },

  // 加载消息列表
  async loadMessages() {
    this.setData({ loading: true })
    
    try {
      const phone = getPhone() || ''
      
      if (!phone) {
        this.setData({ messages: [], loading: false })
        return
      }

      // 查询用户消息
      const result = await dbQuery('messages', {
        phone: phone
      })
      
      let messages = result.data || []
      
      // 处理消息数据
      messages = messages.map((m: Message) => ({
        ...m,
        typeConfig: MESSAGE_TYPES[m.type] || MESSAGE_TYPES.system,
        isUnread: m.status === 'unread'
      }))
      
      // 根据 Tab 过滤
      if (this.data.currentTab !== 'all') {
        messages = messages.filter((m: Message) => m.type === this.data.currentTab)
      }
      
      // 按时间倒序
      messages.sort((a: Message, b: Message) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      // 更新统计
      const allMessages = result.data || []
      const unreadCount = allMessages.filter((m: Message) => m.status === 'unread').length
      
      const tabs = this.data.tabs.map(tab => {
        if (tab.key === 'all') {
          return { ...tab, count: allMessages.length }
        }
        const count = allMessages.filter((m: Message) => m.type === tab.key).length
        return { ...tab, count }
      })
      
      this.setData({
        messages,
        tabs,
        stats: {
          total: allMessages.length,
          unread: unreadCount
        },
        loading: false
      })
      
    } catch (err) {
      logger.error('消息', '加载消息失败', err)
      this.setData({ loading: false })
    }
  },

  // 查看消息详情
  async viewMessage(e: any) {
    const index = e.currentTarget.dataset.index
    const message = this.data.messages[index]
    
    // 标记为已读
    if (message.status === 'unread') {
      await this.markAsRead(message._id)
    }
    
    this.setData({
      selectedMessage: message,
      showDetail: true
    })
  },

  // 标记消息为已读
  async markAsRead(messageId: string) {
    try {
      await callFunction('/db-update', {
        collection: 'messages',
        id: messageId,
        data: {
          status: 'read',
          readAt: new Date().toISOString()
        }
      })
      
      // 更新本地数据
      const messages = this.data.messages.map((m: Message) => {
        if (m._id === messageId) {
          return { ...m, status: 'read', isUnread: false }
        }
        return m
      })
      
      const unreadCount = messages.filter((m: Message) => m.isUnread).length
      
      this.setData({
        messages,
        'stats.unread': unreadCount,
        tabs: this.data.tabs.map(tab => {
          if (tab.key === this.data.currentTab || this.data.currentTab === 'all') {
            return { ...tab, count: tab.key === 'all' ? messages.length : messages.filter((m: Message) => m.type === tab.key).length }
          }
          return tab
        })
      })
    } catch (err) {
      logger.error('消息', '标记已读失败', err)
    }
  },

  // 全部标为已读
  async markAllAsRead() {
    wx.showModal({
      title: '确认操作',
      content: '确定要将所有消息标为已读？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const unreadMessages = this.data.messages.filter((m: Message) => m.status === 'unread')
            
            for (const msg of unreadMessages) {
              await callFunction('/db-update', {
                collection: 'messages',
                id: msg._id,
                data: {
                  status: 'read',
                  readAt: new Date().toISOString()
                }
              })
            }
            
            wx.showToast({ title: '已全部已读', icon: 'success' })
            this.loadMessages()
          } catch (err) {
            wx.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 关闭详情
  closeDetail() {
    this.setData({
      showDetail: false,
      selectedMessage: null
    })
  },

  // 点击链接跳转
  navigateToLink(e: any) {
    const link = e.currentTarget.dataset.link
    if (!link) return
    
    // 根据链接类型跳转
    if (link.startsWith('/pages/')) {
      wx.navigateTo({ url: link })
    } else if (link.startsWith('http')) {
      wx.setStorageSync('webviewUrl', link)
      wx.navigateTo({ url: '/pages/webview/webview?url=' + encodeURIComponent(link) })
    }
  },

  // 格式化时间
  formatTime(dateStr: string): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return formatDate(dateStr, 'MM-DD HH:mm')
    }
  }
})
