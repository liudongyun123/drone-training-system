// pages/transfer-request/transfer-request.ts
// 调课申请页面

import { callFunction, dbQuery, dbGetList } from '../../utils/http'
import { formatDate, checkLogin, getPhone, getUserInfo } from '../../utils/util'
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
  courseName: string
  courseTitle: string
  className: string
  date: string
  startTime: string
  endTime: string
  teacherName: string
  teacherId: string
  location: string
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
      const result = await callFunction('transfer-request', {
        action: 'getStats'
      })
      
      if (result.code === 0) {
        this.setData({ stats: result.data })
      }
    } catch (err) {
      logger.error('调课', '加载统计失败', err)
    }
  },

  // 加载我的调课申请
  async loadRequests() {
    this.setData({ loading: true })
    
    try {
      const phone = getPhone() || ''
      const userInfo = getUserInfo()
      const studentId = userInfo?.id || userInfo?._openid || ''
      
      const result = await callFunction('transfer-request', {
        action: 'listMyRequests',
        phone,
        studentId
      })
      
      if (result.code === 0) {
        const data = result.data as any
        const requests = data?.list || data || []
        
        // 处理数据，补充状态文本
        const processedRequests = requests.map((r: TransferRequest) => ({
          ...r,
          statusConfig: STATUS_CONFIG[r.status] || STATUS_CONFIG.pending,
          typeConfig: TRANSFER_TYPES[r.transferType as keyof typeof TRANSFER_TYPES] || TRANSFER_TYPES.time
        }))
        
        this.setData({
          requests: processedRequests,
          total: data?.total || requests.length,
          loading: false
        })
      }
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
      const classesResult = await dbQuery('classes', {
        _id: (query: any) => query.in(classIds)
      })
      
      const classes = classesResult.data || []
      
      // 查询 class_schedules 获取排课
      const today = new Date().toISOString().split('T')[0]
      const schedulesResult = await dbGetList('class_schedules', {
        where: {
          classId: (query: any) => query.in(classIds),
          date: (query: any) => query.gte(today)
        },
        orderBy: 'date asc, startTime asc',
        limit: 50
      })
      
      const schedules = (schedulesResult.data || []).map((s: any) => {
        const classInfo = classes.find((c: any) => c._id === s.classId)
        return {
          ...s,
          courseName: classInfo?.name || classInfo?.courseName || s.title || '未知班级',
          className: classInfo?.name || ''
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

  // 加载可选目标排课
  async loadAvailableTargets(schedule: Schedule) {
    this.setData({ loadingTargets: true })
    
    try {
      const result = await callFunction('transfer-request', {
        action: 'getAvailableSchedules',
        excludeScheduleId: schedule._id || schedule.id
      })
      
      if (result.code === 0) {
        this.setData({ targetSchedules: result.data || [], loadingTargets: false })
      }
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
    if (index === -1) {
      this.setData({ selectedTarget: null })
    } else {
      this.setData({ selectedTarget: this.data.targetSchedules[index] })
    }
  },

  // 提交申请
  async submitRequest() {
    const { selectedSchedule, selectedTarget, transferType, reason, remark } = this.data
    
    if (!reason || reason.trim().length < 5) {
      wx.showToast({ title: '请填写调课原因（至少5个字）', icon: 'none' })
      return
    }
    
    this.setData({ submitting: true })
    
    try {
      const phone = getPhone() || ''
      const userInfo = getUserInfo()
      
      const result = await callFunction('transfer-request', {
        action: 'createRequest',
        studentId: userInfo?.id || userInfo?._openid || phone,
        studentName: userInfo?.name || userInfo?.nickName || '',
        studentPhone: phone,
        originalScheduleId: selectedSchedule!._id || selectedSchedule!.id,
        originalCourseId: selectedSchedule!.courseId,
        originalCourseName: selectedSchedule!.courseName || selectedSchedule!.courseTitle,
        originalDate: selectedSchedule!.date,
        originalTime: selectedSchedule!.startTime,
        originalTeacher: selectedSchedule!.teacherName,
        originalTeacherId: selectedSchedule!.teacherId,
        originalLocation: selectedSchedule!.location,
        targetScheduleId: selectedTarget?._id || selectedTarget?.id,
        targetCourseId: selectedTarget?.courseId,
        targetCourseName: selectedTarget?.courseName || selectedTarget?.courseTitle,
        targetDate: selectedTarget?.date,
        targetTime: selectedTarget?.startTime,
        targetTeacher: selectedTarget?.teacherName,
        targetTeacherId: selectedTarget?.teacherId,
        targetLocation: selectedTarget?.location,
        transferType,
        reason: reason.trim(),
        remark: remark.trim()
      })
      
      if (result.code === 0) {
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
        wx.showToast({ title: result.message || '提交失败', icon: 'none' })
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
            const userInfo = getUserInfo()
            const result = await callFunction('transfer-request', {
              action: 'cancelRequest',
              requestId: request._id || request.id,
              studentId: userInfo?.id || userInfo?._openid || ''
            })
            
            if (result.code === 0) {
              wx.showToast({ title: '申请已取消', icon: 'success' })
              this.loadStats()
              this.loadRequests()
            } else {
              wx.showToast({ title: result.message || '取消失败', icon: 'none' })
            }
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
