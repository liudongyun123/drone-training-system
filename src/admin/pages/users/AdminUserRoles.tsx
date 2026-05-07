// ============================================================================
// 管理员角色管理页面
// 功能：增删改查管理员/教师账号
// ============================================================================

import { useState, useEffect } from 'react'
import { useConfirm } from '@/admin/hooks/useConfirm'
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate'
import { adminService } from '@/services'
import { ADMIN_ROLE_OPTIONS, ROLE_LABELS, PERMISSION_LABELS } from '@/types/userRole'
import type { UserRoleRecord, SystemRole } from '@/types/userRole'
import {
  Shield, Users, Plus, Edit2, Trash2, Search, RefreshCw,
  X, Check, ChevronLeft, ChevronRight, MoreVertical,
  Phone, User, Lock, Unlock, AlertCircle, CheckCircle,
  BookOpen, GraduationCap, Calendar, Award, DollarSign,
  Layout, Megaphone, Settings, FileText
} from 'lucide-react'

// 权限分组 - 增加图标和颜色标识
const PERMISSION_GROUPS: Record<string, { perms: string[]; icon: typeof Shield; color: string }> = {
  '课程': { perms: ['admin:course', 'admin:category', 'admin:comment'], icon: BookOpen, color: 'blue' },
  '学员': { perms: ['admin:member', 'admin:permission'], icon: Users, color: 'green' },
  '教师': { perms: ['admin:teacher'], icon: GraduationCap, color: 'indigo' },
  '教学': { perms: ['admin:schedule', 'admin:attendance', 'admin:exam', 'admin:practice'], icon: Calendar, color: 'amber' },
  '证书': { perms: ['admin:certificate'], icon: Award, color: 'emerald' },
  '财务': { perms: ['admin:order', 'admin:finance'], icon: DollarSign, color: 'rose' },
  '运营': { perms: ['admin:page', 'admin:banner', 'admin:notice', 'admin:marketing'], icon: Megaphone, color: 'violet' },
  '系统': { perms: ['admin:log', 'admin:system', 'admin:role'], icon: Settings, color: 'slate' },
}

// 分组颜色映射
const GROUP_COLOR_MAP: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-200', lightBg: 'bg-blue-50' },
  green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-200', lightBg: 'bg-green-50' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', border: 'border-indigo-200', lightBg: 'bg-indigo-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', lightBg: 'bg-amber-50' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200', lightBg: 'bg-rose-50' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-200', lightBg: 'bg-violet-50' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', border: 'border-slate-200', lightBg: 'bg-slate-50' },
}

