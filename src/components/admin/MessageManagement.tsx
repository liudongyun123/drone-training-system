// ============================================================================
// 消息管理 - 后台管理
// ============================================================================
import { useState, useEffect, useCallback } from 'react'
import { 
  Bell, 
  Send, 
  Trash2, 
  Eye, 
  Check,
  CheckCheck,
  Search,
  RefreshCw,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Button, Loading, Modal, Input, Select } from '@/components'
import { adminService } from '@/services/adminService'
import { formatDateStr } from '@/utils/dateUtils'

// 消息类型
type MessageType = 'system' | 'notice' | 'audit' | 'order' | 'course' | 'certificate'

// 消息状态
type MessageStatus = 'unread' | 'read'

// 消息接口
interface Message {
  _id: string
  userId?: string
  phone?: string
  _openid?: string
  type: MessageType
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
  status: MessageStatus
  link?: string
  linkText?: string
  relatedId?: string
  relatedType?: string
  isSystem: boolean
  readAt?: string
  createdAt: string
  updatedAt?: string
}

// 消息类型配置
const MESSAGE_TYPES: { key: MessageType; label: string; color: string }[] = [
  { key: 'system', label: '系统通知', color: 'blue' },
  { key: 'notice', label: '公告', color: 'purple' },
  { key: 'audit', label: '审核通知', color: 'green' },
  { key: 'order', label: '订单通知', color: 'amber' },
  { key: 'course', label: '课程通知', color: 'indigo' },
  { key: 'certificate', label: '证书通知', color: 'rose' },
]

// 优先级配置
const PRIORITIES: { key: 'low' | 'medium' | 'high'; label: string; color: string }[] = [
  { key: 'low', label: '普通', color: 'gray' },
  { key: 'medium', label: '重要', color: 'amber' },
  { key: 'high', label: '紧急', color: 'red' },
]

// 类型选项
const typeOptions = [
  { value: 'all', label: '全部类型' },
  ...MESSAGE_TYPES.map(t => ({ value: t.key, label: t.label }))
]

// 消息类型选项
const messageTypeOptions = MESSAGE_TYPES.map(t => ({ value: t.key, label: t.label }))

// 优先级选项
const priorityOptions = PRIORITIES.map(p => ({ value: p.key, label: p.label }))

// 目标类型选项
const targetTypeOptions = [
  { value: 'all', label: '全体用户' },
  { value: 'user', label: '指定用户ID' },
  { value: 'phone', label: '指定手机号' }
]

