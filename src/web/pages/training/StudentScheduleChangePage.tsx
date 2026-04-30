/**
 * 学员调课申请页面
 * 学员提交调课申请、查看申请记录
 */

import { useState, useEffect } from 'react'
import { scheduleChangeService } from '@/services/enrollmentService'
import { app as cloudbaseApp } from '@/utils/cloudbase'
import { useAuthStore } from '@/store/authStore'

interface ScheduleChange {
  _id: string
  enrollmentId: string
  courseId: string
  scheduleId: string
  userId: string
  applyTime: string
  changeType: string
  reason: string
  originalDate: string
  originalStartTime: string
  originalEndTime: string
  newDate: string
  newStartTime: string
  newEndTime: string
  status: string
  approverId: string
  approveTime: string
  approveRemark: string
  createdAt: string
  updatedAt: string
}

interface ClassSchedule {
  _id: string
  classId: string
  title: string
  date: string
  startTime: string
  endTime: string
  location: string
  className?: string
}

export default function StudentScheduleChange() {
  const [changes, setChanges] = useState<ScheduleChange[]>([])
  const [schedules, setSchedules] = useState<ClassSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null)
  const [formData, setFormData] = useState({
    scheduleId: '',
    changeType: 'reschedule',
    reason: '',
    newDate: '',
    newStartTime: '09:00',
    newEndTime: '12:00'
  })

  // 加载调课申请列表
  const loadChanges = async () => {
    try {
      setLoading(true)
      const { user } = useAuthStore.getState()
      const userId = user?.uid || ''

      const result = await scheduleChangeService.getUserChanges(userId)
      if (result.code === 0) {
        setChanges(result.data as ScheduleChange[])
      }
    } catch (error) {
      console.error('加载调课申请失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载培训班的排课列表（从 class_schedules）
  const loadSchedules = async () => {
    try {
      const db = cloudbaseApp.database()
      
      // 获取当前用户的所有报名记录
      const { user } = useAuthStore.getState()
      const userId = user?.uid || ''
      
      // 查询用户报名的班级
      const enrollResult = await db.collection('enrollments')
        .where({ _openid: userId, status: 'active' })
        .field({ classId: true })
        .limit(100)
        .get()
      
      const classIds = enrollResult.data?.map((e: any) => e.classId) || []
      
      if (classIds.length > 0) {
        // 从 class_schedules 获取排课
        const schedulesResult = await db.collection('class_schedules')
          .where({
            classId: db.command.in(classIds)
          })
          .orderBy('date', 'asc')
          .orderBy('startTime', 'asc')
          .limit(100)
          .get()
        
        // 获取班级名称
        const classResult = await db.collection('classes')
          .where({ _id: db.command.in(classIds) })
          .field({ _id: true, name: true })
          .limit(100)
          .get()
        
        const classNameMap: Record<string, string> = {}
        classResult.data?.forEach((c: any) => {
          classNameMap[c._id] = c.name
        })
        
        const schedulesWithClassName = (schedulesResult.data || []).map((s: any) => ({
          ...s,
          className: classNameMap[s.classId] || '未知班级'
        }))
        
        setSchedules(schedulesWithClassName)
      }
    } catch (error) {
      console.error('加载排课列表失败:', error)
    }
  }

  useEffect(() => {
    loadChanges()
    loadSchedules()
  }, [])

  // 打开申请对话框
  const openModal = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule)
    setFormData({
      scheduleId: schedule._id,
      changeType: 'reschedule',
      reason: '',
      newDate: '',
      newStartTime: schedule.startTime,
      newEndTime: schedule.endTime
    })
    setShowModal(true)
  }

  // 提交调课申请
  const handleSubmit = async () => {
    if (!formData.reason.trim()) {
      alert('请填写调课原因')
      return
    }

    if (!formData.newDate) {
      alert('请选择新的上课日期')
      return
    }

    const currentEnrollmentId = selectedSchedule?._id || ''
    const classId = selectedSchedule?.classId || ''

    try {
      await scheduleChangeService.create({
        enrollmentId: currentEnrollmentId,
        classId,
        scheduleId: formData.scheduleId,
        userId: useAuthStore.getState().user?.uid || '',
        changeType: formData.changeType,
        reason: formData.reason,
        originalDate: selectedSchedule?.date || '',
        originalStartTime: selectedSchedule?.startTime || '',
        originalEndTime: selectedSchedule?.endTime || '',
        newDate: formData.newDate,
        newStartTime: formData.newStartTime,
        newEndTime: formData.newEndTime
      })

      alert('申请提交成功，等待管理员审批')
      setShowModal(false)
      loadChanges()
    } catch (error) {
      console.error('提交申请失败:', error)
      alert('提交申请失败')
    }
  }

  // 撤销调课申请
  const handleCancel = async (changeId: string) => {
    if (!confirm('确定要撤销这个调课申请吗？')) return

    try {
      await scheduleChangeService.cancel(changeId, '申请撤销')
      alert('已撤销')
      loadChanges()
    } catch (error) {
      console.error('撤销失败:', error)
      alert('撤销失败')
    }
  }

  // 调课类型标签
  const getChangeTypeBadge = (type: string) => {
    const typeMap = {
      reschedule: { text: '改期', className: 'bg-blue-100 text-blue-800' },
      transfer: { text: '转班', className: 'bg-purple-100 text-purple-800' },
      suspend: { text: '暂停', className: 'bg-yellow-100 text-yellow-800' },
      resume: { text: '恢复', className: 'bg-green-100 text-green-800' }
    }
    const typeInfo = typeMap[type as keyof typeof typeMap] || { text: type, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 text-xs rounded ${typeInfo.className}`}>
        {typeInfo.text}
      </span>
    )
  }

  // 状态标签
  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { text: '待审批', className: 'bg-yellow-100 text-yellow-800' },
      approved: { text: '已通过', className: 'bg-green-100 text-green-800' },
      rejected: { text: '已拒绝', className: 'bg-red-100 text-red-800' },
      cancelled: { text: '已撤销', className: 'bg-gray-100 text-gray-800' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 text-xs rounded ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    )
  }

  // 格式化时间
  const formatTime = (time: string) => {
    if (!time) return '-'
    const date = new Date(time)
    return date.toLocaleString('zh-CN')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">调课申请</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：可调课的排课列表 */}
        <div>
          <h2 className="text-xl font-bold mb-4">可调课的课程</h2>
          <div className="space-y-4">
            {schedules.length > 0 ? (
              schedules.map(schedule => (
                <div key={schedule._id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {schedule.title}
                      </h3>
                      <div className="text-sm text-gray-600">
                        <div>日期：{schedule.date}</div>
                        <div>时间：{schedule.startTime} - {schedule.endTime}</div>
                        <div>场地：{schedule.classroom}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openModal(schedule)}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    申请调课
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                暂无可调课的课程
              </div>
            )}
          </div>
        </div>

        {/* 右侧：调课申请记录 */}
        <div>
          <h2 className="text-xl font-bold mb-4">我的申请记录</h2>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">加载中...</div>
            ) : changes.length > 0 ? (
              changes.map(change => (
                <div key={change._id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex space-x-2">
                      {getChangeTypeBadge(change.changeType)}
                      {getStatusBadge(change.status)}
                    </div>
                    {change.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(change._id)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        撤销申请
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">申请时间：</span>
                      <span className="text-gray-900">{formatTime(change.applyTime)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">调课原因：</span>
                      <span className="text-gray-900">{change.reason}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">原上课时间：</span>
                      <span className="text-gray-900">
                        {change.originalDate} {change.originalStartTime}-{change.originalEndTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">新上课时间：</span>
                      <span className="text-gray-900">
                        {change.newDate} {change.newStartTime}-{change.newEndTime}
                      </span>
                    </div>
                    {change.approveTime && (
                      <div>
                        <span className="text-gray-500">审批时间：</span>
                        <span className="text-gray-900">{formatTime(change.approveTime)}</span>
                      </div>
                    )}
                    {change.approveRemark && (
                      <div>
                        <span className="text-gray-500">审批意见：</span>
                        <span className="text-gray-900">{change.approveRemark}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                暂无调课申请记录
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 申请对话框 */}
      {showModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">申请调课</h2>

            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="font-medium text-gray-900 mb-2">原课程信息</h3>
              <div className="text-sm space-y-1">
                <div>课程：{selectedSchedule.title}</div>
                <div>日期：{selectedSchedule.date}</div>
                <div>时间：{selectedSchedule.startTime} - {selectedSchedule.endTime}</div>
                <div>场地：{selectedSchedule.classroom}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  调课类型 *
                </label>
                <select
                  value={formData.changeType}
                  onChange={(e) => setFormData({ ...formData, changeType: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="reschedule">改期</option>
                  <option value="transfer">转班</option>
                  <option value="suspend">暂停</option>
                  <option value="resume">恢复</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  调课原因 *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  placeholder="请说明调课原因"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新上课日期 *
                </label>
                <input
                  type="date"
                  value={formData.newDate}
                  onChange={(e) => setFormData({ ...formData, newDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    开始时间 *
                  </label>
                  <input
                    type="time"
                    value={formData.newStartTime}
                    onChange={(e) => setFormData({ ...formData, newStartTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    结束时间 *
                  </label>
                  <input
                    type="time"
                    value={formData.newEndTime}
                    onChange={(e) => setFormData({ ...formData, newEndTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
