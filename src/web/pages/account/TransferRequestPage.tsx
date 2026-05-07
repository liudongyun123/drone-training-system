import { useState, useEffect } from 'react'
import {
  ArrowLeft, Calendar, Clock, MapPin, User, Book, FileText,
  CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw,
  Plus, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { transferService, TransferRequest, TransferStats } from '@/services/transferService'
import { useAuthStore } from '@/store/authStore'
import { app } from '@/utils/cloudbase'

// 辅助函数：格式化日期
const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}

// 调课类型配置
const TRANSFER_TYPES = {
  time: { label: '时间调整', color: 'text-blue-600', bg: 'bg-blue-50' },
  teacher: { label: '更换老师', color: 'text-purple-600', bg: 'bg-purple-50' },
  location: { label: '更换场地', color: 'text-green-600', bg: 'bg-green-50' },
  course: { label: '更换课程', color: 'text-orange-600', bg: 'bg-orange-50' },
  leave: { label: '请假补课', color: 'text-gray-600', bg: 'bg-gray-50' }
}

// 状态配置
const STATUS_CONFIG = {
  pending: { label: '待审核', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertCircle },
  approved: { label: '已通过', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-50', icon: XCircle }
}

export default function TransferRequestPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // ★ 从 localStorage 获取手机号（兼容管理员登录）
  const userPhone = user?.phone || localStorage.getItem('user_phone') || ''

  // 状态
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<TransferRequest[]>([])
  const [stats, setStats] = useState<TransferStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  // 筛选
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // 详情弹窗
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // 加载数据
  const loadRequests = async () => {
    if (!user?.id && !user?._openid && !userPhone) {
      console.log('未登录或无学员信息')
      return
    }

    setLoading(true)
    try {
      const result = await transferService.listMyRequests({
        studentId: user?.id || user?._openid,
        phone: userPhone,
        status: statusFilter as any,
        transferType: typeFilter as any,
        page,
        pageSize
      })

      if (result.code === 0) {
        const data = result.data as any
        setRequests(data?.list || data || [])
        setTotal(data?.total || 0)
        setTotalPages(data?.totalPages || 1)
      }
    } catch (error) {
      console.error('加载调课记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载统计
  const loadStats = async () => {
    try {
      const result = await transferService.getStats()
      if (result.code === 0 && result.data) {
        setStats(result.data as TransferStats)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'list') {
      loadRequests()
      loadStats()
    }
  }, [activeTab, page, statusFilter, typeFilter, user])

  // 取消申请
  const handleCancel = async (requestId: string) => {
    if (!confirm('确定要取消这个调课申请吗？')) return

    try {
      const result = await transferService.cancelRequest(
        requestId,
        user?.id || user?._openid || ''
      )
      if (result.code === 0) {
        alert('申请已取消')
        loadRequests()
        loadStats()
      } else {
        alert(result.message || '取消失败')
      }
    } catch (error: any) {
      alert(error.message || '取消失败')
    }
  }

  // 查看详情
  const handleViewDetail = async (request: TransferRequest) => {
    try {
      const result = await transferService.getRequestDetail(request._id || request.id || '')
      if (result.code === 0 && result.data) {
        setSelectedRequest(result.data as TransferRequest)
        setShowDetail(true)
      }
    } catch (error) {
      console.error('加载详情失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold">调课申请</h1>
          </div>
          <button
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
            新申请
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            我的申请
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            新建申请
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {activeTab === 'list' ? (
          <>
            {/* 统计卡片 */}
            {stats && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard
                  label="待审核"
                  value={stats.pending}
                  color="yellow"
                />
                <StatCard
                  label="已通过"
                  value={stats.approved}
                  color="green"
                />
                <StatCard
                  label="已拒绝"
                  value={stats.rejected}
                  color="red"
                />
                <StatCard
                  label="通过率"
                  value={`${stats.approvalRate}%`}
                  color="blue"
                />
              </div>
            )}

            {/* 筛选 */}
            <div className="flex gap-2 mb-4">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部状态</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
                <option value="cancelled">已取消</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部类型</option>
                <option value="time">时间调整</option>
                <option value="teacher">更换老师</option>
                <option value="location">更换场地</option>
                <option value="course">更换课程</option>
                <option value="leave">请假补课</option>
              </select>
              <button
                onClick={() => loadRequests()}
                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* 列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">暂无调课记录</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                >
                  立即申请
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const typeConfig = TRANSFER_TYPES[request.transferType as keyof typeof TRANSFER_TYPES] || TRANSFER_TYPES.time
                  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={request._id || request.id}
                      className="bg-white rounded-xl shadow-sm p-4"
                    >
                      {/* 头部 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                            <span className="flex items-center gap-1">
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>

                      {/* 原排课信息 */}
                      <div className="mb-3 p-3 bg-red-50 rounded-lg">
                        <div className="text-xs text-red-500 mb-1">原排课</div>
                        <div className="text-sm font-medium text-gray-800">
                          {request.originalCourseName || '未知课程'}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {request.originalDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {request.originalTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {request.originalTeacher || '待分配'}
                          </span>
                        </div>
                      </div>

                      {/* 目标排课信息 */}
                      {request.targetScheduleId && (
                        <div className="mb-3 p-3 bg-green-50 rounded-lg">
                          <div className="text-xs text-green-500 mb-1">目标排课</div>
                          <div className="text-sm font-medium text-gray-800">
                            {request.targetCourseName || '待选择'}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            {request.targetDate && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {request.targetDate}
                              </span>
                            )}
                            {request.targetTime && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {request.targetTime}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 调课原因 */}
                      <div className="text-sm text-gray-600 mb-3">
                        <span className="text-gray-400">原因：</span>
                        {request.reason}
                      </div>

                      {/* 管理员回复 */}
                      {request.adminReply && (
                        <div className="p-3 bg-gray-50 rounded-lg mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            管理员回复 {request.adminName && `by ${request.adminName}`}
                          </div>
                          <div className="text-sm text-gray-700">{request.adminReply}</div>
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(request)}
                          className="flex-1 py-2 text-sm text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-50"
                        >
                          查看详情
                        </button>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(request._id || request.id || '')}
                            className="flex-1 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                          >
                            取消申请
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span className="text-sm text-gray-500">
                      第 {page} / {totalPages} 页
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <TransferRequestForm
            onSuccess={() => {
              setActiveTab('list')
              loadRequests()
              loadStats()
            }}
            onCancel={() => setActiveTab('list')}
            user={user}
          />
        )}
      </div>

      {/* 详情弹窗 */}
      {showDetail && selectedRequest && (
        <DetailModal
          request={selectedRequest}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}

// ============================================================================
// 子组件
// ============================================================================

interface StatCardProps {
  label: string
  value: number | string
  color: 'yellow' | 'green' | 'red' | 'blue'
}

function StatCard({ label, value, color }: StatCardProps) {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600'
  }

  return (
    <div className={`p-3 rounded-xl text-center ${colors[color]}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  )
}

// ============================================================================
// 详情弹窗
// ============================================================================

interface DetailModalProps {
  request: TransferRequest
  onClose: () => void
}

function DetailModal({ request, onClose }: DetailModalProps) {
  const typeConfig = TRANSFER_TYPES[request.transferType as keyof typeof TRANSFER_TYPES] || TRANSFER_TYPES.time
  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">调课详情</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 状态标签 */}
          <div className="flex gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.bg} ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* 原排课 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">原排课信息</h3>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="font-medium text-gray-800 mb-2">
                {request.originalCourseName || '未知课程'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  {request.originalDate}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  {request.originalTime}
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  {request.originalTeacher || '待分配'}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  {request.originalLocation || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* 目标排课 */}
          {request.targetScheduleId && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">目标排课</h3>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="font-medium text-gray-800 mb-2">
                  {request.targetCourseName || '待选择'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {request.targetDate && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      {request.targetDate}
                    </div>
                  )}
                  {request.targetTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      {request.targetTime}
                    </div>
                  )}
                  {request.targetTeacher && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      {request.targetTeacher}
                    </div>
                  )}
                  {request.targetLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      {request.targetLocation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 调课原因 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">调课原因</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
              {request.reason}
            </div>
          </div>

          {/* 备注 */}
          {request.remark && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">备注</h3>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                {request.remark}
              </div>
            </div>
          )}

          {/* 审核信息 */}
          {request.reviewedAt && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">审核结果</h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className={statusConfig.color}>
                    {statusConfig.label}
                  </span>
                  <span className="text-gray-400">
                    {request.adminName || '管理员'}
                  </span>
                </div>
                {request.adminReply && (
                  <div className="mt-2 text-sm text-gray-700">
                    {request.adminReply}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 时间线 */}
          <div className="text-xs text-gray-400 space-y-1">
            <div>申请时间：{formatDate(request.createdAt)}</div>
            {request.updatedAt !== request.createdAt && (
              <div>更新时间：{formatDate(request.updatedAt)}</div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 新建申请表单
// ============================================================================

interface TransferRequestFormProps {
  onSuccess: () => void
  onCancel: () => void
  user: any
}

function TransferRequestForm({ onSuccess, onCancel, user }: TransferRequestFormProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  // 步骤1：原排课选择
  const [mySchedules, setMySchedules] = useState<any[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  // 步骤2：调课类型和目标
  const [transferType, setTransferType] = useState<string>('time')
  const [reason, setReason] = useState('')
  const [remark, setRemark] = useState('')

  // 步骤3：选择目标排课
  const [targetSchedules, setTargetSchedules] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any>(null)
  const [loadingTargets, setLoadingTargets] = useState(false)

  // 加载我的排课
  useEffect(() => {
    loadMySchedules()
  }, [])

  const loadMySchedules = async () => {
    setLoadingSchedules(true)
    try {
      const db = app.database()
      if (!db) {
        console.error('数据库未初始化')
        setMySchedules([])
        return
      }

      // 获取用户身份信息（支持多种字段）
      const userPhone = user?.phone || localStorage.getItem('user_phone') || ''
      const userId = user?.uid || user?.studentId || user?._openid || ''

      console.log('[调课] 加载可调课排课, userPhone:', userPhone, 'userId:', userId)

      // 构建多条件查询，支持手机号、studentId、userId 匹配
      let members: any[] = []

      // 方式A：按手机号查询
      if (userPhone) {
        const result1 = await db.collection('class_members')
          .where(db.command.or([
            { phone: userPhone },
            { studentId: `phone_${userPhone}` }
          ]))
          .get()
        members = result1.data || []
        console.log('[调课] 手机号匹配成员记录:', members.length, '条')
      }

      // 方式B：如果手机号没查到，尝试按 userId/studentId 查询
      if (members.length === 0 && userId) {
        const result2 = await db.collection('class_members')
          .where(db.command.or([
            { studentId: userId },
            { memberId: userId },
            { userId: userId }
          ]))
          .get()
        members = result2.data || []
        console.log('[调课] ID匹配成员记录:', members.length, '条')
      }

      // 方式C：从 registrations 获取班级ID（兜底方案）
      if (members.length === 0 && (userPhone || userId)) {
        try {
          const regQuery: any = {}
          if (userPhone) {
            regQuery.$or = [{ userPhone }, { phone: userPhone }]
          }
          if (userId) {
            regQuery.$or = regQuery.$or || []
            regQuery.$or.push({ userId })
          }
          const regResult = await db.collection('registrations').where(regQuery).limit(20).get()
          const regs = regResult.data || []
          if (regs.length > 0) {
            // 用 registrations 的 classId 直接构建虚拟成员
            members = regs.map((r: any) => ({
              classId: r.classId,
              source: 'registration',
              studentName: r.studentName || r.name || ''
            }))
            console.log('[调课] 从 registrations 找到班级:', members.length, '个')
          }
        } catch (e) {
          console.log('[调课] 查询 registrations 失败:', e)
        }
      }

      console.log('[调课] 最终成员记录:', members.length, '条')

      if (members.length === 0) {
        setMySchedules([])
        return
      }
      
      // 2. 获取班级 ID 列表
      const classIds = members.map((m: any) => m.classId).filter(Boolean)
      
      if (classIds.length === 0) {
        setMySchedules([])
        return
      }
      
      // 3. 查询 classes 获取班级信息
      const classesResult = await db.collection('classes')
        .where(db.command.or(classIds.map(id => ({ _id: id }))))
        .get()
      
      const classes = classesResult.data || []
      console.log('对应的班级:', classes)
      
      if (classes.length === 0) {
        setMySchedules([])
        return
      }
      
      // 4. 查询 class_schedules 获取排课（只查询未开始的）
      const today = new Date().toISOString().split('T')[0]
      const schedulesResult = await db.collection('class_schedules')
        .where(
          db.command.and([
            { classId: db.command.in(classIds) },
            { date: db.command.gte(today) }
          ])
        )
        .orderBy('date', 'asc')
        .orderBy('startTime', 'asc')
        .limit(50)
        .get()
      
      // 5. 补充班级名称
      const schedules = (schedulesResult.data || []).map((s: any) => {
        const classInfo = classes.find((c: any) => c._id === s.classId)
        return {
          ...s,
          courseName: classInfo?.name || classInfo?.courseName || s.title || '未知班级',
          className: classInfo?.name || ''
        }
      })
      
      console.log('可调课排课列表:', schedules)
      setMySchedules(schedules)
    } catch (error) {
      console.error('加载排课失败:', error)
      setMySchedules([])
    } finally {
      setLoadingSchedules(false)
    }
  }

  // 步骤1完成，加载可选目标
  const handleSelectOriginal = (schedule: any) => {
    setSelectedSchedule(schedule)
    setStep(2)
    loadAvailableTargets(schedule)
  }

  // 加载可选目标排课
  const loadAvailableTargets = async (schedule: any) => {
    setLoadingTargets(true)
    try {
      const result = await transferService.getAvailableSchedules({
        excludeScheduleId: schedule._id || schedule.id
      })
      if (result.code === 0) {
        // @ts-ignore
        setTargetSchedules(result.data || [])
      }
    } catch (error) {
      console.error('加载可选排课失败:', error)
    } finally {
      setLoadingTargets(false)
    }
  }

  // 提交申请
  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      alert('请填写调课原因（至少5个字）')
      return
    }

    setLoading(true)
    try {
      const studentId = user?.studentId || user?._openid || ''

      const result = await transferService.createRequest({
        studentId,
        studentName: user?.name || user?.nickName || '',
        studentPhone: user?.phone || '',
        originalScheduleId: selectedSchedule._id || selectedSchedule.id,
        originalCourseId: selectedSchedule.courseId,
        originalCourseName: selectedSchedule.courseName || selectedSchedule.courseTitle,
        originalDate: selectedSchedule.date,
        originalTime: selectedSchedule.startTime,
        originalTeacher: selectedSchedule.teacherName,
        originalTeacherId: selectedSchedule.teacherId,
        originalLocation: selectedSchedule.location,
        targetScheduleId: selectedTarget?._id || selectedTarget?.id,
        targetCourseId: selectedTarget?.courseId,
        targetCourseName: selectedTarget?.courseName || selectedTarget?.courseTitle,
        targetDate: selectedTarget?.date,
        targetTime: selectedTarget?.startTime,
        targetTeacher: selectedTarget?.teacherName,
        targetTeacherId: selectedTarget?.teacherId,
        targetLocation: selectedTarget?.location,
        transferType: transferType as any,
        reason: reason.trim(),
        remark: remark.trim()
      })

      if (result.code === 0) {
        alert('调课申请提交成功！')
        onSuccess()
      } else {
        alert(result.message || '提交失败')
      }
    } catch (error: any) {
      alert(error.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 步骤指示器 */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <CheckCircle size={16} /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 px-4">
        <span>选择原课程</span>
        <span>填写原因</span>
        <span>选择目标</span>
      </div>

      {/* 步骤1：选择原排课 */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            请选择您要调课的排课
          </h3>
          
          {loadingSchedules ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
              <p className="text-gray-500 text-sm">加载中...</p>
            </div>
          ) : mySchedules.length === 0 ? (
            <div className="text-center py-8">
              <Book className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-gray-600 font-medium mb-2">暂无可调课的排课记录</p>
              <p className="text-gray-400 text-sm mb-4">
                您还没有加入任何班级，或班级的排课已结束
              </p>
              <div className="space-y-2">
                <button
                  onClick={loadMySchedules}
                  className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                >
                  重新加载
                </button>
                <p className="text-xs text-gray-400">
                  如需报名课程，请联系管理员
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mySchedules.map((schedule) => (
                <button
                  key={schedule._id || schedule.id}
                  onClick={() => handleSelectOriginal(schedule)}
                  className="w-full p-4 bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-xl text-left transition-all"
                >
                  <div className="font-medium text-gray-800">
                    {schedule.courseName || schedule.courseTitle || '未知课程'}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {schedule.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {schedule.teacherName || '待分配'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {schedule.location || '-'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 步骤2：填写原因 */}
      {step === 2 && (
        <div className="bg-white rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            已选课程：{selectedSchedule?.courseName || selectedSchedule?.courseTitle}
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              调课类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TRANSFER_TYPES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setTransferType(key)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    transferType === key
                      ? `${config.bg} ${config.color} border-2 border-current`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              调课原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明调课原因（至少5个字）..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={4}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注（选填）
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="其他补充说明..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={2}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
            >
              上一步
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={reason.trim().length < 5}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {/* 步骤3：选择目标排课 */}
      {step === 3 && (
        <div className="bg-white rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            请选择目标排课（可选）
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            如果您已经有想要调到的具体时间/班级，请选择；如暂不确定，可留空让管理员帮您安排。
          </p>

          {loadingTargets ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelectedTarget(null)}
                className={`w-full p-4 rounded-xl text-sm font-medium mb-3 transition-all ${
                  !selectedTarget
                    ? 'bg-blue-50 border-2 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                暂不指定，由管理员安排
              </button>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {targetSchedules.map((schedule) => (
                  <button
                    key={schedule._id || schedule.id}
                    onClick={() => setSelectedTarget(schedule)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedTarget?._id === schedule._id || selectedTarget?.id === schedule.id
                        ? 'bg-blue-50 border-2 border-blue-300'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium text-gray-800">
                      {schedule.courseName || schedule.courseTitle}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {schedule.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {schedule.startTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {schedule.teacherName || '待分配'}
                      </span>
                      <span className="text-green-600">
                        剩余 {schedule.maxStudents - (schedule.enrolled || 0)} 名额
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
            >
              上一步
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  提交中...
                </>
              ) : (
                '提交申请'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 取消按钮 */}
      <button
        onClick={onCancel}
        className="w-full py-3 text-gray-500 text-sm"
      >
        取消
      </button>
    </div>
  )
}
