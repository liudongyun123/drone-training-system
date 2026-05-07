/**
 * 管理后台 - 调课审核管理页面
 * 版本: v20260406-production
 * 功能:
 * - 查看所有调课申请
 * - 审核（通过/拒绝）申请
 * - 批量操作
 * - 统计数据
 */
import { useState, useEffect } from 'react'
import { useConfirm } from '@/admin/hooks/useConfirm'
import {
  Search, Filter, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Clock, Calendar, User, Book, MapPin, FileText, Loader2,
  ChevronDown, ChevronUp, Eye, Check, X, ArrowRight,
  BarChart3, Download, Bell
} from 'lucide-react'
import { transferService, TransferRequest, TransferStats } from '@/services/transferService'
import { formatDateStr } from '@/utils/dateUtils'

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

export default function AdminTransfers() {
  const { confirm, ConfirmDialog } = useConfirm()
  // 状态
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<TransferRequest[]>([])
  const [stats, setStats] = useState<TransferStats | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(15)
  const [totalPages, setTotalPages] = useState(1)

  // 筛选
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [keyword, setKeyword] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 多选
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // 详情弹窗
  const [detailModal, setDetailModal] = useState<{
    show: boolean
    request: TransferRequest | null
    loading: boolean
  }>({ show: false, request: null, loading: false })

  // 审核弹窗
  const [auditModal, setAuditModal] = useState<{
    show: boolean
    type: 'approve' | 'reject'
    request: TransferRequest | null
    reply: string
    loading: boolean
  }>({ show: false, type: 'approve', request: null, reply: '', loading: false })

  // 批量审核弹窗
  const [batchModal, setBatchModal] = useState<{
    show: boolean
    type: 'approve' | 'reject'
    reply: string
    loading: boolean
  }>({ show: false, type: 'approve', reply: '', loading: false })

  // 加载数据
  const loadRequests = async () => {
    setLoading(true)
    try {
      const result = await transferService.listAllRequests({
        // @ts-ignore
        status: statusFilter,
        // @ts-ignore
        transferType: typeFilter,
        keyword: keyword || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize
      })

      if (result.code === 0) {
        // @ts-ignore
        setRequests(result.data?.data || result.data || [])
        // @ts-ignore
        setTotal(result.data?.total || 0)
        // @ts-ignore
        setTotalPages(result.data?.totalPages || 1)
        
        // 更新统计
        // @ts-ignore
        if (result.data?.stats) {
          // @ts-ignore
          setStats(result.data.stats as TransferStats)
        }
      }
    } catch (error) {
      console.error('加载调课申请失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载统计
  const loadStats = async () => {
    try {
      const result = await transferService.getStats()
      if (result.code === 0) {
        // @ts-ignore
        setStats(result.data)
      }
    } catch (error) {
      console.error('加载统计失败:', error)
    }
  }

  useEffect(() => {
    loadRequests()
    loadStats()
  }, [statusFilter, typeFilter, page])

  // 搜索
  const handleSearch = () => {
    setPage(1)
    loadRequests()
  }

  // 重置筛选
  const handleReset = () => {
    setStatusFilter('pending')
    setTypeFilter('all')
    setKeyword('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(requests.filter(r => r.status === 'pending').map(r => r._id || r.id || ''))
    }
    setSelectAll(!selectAll)
  }

  // 单选/取消单选
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // 查看详情
  const handleViewDetail = async (request: TransferRequest) => {
    setDetailModal({ show: true, request: null, loading: true })
    try {
      const result = await transferService.getRequestDetail(request._id || request.id || '')
      if (result.code === 0) {
        // @ts-ignore
        setDetailModal({ show: true, request: result.data, loading: false })
      }
    } catch (error) {
      console.error('加载详情失败:', error)
      setDetailModal({ show: true, request, loading: false })
    }
  }

  // 打开审核弹窗
  const handleOpenAudit = (type: 'approve' | 'reject', request: TransferRequest) => {
    setAuditModal({
      show: true,
      type,
      request,
      reply: type === 'approve' ? '您的调课申请已通过。' : '',
      loading: false
    })
  }

  // 执行审核
  const handleAudit = async () => {
    if (!auditModal.request) return
    
    const requestId = auditModal.request._id || auditModal.request.id || ''
    
    if (auditModal.type === 'reject' && (!auditModal.reply.trim() || auditModal.reply.trim().length < 2)) {
      await confirm({ title: '提示', message: '请填写拒绝原因', variant: 'info' })
      return
    }

    setAuditModal({ ...auditModal, loading: true })
    try {
      let result
      if (auditModal.type === 'approve') {
        result = await transferService.approveRequest(requestId, {
          adminName: '管理员',
          adminReply: auditModal.reply
        })
      } else {
        result = await transferService.rejectRequest(requestId, {
          adminName: '管理员',
          adminReply: auditModal.reply
        })
      }

      if (result.code === 0) {
        await confirm({ title: '提示', message: auditModal.type === 'approve' ? '已通过申请' : '已拒绝申请', variant: 'info' })
        setAuditModal({ show: false, type: 'approve', request: null, reply: '', loading: false })
        loadRequests()
        loadStats()
      } else {
        await confirm({ title: '提示', message: result.message || '操作失败', variant: 'info' })
      }
    } catch (error: any) {
      await confirm({ title: '提示', message: error.message || '操作失败', variant: 'info' })
    } finally {
      setAuditModal({ ...auditModal, loading: false })
    }
  }

  // 批量审核
  const handleBatchAudit = async () => {
    if (selectedIds.length === 0) {
      await confirm({ title: '提示', message: '请选择要审核的申请', variant: 'info' })
      return
    }

    if (batchModal.type === 'reject' && (!batchModal.reply.trim() || batchModal.reply.trim().length < 2)) {
      await confirm({ title: '提示', message: '批量拒绝需要填写原因', variant: 'info' })
      return
    }

    setBatchModal({ ...batchModal, loading: true })
    try {
      let result
      if (batchModal.type === 'approve') {
        result = await transferService.batchApprove(selectedIds, {
          adminName: '管理员',
          adminReply: batchModal.reply
        })
      } else {
        result = await transferService.batchReject(selectedIds, {
          adminName: '管理员',
          adminReply: batchModal.reply
        })
      }

      if (result.code === 0) {
        await confirm({ title: '提示', message: `批量操作完成：成功 ${result.data?.successCount || 0}，失败 ${result.data?.failCount || 0}`, variant: 'info' })
        setBatchModal({ show: false, type: 'approve', reply: '', loading: false })
        setSelectedIds([])
        setSelectAll(false)
        loadRequests()
        loadStats()
      } else {
        await confirm({ title: '提示', message: result.message || '操作失败', variant: 'info' })
      }
    } catch (error: any) {
      await confirm({ title: '提示', message: error.message || '操作失败', variant: 'info' })
    } finally {
      setBatchModal({ ...batchModal, loading: false })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">调课审核</h1>
              <p className="text-sm text-gray-500 mt-1">管理学员调课申请</p>
            </div>
            <button
              onClick={() => loadRequests()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <StatCard
              label="待审核"
              value={stats.pending}
              color="yellow"
              icon={AlertCircle}
            />
            <StatCard
              label="已通过"
              value={stats.approved}
              color="green"
              icon={CheckCircle}
            />
            <StatCard
              label="已拒绝"
              value={stats.rejected}
              color="red"
              icon={XCircle}
            />
            <StatCard
              label="今日申请"
              value={stats.today}
              color="blue"
              icon={Clock}
            />
            <StatCard
              label="通过率"
              value={`${stats.approvalRate}%`}
              color="purple"
              icon={BarChart3}
            />
          </div>
        )}

        {/* 筛选工具栏 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 状态筛选 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">状态：</span>
              <div className="flex rounded-lg overflow-hidden border">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'pending', label: '待审核' },
                  { value: 'approved', label: '已通过' },
                  { value: 'rejected', label: '已拒绝' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                    className={`px-3 py-1.5 text-sm ${
                      statusFilter === opt.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 类型筛选 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">类型：</span>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="all">全部类型</option>
                <option value="time">时间调整</option>
                <option value="teacher">更换老师</option>
                <option value="location">更换场地</option>
                <option value="course">更换课程</option>
                <option value="leave">请假补课</option>
              </select>
            </div>

            {/* 关键词搜索 */}
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索学员姓名/电话/课程..."
                  className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* 重置 */}
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              重置
            </button>
          </div>

          {/* 日期筛选 */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">日期：</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
            <span className="text-gray-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              搜索
            </button>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 <strong>{selectedIds.length}</strong> 条申请
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setBatchModal({ show: true, type: 'approve', reply: '', loading: false })}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-green-600"
              >
                <Check size={16} />
                批量通过
              </button>
              <button
                onClick={() => setBatchModal({ show: true, type: 'reject', reply: '', loading: false })}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-red-600"
              >
                <X size={16} />
                批量拒绝
              </button>
              <button
                onClick={() => { setSelectedIds([]); setSelectAll(false) }}
                className="px-4 py-2 bg-white text-gray-600 rounded-lg text-sm hover:bg-gray-100"
              >
                取消选择
              </button>
            </div>
          </div>
        )}

        {/* 数据表格 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll && requests.filter(r => r.status === 'pending').length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                    disabled={requests.filter(r => r.status === 'pending').length === 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学员信息</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">调课类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">原排课</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目标排课</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto animate-spin text-blue-500" size={32} />
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <FileText className="mx-auto mb-2 text-gray-300" size={32} />
                    <p>暂无调课申请</p>
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const typeConfig = TRANSFER_TYPES[request.transferType as keyof typeof TRANSFER_TYPES] || TRANSFER_TYPES.time
                  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr key={request._id || request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(request._id || request.id || '')}
                          onChange={() => handleSelect(request._id || request.id || '')}
                          className="rounded border-gray-300"
                          disabled={request.status !== 'pending'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{request.studentName || '未知学员'}</div>
                        <div className="text-xs text-gray-500">{request.studentPhone || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-800">{request.originalCourseName}</div>
                        <div className="text-xs text-gray-500">
                          {request.originalDate} {request.originalTime}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {request.targetScheduleId ? (
                          <>
                            <div className="text-sm text-gray-800">{request.targetCourseName || '-'}</div>
                            <div className="text-xs text-gray-500">
                              {request.targetDate || '-'} {request.targetTime || '-'}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">未指定</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          <span className="flex items-center gap-1">
                            <StatusIcon size={12} />
                            {statusConfig.label}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateStr(request.createdAt, {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(request)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-500"
                            title="查看详情"
                          >
                            <Eye size={16} />
                          </button>
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleOpenAudit('approve', request)}
                                className="p-1.5 hover:bg-green-50 rounded text-gray-500 hover:text-green-500"
                                title="通过"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleOpenAudit('reject', request)}
                                className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-500"
                                title="拒绝"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                共 {total} 条，第 {page} / {totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white border rounded-lg text-sm disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-white border rounded-lg text-sm disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 详情弹窗 */}
      {detailModal.show && detailModal.request && (
        <DetailModal
          request={detailModal.request}
          loading={detailModal.loading}
          onClose={() => setDetailModal({ show: false, request: null, loading: false })}
          onApprove={() => {
            setDetailModal({ show: false, request: null, loading: false })
            handleOpenAudit('approve', detailModal.request!)
          }}
          onReject={() => {
            setDetailModal({ show: false, request: null, loading: false })
            handleOpenAudit('reject', detailModal.request!)
          }}
        />
      )}

      {/* 单个审核弹窗 */}
      {auditModal.show && auditModal.request && (
        <AuditModal
          type={auditModal.type}
          request={auditModal.request}
          reply={auditModal.reply}
          setReply={(reply) => setAuditModal({ ...auditModal, reply })}
          loading={auditModal.loading}
          onClose={() => setAuditModal({ show: false, type: 'approve', request: null, reply: '', loading: false })}
          onSubmit={handleAudit}
        />
      )}

      <ConfirmDialog />

      {/* 批量审核弹窗 */}
      {batchModal.show && (
        <BatchAuditModal
          type={batchModal.type}
          count={selectedIds.length}
          reply={batchModal.reply}
          setReply={(reply) => setBatchModal({ ...batchModal, reply })}
          loading={batchModal.loading}
          onClose={() => setBatchModal({ show: false, type: 'approve', reply: '', loading: false })}
          onSubmit={handleBatchAudit}
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
  color: 'yellow' | 'green' | 'red' | 'blue' | 'purple'
  icon: any
}

function StatCard({ label, value, color, icon: Icon }: StatCardProps) {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100'
  }

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} />
        <span className="text-sm opacity-75">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

// ============================================================================
// 详情弹窗
// ============================================================================

interface DetailModalProps {
  request: TransferRequest | null
  loading: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}

function DetailModal({ request, loading, onClose, onApprove, onReject }: DetailModalProps) {
  if (!request) return null

  const typeConfig = TRANSFER_TYPES[request.transferType as keyof typeof TRANSFER_TYPES] || TRANSFER_TYPES.time
  const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">调课详情</h2>
            <p className="text-sm text-gray-500">申请ID: {request._id || request.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {/* 状态与类型 */}
              <div className="flex gap-2 mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* 学员信息 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">学员信息</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">姓名</div>
                      <div className="font-medium">{request.studentName || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">电话</div>
                      <div className="font-medium">{request.studentPhone || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 原排课 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <ArrowRight size={14} className="text-red-400" style={{ transform: 'rotate(180deg)' }} />
                    原排课
                  </span>
                </h3>
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="font-medium text-gray-800 mb-2">
                    {request.originalCourseName || '未知课程'}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <ArrowRight size={14} className="text-green-400" />
                      目标排课
                    </span>
                  </h3>
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="font-medium text-gray-800 mb-2">
                      {request.targetCourseName || '待选择'}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
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
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">调课原因</h3>
                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                  {request.reason}
                </div>
              </div>

              {/* 备注 */}
              {request.remark && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">备注</h3>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm">
                    {request.remark}
                  </div>
                </div>
              )}

              {/* 审核结果 */}
              {request.reviewedAt && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">审核结果</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {request.adminName || '管理员'} {formatDateStr(request.reviewedAt)}
                      </span>
                    </div>
                    {request.adminReply && (
                      <div className="text-sm text-gray-700">
                        回复：{request.adminReply}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 时间线 */}
              <div className="text-xs text-gray-400 space-y-1">
                <div>申请时间：{formatDateStr(request.createdAt)}</div>
                {request.updatedAt !== request.createdAt && (
                  <div>更新时间：{formatDateStr(request.updatedAt)}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 底部操作 */}
        {request.status === 'pending' && !loading && (
          <div className="p-4 border-t flex gap-3">
            <button
              onClick={onApprove}
              className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-600"
            >
              <CheckCircle size={18} />
              通过申请
            </button>
            <button
              onClick={onReject}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-600"
            >
              <XCircle size={18} />
              拒绝申请
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 审核弹窗
// ============================================================================

interface AuditModalProps {
  type: 'approve' | 'reject'
  request: TransferRequest
  reply: string
  setReply: (reply: string) => void
  loading: boolean
  onClose: () => void
  onSubmit: () => void
}

function AuditModal({ type, request, reply, setReply, loading, onClose, onSubmit }: AuditModalProps) {
  const isApprove = type === 'approve'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* 头部 */}
        <div className={`px-6 py-4 border-b ${isApprove ? 'bg-green-50' : 'bg-red-50'}`}>
          <h2 className={`text-lg font-semibold ${isApprove ? 'text-green-700' : 'text-red-700'}`}>
            {isApprove ? '通过调课申请' : '拒绝调课申请'}
          </h2>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            {isApprove
              ? `确定要通过学员 ${request.studentName || '未知'} 的调课申请吗？`
              : `确定要拒绝学员 ${request.studentName || '未知'} 的调课申请吗？`}
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              回复内容 {isApprove ? '' : <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={isApprove ? '选填，可添加备注' : '请填写拒绝原因（至少2个字）'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || (!isApprove && reply.trim().length < 2)}
            className={`flex-1 py-3 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
              isApprove ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            {isApprove ? '确认通过' : '确认拒绝'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 批量审核弹窗
// ============================================================================

interface BatchAuditModalProps {
  type: 'approve' | 'reject'
  count: number
  reply: string
  setReply: (reply: string) => void
  loading: boolean
  onClose: () => void
  onSubmit: () => void
}

function BatchAuditModal({ type, count, reply, setReply, loading, onClose, onSubmit }: BatchAuditModalProps) {
  const isApprove = type === 'approve'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        {/* 头部 */}
        <div className={`px-6 py-4 border-b ${isApprove ? 'bg-green-50' : 'bg-red-50'}`}>
          <h2 className={`text-lg font-semibold ${isApprove ? 'text-green-700' : 'text-red-700'}`}>
            批量{isApprove ? '通过' : '拒绝'}
          </h2>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            确定要{isApprove ? '通过' : '拒绝'}选中的 <strong>{count}</strong> 条调课申请吗？
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              回复内容 {isApprove ? '' : <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={isApprove ? '选填，可添加备注' : '请填写统一拒绝原因（至少2个字）'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
            />
          </div>

          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
            <AlertCircle size={16} className="inline mr-1" />
            批量操作将对所有选中记录执行相同操作，请确认无误后再提交。
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || (!isApprove && reply.trim().length < 2)}
            className={`flex-1 py-3 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
              isApprove ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : null}
            确认{isApprove ? '通过' : '拒绝'}
          </button>
        </div>
      </div>
    </div>
  )
}
