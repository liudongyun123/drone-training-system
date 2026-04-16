import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { CloudUserAdminService, CloudAdminService } from '../../services/CloudAdminService'
import AdminTablePagination from './AdminTablePagination'
import { formatDateStr } from '@/utils/dateUtils'

interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'banned'
  createdAt: string
  lastLogin?: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    phone: '',
    password: '123456',
    username: '',
    role: 'student' as 'student' | 'admin',
  })
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    role: 'user' as 'user' | 'admin',
  })
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  useEffect(() => {
    loadUsers()
  }, [page, rowsPerPage])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      // ✅ 优化：getAll 直接返回 total
      const result = await CloudUserAdminService.getAll({ offset, limit: rowsPerPage })
      if (result.success && result.data) {
        setUsers(result.data)
        // ✅ 从 getAll 结果中获取 total
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      setSnackbar({ open: true, message: '加载用户列表失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const [total, setTotal] = useState(0)

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setUserForm({
      username: user.username,
      email: user.email,
      role: user.role,
    })
    setEditDialogOpen(true)
  }

  const handleDelete = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleBan = async (user: User) => {
    try {
      await CloudUserAdminService.banUser(user.id)
      await loadUsers()
      setSnackbar({ open: true, message: '用户已封禁', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: '封禁用户失败', severity: 'error' })
    }
  }

  const handleUnban = async (user: User) => {
    try {
      await CloudUserAdminService.unbanUser(user.id)
      await loadUsers()
      setSnackbar({ open: true, message: '用户已解封', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: '解封用户失败', severity: 'error' })
    }
  }

  const handleSaveUser = async () => {
    try {
      if (selectedUser) {
        await CloudUserAdminService.update(selectedUser.id, userForm)
        setSnackbar({ open: true, message: '用户更新成功', severity: 'success' })
      }
      setEditDialogOpen(false)
      await loadUsers()
    } catch (error) {
      setSnackbar({ open: true, message: '保存用户失败', severity: 'error' })
    }
  }

  const handleAddUser = async () => {
    try {
      const result = await CloudAdminService.add('users', {
        password: addForm.password,
        data: {
          phone: addForm.phone,
          username: addForm.username || addForm.phone,
          role: addForm.role,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
      
      if (result.code === 0) {
        setSnackbar({ open: true, message: '用户添加成功', severity: 'success' })
        setAddDialogOpen(false)
        setAddForm({ phone: '', password: '123456', username: '', role: 'student' })
        await loadUsers()
      } else {
        setSnackbar({ open: true, message: result.message || '添加失败', severity: 'error' })
      }
    } catch (error) {
      setSnackbar({ open: true, message: '添加用户失败', severity: 'error' })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return

    try {
      await CloudUserAdminService.delete(selectedUser.id)
      setSnackbar({ open: true, message: '用户删除成功', severity: 'success' })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
      await loadUsers()
    } catch (error) {
      setSnackbar({ open: true, message: '删除用户失败', severity: 'error' })
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error'
  }

  const getStatusLabel = (status: string) => {
    return status === 'active' ? '正常' : '已封禁'
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">用户管理</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          添加用户
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>用户名</TableCell>
              <TableCell>邮箱</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>注册时间</TableCell>
              <TableCell>最后登录</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'admin' ? '管理员' : '普通用户'}
                    color={user.role === 'admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(user.status)}
                    color={getStatusColor(user.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {formatDateStr(user.createdAt)}
                </TableCell>
                <TableCell>
                  {formatDateStr(user.lastLogin) || '-'}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(user)}>
                    <EditIcon />
                  </IconButton>
                  {user.status === 'active' ? (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleBan(user)}
                    >
                      <BlockIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleUnban(user)}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(user)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AdminTablePagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
      />

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑用户</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="用户名"
              defaultValue={selectedUser?.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            />
            <TextField
              fullWidth
              label="邮箱"
              defaultValue={selectedUser?.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select
                label="角色"
                defaultValue={selectedUser?.role || 'user'}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
              >
                <MenuItem value="user">普通用户</MenuItem>
                <MenuItem value="admin">管理员</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveUser} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 添加用户对话框 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加用户</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="手机号"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              placeholder="请输入手机号"
            />
            <TextField
              fullWidth
              label="密码"
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
              placeholder="请输入密码"
              defaultValue="123456"
            />
            <TextField
              fullWidth
              label="用户名（可选）"
              value={addForm.username}
              onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
              placeholder="不填则使用手机号"
            />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select
                label="角色"
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as any })}
              >
                <MenuItem value="student">学生</MenuItem>
                <MenuItem value="admin">管理员</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>取消</Button>
          <Button onClick={handleAddUser} variant="contained" disabled={!addForm.phone}>
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除用户 "{selectedUser?.username}" 吗？此操作无法撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}
