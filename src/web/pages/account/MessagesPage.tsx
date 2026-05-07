// ============================================================================
// 消息中心页 - 前台用户
// ============================================================================
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Bell, 
  ChevronRight, 
  Clock, 
  Eye,
  ArrowLeft,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  MessageSquare,
  BellRing,
  Package,
  GraduationCap,
  Award,
  Megaphone,
  Settings
} from 'lucide-react'
// @ts-ignore
import { Button, Loading, Empty } from '@/components'
import { CloudMessageService, Message, MessageType } from '@/services/CloudMessageService'
import { useAuthStore } from '@/store/authStore'

// 消息类型配置
const MESSAGE_TYPES: { key: MessageType | 'all'; label: string; icon: any; color: string }[] = [
  { key: 'all', label: '全部', icon: Bell, color: 'gray' },
  { key: 'system', label: '系统通知', icon: BellRing, color: 'blue' },
  { key: 'audit', label: '审核通知', icon: Check, color: 'green' },
  { key: 'order', label: '订单通知', icon: Package, color: 'amber' },
  { key: 'course', label: '课程通知', icon: GraduationCap, color: 'indigo' },
  { key: 'certificate', label: '证书通知', icon: Award, color: 'rose' },
  { key: 'notice', label: '公告', icon: Megaphone, color: 'purple' },
]

