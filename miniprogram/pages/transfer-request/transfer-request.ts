// pages/transfer-request/transfer-request.ts
// 调课申请页面

import { dbGetList, dbAdd, dbUpdate, dbQuery } from '../../utils/http'
import { formatDate, checkLogin, getPhone } from '../../utils/util'
import logger from '../../utils/logger'

// 调课类型配置
const TRANSFER_TYPES = {
  time: { label: '时间调整', color: '#2563eb' },
  teacher: { label: '更换老师', color: '#7c3aed' },
  location: { label: '更换场地', color: '#059669' },
  course: { label: '更换课程', color: '#ea580c' },
  leave: { label: '请假补课', color: '#6b7280' }
}

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待审核', color: '#f59e0b', bg: '#fef3c7' },
  approved: { label: '已通过', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: '已拒绝', color: '#ef4444', bg: '#fee2e2' },
  cancelled: { label: '已取消', color: '#6b7280', bg: '#f3f4f6' }
}

interface Schedule {
  _id: string
  id?: string
  courseId?: string
  courseName: string
  courseTitle: string
  className: string
  classId?: string
  date: string
  startTime: string
  endTime: string
  teacherName: string
  teacherId: string
  location: string
  maxStudents?: number
  enrolledCount?: number
  remaining?: number
}

interface TransferRequest {
  _id?: string
  id?: string
  transferType: string
  status: string
  originalCourseName: string
  originalDate: string
  originalTime: string
  originalTeacher: string
  originalLocation: string
  targetCourseName: string
  targetDate: string
  targetTime: string
  targetTeacher: string
  targetLocation: string
  reason: string
  adminReply: string
  adminName: string
  createdAt: string
  reviewedAt: string
}

interface TransferStats {
  total: number
  pending: number
  approved: number
  rejected: number
  approvalRate: number
}