export default function AdminUserRoles() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [roles, setRoles] = useState<UserRoleRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingRecord, setEditingRecord] = useState<UserRoleRecord | null>(null)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // 表单数据
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    role: 'admin' as SystemRole,
    description: '',
    permissions: [] as string[],
  })

  const pageSize = 15

  // 加载数据 - 使用云函数查询（绕过安全规则限制）
  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const query: Record<string, any> = {}
      if (filterRole) query.role = filterRole
      if (search) {
        query.$or = [
          { phone: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      }
      
      const result = await adminService.list('user_roles', query, { page, limit: pageSize })
      
      if (result.code === 0) {
        const list = Array.isArray(result.data) ? result.data : (result.data?.data || result.data?.list || [])
        setRoles(list)
        setTotal(result.total || list.length)
      } else {
        console.error('加载失败:', result.message)
      }
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page, filterRole, search])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.menu-button')) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // 刷新
  const refresh = async () => {
    setRefreshing(true)
    await loadData(false)
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
    loadData()
  }

  // 打开新增弹窗
  const openAddDialog = () => {
    setEditMode(false)
    setEditingRecord(null)
    setFormData({
      phone: '',
      name: '',
      role: 'admin',
      description: '',
      permissions: [],
    })
    setFormError('')
    setFormSuccess('')
    setDialogOpen(true)
  }

  // 打开编辑弹窗
  const openEditDialog = (record: UserRoleRecord) => {
    setEditMode(true)
    setEditingRecord(record)
    setFormData({
      phone: record.phone,
      name: record.name,
      role: record.role,
      description: record.description || '',
      permissions: record.permissions || [],
    })
    setFormError('')
    setFormSuccess('')
    setDialogOpen(true)
  }

  // 关闭弹窗
  const closeDialog = () => {
    setDialogOpen(false)
    setEditingRecord(null)
    setFormError('')
    setFormSuccess('')
  }

  // 切换权限
  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }))
  }

  // 全选分组权限
  const toggleGroupPermission = (groupName: string) => {
    const groupConfig = PERMISSION_GROUPS[groupName]
    if (!groupConfig) return
    const perms = groupConfig.perms
    const allSelected = perms.every(p => formData.permissions.includes(p))
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !perms.includes(p))
        : [...new Set([...prev.permissions, ...perms])]
    }))
  }

  // 保存
  const handleSave = async () => {
    setFormError('')
    setFormSuccess('')

    // 验证
    if (!formData.phone.trim()) {
      setFormError('请输入手机号')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setFormError('请输入正确的手机号')
      return
    }
    if (!formData.name.trim()) {
      setFormError('请输入姓名')
      return
    }

    try {
      if (editMode && editingRecord) {
        // 更新 - 使用云函数
        const result = await adminService.update('user_roles', editingRecord._id!, {
          name: formData.name,
          role: formData.role,
          roleName: ROLE_LABELS[formData.role],
          description: formData.description,
          permissions: formData.permissions,
          updatedAt: new Date().toISOString(),
        })

        if (result.code === 0) {
          setFormSuccess('更新成功')
          await loadData(false)
          setTimeout(closeDialog, 1500)
        } else {
          setFormError(result.message || '更新失败')
        }
      } else {
        // 新增 - 使用云函数
        const result = await adminService.add('user_roles', {
          phone: formData.phone,
          name: formData.name,
          role: formData.role,
          roleName: ROLE_LABELS[formData.role],
          description: formData.description,
          permissions: formData.permissions,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        if (result.code === 0) {
          setFormSuccess('创建成功')
          await loadData(false)
          setTimeout(closeDialog, 1500)
        } else {
          setFormError(result.message || '创建失败')
        }
      }
    } catch (error: any) {
      setFormError(error.message || '操作失败')
    }
  }

  // 删除
  const handleDelete = async (record: UserRoleRecord) => {
    const ok = await confirm({ title: '删除确认', message: `确定要删除 ${record.name} (${record.phone}) 吗？`, variant: 'danger' })
    if (!ok) return

    try {
      const result = await adminService.delete('user_roles', record._id!)
      if (result.code === 0) {
        await loadData(false)
      } else {
        await confirm({ title: '提示', message: result.message || '删除失败', variant: 'info' })
      }
    } catch (error: any) {
      console.error('删除失败:', error)
      await confirm({ title: '提示', message: error.message || '删除失败', variant: 'info' })
    }
  }

  // 禁用/启用
  const handleToggleStatus = async (record: UserRoleRecord) => {
    const newStatus = record.status === 'active' ? 'disabled' : 'active'
    const result = await adminService.update('user_roles', record._id!, { 
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })
    if (result.code === 0) {
      await loadData(false)
    }
  }

  // 获取角色颜色
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700'
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'teacher': return 'bg-blue-100 text-blue-700'
      case 'student': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <AdminPageTemplate
      title="管理员账号"
      subtitle="管理管理员、教师等系统账号"
      // @ts-ignore
      icon={Shield}
    >
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stats-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-purple-500/20 text-purple-500">
              <Shield size={20} />
            </div>
            <div>
              <p className="stat-label">总账号数</p>
              <p className="stat-value">{total}</p>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-red-500/20 text-red-500">
              <Lock size={20} />
            </div>
            <div>
              <p className="stat-label">超级管理员</p>
              <p className="stat-value">{(roles || []).filter(r => r.role === 'super_admin').length}</p>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-purple-500/20 text-purple-500">
              <Users size={20} />
            </div>
            <div>
              <p className="stat-label">管理员</p>
              <p className="stat-value">{(roles || []).filter(r => r.role === 'admin').length}</p>
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon bg-blue-500/20 text-blue-500">
              <User size={20} />
            </div>
            <div>
              <p className="stat-label">教师</p>
              <p className="stat-value">{(roles || []).filter(r => r.role === 'teacher').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 flex-1">
          {/* 搜索 */}
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索手机号/姓名..."
              className="input input-bordered w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* 角色筛选 */}
          <select
            className="select select-bordered"
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1) }}
          >
            <option value="">全部角色</option>
            {ADMIN_ROLE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button className="btn btn-outline btn-sm" onClick={handleSearch}>
            搜索
          </button>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddDialog}>
            <Plus size={16} />
            添加账号
          </button>
        </div>
      </div>

      {/* 表格 */}
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
                    <th>姓名</th>
                    <th>手机号</th>
                    <th>角色</th>
                    <th>权限数</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(!roles || roles.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    roles.map((record) => (
                      <tr key={record._id}>
                        <td>
                          <div className="font-medium">{record.name}</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Phone size={14} className="text-gray-400" />
                            <span>{record.phone}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getRoleBadgeClass(record.role)}`}>
                            {record.roleName}
                          </span>
                        </td>
                        <td>
                          <span className="text-primary font-medium">
                            {record.permissions?.length || 0}
                          </span>
                          <span className="text-gray-400 text-sm"> 个</span>
                        </td>
                        <td>
                          {record.status === 'active' ? (
                            <span className="badge badge-success gap-1">
                              <CheckCircle size={12} />
                              正常
                            </span>
                          ) : (
                            <span className="badge badge-error gap-1">
                              <AlertCircle size={12} />
                              禁用
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">
                            {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </td>
                        <td>
                          <div className="relative" style={{ position: 'relative' }}>
                            <button 
                              type="button"
                              className="btn btn-ghost btn-xs menu-button"
                              onClick={() => setOpenMenuId(openMenuId === record._id ? null : record._id!)}
                            >
                              <MoreVertical size={14} />
                            </button>
                            {openMenuId === record._id && (
                              <div 
                                className="fixed bg-base-100 rounded-lg shadow-xl border p-1 min-w-[120px] z-[9999]"
                                style={{
                                  right: '20px',
                                  marginTop: '4px'
                                }}
                              >
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded text-left"
                                  onClick={() => { openEditDialog(record); setOpenMenuId(null) }}
                                >
                                  <Edit2 size={14} />
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded text-left"
                                  onClick={() => { handleToggleStatus(record); setOpenMenuId(null) }}
                                >
                                  {record.status === 'active' ? (
                                    <>
                                      <Lock size={14} />
                                      禁用
                                    </>
                                  ) : (
                                    <>
                                      <Unlock size={14} />
                                      启用
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-200 rounded text-error text-left"
                                  onClick={() => { handleDelete(record); setOpenMenuId(null) }}
                                >
                                  <Trash2 size={14} />
                                  删除
                                </button>
                              </div>
                            )}
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
          {total > pageSize && (
            <div className="flex justify-center items-center gap-2 p-4 border-t">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm">
                第 {page} / {Math.ceil(total / pageSize)} 页
              </span>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 弹窗 */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {editMode ? '编辑账号' : '添加账号'}
                  </h3>
                  <p className="text-sm text-gray-500">配置账号角色和权限</p>
                </div>
              </div>
              <button onClick={closeDialog} className="btn btn-ghost btn-sm btn-circle">
                <X size={20} />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 overflow-y-auto max-h-[65vh]">
              {/* 提示 */}
              {formError && (
                <div className="alert alert-error mb-4">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="alert alert-success mb-4">
                  <CheckCircle size={16} />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* 基本信息区域 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">基本信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 手机号 */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">手机号 <span className="text-error">*</span></span>
                    </label>
                    <input
                      type="tel"
                      className="input input-bordered w-full"
                      placeholder="请输入手机号"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={editMode}
                    />
                  </div>

                  {/* 姓名 */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">姓名 <span className="text-error">*</span></span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="请输入姓名"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* 角色 */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">角色</span>
                    </label>
                    <select
                      className="select select-bordered w-full"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        role: e.target.value as SystemRole,
                        roleName: ROLE_LABELS[e.target.value as SystemRole]
                      }))}
                    >
                      {ADMIN_ROLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} - {opt.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 描述 */}
                  <div>
                    <label className="label">
                      <span className="label-text font-medium">备注</span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="可选，填写备注信息"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* 权限配置区域 - 优化版 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} />
                    权限配置
                  </h4>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400">已选择</span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {formData.permissions.length}
                    </span>
                    <span className="text-gray-400">个权限</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-base-200/60 to-base-200/30 rounded-2xl p-5 border border-base-300/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {Object.entries(PERMISSION_GROUPS).map(([groupName, groupConfig]) => {
                      const { perms, icon: GroupIcon, color } = groupConfig
                      const colors = GROUP_COLOR_MAP[color] || GROUP_COLOR_MAP.slate
                      const selectedCount = perms.filter(p => formData.permissions.includes(p)).length
                      const isAllSelected = perms.every(p => formData.permissions.includes(p))
                      const isNoneSelected = selectedCount === 0
                      
                      return (
                        <div 
                          key={groupName} 
                          className={`bg-white rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${isAllSelected ? 'border-primary/40 ring-1 ring-primary/10' : colors.border}`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm checkbox-primary"
                              checked={isAllSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = !isAllSelected && !isNoneSelected;
                              }}
                              onChange={() => toggleGroupPermission(groupName)}
                            />
                            <div className={`w-8 h-8 rounded-lg ${colors.lightBg} flex items-center justify-center`}>
                              <GroupIcon size={16} className={colors.text} />
                            </div>
                            <span className="font-semibold text-sm">{groupName}</span>
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                              isAllSelected ? 'bg-primary text-white shadow-sm' : 
                              isNoneSelected ? 'bg-gray-100 text-gray-400' : 
                              `${colors.bg}/10 ${colors.text}`
                            }`}>
                              {selectedCount}/{perms.length}
                            </span>
                          </label>
                          <div className="flex flex-wrap gap-1.5 mt-3 ml-9">
                            {perms.map(perm => (
                              <label
                                key={perm}
                                className="cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={formData.permissions.includes(perm)}
                                  onChange={() => togglePermission(perm)}
                                />
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                                  formData.permissions.includes(perm)
                                    ? `${colors.bg} text-white shadow-sm scale-[1.02]`
                                    : `${colors.lightBg} ${colors.text} hover:opacity-70`
                                }`}>
                                  {PERMISSION_LABELS[perm] || perm}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* 快捷操作栏 */}
                  <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      共 {Object.values(PERMISSION_GROUPS).reduce((sum, g) => sum + g.perms.length, 0)} 个可分配权限
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs btn-outline btn-primary"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          permissions: Object.values(PERMISSION_GROUPS).flatMap(g => g.perms)
                        }))}
                      >
                        全选所有
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                      >
                        清空全部
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部 */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-base-200">
              <button onClick={closeDialog} className="btn btn-ghost">
                取消
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                {editMode ? '保存修改' : '创建账号'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </AdminPageTemplate>
  )
}
