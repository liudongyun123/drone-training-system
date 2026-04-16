// ============================================================================
// 角色权限管理 - 纯Tailwind CSS版本
// ============================================================================
import React, { useState, useEffect } from 'react'
import { Search as SearchIcon, Plus, Edit2, Trash2, X, Check, Shield, Loader2 } from 'lucide-react'
import { CloudRoleAdminService } from '../../services/CloudAdminService'

interface Permission {
  id: string
  name: string
  code: string
  description: string
}

interface Role {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
  createdAt: string
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [permissionsLoading, setPermissionsLoading] = useState(true)

  // 角色表单状态
  const [roleForm, setRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    permissions: [] as string[],
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')

  // 从 API 加载权限列表
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        setPermissionsLoading(true)
        const systemPermissions: Permission[] = [
          { id: '1', name: '用户管理', code: 'user:manage', description: '管理用户信息' },
          { id: '2', name: '订单管理', code: 'order:manage', description: '管理订单信息' },
          { id: '3', name: '课程管理', code: 'course:manage', description: '管理课程信息' },
          { id: '4', name: '题库管理', code: 'question:manage', description: '管理题库信息' },
          { id: '5', name: '试卷管理', code: 'exam:manage', description: '管理试卷信息' },
          { id: '6', name: '财务管理', code: 'finance:manage', description: '管理财务数据' },
          { id: '7', name: '数据查看', code: 'data:view', description: '查看数据统计' },
          { id: '8', name: '系统设置', code: 'system:setting', description: '系统配置管理' },
        ]
        setPermissions(systemPermissions)
      } catch (error) {
        console.error('加载权限列表失败:', error)
        setPermissions([])
      } finally {
        setPermissionsLoading(false)
      }
    }

    loadPermissions()
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      const result = await CloudRoleAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })
      if (result.success && result.data) {
        setRoles(result.data)
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      } else {
        setError(result.message || '加载角色失败')
      }
    } catch (error) {
      console.error('加载角色失败:', error)
      setError('加载角色失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setEditMode(true)
      setEditingRole(role)
      setRoleForm({
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: role.permissions,
      })
    } else {
      setEditMode(false)
      setEditingRole(null)
      setRoleForm({
        name: '',
        code: '',
        description: '',
        permissions: [],
      })
    }
    setDialogOpen(true)
    setError('')
    setSuccess('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setEditingRole(null)
    setRoleForm({
      name: '',
      code: '',
      description: '',
      permissions: [],
    })
  }

  const handlePermissionChange = (permissionId: string) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }))
  }

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      setError('请输入角色名称')
      return
    }
    if (!roleForm.code.trim()) {
      setError('请输入角色编码')
      return
    }
    if (!/^[a-z_]+$/.test(roleForm.code)) {
      setError('角色编码只能包含小写字母和下划线')
      return
    }

    if (editMode && editingRole) {
      try {
        const result = await CloudRoleAdminService.update(editingRole.id, roleForm)
        if (result.success) {
          setSuccess('角色更新成功')
          await loadRoles()
          setTimeout(() => {
            handleCloseDialog()
            setSuccess('')
          }, 1500)
        } else {
          setError(result.error || '更新失败')
          setTimeout(() => setError(''), 3000)
        }
      } catch (error) {
        console.error('更新角色失败:', error)
        setError('更新角色失败')
        setTimeout(() => setError(''), 3000)
      }
    } else {
      try {
        const result = await CloudRoleAdminService.add(roleForm)
        if (result.success) {
          setSuccess('角色创建成功')
          await loadRoles()
          setTimeout(() => {
            handleCloseDialog()
            setSuccess('')
          }, 1500)
        } else {
          setError(result.error || '创建失败')
          setTimeout(() => setError(''), 3000)
        }
      } catch (error) {
        console.error('创建角色失败:', error)
        setError('创建角色失败')
        setTimeout(() => setError(''), 3000)
      }
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('确定要删除这个角色吗?')) {
      try {
        const result = await CloudRoleAdminService.delete(roleId)
        if (result.success) {
          setSuccess('角色删除成功')
          await loadRoles()
          setTimeout(() => setSuccess(''), 2000)
        } else {
          setError(result.error || '删除失败')
        }
      } catch (error) {
        console.error('删除角色失败:', error)
        setError('删除角色失败')
      }
    }
  }

  const getPermissionName = (permissionId: string) => {
    const permission = permissions.find(p => p.id === permissionId)
    return permission ? permission.name : permissionId
  }

  useEffect(() => {
    loadRoles()
  }, [page, rowsPerPage, searchText])

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">角色权限管理</h2>
        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索角色..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setPage(0)
              }}
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {/* 新增按钮 */}
          <button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增角色
          </button>
        </div>
      </div>

      {/* 提示信息 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span className="flex-1">{success}</span>
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-600">加载中...</span>
        </div>
      ) : (
        <>
          {/* 表格 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">角色名称</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">角色编码</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">描述</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">权限数量</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">创建时间</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      暂无角色数据
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{role.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded font-mono text-xs">
                          {role.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{role.description || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
                          {role.permissions.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{role.createdAt}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenDialog(role)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              共 <span className="font-medium">{total}</span> 条记录
            </div>
            <div className="flex items-center gap-2">
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setPage(0)
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={10}>10条/页</option>
                <option value={20}>20条/页</option>
                <option value={50}>50条/页</option>
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm">
                  第 {page + 1} / {Math.ceil(total / rowsPerPage) || 1} 页
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / rowsPerPage) - 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 弹窗 */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {editMode ? '编辑角色' : '新增角色'}
                </h3>
              </div>
              <button
                onClick={handleCloseDialog}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* 角色名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  角色名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入角色名称"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* 角色编码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  角色编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleForm.code}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="只能包含小写字母和下划线"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">只能包含小写字母和下划线，如：admin_role</p>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">描述</label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请输入角色描述"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* 权限配置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">权限配置</label>
                {permissionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                ) : permissions.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
                    暂无可用权限配置
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={roleForm.permissions.includes(permission.id)}
                          onChange={() => handlePermissionChange(permission.id)}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800">{permission.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{permission.code}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseDialog}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveRole}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
