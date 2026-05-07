// ============================================================================
// 管理后台 - 权限管理
// 功能：课程权限管理、班级权限管理、权限统计、手动授权
// 版本：v1.2 - 班级成员 → 班级权限，明确职责边界
// ============================================================================
import { useState, useEffect } from 'react'
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate'
import { permissionService } from '@/services/permissionService'
import { classService } from '@/services/classService'
import type { CoursePermission, ClassMember, PermissionStats, ClassMemberStats } from '@/types/permission'
import {
  Shield, Users, BookOpen, GraduationCap, Search, RefreshCw,
  Eye, EyeOff, Clock, CheckCircle, XCircle, Download, Upload,
  Plus, Minus, ChevronLeft, ChevronRight, MoreVertical, Trash2, Edit,
  UserPlus, X, Check, AlertCircle, Loader2
} from 'lucide-react'
import app from '@/config/tcb'

type TabType = 'course-permissions' | 'class-members'

// 班级权限来源标签
const SOURCE_LABELS_FOR_MEMBER: Record<string, { text: string; color: string }> = {
  online: { text: '线上', color: 'bg-blue-100 text-blue-700' },
  offline: { text: '线下', color: 'bg-green-100 text-green-700' },
  admin_grant: { text: '管理员授权', color: 'bg-pink-100 text-pink-700' }
}

// 会员类型标签
const MEMBER_TYPE_LABELS: Record<string, { text: string; color: string }> = {
  user: { text: '普通用户', color: 'bg-gray-100 text-gray-700' },
  student: { text: '正式学员', color: 'bg-blue-100 text-blue-700' },
  graduate: { text: '毕业学员', color: 'bg-green-100 text-green-700' }
}

// 权限来源标签
const SOURCE_LABELS: Record<string, { text: string; color: string }> = {
  purchase: { text: '线上购买', color: 'bg-blue-100 text-blue-700' },
  registration: { text: '报名获得', color: 'bg-green-100 text-green-700' },
  gift: { text: '赠送', color: 'bg-purple-100 text-purple-700' },
  trial: { text: '试用', color: 'bg-yellow-100 text-yellow-700' },
  admin_grant: { text: '管理员授权', color: 'bg-pink-100 text-pink-700' }
}

// 权限状态标签
const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  active: { text: '有效', color: 'bg-green-100 text-green-700' },
  expired: { text: '已过期', color: 'bg-gray-100 text-gray-700' },
  revoked: { text: '已撤销', color: 'bg-red-100 text-red-700' }
}

// 班级权限状态标签
const MEMBER_STATUS_LABELS: Record<string, { text: string; color: string }> = {
  enrolled: { text: '已报名', color: 'bg-blue-100 text-blue-700' },
  learning: { text: '学习中', color: 'bg-green-100 text-green-700' },
  completed: { text: '已结课', color: 'bg-gray-100 text-gray-700' },
  dropped: { text: '已退课', color: 'bg-red-100 text-red-700' }
}

