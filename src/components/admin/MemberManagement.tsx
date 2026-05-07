/**
 * 学员管理组件
 * 使用 members 集合统一管理用户/学员/毕业生
 * 支持按 type (user/student/graduate) 分组展示
 */

import React, { useState, useEffect, useCallback } from 'react'
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
  Tabs,
  Tab,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material'
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  EmojiEvents as GraduateIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Book as BookIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import { membersService } from '../../services/membersService'
import { 
  Member, 
  MemberType, 
  MemberSource, 
  MemberSourceLabels, 
  MemberSourceDescriptions 
} from '../../types/member'
import AdminTablePagination from './AdminTablePagination'
import { formatDateStr } from '@/utils/dateUtils'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

// 标签页类型
interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

// 统计卡片组件
function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
              display: 'flex',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function MemberManagement() {
  // 数据状态
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  
  // 筛选状态
  const [tabValue, setTabValue] = useState(0) // 0=全部, 1=用户, 2=学员, 3=毕业
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sourceFilter, setSourceFilter] = useState<MemberSource | 'all'>('all') // ★ 来源筛选
  const [showSourceTip, setShowSourceTip] = useState(false) // ★ 来源说明弹窗
  
  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  
  // 选中的成员
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'user' as MemberType,
    role: 'student' as 'student' | 'teacher' | 'admin',
    status: 'active' as 'active' | 'inactive',
    level: 'beginner',
  })
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'user' as MemberType,
    level: 'beginner',
  })

  // 权限详情弹窗状态
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [permissionLoading, setPermissionLoading] = useState(false)
  const [memberPermissions, setMemberPermissions] = useState<{
    coursePermissions: any[]
    enrollments: any[]
  }>({
    coursePermissions: [],
    enrollments: [],
  })
  
  // 提示状态
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  })

  // 加载数据
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true)
      
      // 导入 ensureAuthenticated 确保用户已登录
      const { ensureAuthenticated } = await import('@/utils/cloudbase')
      await ensureAuthenticated()
      
      const result = await membersService.getAll()
      console.log('[MemberManagement] API 返回:', result)
      if (result && result.success && result.data) {
        setAllMembers(result.data.list || [])
        console.log('[MemberManagement] 加载成员数据:', result.data.list?.length)
      } else {
        console.warn('[MemberManagement] 返回数据格式异常:', result)
        setAllMembers([])
      }
    } catch (error) {
      console.error('加载成员列表失败:', error)
      setSnackbar({ open: true, message: '加载成员列表失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 延迟加载确保认证完成
    const timer = setTimeout(() => {
      loadMembers()
    }, 500)
    return () => clearTimeout(timer)
  }, [loadMembers])

  // 筛选成员
  useEffect(() => {
    let filtered = [...allMembers]
    
    // 按标签页筛选
    const typeMap: (MemberType | 'all')[] = ['all', 'user', 'student', 'graduate']
    const currentType = typeMap[tabValue]
    if (currentType !== 'all') {
      filtered = filtered.filter((m) => m.type === currentType)
    }
    
    // ★ 按来源筛选
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((m) => m.source === sourceFilter)
    }
    
    // 按关键词搜索
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(keyword) ||
          m.phone?.includes(keyword) ||
          m.email?.toLowerCase().includes(keyword) ||
          m._id?.toLowerCase().includes(keyword)
      )
    }
    
    setFilteredMembers(filtered)
    setTotal(filtered.length)
    setPage(0) // 重置页码
  }, [allMembers, tabValue, searchKeyword, sourceFilter])

  // ★ 来源统计
  const sourceStats = {
    online_purchase: allMembers.filter((m) => m.source === 'online_purchase').length,
    online_enroll: allMembers.filter((m) => m.source === 'online_enroll').length,
    offline_enroll: allMembers.filter((m) => m.source === 'offline_enroll').length,
    hybrid: allMembers.filter((m) => m.source === 'hybrid').length,
    admin_import: allMembers.filter((m) => m.source === 'admin_import').length,
    system: allMembers.filter((m) => m.source === 'system').length,
    unknown: allMembers.filter((m) => !m.source).length, // 无来源的
  }

  // 统计计算
  const stats = {
    total: allMembers.length,
    users: allMembers.filter((m) => m.type === 'user').length,
    students: allMembers.filter((m) => m.type === 'student').length,
    graduates: allMembers.filter((m) => m.type === 'graduate').length,
  }

  // ★ 新增：获取学员关联的订单和报名数量
  const getMemberRelationCount = (memberId: string, phone: string) => {
    // 这里通过 members 数据中的 enrolledCourses 数组来统计
    const member = allMembers.find(m => m._id === memberId)
    if (!member) return { orders: 0, enrollments: 0 }
    
    // enrolledCourses 数组中统计课程购买数量
    const courseCount = member.enrolledCourses?.length || 0
    
    // 从 stats 中获取订单数量
    const orderCount = member.stats?.totalOrders || 0
    
    return { 
      orders: orderCount, 
      enrollments: courseCount 
    }
  }

  // 处理编辑
  const handleEdit = (member: Member) => {
    setSelectedMember(member)
    setEditForm({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      type: member.type,
      role: member.role || 'student',
      // @ts-ignore
      status: member.status || 'active',
      level: member.profile?.level || 'beginner',
    })
    setEditDialogOpen(true)
  }

  // 保存编辑
  const handleSave = async () => {
    if (!selectedMember) return
    
    try {
      const updateData = {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        type: editForm.type,
        role: editForm.role,
        status: editForm.status,
        profile: {
          ...selectedMember.profile,
          level: editForm.level,
        },
      }
      
      // @ts-ignore
      await membersService.update(selectedMember._id, updateData)
      setSnackbar({ open: true, message: '保存成功', severity: 'success' })
      setEditDialogOpen(false)
      await loadMembers()
    } catch (error) {
      console.error('保存失败:', error)
      setSnackbar({ open: true, message: '保存失败', severity: 'error' })
    }
  }

  // 手动升级为学员
  const handleUpgradeToStudent = async (member: Member) => {
    try {
      await membersService.upgradeToStudent(member._id, 'manual')
      setSnackbar({ open: true, message: `已将 ${member.name} 升级为正式学员`, severity: 'success' })
      await loadMembers()
    } catch (error) {
      console.error('升级失败:', error)
      setSnackbar({ open: true, message: '升级失败', severity: 'error' })
    }
  }

  // 查看权限详情
  const handleViewPermissions = async (member: Member) => {
    setSelectedMember(member)
    setPermissionLoading(true)
    setPermissionDialogOpen(true)

    try {
      // 1. 获取课程权限（从 enrolledCourses）
      const coursePermissions = member.enrolledCourses || []

      // 2. 获取报名记录（从 enrollments 集合）
      const { adminService } = await import('@/services')
      const enrollmentsResult = await adminService.list('enrollments', {
        phone: member.phone
      }, { limit: 50 })

      const enrollments = enrollmentsResult.code === 0
        ? (Array.isArray(enrollmentsResult.data) ? enrollmentsResult.data : (enrollmentsResult.data?.data || []))
        : []

      setMemberPermissions({
        coursePermissions,
        enrollments,
      })
    } catch (error) {
      console.error('加载权限详情失败:', error)
      setMemberPermissions({
        coursePermissions: [],
        enrollments: [],
      })
    } finally {
      setPermissionLoading(false)
    }
  }

  // 打开新建对话框
  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      phone: '',
      email: '',
      type: 'user',
      level: 'beginner',
    })
    setCreateDialogOpen(true)
  }

  // 创建新成员
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setSnackbar({ open: true, message: '请输入姓名', severity: 'error' })
      return
    }
    
    try {
      const result = await membersService.create({
        name: createForm.name,
        phone: createForm.phone || undefined,
        email: createForm.email || undefined,
        type: createForm.type,
        role: 'student',
        // @ts-ignore
        level: createForm.level,
      })
      
      if (result.success) {
        setSnackbar({ open: true, message: '创建成功', severity: 'success' })
        setCreateDialogOpen(false)
        await loadMembers()
      } else {
        setSnackbar({ open: true, message: result.message || '创建失败', severity: 'error' })
      }
    } catch (error) {
      console.error('创建失败:', error)
      setSnackbar({ open: true, message: '创建失败', severity: 'error' })
    }
  }

  // 获取类型标签
  const getTypeChip = (type: MemberType) => {
    const config = {
      user: { label: '普通用户', color: 'default' as const },
      student: { label: '正式学员', color: 'primary' as const },
      graduate: { label: '毕业学员', color: 'success' as const },
    }
    const c = config[type] || config.user
    return <Chip label={c.label} color={c.color} size="small" />
  }

  // 获取状态标签
  const getStatusChip = (status: string) => {
    return (
      <Chip
        label={status === 'active' ? '正常' : '禁用'}
        color={status === 'active' ? 'success' : 'error'}
        size="small"
      />
    )
  }

  // 获取学习等级标签
  const getLevelChip = (level?: string) => {
    const config: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
      beginner: { label: '初级', color: 'info' },
      intermediate: { label: '中级', color: 'warning' },
      advanced: { label: '高级', color: 'success' },
    }
    const c = config[level || ''] || config.beginner
    return <Chip label={c.label} color={c.color} size="small" variant="outlined" />
  }

  // ★ 获取来源标签
  const getSourceChip = (source?: MemberSource) => {
    if (!source) {
      return <Chip label="未分类" color="default" size="small" variant="outlined" />
    }
    
    const sourceConfig: Record<MemberSource, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'error' }> = {
      'online_purchase': { label: '线上购买', color: 'primary' },       // 蓝色
      'online_enroll': { label: '线上报名', color: 'success' },         // 绿色
      'offline_enroll': { label: '线下报名', color: 'warning' },        // 橙色
      'hybrid': { label: '混合用户', color: 'secondary' },               // 紫色
      'admin_import': { label: '导入', color: 'default' },             // 灰色
      'system': { label: '系统', color: 'default' },                   // 灰色
    }
    const c = sourceConfig[source] || { label: '未知', color: 'default' as const }
    return <Chip label={c.label} color={c.color} size="small" />
  }

  // ★ 来源颜色用于统计卡片
  const sourceColors: Record<string, string> = {
    'online_purchase': '#3b82f6',  // 蓝色
    'online_enroll': '#22c55e',   // 绿色
    'offline_enroll': '#f59e0b',  // 橙色
    'hybrid': '#8b5cf6',          // 紫色
    'admin_import': '#6b7280',    // 灰色
    'system': '#06b6d4',          // 青色
    'unknown': '#9ca3af',         // 浅灰
  }

  // ★ 来源图标
  const sourceIcons: Record<string, React.ReactNode> = {
    'online_purchase': <BookIcon />,
    'online_enroll': <SchoolIcon />,
    'offline_enroll': <SchoolIcon />,
    'hybrid': <TrendingUpIcon />,
    'admin_import': <PersonIcon />,
    'system': <PersonIcon />,
    'unknown': <PersonIcon />,
  }

  // 分页数据
  const paginatedMembers = filteredMembers.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* 标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          学员管理
        </Typography>
        <Button
          startIcon={<HelpOutlineIcon />}
          size="small"
          onClick={() => setShowSourceTip(true)}
        >
          来源说明
        </Button>
      </Box>

      {/* ★ 来源统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="线上购买" value={sourceStats.online_purchase} icon={sourceIcons['online_purchase']} color={sourceColors['online_purchase']} />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="线上报名" value={sourceStats.online_enroll} icon={sourceIcons['online_enroll']} color={sourceColors['online_enroll']} />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="线下报名" value={sourceStats.offline_enroll} icon={sourceIcons['offline_enroll']} color={sourceColors['offline_enroll']} />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="混合用户" value={sourceStats.hybrid} icon={sourceIcons['hybrid']} color={sourceColors['hybrid']} />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="其他" value={sourceStats.admin_import + sourceStats.system + sourceStats.unknown} icon={sourceIcons['unknown']} color={sourceColors['unknown']} />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="总人数" value={stats.total} icon={<PersonIcon />} color="#6366f1" />
        </Grid>
      </Grid>

      {/* 统计卡片（保留原有的角色统计） */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard title="普通用户" value={stats.users} icon={<PersonIcon />} color="#94a3b8" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="正式学员" value={stats.students} icon={<SchoolIcon />} color="#3b82f6" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard title="毕业学员" value={stats.graduates} icon={<GraduateIcon />} color="#22c55e" />
        </Grid>
      </Grid>

      {/* 标签页和搜索 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1, flexWrap: 'wrap', gap: 1 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label={`全部 (${stats.total})`} />
            <Tab label={`用户 (${stats.users})`} />
            <Tab label={`学员 (${stats.students})`} />
            <Tab label={`毕业 (${stats.graduates})`} />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* ★ 来源筛选 */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>来源</InputLabel>
              <Select
                value={sourceFilter}
                label="来源"
                onChange={(e) => setSourceFilter(e.target.value as MemberSource | 'all')}
              >
                <MenuItem value="all">全部来源</MenuItem>
                <MenuItem value="online_purchase">线上购买</MenuItem>
                <MenuItem value="online_enroll">线上报名</MenuItem>
                <MenuItem value="offline_enroll">线下报名</MenuItem>
                <MenuItem value="hybrid">混合用户</MenuItem>
                <MenuItem value="admin_import">导入</MenuItem>
                <MenuItem value="system">系统</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              placeholder="搜索姓名/手机/邮箱..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 200 }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonIcon />}
              onClick={handleOpenCreate}
            >
              新建成员
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 数据表格 */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>手机号</TableCell>
              <TableCell>来源</TableCell> {/* ★ 新增来源列 */}
              <TableCell>类型</TableCell>
              <TableCell>等级</TableCell>
              <TableCell>已购课程</TableCell>
              <TableCell>注册时间</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">暂无数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map((member) => (
                <TableRow key={member._id} hover>
                  <TableCell sx={{ maxWidth: 120, fontSize: 12 }}>{member._id}</TableCell>
                  <TableCell>{member.name || '-'}</TableCell>
                  <TableCell>{member.phone || '-'}</TableCell>
                  <TableCell>{getSourceChip(member.source)}</TableCell> {/* ★ 来源列 */}
                  <TableCell>{getTypeChip(member.type)}</TableCell>
                  <TableCell>{getLevelChip(member.profile?.level)}</TableCell>
                  <TableCell>
                    {member.enrolledCourses?.length || 0} 门
                  </TableCell>
                  <TableCell>
                    {formatDateStr(member.createdAt)}
                  </TableCell>
                  <TableCell>{getStatusChip(member.status || 'active')}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleEdit(member)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleViewPermissions(member)} color="info">
                      <VisibilityIcon />
                    </IconButton>
                    {member.type === 'user' && (
                      <Button
                        size="small"
                        color="primary"
                        variant="outlined"
                        onClick={() => handleUpgradeToStudent(member)}
                        sx={{ ml: 1 }}
                      >
                        升级
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <AdminTablePagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(p) => setPage(p)}
        onRowsPerPageChange={(r) => {
          setRowsPerPage(r)
          setPage(0)
        }}
      />

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑成员信息</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="姓名"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="手机号"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="邮箱"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>成员类型</InputLabel>
              <Select
                label="成员类型"
                value={editForm.type}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as MemberType })}
              >
                <MenuItem value="user">普通用户</MenuItem>
                <MenuItem value="student">正式学员</MenuItem>
                <MenuItem value="graduate">毕业学员</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>学习等级</InputLabel>
              <Select
                label="学习等级"
                value={editForm.level}
                onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
              >
                <MenuItem value="beginner">初级</MenuItem>
                <MenuItem value="intermediate">中级</MenuItem>
                <MenuItem value="advanced">高级</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
              >
                <MenuItem value="active">正常</MenuItem>
                <MenuItem value="inactive">禁用</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新建成员对话框 */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建成员</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="姓名 *"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="手机号"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="邮箱"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>成员类型</InputLabel>
              <Select
                label="成员类型"
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as MemberType })}
              >
                <MenuItem value="user">普通用户</MenuItem>
                <MenuItem value="student">正式学员</MenuItem>
                <MenuItem value="graduate">毕业学员</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>学习等级</InputLabel>
              <Select
                label="学习等级"
                value={createForm.level}
                onChange={(e) => setCreateForm({ ...createForm, level: e.target.value })}
              >
                <MenuItem value="beginner">初级</MenuItem>
                <MenuItem value="intermediate">中级</MenuItem>
                <MenuItem value="advanced">高级</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreate} variant="contained" color="primary">
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* ★ 来源说明弹窗 */}
      <Dialog open={showSourceTip} onClose={() => setShowSourceTip(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutlineIcon color="primary" />
            成员来源说明
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="primary">
              线上线下一体化会员体系
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="body2" fontWeight="bold">
                线上购买 (online_purchase)
              </Typography>
              <Typography variant="caption">
                仅线上购买课程，自主学习视频，无班级，无需考勤
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.main', color: 'success.contrastText' }}>
              <Typography variant="body2" fontWeight="bold">
                线上报名 (online_enroll)
              </Typography>
              <Typography variant="caption">
                线上报名缴费后，分配到线下班级，需参加培训考勤，可选开通视频
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
              <Typography variant="body2" fontWeight="bold">
                线下报名 (offline_enroll)
              </Typography>
              <Typography variant="caption">
                线下到店报名，分配班级，需参加培训考勤，可选开通视频
              </Typography>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
              <Typography variant="body2" fontWeight="bold">
                混合用户 (hybrid)
              </Typography>
              <Typography variant="caption">
                既有线上购课，又有线下/线上报名，同时拥有视频+班级考勤
              </Typography>
            </Paper>
            
            <Divider />
            
            <Typography variant="body2" color="textSecondary">
              <strong>核心区别：</strong><br/>
              • 线上购买用户 - 纯视频学习<br/>
              • 线上/线下报名用户 - 需要参加线下班级培训+考勤
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSourceTip(false)} variant="contained">
            我知道了
          </Button>
        </DialogActions>
      </Dialog>

      {/* 权限详情弹窗 */}
      <Dialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon color="primary" />
            权限详情 - {selectedMember?.name || selectedMember?.phone}
          </Box>
        </DialogTitle>
        <DialogContent>
          {permissionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
              {/* 课程权限 */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BookIcon color="primary" />
                  课程视频权限 ({memberPermissions.coursePermissions.length})
                </Typography>
                {memberPermissions.coursePermissions.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    暂无课程视频权限
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>课程ID</TableCell>
                          <TableCell>来源</TableCell>
                          <TableCell>关联订单</TableCell>
                          <TableCell>获取时间</TableCell>
                          <TableCell>到期时间</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberPermissions.coursePermissions.map((perm: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell sx={{ maxWidth: 150 }}>{perm.courseId}</TableCell>
                            <TableCell>
                              <Chip
                                label={perm.source === 'purchase' ? '购买' : perm.source === 'enrollment' ? '报名' : perm.source === 'grant' ? '授权' : perm.source}
                                size="small"
                                color={perm.source === 'purchase' ? 'primary' : perm.source === 'enrollment' ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>{perm.orderId || '-'}</TableCell>
                            <TableCell>{perm.grantedAt ? formatDateStr(perm.grantedAt) : '-'}</TableCell>
                            <TableCell>{perm.expiresAt ? formatDateStr(perm.expiresAt) : '永久'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* 班级报名记录 */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon color="primary" />
                  班级报名记录 ({memberPermissions.enrollments.length})
                </Typography>
                {memberPermissions.enrollments.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    暂无班级报名记录
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>班级</TableCell>
                          <TableCell>来源</TableCell>
                          <TableCell>状态</TableCell>
                          <TableCell>报名时间</TableCell>
                          <TableCell>关联订单</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberPermissions.enrollments.map((enroll: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{enroll.className || enroll.classId}</TableCell>
                            <TableCell>
                              <Chip
                                label={enroll.source === 'online_enroll' ? '线上报名' : enroll.source === 'offline_enroll' ? '线下报名' : enroll.source}
                                size="small"
                                color={enroll.source === 'online_enroll' ? 'primary' : 'success'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={enroll.status === 'active' ? '正常' : enroll.status === 'completed' ? '已结课' : enroll.status}
                                size="small"
                                color={enroll.status === 'active' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{enroll.enrollmentTime ? formatDateStr(enroll.enrollmentTime) : '-'}</TableCell>
                            <TableCell>{enroll.orderId || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialogOpen(false)} variant="contained">
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示 */}
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