Page({
  data: {
    isLoggedIn: false,
    activeTab: 'list' as 'list' | 'create',
    
    // 统计数据
    stats: null as TransferStats | null,
    
    // 列表数据
    requests: [] as TransferRequest[],
    loading: false,
    total: 0,
    page: 1,
    pageSize: 10,
    
    // 筛选
    statusFilter: 'all',
    typeFilter: 'all',
    
    // 新建申请
    step: 1,
    mySchedules: [] as Schedule[],
    selectedSchedule: null as Schedule | null,
    transferType: 'time',
    reason: '',
    remark: '',
    targetSchedules: [] as Schedule[],
    selectedTarget: null as Schedule | null,
    targetConflict: false,
    loadingSchedules: false,
    loadingTargets: false,
    submitting: false,
    
    // 详情弹窗
    showDetail: false,
    selectedRequest: null as TransferRequest | null
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '调课申请' })
    if (!checkLogin()) {
      this.setData({ isLoggedIn: false })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.setData({ isLoggedIn: true })
    this.loadStats()
    this.loadRequests()
  },

  onShow() {
    if (this.data.isLoggedIn && this.data.activeTab === 'list') {
      this.loadStats()
      this.loadRequests()
    }
  },

  onPullDownRefresh() {
    this.loadStats()
    this.loadRequests().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 切换 Tab
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab as 'list' | 'create'
    this.setData({ activeTab: tab })
    
    if (tab === 'create' && this.data.mySchedules.length === 0) {
      this.loadMySchedules()
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      const phone = getPhone() || ''
      const userInfo = wx.getStorageSync('userInfo')
      const studentId = userInfo?.id || userInfo?._openid || phone

      const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        dbGetList('transfer_requests', { where: { studentId }, limit: 0 }),
        dbGetList('transfer_requests', { where: { studentId, status: 'pending' }, limit: 0 }),
        dbGetList('transfer_requests', { where: { studentId, status: 'approved' }, limit: 0 }),
        dbGetList('transfer_requests', { where: { studentId, status: 'rejected' }, limit: 0 }),
      ])

      const total = (totalRes as any).total || (totalRes as any).data?.length || 0
      const pending = (pendingRes as any).total || (pendingRes as any).data?.length || 0
      const approved = (approvedRes as any).total || (approvedRes as any).data?.length || 0
      const rejected = (rejectedRes as any).total || (rejectedRes as any).data?.length || 0
      const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

      this.setData({
        stats: { total, pending, approved, rejected, approvalRate }
      })
    } catch (err) {
      logger.error('调课', '加载统计失败', err)
    }
  },

  // 加载我的调课申请
  async loadRequests() {
    this.setData({ loading: true })
    
    try {
      const phone = getPhone() || ''

      // 统一按手机号查询本人调课申请（写入端 studentId 与 studentPhone 均存手机号）
      const result: any = await dbGetList('transfer_requests', {
        where: { $or: [{ studentId: phone }, { studentPhone: phone }] },
        useOperators: true,
        orderBy: 'createdAt',
        order: 'desc',
        limit: 50
      })
      
      const requests = (result as any).data || []
      
      // 处理数据，补充状态文本
      const processedRequests = requests.map((r: TransferRequest) => ({
        ...r,
        statusConfig: STATUS_CONFIG[r.status] || STATUS_CONFIG.pending,
        typeConfig: TRANSFER_TYPES[r.transferType as keyof typeof TRANSFER_TYPES] || TRANSFER_TYPES.time
      }))
      
      this.setData({
        requests: processedRequests,
        total: (result as any).total || requests.length,
        loading: false
      })
    } catch (err) {
      logger.error('调课', '加载调课申请失败', err)
      this.setData({ loading: false })
    }
  },

  // 加载我的排课
  async loadMySchedules() {
    this.setData({ loadingSchedules: true })
    
    try {
      const phone = getPhone() || ''
      
      // 查询 class_members 获取班级
      const membersResult = await dbQuery('class_members', {
        phone: phone
      })
      
      const members = membersResult.data || []
      if (members.length === 0) {
        this.setData({ mySchedules: [], loadingSchedules: false })
        return
      }
      
      const classIds = members.map((m: any) => m.classId)
      
      // 查询 classes 获取班级信息
      const classesResult = await dbGetList('classes', {
        where: { _id: { $in: classIds } },
        useOperators: true
      })
      
      const classes = classesResult.data || []
      
      // 查询 class_schedules 获取排课
      const today = new Date().toISOString().split('T')[0]
      const schedulesResult = await dbGetList('class_schedules', {
        where: {
          classId: { $in: classIds },
          date: { $gte: today }
        },
        useOperators: true,
        orderBy: 'date',
        order: 'asc',
        limit: 50
      })
      
      const schedules = (schedulesResult.data || []).map((s: any) => {
        const classInfo = classes.find((c: any) => c._id === s.classId)
        const max = classInfo?.maxStudents || 0
        const enrolled = classInfo?.enrolledCount || 0
        return {
          ...s,
          courseId: classInfo?.courseId || '',
          courseName: classInfo?.name || classInfo?.courseName || s.title || '未知班级',
          className: classInfo?.name || '',
          maxStudents: max,
          enrolledCount: enrolled,
          remaining: Math.max(0, max - enrolled)
        }
      })
      
      this.setData({ mySchedules: schedules, loadingSchedules: false })
    } catch (err) {
      logger.error('调课', '加载排课失败', err)
      this.setData({ mySchedules: [], loadingSchedules: false })
    }
  },

  // 选择原排课
  handleSelectOriginal(e: any) {
    const index = e.currentTarget.dataset.index
    const schedule = this.data.mySchedules[index]
    
    this.setData({
      selectedSchedule: schedule,
      step: 2
    })
    
    this.loadAvailableTargets(schedule)
  },

  // 加载可选目标排课（同课程的其他班级，未开始，含容量）
  async loadAvailableTargets(schedule: Schedule) {
    this.setData({ loadingTargets: true })

    try {
      const today = new Date().toISOString().split('T')[0]
      const originalClassId = schedule.classId
      const courseId = schedule.courseId

      // 1. 查询同课程的其他班级（排除原班级，仅招生中/进行中）
      let otherClasses: any[] = []
      if (courseId) {
        const classRes = await dbGetList('classes', {
          where: {
            courseId,
            _id: { $ne: originalClassId },
            status: { $in: ['enrolling', 'in_progress'] }
          },
          limit: 100
        })
        otherClasses = (classRes as any).data || []
      }
      if (otherClasses.length === 0) {
        this.setData({ targetSchedules: [], loadingTargets: false })
        return
      }

      const classIds = otherClasses.map((c: any) => c._id)
      const classMap: Record<string, any> = {}
      otherClasses.forEach((c: any) => { classMap[c._id] = c })

      // 2. 查询这些班级的未开始排课
      const schedRes = await dbGetList('class_schedules', {
        where: {
          classId: { $in: classIds },
          date: { $gte: today },
          _id: { $ne: schedule._id || schedule.id }
        },
        orderBy: 'date asc',
        limit: 50
      })

      // 3. 附带班级名称与容量
      const schedules = (schedRes.data || []).map((s: any) => {
        const c = classMap[s.classId] || {}
        const max = c.maxStudents || 0
        const enrolled = c.enrolledCount || 0
        return {
          ...s,
          courseId,
          courseName: c.courseName || c.name || '',
          className: c.name || '',
          maxStudents: max,
          enrolledCount: enrolled,
          remaining: Math.max(0, max - enrolled)
        }
      })

      this.setData({ targetSchedules: schedules, loadingTargets: false })
    } catch (err) {
      logger.error('调课', '加载可选排课失败', err)
      this.setData({ targetSchedules: [], loadingTargets: false })
    }
  },

  // 设置调课类型
  setTransferType(e: any) {
    const type = e.currentTarget.dataset.type
    this.setData({ transferType: type })
  },

  // 设置原因
  setReason(e: any) {
    this.setData({ reason: e.detail.value })
  },

  // 设置备注
  setRemark(e: any) {
    this.setData({ remark: e.detail.value })
  },

  // 下一步
  nextStep() {
    if (!this.data.reason || this.data.reason.trim().length < 5) {
      wx.showToast({ title: '请填写调课原因（至少5个字）', icon: 'none' })
      return
    }
    this.setData({ step: 3 })
  },

  // 上一步
  prevStep() {
    const step = this.data.step - 1
    if (step < 1) {
      this.setData({ activeTab: 'list' })
    } else {
      this.setData({ step })
    }
  },

  // 选择目标排课
  selectTarget(e: any) {
    const index = e.currentTarget.dataset.index
    let target: any = null
    if (index !== -1) {
      target = this.data.targetSchedules[index]
    }

    // 检测与学员其他已排课程的时间冲突
    let conflict = false
    if (target) {
      const originalId = this.data.selectedSchedule?._id || this.data.selectedSchedule?.id
      conflict = this.data.mySchedules.some((s: any) => {
        if ((s._id || s.id) === originalId) return false
        if (s.date !== target.date) return false
        return this.isTimeOverlap(s.startTime, s.endTime, target.startTime, target.endTime)
      })
    }

    this.setData({ selectedTarget: target, targetConflict: conflict })
  },

  // 时间是否重叠（HH:mm）
  isTimeOverlap(aStart?: string, aEnd?: string, bStart?: string, bEnd?: string): boolean {
    const toMin = (t?: string): number | null => {
      if (!t) return null
      const p = String(t).split(':').map(Number)
      if (p.length < 2 || isNaN(p[0]) || isNaN(p[1])) return null
      return p[0] * 60 + p[1]
    }
    const aS = toMin(aStart); const aE = toMin(aEnd)
    const bS = toMin(bStart); const bE = toMin(bEnd)
    if (aS == null || aE == null || bS == null || bE == null) return false
    return aS < bE && bS < aE
  },

  // 提交申请
  async submitRequest() {
    const { selectedSchedule, selectedTarget, transferType, reason, remark } = this.data

    if (!selectedSchedule) {
      wx.showToast({ title: '请先选择原排课', icon: 'none' })
      return
    }
    if (!reason || reason.trim().length < 5) {
      wx.showToast({ title: '请填写调课原因（至少5个字）', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      const phone = getPhone() || ''
      const userInfo = wx.getStorageSync('userInfo')
      const now = new Date().toISOString()

      // 防御性取值：避免字段缺失导致构造 payload 时抛异常（原代码用 ! 非null断言，selectedSchedule 为空会崩溃）
      const result = await dbAdd('transfer_requests', {
        studentId: userInfo?.id || userInfo?._openid || phone,
        studentName: userInfo?.name || userInfo?.nickName || '',
        studentPhone: phone,
        originalScheduleId: selectedSchedule._id || selectedSchedule.id || '',
        originalCourseId: selectedSchedule.courseId || '',
        originalCourseName: selectedSchedule.courseName || selectedSchedule.courseTitle || '',
        originalDate: selectedSchedule.date || '',
        originalTime: selectedSchedule.startTime || '',
        originalTeacher: selectedSchedule.teacherName || '',
        originalTeacherId: selectedSchedule.teacherId || '',
        originalLocation: selectedSchedule.location || '',
        targetScheduleId: selectedTarget?._id || selectedTarget?.id || '',
        targetCourseId: selectedTarget?.courseId || '',
        targetCourseName: selectedTarget?.courseName || selectedTarget?.courseTitle || '',
        targetDate: selectedTarget?.date || '',
        targetTime: selectedTarget?.startTime || '',
        targetTeacher: selectedTarget?.teacherName || '',
        targetTeacherId: selectedTarget?.teacherId || '',
        targetLocation: selectedTarget?.location || '',
        transferType,
        reason: reason.trim(),
        remark: (remark || '').trim(),
        status: 'pending',
        createdAt: now,
        updatedAt: now
      })

      // db-init 返回结构为 { code, data: { id }, message }
      const resp = result as any
      if (resp && resp.code === 0) {
        wx.showToast({ title: '调课申请提交成功', icon: 'success' })

        // 重置表单
        this.setData({
          activeTab: 'list',
          step: 1,
          selectedSchedule: null,
          transferType: 'time',
          reason: '',
          remark: '',
          selectedTarget: null
        })

        // 刷新列表
        this.loadStats()
        this.loadRequests()
      } else {
        // 透出服务端真实错误（如 code:-1），不再笼统显示“提交失败”
        wx.showToast({ title: resp?.message || '提交失败', icon: 'none' })
      }
    } catch (err: any) {
      wx.showToast({ title: err.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 查看详情
  viewDetail(e: any) {
    const index = e.currentTarget.dataset.index
    const request = this.data.requests[index]
    
    this.setData({
      showDetail: true,
      selectedRequest: request
    })
  },

  // 关闭详情
  closeDetail() {
    this.setData({
      showDetail: false,
      selectedRequest: null
    })
  },

  // 取消申请
  cancelRequest(e: any) {
    const index = e.currentTarget.dataset.index
    const request = this.data.requests[index]
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个调课申请吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await dbUpdate('transfer_requests', request._id || request.id, {
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            })
            
            wx.showToast({ title: '申请已取消', icon: 'success' })
            this.loadStats()
            this.loadRequests()
          } catch (err: any) {
            wx.showToast({ title: err.message || '取消失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 格式化日期
  formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return '-'
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    } catch {
      return '-'
    }
  }
})