export default function PermissionManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('course-permissions')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 课程权限状态
  const [coursePermissions, setCoursePermissions] = useState<CoursePermission[]>([])
  const [courseStats, setCourseStats] = useState<PermissionStats | null>(null)
  const [coursePage, setCoursePage] = useState(1)
  const [courseTotal, setCourseTotal] = useState(0)
  const [courseSearch, setCourseSearch] = useState('')

  // 班级权限状态
  const [classMembers, setClassMembers] = useState<ClassMember[]>([])
  const [memberStats, setMemberStats] = useState<ClassMemberStats | null>(null)
  const [memberPage, setMemberPage] = useState(1)
  const [memberTotal, setMemberTotal] = useState(0)
  const [memberSearch, setMemberSearch] = useState('')

  // 手动添加权限对话框状态
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMemberStep, setAddMemberStep] = useState<'search' | 'confirm'>('search')
  
  // 搜索用户相关
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  
  // 选择班级相关
  const [availableClasses, setAvailableClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  
  // 权限设置相关
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [videoValidDays, setVideoValidDays] = useState(365)
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null)

  // 编辑权限对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<CoursePermission | null>(null)
  const [editFormData, setEditFormData] = useState({
    videoEnabled: true,
    videoValidDays: 365,
    status: 'active' as 'active' | 'expired' | 'revoked'
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editResult, setEditResult] = useState<{ success: boolean; message: string } | null>(null)

  const pageSize = 20

  // 加载课程权限
  const loadCoursePermissions = async () => {
    setLoading(true)
    try {
      const result = await permissionService.getUserPermissions('', { limit: 200 })
      setCoursePermissions(result)

      // 计算统计
      const stats: PermissionStats = {
        totalPermissions: result.length,
        activePermissions: result.filter(p => p.status === 'active').length,
        expiredPermissions: result.filter(p => p.status === 'expired').length,
        bySource: {
          purchase: result.filter(p => p.source === 'purchase').length,
          registration: result.filter(p => p.source === 'registration').length,
          gift: result.filter(p => p.source === 'gift').length,
          trial: result.filter(p => p.source === 'trial').length,
          admin_grant: result.filter(p => p.source === 'admin_grant').length
        }
      }
      setCourseStats(stats)
      setCourseTotal(result.length)
    } catch (error) {
      console.error('加载课程权限失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 打开编辑权限对话框
  const openEditDialog = (permission: CoursePermission) => {
    setEditingPermission(permission)
    setEditFormData({
      videoEnabled: permission.videoAccess?.enabled ?? true,
      videoValidDays: permission.videoAccess?.validUntil 
        ? Math.ceil((new Date(permission.videoAccess.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 365,
      status: permission.status as 'active' | 'expired' | 'revoked'
    })
    setEditResult(null)
    setEditDialogOpen(true)
  }

  // 关闭编辑对话框
  const closeEditDialog = () => {
    setEditDialogOpen(false)
    setEditingPermission(null)
    setEditResult(null)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingPermission) return
    
    setEditLoading(true)
    setEditResult(null)
    
    try {
      // 计算新的有效期
      const videoValidUntil = editFormData.videoEnabled && editFormData.videoValidDays > 0
        ? new Date(Date.now() + editFormData.videoValidDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined

      // 调用云函数更新权限
      const result = await app.callFunction({
        name: 'admin',
        data: {
          action: 'update',
          collection: 'course_permissions',
          docId: editingPermission._id,
          data: {
            videoAccess: {
              enabled: editFormData.videoEnabled,
              validUntil: videoValidUntil
            },
            status: editFormData.status,
            updatedAt: new Date().toISOString()
          }
        }
      }) as { result: { code: number; message?: string } }

      if (result.result.code === 0) {
        setEditResult({ success: true, message: '权限更新成功！' })
        // 刷新列表
        loadCoursePermissions()
      } else {
        setEditResult({ success: false, message: result.result.message || '更新失败' })
      }
    } catch (error: any) {
      console.error('更新权限失败:', error)
      setEditResult({ success: false, message: error.message || '更新失败，请重试' })
    } finally {
      setEditLoading(false)
    }
  }

  // 撤销权限
  const handleRevokePermission = async (permission: CoursePermission) => {
    if (!confirm(`确定要撤销该用户的课程权限吗？\n\n用户：${permission.userName || '未知'}\n课程：${permission.courseName || permission.courseId}`)) {
      return
    }

    try {
      const result = await app.callFunction({
        name: 'admin',
        data: {
          action: 'update',
          collection: 'course_permissions',
          docId: permission._id,
          data: {
            status: 'revoked',
            revokedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      }) as { result: { code: number; message?: string } }

      if (result.result.code === 0) {
        alert('权限已撤销')
        loadCoursePermissions()
      } else {
        alert(result.result.message || '撤销失败')
      }
    } catch (error: any) {
      console.error('撤销权限失败:', error)
      alert(error.message || '撤销失败，请重试')
    }
  }

  // 加载班级成员
  const loadClassMembers = async () => {
    setLoading(true)
    try {
      // 先获取所有班级
      const classesResult = await classService.getList({ page: 1, pageSize: 100 })
      console.log('[PermissionManagement] 班级列表:', classesResult)
      
      if (classesResult.code !== 0 || !classesResult.data?.list?.length) {
        setClassMembers([])
        setMemberStats({
          totalMembers: 0,
          enrolled: 0,
          learning: 0,
          completed: 0,
          dropped: 0,
          averageAttendance: 0
        })
        return
      }

      // 获取每个班级的成员
      const allMembers: ClassMember[] = []
      for (const cls of classesResult.data.list) {
        try {
          const members = await permissionService.getClassMembers(cls._id, { limit: 100 })
          allMembers.push(...members)
        } catch (e) {
          console.error(`获取班级 ${cls._id} 成员失败:`, e)
        }
      }

      console.log('[PermissionManagement] 班级成员总数:', allMembers.length)

      setClassMembers(allMembers)
      setMemberTotal(allMembers.length)

      // 计算统计
      const stats: ClassMemberStats = {
        totalMembers: allMembers.length,
        enrolled: allMembers.filter(m => m.status === 'enrolled').length,
        learning: allMembers.filter(m => m.status === 'learning').length,
        completed: allMembers.filter(m => m.status === 'completed').length,
        dropped: allMembers.filter(m => m.status === 'dropped').length,
        averageAttendance: 0
      }
      setMemberStats(stats)
    } catch (error) {
      console.error('加载班级成员失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 刷新数据
  const refresh = async () => {
    setRefreshing(true)
    if (activeTab === 'course-permissions') {
      await loadCoursePermissions()
    } else {
      await loadClassMembers()
    }
    setRefreshing(false)
  }

  // ========== 手动添加成员功能 ==========

  // 加载可选班级列表
  const loadAvailableClasses = async () => {
    try {
      const result = await classService.getList({ page: 1, pageSize: 100 })
      if (result.code === 0 && result.data?.list) {
        // 只显示正在报名或进行中的班级
        const activeClasses = result.data.list.filter((c: any) =>
          ['enrolling', 'in_progress'].includes(c.status)
        )
        setAvailableClasses(activeClasses.map((c: any) => ({
          id: c._id,
          name: c.name || `班级-${c._id?.slice(-4) || ''}`,
          status: c.status,
          courseName: c.courseName || c.courseId
        })))
      }
    } catch (error) {
      console.error('加载班级列表失败:', error)
    }
  }

  // 搜索用户 - 同时搜索 members 和 enrollments 集合
  const searchUsers = async () => {
    if (!searchKeyword.trim()) return
    
    setSearching(true)
    setSearchResults([])
    try {
      // 并行搜索两个集合
      const [membersResult, enrollmentsResult] = await Promise.all([
        // 搜索 members 集合
        app.callFunction({
          name: 'admin',
          data: {
            action: 'list',
            collection: 'members',
            query: {
              $or: [
                { name: { $regex: searchKeyword, $options: 'i' } },
                { phone: { $regex: searchKeyword, $options: 'i' } }
              ]
            },
            options: { limit: 20 }
          }
        }) as Promise<{ result: { code: number; data?: any[] } }>,
        // 搜索 enrollments 集合（线下报名/线上报名的用户）
        app.callFunction({
          name: 'admin',
          data: {
            action: 'list',
            collection: 'enrollments',
            query: {
              $or: [
                { name: { $regex: searchKeyword, $options: 'i' } },
                { phone: { $regex: searchKeyword, $options: 'i' } },
                { studentName: { $regex: searchKeyword, $options: 'i' } },
                { studentPhone: { $regex: searchKeyword, $options: 'i' } }
              ]
            },
            options: { limit: 20 }
          }
        }) as Promise<{ result: { code: number; data?: any[] } }>
      ])

      // 合并结果
      const membersList = membersResult.result.code === 0 
        // @ts-ignore
        ? (Array.isArray(membersResult.result.data) ? membersResult.result.data : membersResult.result.data?.list || [])
        : []
      
      const enrollmentsList = enrollmentsResult.result.code === 0
        // @ts-ignore
        ? (Array.isArray(enrollmentsResult.result.data) ? enrollmentsResult.result.data : enrollmentsResult.result.data?.list || [])
        : []

      // 转换 enrollments 数据格式为统一的用户格式
      const formattedEnrollments = enrollmentsList.map((e: any) => ({
        _id: e.userId || e._id,
        name: e.studentName || e.name || '未知',
        phone: e.studentPhone || e.phone || '',
        type: e.source?.includes('offline') ? 'student' : 'user',
        source: e.source || 'unknown',
        _fromEnrollment: true, // 标记来源
        enrollmentId: e._id
      }))

      // 合并并去重（根据 phone）
      const phoneMap = new Map()
      
      // 先添加 members（优先级更高）
      membersList.forEach((m: any) => {
        if (m.phone) phoneMap.set(m.phone, m)
      })
      
      // 再添加 enrollments 中不存在的
      formattedEnrollments.forEach((e: any) => {
        if (e.phone && !phoneMap.has(e.phone)) {
          phoneMap.set(e.phone, e)
        }
      })

      const mergedList = Array.from(phoneMap.values())
      console.log('[PermissionManagement] 搜索用户结果:', { 
        members: membersList.length, 
        enrollments: enrollmentsList.length, 
        merged: mergedList.length 
      })
      
      setSearchResults(mergedList)
    } catch (error) {
      console.error('搜索用户失败:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // 打开添加权限对话框
  const openAddMemberDialog = () => {
    setAddMemberDialogOpen(true)
    setAddMemberStep('search')
    setSearchKeyword('')
    setSearchResults([])
    setSelectedUser(null)
    setSelectedClass(null)
    setVideoEnabled(true)
    setVideoValidDays(365)
    setAddResult(null)
    loadAvailableClasses()
  }

  // 关闭添加成员对话框
  const closeAddMemberDialog = () => {
    setAddMemberDialogOpen(false)
  }

  // 选择用户
  const selectUser = (user: any) => {
    setSelectedUser(user)
    setAddMemberStep('confirm')
  }

  // 返回搜索步骤
  const backToSearch = () => {
    setAddMemberStep('search')
    setSelectedUser(null)
    setSelectedClass(null)
  }

  // 提交添加成员
  const submitAddMember = async () => {
    if (!selectedUser || !selectedClass) return

    setAddMemberLoading(true)
    setAddResult(null)
    try {
      // 计算视频有效期
      const videoValidUntil = videoEnabled
        ? new Date(Date.now() + videoValidDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined

      // 调用 permissionService 添加班级成员
      const result = await permissionService.addClassMember({
        classId: selectedClass.id,
        userId: selectedUser._id,
        userName: selectedUser.name || selectedUser.phone || '未知',
        userPhone: selectedUser.phone,
        className: selectedClass.name,
        courseId: selectedClass.courseId,
        // @ts-ignore
        source: 'admin_grant',
        videoEnabled,
        videoValidUntil
      })

      if (result.code === 0) {
        setAddResult({ success: true, message: '添加成功！用户已成功加入班级。' })
        // 刷新班级成员列表
        loadClassMembers()
      } else {
        setAddResult({ success: false, message: result.message || '添加失败，请重试。' })
      }
    } catch (error: any) {
      console.error('添加班级成员失败:', error)
      setAddResult({ success: false, message: error.message || '添加失败，请重试。' })
    } finally {
      setAddMemberLoading(false)
    }
  }

  // 继续添加下一个
  const continueAddNext = () => {
    setAddMemberStep('search')
    setSearchKeyword('')
    setSearchResults([])
    setSelectedUser(null)
    setSelectedClass(null)
    setAddResult(null)
  }

  // 切换标签
  useEffect(() => {
    if (activeTab === 'course-permissions') {
      loadCoursePermissions()
    } else {
      loadClassMembers()
    }
  }, [activeTab])

  // 过滤数据
  const filteredCoursePermissions = coursePermissions.filter(p => {
    if (!courseSearch) return true
    const search = courseSearch.toLowerCase()
    return (
      p.userId?.toLowerCase().includes(search) ||
      p.userName?.toLowerCase().includes(search) ||
      p.courseName?.toLowerCase().includes(search) ||
      p.courseId?.toLowerCase().includes(search)
    )
  })

  const filteredClassMembers = classMembers.filter(m => {
    if (!memberSearch) return true
    const search = memberSearch.toLowerCase()
    return (
      m.userId?.toLowerCase().includes(search) ||
      m.userName?.toLowerCase().includes(search) ||
      m.className?.toLowerCase().includes(search)
    )
  })

  // 分页数据
  const paginatedCoursePermissions = filteredCoursePermissions.slice(
    (coursePage - 1) * pageSize,
    coursePage * pageSize
  )

  const paginatedClassMembers = filteredClassMembers.slice(
    (memberPage - 1) * pageSize,
    memberPage * pageSize
  )

  return (
    <AdminPageTemplate
      title="权限管理"
      subtitle="管理课程视频权限和班级参与权限"
      // @ts-ignore
      icon={Shield}
    >
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {activeTab === 'course-permissions' && courseStats && (
          <>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-blue-500/20 text-blue-500">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="stat-label">总权限数</p>
                  <p className="stat-value">{courseStats.totalPermissions}</p>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-green-500/20 text-green-500">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="stat-label">有效权限</p>
                  <p className="stat-value">{courseStats.activePermissions}</p>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-red-500/20 text-red-500">
                  <XCircle size={20} />
                </div>
                <div>
                  <p className="stat-label">已过期</p>
                  <p className="stat-value">{courseStats.expiredPermissions}</p>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-purple-500/20 text-purple-500">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="stat-label">购买来源</p>
                  <p className="stat-value">{courseStats.bySource.purchase}</p>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === 'class-members' && memberStats && (
          <>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-blue-500/20 text-blue-500">
                  <Users size={20} />
                </div>
                <div>
                  <p className="stat-label">总权限数</p>
                  <p className="stat-value">{memberStats.totalMembers}</p>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-green-500/20 text-green-500">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <p className="stat-label">学习中</p>
                  <p className="stat-value">{memberStats.learning}</p>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-blue-500/20 text-blue-500">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="stat-label">已报名</p>
                  <p className="stat-value">{memberStats.enrolled}</p>
                </div>
              </div>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-3">
                <div className="stat-icon bg-gray-500/20 text-gray-500">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="stat-label">已结课</p>
                  <p className="stat-value">{memberStats.completed}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 标签页 */}
      <div className="tabs mb-4">
        <button
          className={`tab ${activeTab === 'course-permissions' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('course-permissions')}
        >
          <BookOpen size={16} />
          课程权限
        </button>
        <button
          className={`tab ${activeTab === 'class-members' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('class-members')}
        >
          <Users size={16} />
          班级权限
        </button>
      </div>

      {/* 工具栏 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={activeTab === 'course-permissions' ? '搜索用户/课程...' : '搜索用户/班级...'}
              className="input input-bordered w-full pl-10"
              value={activeTab === 'course-permissions' ? courseSearch : memberSearch}
              onChange={(e) => {
                if (activeTab === 'course-permissions') {
                  setCourseSearch(e.target.value)
                  setCoursePage(1)
                } else {
                  setMemberSearch(e.target.value)
                  setMemberPage(1)
                }
              }}
            />
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          {activeTab === 'class-members' && (
            <button className="btn btn-primary btn-sm" onClick={openAddMemberDialog}>
              <UserPlus size={16} />
              添加班级权限
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
          <button className="btn btn-outline btn-sm">
            <Download size={16} />
            导出
          </button>
        </div>
      </div>

      {/* 课程权限表格 */}
      {activeTab === 'course-permissions' && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th>课程</th>
                      <th>来源</th>
                      <th>视频状态</th>
                      <th>有效期</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCoursePermissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      paginatedCoursePermissions.map((perm) => (
                        <tr key={perm._id}>
                          <td>
                            <div className="font-medium">{perm.userName || '未知'}</div>
                            <div className="text-xs text-gray-500">{perm.userId?.slice(0, 16)}...</div>
                          </td>
                          <td>
                            <div className="font-medium">{perm.courseName || perm.courseId}</div>
                          </td>
                          <td>
                            <span className={`badge ${SOURCE_LABELS[perm.source]?.color || 'badge-ghost'}`}>
                              {SOURCE_LABELS[perm.source]?.text || perm.source}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              {perm.videoAccess?.enabled ? (
                                <Eye className="text-green-500" size={16} />
                              ) : (
                                <EyeOff className="text-red-500" size={16} />
                              )}
                              <span className="text-sm">
                                {perm.videoAccess?.enabled ? '可观看' : '已禁用'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="text-sm">
                              {perm.videoAccess?.validUntil 
                                ? new Date(perm.videoAccess.validUntil).toLocaleDateString('zh-CN')
                                : '-'}
                            </div>
                            {perm.videoAccess?.validUntil && new Date(perm.videoAccess.validUntil) < new Date() && (
                              <span className="text-xs text-red-500">已过期</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${STATUS_LABELS[perm.status]?.color || 'badge-ghost'}`}>
                              {STATUS_LABELS[perm.status]?.text || perm.status}
                            </span>
                          </td>
                          <td>
                            <div className="dropdown dropdown-end">
                              <button tabIndex={0} className="btn btn-ghost btn-xs">
                                <MoreVertical size={14} />
                              </button>
                              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
                                <li>
                                  <a onClick={() => openEditDialog(perm)}>
                                    <Edit size={14} /> 编辑
                                  </a>
                                </li>
                                <li>
                                  <a className="text-red-500" onClick={() => handleRevokePermission(perm)}>
                                    <Trash2 size={14} /> 撤销
                                  </a>
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {courseTotal > pageSize && (
              <div className="flex justify-center items-center gap-2 p-4 border-t">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setCoursePage(p => Math.max(1, p - 1))}
                  disabled={coursePage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm">
                  第 {coursePage} / {Math.ceil(courseTotal / pageSize)} 页
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setCoursePage(p => Math.min(Math.ceil(courseTotal / pageSize), p + 1))}
                  disabled={coursePage >= Math.ceil(courseTotal / pageSize)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 班级权限表格 */}
      {activeTab === 'class-members' && (
        <div className="card bg-base-100 shadow">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>学员</th>
                      <th>班级</th>
                      <th>来源</th>
                      <th>视频权限</th>
                      <th>出勤</th>
                      <th>状态</th>
                      <th>报名时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedClassMembers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-500">
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      paginatedClassMembers.map((member) => (
                        <tr key={member._id}>
                          <td>
                            <div className="font-medium">{member.userName || '未知'}</div>
                            <div className="text-xs text-gray-500">{member.userPhone || member.userId?.slice(0, 11)}</div>
                          </td>
                          <td>
                            <div className="font-medium">{member.className || member.classId}</div>
                          </td>
                          <td>
                            <span className={`badge ${SOURCE_LABELS_FOR_MEMBER[member.source]?.color || (member.source === 'online' ? 'badge-primary' : 'badge-secondary')}`}>
                              {SOURCE_LABELS_FOR_MEMBER[member.source]?.text || (member.source === 'online' ? '线上' : member.source === 'offline' ? '线下' : member.source)}
                            </span>
                          </td>
                          <td>
                            {member.videoEnabled ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <Eye size={14} /> 已开通
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-400">
                                <EyeOff size={14} /> 未开通
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="text-sm">
                              <span className="text-green-600">{member.attendance?.present || 0}</span>
                              <span className="text-gray-400">/</span>
                              <span>{member.attendance?.total || 0}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${MEMBER_STATUS_LABELS[member.status]?.color || 'badge-ghost'}`}>
                              {MEMBER_STATUS_LABELS[member.status]?.text || member.status}
                            </span>
                          </td>
                          <td>
                            <div className="text-sm">
                              {new Date(member.enrolledAt).toLocaleDateString('zh-CN')}
                            </div>
                          </td>
                          <td>
                            <div className="dropdown dropdown-end">
                              <button tabIndex={0} className="btn btn-ghost btn-xs">
                                <MoreVertical size={14} />
                              </button>
                              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32">
                                <li><a>详情</a></li>
                                <li><a className="text-error">移除</a></li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {memberTotal > pageSize && (
              <div className="flex justify-center items-center gap-2 p-4 border-t">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                  disabled={memberPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm">
                  第 {memberPage} / {Math.ceil(memberTotal / pageSize)} 页
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setMemberPage(p => Math.min(Math.ceil(memberTotal / pageSize), p + 1))}
                  disabled={memberPage >= Math.ceil(memberTotal / pageSize)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 手动添加班级权限对话框 */}
      {addMemberDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* 对话框标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <UserPlus className="text-primary" size={20} />
                <h3 className="text-lg font-semibold">添加班级权限</h3>
              </div>
              <button onClick={closeAddMemberDialog} className="btn btn-ghost btn-sm btn-circle">
                <X size={18} />
              </button>
            </div>

            {/* 对话框内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {addMemberStep === 'search' && !addResult && (
                <>
                  {/* 步骤1：搜索用户 */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-content text-xs">1</span>
                      搜索用户
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="输入手机号或姓名搜索"
                        className="input input-bordered flex-1"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={searchUsers}
                        disabled={searching || !searchKeyword.trim()}
                      >
                        {searching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        搜索
                      </button>
                    </div>
                  </div>

                  {/* 搜索结果列表 */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <h5 className="text-sm text-gray-500">搜索结果（点击选择）：</h5>
                      {searchResults.map((user) => (
                        <div
                          key={user._id}
                          className="p-3 border rounded-lg hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                          onClick={() => selectUser(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{user.name || '未设置姓名'}</div>
                              <div className="text-sm text-gray-500">
                                手机: {user.phone || '未绑定'} | 
                                <span className={`ml-1 badge badge-xs ${MEMBER_TYPE_LABELS[user.type]?.color || 'badge-ghost'}`}>
                                  {MEMBER_TYPE_LABELS[user.type]?.text || user.type || '未知'}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="text-gray-400" size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchKeyword && searchResults.length === 0 && !searching && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="mx-auto mb-2" size={40} />
                      <p>未找到匹配的用户</p>
                      <p className="text-sm">请检查手机号或姓名是否正确</p>
                    </div>
                  )}

                  {/* 步骤2：选择班级 */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-content text-xs">2</span>
                      选择班级
                    </h4>
                    <select
                      className="select select-bordered w-full"
                      value={selectedClass?.id || ''}
                      onChange={(e) => {
                        const cls = availableClasses.find(c => c.id === e.target.value)
                        setSelectedClass(cls || null)
                      }}
                    >
                      <option value="">请选择班级</option>
                      {availableClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.status === 'enrolling' ? '(报名中)' : '(进行中)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 提示信息 */}
                  <div className="alert alert-info">
                    <AlertCircle size={18} />
                    <span className="text-sm">
                      管理员手动添加的成员来源将标记为"管理员授权"，可用于为线下报班用户提供班级权限。
                    </span>
                  </div>
                </>
              )}

              {addMemberStep === 'confirm' && !addResult && (
                <>
                  {/* 确认信息 */}
                  <div className="space-y-4">
                    {/* 选中用户信息 */}
                    <div className="bg-base-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="text-primary" size={20} />
                        <span className="font-medium">选中的用户</span>
                      </div>
                      <div className="pl-9 space-y-1 text-sm">
                        <p><span className="text-gray-500">姓名：</span>{selectedUser?.name || '未设置'}</p>
                        <p><span className="text-gray-500">手机：</span>{selectedUser?.phone || '未绑定'}</p>
                        <p><span className="text-gray-500">类型：</span>
                          <span className={`badge badge-xs ${MEMBER_TYPE_LABELS[selectedUser?.type]?.color || 'badge-ghost'}`}>
                            {MEMBER_TYPE_LABELS[selectedUser?.type]?.text || selectedUser?.type || '未知'}
                          </span>
                        </p>
                      </div>
                      <button onClick={backToSearch} className="btn btn-ghost btn-sm mt-3">
                        <Search size={14} /> 重新搜索
                      </button>
                    </div>

                    {/* 选中的班级 */}
                    <div className="bg-base-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <GraduationCap className="text-primary" size={20} />
                        <span className="font-medium">选中的班级</span>
                      </div>
                      <div className="pl-9 space-y-1 text-sm">
                        <p><span className="text-gray-500">班级名称：</span>{selectedClass?.name}</p>
                        <p><span className="text-gray-500">关联课程：</span>{selectedClass?.courseName || '未知'}</p>
                      </div>
                    </div>

                    {/* 权限设置 */}
                    <div className="bg-base-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="text-primary" size={20} />
                        <span className="font-medium">权限设置</span>
                      </div>
                      <div className="pl-9 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            className="toggle toggle-primary toggle-sm"
                            checked={videoEnabled}
                            onChange={(e) => setVideoEnabled(e.target.checked)}
                          />
                          <span className="text-sm">开通视频观看权限</span>
                        </label>
                        
                        {videoEnabled && (
                          <div className="mt-2">
                            <label className="text-sm text-gray-500 mb-1 block">视频权限有效期</label>
                            <select
                              className="select select-bordered select-sm w-full"
                              value={videoValidDays}
                              onChange={(e) => setVideoValidDays(Number(e.target.value))}
                            >
                              <option value={30}>30天</option>
                              <option value={90}>90天</option>
                              <option value={180}>半年（180天）</option>
                              <option value={365}>一年（365天）</option>
                              <option value={730}>两年（730天）</option>
                              <option value={0}>永久有效</option>
                            </select>
                            {videoValidDays === 0 && (
                              <p className="text-xs text-success mt-1">用户将获得永久视频观看权限</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 结果提示 */}
              {addResult && (
                <div className={`alert ${addResult.success ? 'alert-success' : 'alert-error'}`}>
                  {addResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  <div>
                    <p className="font-medium">{addResult.success ? '添加成功！' : '添加失败'}</p>
                    <p className="text-sm">{addResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 对话框底部按钮 */}
            <div className="px-6 py-4 border-t bg-base-100 flex justify-end gap-2">
              {addResult ? (
                <>
                  <button onClick={closeAddMemberDialog} className="btn btn-ghost">
                    关闭
                  </button>
                  {addResult.success && (
                    <button onClick={continueAddNext} className="btn btn-primary">
                      <Plus size={16} /> 继续添加
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={closeAddMemberDialog} className="btn btn-ghost">
                    取消
                  </button>
                  {addMemberStep === 'search' ? (
                    <button
                      className="btn btn-primary"
                      disabled={!selectedClass}
                      onClick={() => {
                        if (selectedUser) setAddMemberStep('confirm')
                      }}
                    >
                      下一步
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={!selectedUser || !selectedClass || addMemberLoading}
                      onClick={submitAddMember}
                    >
                      {addMemberLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                      确认添加
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 编辑权限对话框 */}
      {editDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* 对话框标题 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2">
                <Edit className="text-primary" size={20} />
                <h3 className="text-lg font-semibold">编辑权限</h3>
              </div>
              <button onClick={closeEditDialog} className="btn btn-ghost btn-sm btn-circle">
                <X size={18} />
              </button>
            </div>

            {/* 对话框内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 权限信息 */}
              <div className="bg-base-200 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">用户：</span>{editingPermission?.userName || '未知'}</p>
                  <p><span className="text-gray-500">课程：</span>{editingPermission?.courseName || editingPermission?.courseId}</p>
                  <p><span className="text-gray-500">来源：</span>
                    <span className={`badge badge-xs ${SOURCE_LABELS[editingPermission?.source]?.color || 'badge-ghost'}`}>
                      {SOURCE_LABELS[editingPermission?.source]?.text || editingPermission?.source}
                    </span>
                  </p>
                </div>
              </div>

              {/* 视频权限设置 */}
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={editFormData.videoEnabled}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, videoEnabled: e.target.checked }))}
                  />
                  <span>开通视频观看权限</span>
                </label>

                {editFormData.videoEnabled && (
                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">视频权限有效期</label>
                    <select
                      className="select select-bordered w-full"
                      value={editFormData.videoValidDays}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, videoValidDays: Number(e.target.value) }))}
                    >
                      <option value={30}>30天</option>
                      <option value={90}>90天</option>
                      <option value={180}>半年（180天）</option>
                      <option value={365}>一年（365天）</option>
                      <option value={730}>两年（730天）</option>
                      <option value={0}>永久有效</option>
                    </select>
                    {editFormData.videoValidDays === 0 && (
                      <p className="text-xs text-success mt-1">用户将获得永久视频观看权限</p>
                    )}
                  </div>
                )}

                {/* 权限状态 */}
                <div>
                  <label className="text-sm text-gray-500 mb-2 block">权限状态</label>
                  <select
                    className="select select-bordered w-full"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'expired' | 'revoked' }))}
                  >
                    <option value="active">有效</option>
                    <option value="expired">已过期</option>
                    <option value="revoked">已撤销</option>
                  </select>
                </div>
              </div>

              {/* 结果提示 */}
              {editResult && (
                <div className={`alert ${editResult.success ? 'alert-success' : 'alert-error'} mt-4`}>
                  {editResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  <div>
                    <p className="font-medium">{editResult.success ? '更新成功！' : '更新失败'}</p>
                    <p className="text-sm">{editResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 对话框底部按钮 */}
            <div className="px-6 py-4 border-t bg-base-100 flex justify-end gap-2">
              <button onClick={closeEditDialog} className="btn btn-ghost">
                关闭
              </button>
              <button
                className="btn btn-primary"
                disabled={editLoading}
                onClick={handleSaveEdit}
              >
                {editLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageTemplate>
  )
}