// 格式化时间
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<MessageType | 'all'>('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)
  
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuthStore()
  // 从 user 对象或 localStorage 获取 phone
  const phone = user?.phone || localStorage.getItem('user_phone')

  // 加载消息
  const loadMessages = useCallback(async () => {
    console.log('[Messages] loadMessages 调用, isLoggedIn:', isLoggedIn, 'user:', user, 'phone:', phone)
    
    // 未登录用户：只显示系统公告
    if (!isLoggedIn) {
      console.log('[Messages] 用户未登录，只加载系统公告')
      try {
        setLoading(true)
        const result = await CloudMessageService.getMessages({
          type: selectedType === 'all' ? 'system' : selectedType,
          page: 1,
          pageSize: 50
        })
        console.log('[Messages] 未登录查询结果:', result)
        setMessages(result.data)
        setUnreadCount(0)
      } catch (error) {
        console.error('加载消息失败:', error)
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      setLoading(true)
      
      // 获取用户标识
      const userId = user?.id
      const _openid = user?._openid
      const currentPhone = user?.phone || localStorage.getItem('user_phone')
      console.log('[Messages] 查询参数:', { userId, _openid, phone: currentPhone })
      
      // 查询消息 - 使用重新获取的 phone
      const result = await CloudMessageService.getMessages({
        userId,
        phone: currentPhone,
        _openid,
        type: selectedType === 'all' ? undefined : selectedType,
        page: 1,
        pageSize: 50
      })
      
      console.log('[Messages] 查询结果:', result)
      
      setMessages(result.data)
      
      // 获取未读数
      const unread = await CloudMessageService.getUnreadCount({
        userId,
        phone,
        _openid
      })
      setUnreadCount(unread)
    } catch (error) {
      console.error('加载消息失败:', error)
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn, user, phone, selectedType])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // 查看消息详情
  const viewMessage = async (message: Message) => {
    setSelectedMessage(message)
    setShowDetail(true)
    
    // 如果未读，标记为已读
    if (message.status === 'unread') {
      await CloudMessageService.markAsRead(message.id)
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, status: 'read' as const } : m
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  // 关闭详情
  const closeDetail = () => {
    setShowDetail(false)
    setSelectedMessage(null)
  }

  // 全部标为已读
  const handleMarkAllRead = async () => {
    if (markingRead) return
    try {
      setMarkingRead(true)
      await CloudMessageService.markAllAsRead({
        userId: user?.id,
        phone,
        _openid: user?._openid
      })
      setMessages(prev => prev.map(m => ({ ...m, status: 'read' as const })))
      setUnreadCount(0)
    } catch (error) {
      console.error('标记全部已读失败:', error)
    } finally {
      setMarkingRead(false)
    }
  }

  // 删除消息
  const handleDelete = async (messageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const message = messages.find(m => m.id === messageId)
    if (message?.status === 'unread') {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    
    await CloudMessageService.deleteMessage(messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  // 获取类型配置
  const getTypeConfig = (type: MessageType) => {
    return MESSAGE_TYPES.find(t => t.key === type) || MESSAGE_TYPES[0]
  }

  // 获取未读数统计
  const getUnreadByType = (type: MessageType | 'all') => {
    if (type === 'all') return unreadCount
    return messages.filter(m => m.type === type && m.status === 'unread').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* 头部 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">消息中心</h1>
                  {unreadCount > 0 && (
                    <p className="text-sm text-blue-600">有 {unreadCount} 条未读消息</p>
                  )}
                </div>
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingRead}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {markingRead ? (
                  // @ts-ignore
                  <Loading size="small" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                全部已读
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 消息类型筛选 */}
      <div className="bg-white border-b border-slate-100 sticky top-[72px] z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {MESSAGE_TYPES.map(type => {
              const config = type
              const unread = getUnreadByType(type.key)
              const isActive = selectedType === type.key
              
              return (
                <button
                  key={type.key}
                  onClick={() => setSelectedType(type.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {config.label}
                  {unread > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-white/30 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {!isLoggedIn && selectedType !== 'all' && selectedType !== 'system' ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">请先登录</h3>
            <p className="text-slate-500 mb-4">登录后查看您的消息</p>
            <Button onClick={() => navigate('/login')}>去登录</Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading text="加载消息中..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">暂无消息</h3>
            <p className="text-slate-500">
              {selectedType === 'all' ? '暂无新消息' : `暂无${getTypeConfig(selectedType).label}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(message => {
              const typeConfig = getTypeConfig(message.type)
              const isUnread = message.status === 'unread'
              
              return (
                <div
                  key={message.id}
                  onClick={() => viewMessage(message)}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer group ${
                    isUnread 
                      ? 'border-blue-200 hover:shadow-md hover:border-blue-300' 
                      : 'border-slate-100 hover:shadow-md hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 左侧图标 */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      message.type === 'audit' ? 'bg-green-100 text-green-600' :
                      message.type === 'order' ? 'bg-amber-100 text-amber-600' :
                      message.type === 'course' ? 'bg-indigo-100 text-indigo-600' :
                      message.type === 'certificate' ? 'bg-rose-100 text-rose-600' :
                      message.type === 'notice' ? 'bg-purple-100 text-purple-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {message.type === 'audit' ? <Check className="w-5 h-5" /> :
                       message.type === 'order' ? <Package className="w-5 h-5" /> :
                       message.type === 'course' ? <GraduationCap className="w-5 h-5" /> :
                       message.type === 'certificate' ? <Award className="w-5 h-5" /> :
                       message.type === 'notice' ? <Megaphone className="w-5 h-5" /> :
                       <Bell className="w-5 h-5" />}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          )}
                          <h3 className={`font-semibold ${isUnread ? 'text-slate-800' : 'text-slate-600'} group-hover:text-blue-600 transition-colors`}>
                            {message.title}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          message.type === 'audit' ? 'bg-green-50 text-green-600' :
                          message.type === 'order' ? 'bg-amber-50 text-amber-600' :
                          message.type === 'course' ? 'bg-indigo-50 text-indigo-600' :
                          message.type === 'certificate' ? 'bg-rose-50 text-rose-600' :
                          message.type === 'notice' ? 'bg-purple-50 text-purple-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {typeConfig.label}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {message.link && (
                            <span className="text-xs text-blue-500">查看详情 →</span>
                          )}
                          <button
                            onClick={(e) => handleDelete(message.id, e)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 消息详情弹窗 */}
      {showDetail && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDetail}
          />
          <div className="relative bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl animate-scaleIn">
            {/* 头部 */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  selectedMessage.type === 'audit' ? 'bg-green-100 text-green-700' :
                  selectedMessage.type === 'order' ? 'bg-amber-100 text-amber-700' :
                  selectedMessage.type === 'course' ? 'bg-indigo-100 text-indigo-700' :
                  selectedMessage.type === 'certificate' ? 'bg-rose-100 text-rose-700' :
                  selectedMessage.type === 'notice' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {getTypeConfig(selectedMessage.type).label}
                </span>
                <button 
                  onClick={closeDetail}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                {selectedMessage.title}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedMessage.createdAt)}
                </span>
                {selectedMessage.status === 'read' && selectedMessage.readAt && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    已读
                  </span>
                )}
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="prose prose-slate max-w-none">
                {selectedMessage.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-2">{line}</p>
                ))}
              </div>
            </div>

            {/* 底部操作 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {selectedMessage.link ? (
                <Link to={selectedMessage.link}>
                  <Button className="w-full" variant="primary">
                    {selectedMessage.linkText || '查看详情'}
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={closeDetail}
                  className="w-full"
                  variant="outline"
                >
                  关闭
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