export default function MessageManagement() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    today: 0
  })

  // 发送表单
  const [sendForm, setSendForm] = useState({
    type: 'system' as MessageType,
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    targetType: 'all' as 'all' | 'user' | 'phone',
    targetValue: '',
    link: '',
    linkText: ''
  })

  // 加载消息列表
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const query: any = {}
      
      if (selectedType !== 'all') {
        query.type = selectedType
      }
      
      const result = await adminService.list('messages', query, {
        limit: 100,
        orderBy: 'createdAt',
        order: 'desc'
      })
      
      let data = result.data || []
      
      // 搜索过滤
      if (searchText) {
        data = data.filter((m: Message) => 
          m.title?.includes(searchText) || 
          m.content?.includes(searchText) ||
          m.phone?.includes(searchText)
        )
      }
      
      setMessages(data)
      
      // 统计数据
      const total = data.length
      const unread = data.filter((m: Message) => m.status === 'unread').length
      const today = data.filter((m: Message) => {
        const today = new Date().toDateString()
        return new Date(m.createdAt).toDateString() === today
      }).length
      
      setStats({ total, unread, today })
    } catch (error) {
      console.error('加载消息列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedType, searchText])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // 发送消息
  const handleSendMessage = async () => {
    if (!sendForm.title.trim()) {
      alert('请输入消息标题')
      return
    }
    if (!sendForm.content.trim()) {
      alert('请输入消息内容')
      return
    }

    try {
      setSending(true)
      
      const now = new Date().toISOString()
      
      // 根据目标类型构建消息
      const messagesToSend: any[] = []
      
      if (sendForm.targetType === 'all') {
        messagesToSend.push({
          type: sendForm.type,
          title: sendForm.title,
          content: sendForm.content,
          priority: sendForm.priority,
          status: 'unread',
          isSystem: true,
          link: sendForm.link || undefined,
          linkText: sendForm.linkText || undefined,
          createdAt: now
        })
      } else if (sendForm.targetType === 'user' && sendForm.targetValue) {
        messagesToSend.push({
          type: sendForm.type,
          title: sendForm.title,
          content: sendForm.content,
          priority: sendForm.priority,
          status: 'unread',
          isSystem: false,
          userId: sendForm.targetValue,
          link: sendForm.link || undefined,
          linkText: sendForm.linkText || undefined,
          createdAt: now
        })
      } else if (sendForm.targetType === 'phone' && sendForm.targetValue) {
        const phones = sendForm.targetValue.split(',').map(p => p.trim()).filter(p => p)
        phones.forEach(phone => {
          messagesToSend.push({
            type: sendForm.type,
            title: sendForm.title,
            content: sendForm.content,
            priority: sendForm.priority,
            status: 'unread',
            isSystem: false,
            phone,
            link: sendForm.link || undefined,
            linkText: sendForm.linkText || undefined,
            createdAt: now
          })
        })
      }
      
      // 批量发送
      for (const msg of messagesToSend) {
        await adminService.add('messages', msg)
      }
      
      alert(`成功发送 ${messagesToSend.length} 条消息`)
      setShowSendModal(false)
      setSendForm({
        type: 'system',
        title: '',
        content: '',
        priority: 'medium',
        targetType: 'all',
        targetValue: '',
        link: '',
        linkText: ''
      })
      loadMessages()
    } catch (error) {
      console.error('发送消息失败:', error)
      alert('发送消息失败')
    } finally {
      setSending(false)
    }
  }

  // 删除消息
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条消息吗？')) return
    try {
      await adminService.delete('messages', id)
      loadMessages()
    } catch (error) {
      console.error('删除消息失败:', error)
    }
  }

  // 标记已读
  const handleMarkRead = async (id: string) => {
    try {
      await adminService.update('messages', id, {
        status: 'read',
        readAt: new Date().toISOString()
      })
      loadMessages()
    } catch (error) {
      console.error('标记已读失败:', error)
    }
  }

  // 全部标记已读
  const handleMarkAllRead = async () => {
    try {
      const unreadMessages = messages.filter(m => m.status === 'unread')
      for (const msg of unreadMessages) {
        await adminService.update('messages', msg._id, {
          status: 'read',
          readAt: new Date().toISOString()
        })
      }
      loadMessages()
    } catch (error) {
      console.error('批量标记已读失败:', error)
    }
  }

  // 查看详情
  const handleViewDetail = (message: Message) => {
    setSelectedMessage(message)
    setShowDetailModal(true)
    
    // 如果未读，自动标记为已读
    if (message.status === 'unread') {
      handleMarkRead(message._id)
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    return formatDateStr(dateStr, { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取类型标签
  const getTypeLabel = (type: MessageType) => {
    const config = MESSAGE_TYPES.find(t => t.key === type)
    return config?.label || type
  }

  // 获取类型颜色
  const getTypeColor = (type: MessageType) => {
    const config = MESSAGE_TYPES.find(t => t.key === type)
    return config?.color || 'gray'
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    const config = PRIORITIES.find(p => p.key === priority)
    return config?.color || 'gray'
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">消息管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统消息和用户通知</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadMessages}
          >
            刷新
          </Button>
          <Button 
            variant="outline"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAllRead}
            disabled={stats.unread === 0}
          >
            全部已读
          </Button>
          <Button 
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            onClick={() => setShowSendModal(true)}
          >
            发送消息
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">消息总数</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">未读消息</p>
              <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日新增</p>
              <p className="text-2xl font-bold text-gray-800">{stats.today}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索消息标题、内容或手机号..."
              prefix={<Search className="w-4 h-4" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Select
            value={selectedType}
            // @ts-ignore
            onChange={(value) => setSelectedType(value)}
            options={typeOptions}
            style={{ width: 150 }}
          />
        </div>
      </div>

      {/* 消息列表 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loading text="加载中..." />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无消息</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">标题</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">优先级</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">发送对象</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map(message => (
                <tr 
                  key={message._id} 
                  className={`hover:bg-gray-50 cursor-pointer ${message.status === 'unread' ? 'bg-blue-50/50' : ''}`}
                  onClick={() => handleViewDetail(message)}
                >
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      getTypeColor(message.type) === 'blue' ? 'bg-blue-100 text-blue-700' :
                      getTypeColor(message.type) === 'green' ? 'bg-green-100 text-green-700' :
                      getTypeColor(message.type) === 'amber' ? 'bg-amber-100 text-amber-700' :
                      getTypeColor(message.type) === 'purple' ? 'bg-purple-100 text-purple-700' :
                      getTypeColor(message.type) === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                      getTypeColor(message.type) === 'rose' ? 'bg-rose-100 text-rose-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getTypeLabel(message.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {message.status === 'unread' && (
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                      <span className="font-medium text-gray-800">{message.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      getPriorityColor(message.priority) === 'red' ? 'bg-red-100 text-red-700' :
                      getPriorityColor(message.priority) === 'amber' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {message.priority === 'high' ? '紧急' : message.priority === 'medium' ? '重要' : '普通'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {message.status === 'read' ? (
                      <span className="text-green-600 text-sm">已读</span>
                    ) : (
                      <span className="text-red-600 text-sm">未读</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {message.isSystem ? (
                      <span className="text-purple-600">全体用户</span>
                    ) : message.phone ? (
                      message.phone
                    ) : message.userId ? (
                      <span>用户: {message.userId.slice(0, 8)}...</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatTime(message.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        // @ts-ignore
                        size="small" 
                        variant="ghost"
                        icon={<Eye className="w-4 h-4" />}
                        onClick={() => handleViewDetail(message)}
                      >
                        查看
                      </Button>
                      {message.status === 'unread' && (
                        <Button 
                          // @ts-ignore
                          size="small" 
                          variant="ghost"
                          icon={<Check className="w-4 h-4" />}
                          onClick={() => handleMarkRead(message._id)}
                        >
                          已读
                        </Button>
                      )}
                      <Button 
                        // @ts-ignore
                        size="small" 
                        variant="ghost"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => handleDelete(message._id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 发送消息弹窗 */}
      {showSendModal && (
        <Modal
          title="发送消息"
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消息类型</label>
              <select
                className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                value={sendForm.type}
                onChange={(e) => setSendForm({ ...sendForm, type: e.target.value as MessageType })}
              >
                {messageTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消息标题</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                placeholder="请输入消息标题"
                value={sendForm.title}
                onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">消息内容</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="请输入消息内容"
                value={sendForm.content}
                onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select
                className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                value={sendForm.priority}
                onChange={(e) => setSendForm({ ...sendForm, priority: e.target.value as any })}
              >
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发送对象</label>
              <select
                className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                value={sendForm.targetType}
                onChange={(e) => setSendForm({ ...sendForm, targetType: e.target.value as any, targetValue: '' })}
              >
                {targetTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {sendForm.targetType !== 'all' && (
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                  placeholder={sendForm.targetType === 'user' ? '请输入用户ID' : '请输入手机号，多个用逗号分隔'}
                  value={sendForm.targetValue}
                  onChange={(e) => setSendForm({ ...sendForm, targetValue: e.target.value })}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">跳转链接（可选）</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                placeholder="如: /my-orders"
                value={sendForm.link}
                onChange={(e) => setSendForm({ ...sendForm, link: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">链接文本（可选）</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2.5 px-3"
                placeholder="如: 查看订单详情"
                value={sendForm.linkText}
                onChange={(e) => setSendForm({ ...sendForm, linkText: e.target.value })}
              />
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowSendModal(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleSendMessage}
                disabled={sending}
              >
                {sending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 消息详情弹窗 */}
      {showDetailModal && selectedMessage && (
        <Modal
          title="消息详情"
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-sm rounded-full ${
                getTypeColor(selectedMessage.type) === 'blue' ? 'bg-blue-100 text-blue-700' :
                getTypeColor(selectedMessage.type) === 'green' ? 'bg-green-100 text-green-700' :
                getTypeColor(selectedMessage.type) === 'amber' ? 'bg-amber-100 text-amber-700' :
                getTypeColor(selectedMessage.type) === 'purple' ? 'bg-purple-100 text-purple-700' :
                getTypeColor(selectedMessage.type) === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                getTypeColor(selectedMessage.type) === 'rose' ? 'bg-rose-100 text-rose-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {getTypeLabel(selectedMessage.type)}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${
                getPriorityColor(selectedMessage.priority) === 'red' ? 'bg-red-100 text-red-700' :
                getPriorityColor(selectedMessage.priority) === 'amber' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {selectedMessage.priority === 'high' ? '紧急' : selectedMessage.priority === 'medium' ? '重要' : '普通'}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800">{selectedMessage.title}</h3>
            </div>

            <div className="text-sm text-gray-500">
              <p>发送时间: {formatTime(selectedMessage.createdAt)}</p>
              {selectedMessage.readAt && (
                <p>阅读时间: {formatTime(selectedMessage.readAt)}</p>
              )}
              <p>发送对象: {
                selectedMessage.isSystem ? '全体用户' : 
                selectedMessage.phone ? selectedMessage.phone :
                selectedMessage.userId ? `用户: ${selectedMessage.userId}` : '-'
              }</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
            </div>

            {selectedMessage.link && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">
                  跳转链接: <span className="text-blue-600">{selectedMessage.linkText || selectedMessage.link}</span>
                </p>
              </div>
            )}

            {/* 底部按钮 */}
            <div className="flex justify-end pt-4 border-t">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowDetailModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
