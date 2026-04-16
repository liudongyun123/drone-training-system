import React, { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Card, CardContent, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Switch,
  FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Tooltip, Stack, Divider, SelectChangeEvent, Autocomplete, FormHelperText,
  Checkbox, FormControlLabel
} from '@mui/material'
import {
  Delete, Edit, Add, Search, Close, Visibility, PushPin, VisibilityOff,
  Launch, Link as LinkIcon, NotificationsActive, School, CalendarMonth,
  ToggleOn, ToggleOff, CheckCircle, Schedule
} from '@mui/icons-material'
import { CloudNoticeAdminService } from '../../services/CloudAdminService'
import { classService } from '../../services/classService'
import { CloudCourseService } from '../../services/CloudCourseService'
import AdminTablePagination from './AdminTablePagination'

// 公告类型
type NoticeType = 'class' | 'course' | 'general' | 'system'
// 链接类型
type LinkType = 'none' | 'classRegistration' | 'coursePurchase' | 'custom'

interface Notice {
  id: string
  title: string
  content: string
  type: NoticeType
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'published' | 'expired'
  target: 'all' | 'vip' | 'new'
  
  // 新增：链接功能
  linkType: LinkType
  linkId?: string       // 班级或课程的ID
  linkUrl?: string      // 自定义链接URL
  linkText?: string     // 按钮文字
  
  // 新增：弹窗功能
  showAsPopup: boolean
  isPopupEnabled: boolean
  popupStyle: 'banner' | 'modal' | 'toast'
  
  // 时间控制
  startTime: string
  endTime: string
  
  // 统计数据
  views: number
  clicks: number
  
  createdAt: string
  updatedAt: string
  isPinned?: boolean
}

interface Stats {
  total: number
  published: number
  draft: number
  expired: number
  popupEnabled: number
}

interface ClassOption {
  id: string
  name: string
  status: string
}

interface CourseOption {
  id: string
  title: string
  status: string
}

export default function NoticeManagement() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [previewNotice, setPreviewNotice] = useState<Notice | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // 统计数据
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0, expired: 0, popupEnabled: 0 })

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [popupFilter, setPopupFilter] = useState<string>('all')

  // 可选的班级和课程
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([])
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null)

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    type: 'general' as NoticeType,
    priority: 'medium' as const,
    status: 'draft' as const,
    target: 'all' as const,
    linkType: 'none' as LinkType,
    linkUrl: '',
    linkText: '',
    showAsPopup: false,
    isPopupEnabled: false,
    popupStyle: 'modal' as const,
    startTime: '',
    endTime: '',
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')

  // 加载可选的班级和课程
  const loadOptions = async () => {
    try {
      // 加载班级
      const classResult = await classService.getList({ pageSize: 100 })
      if (classResult.code === 0 && classResult.data) {
        const classes = classResult.data.list
          .filter((c: any) => c.status === 'enrolling' || c.status === 'enrolled')
          .map((c: any) => ({
            id: c._id || c.id,
            name: c.name || c.title,
            status: c.status
          }))
        setAvailableClasses(classes)
      }

      // 加载课程
      const courseResult = await CloudCourseService.getAll()
      if (courseResult && Array.isArray(courseResult)) {
        const courses = courseResult
          .filter((c: any) => c.status === 'published')
          .map((c: any) => ({
            id: c._id || c.id,
            title: c.title,
            status: c.status
          }))
        setAvailableCourses(courses)
      }
    } catch (err) {
      console.error('加载选项失败:', err)
    }
  }

  // 加载公告
  const loadNotices = useCallback(async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      const result = await CloudNoticeAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })

      if (result.success && result.data) {
        const mappedData = result.data.map((item: any) => ({
          id: item._id || item.id,
          title: item.title || '',
          content: item.content || '',
          type: item.noticeType || item.type || 'general',
          priority: item.priority || 'medium',
          status: item.status || 'draft',
          target: item.target || 'all',
          linkType: item.linkType || 'none',
          linkId: item.linkId || '',
          linkUrl: item.linkUrl || '',
          linkText: item.linkText || '',
          showAsPopup: item.showAsPopup || false,
          isPopupEnabled: item.isPopupEnabled || false,
          popupStyle: item.popupStyle || 'modal',
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          views: item.views || 0,
          clicks: item.clicks || 0,
          createdAt: item.createdAt || '',
          updatedAt: item.updatedAt || '',
          isPinned: item.isPinned || false,
        }))
        setNotices(mappedData)

        // 计算统计数据
        const allData = await CloudNoticeAdminService.getAll({ limit: 1000 })
        if (allData.success && allData.data) {
          const all = allData.data
          setStats({
            total: all.length,
            published: all.filter((n: any) => n.status === 'published').length,
            draft: all.filter((n: any) => n.status === 'draft').length,
            expired: all.filter((n: any) => n.status === 'expired').length,
            popupEnabled: all.filter((n: any) => n.isPopupEnabled && n.showAsPopup).length,
          })
        }

        if (result.total !== undefined) {
          setTotal(result.total)
        }
      } else {
        setError(result.message || '加载公告失败')
      }
    } catch (error) {
      console.error('加载公告失败:', error)
      setError('加载公告失败')
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, searchText])

  useEffect(() => {
    loadNotices()
    loadOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(notices.map(n => n.id))
    }
    setSelectAll(!selectAll)
  }

  // 选择/取消选择
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // 打开编辑弹窗
  const handleOpenDialog = (notice?: Notice) => {
    if (notice) {
      setEditMode(true)
      setEditingNotice(notice)
      setNoticeForm({
        title: notice.title,
        content: notice.content,
        type: notice.type,
        priority: notice.priority,
        status: notice.status,
        target: notice.target,
        linkType: notice.linkType,
        linkUrl: notice.linkUrl || '',
        linkText: notice.linkText || '',
        showAsPopup: notice.showAsPopup,
        isPopupEnabled: notice.isPopupEnabled,
        popupStyle: notice.popupStyle,
        startTime: notice.startTime,
        endTime: notice.endTime,
      })
      
      // 设置已选择的班级或课程
      if (notice.linkType === 'classRegistration' && notice.linkId) {
        const cls = availableClasses.find(c => c.id === notice.linkId)
        setSelectedClass(cls || null)
      } else if (notice.linkType === 'coursePurchase' && notice.linkId) {
        const course = availableCourses.find(c => c.id === notice.linkId)
        setSelectedCourse(course || null)
      }
    } else {
      setEditMode(false)
      setEditingNotice(null)
      setNoticeForm({
        title: '',
        content: '',
        type: 'general',
        priority: 'medium',
        status: 'draft',
        target: 'all',
        linkType: 'none',
        linkUrl: '',
        linkText: '',
        showAsPopup: false,
        isPopupEnabled: false,
        popupStyle: 'modal',
        startTime: '',
        endTime: '',
      })
      setSelectedClass(null)
      setSelectedCourse(null)
    }
    setDialogOpen(true)
    setError('')
    setSuccess('')
  }

  // 关闭弹窗
  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setEditingNotice(null)
    setSelectedClass(null)
    setSelectedCourse(null)
  }

  // 保存公告
  const handleSave = async () => {
    if (!noticeForm.title.trim()) {
      setError('请输入公告标题')
      return
    }
    if (!noticeForm.content.trim()) {
      setError('请输入公告内容')
      return
    }

    try {
      // 构建保存数据
      const noticeData: any = {
        title: noticeForm.title,
        content: noticeForm.content,
        noticeType: noticeForm.type,
        type: noticeForm.type, // 兼容旧字段
        priority: noticeForm.priority,
        status: noticeForm.status,
        target: noticeForm.target,
        linkType: noticeForm.linkType,
        linkText: noticeForm.linkText,
        showAsPopup: noticeForm.showAsPopup,
        isPopupEnabled: noticeForm.isPopupEnabled,
        popupStyle: noticeForm.popupStyle,
        startTime: noticeForm.startTime,
        endTime: noticeForm.endTime,
        updatedAt: new Date().toISOString(),
      }

      // 设置链接ID
      if (noticeForm.linkType === 'classRegistration' && selectedClass) {
        noticeData.linkId = selectedClass.id
      } else if (noticeForm.linkType === 'coursePurchase' && selectedCourse) {
        noticeData.linkId = selectedCourse.id
      } else if (noticeForm.linkType === 'custom') {
        noticeData.linkUrl = noticeForm.linkUrl
      }

      let result
      if (editMode && editingNotice) {
        result = await CloudNoticeAdminService.update(editingNotice.id, noticeData)
      } else {
        noticeData.createdAt = new Date().toISOString()
        result = await CloudNoticeAdminService.add(noticeData)
      }

      if (result.success) {
        setSuccess(editMode ? '公告更新成功' : '公告创建成功')
        setTimeout(() => {
          handleCloseDialog()
          loadNotices()
        }, 1500)
      } else {
        setError(result.error || '保存失败')
      }
    } catch (err) {
      console.error('保存公告失败:', err)
      setError('保存公告失败')
    }
  }

  // 删除公告
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条公告吗？')) return

    try {
      const result = await CloudNoticeAdminService.delete(id)
      if (result.success) {
        setSuccess('公告已删除')
        loadNotices()
        setTimeout(() => setSuccess(''), 2000)
      } else {
        setError(result.error || '删除失败')
      }
    } catch (err) {
      console.error('删除公告失败:', err)
      setError('删除失败')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 条公告吗？`)) return

    try {
      const promises = selectedIds.map(id => CloudNoticeAdminService.delete(id))
      await Promise.all(promises)
      setSuccess(`已删除 ${selectedIds.length} 条公告`)
      setSelectedIds([])
      setSelectAll(false)
      loadNotices()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('批量删除失败:', err)
      setError('批量删除失败')
    }
  }

  // 批量发布
  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) return

    try {
      const promises = selectedIds.map(id => 
        CloudNoticeAdminService.update(id, { status: 'published', updatedAt: new Date().toISOString() })
      )
      await Promise.all(promises)
      setSuccess(`已发布 ${selectedIds.length} 条公告`)
      setSelectedIds([])
      setSelectAll(false)
      loadNotices()
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('批量发布失败:', err)
      setError('批量发布失败')
    }
  }

  // 切换弹窗启用状态
  const handleTogglePopup = async (notice: Notice) => {
    try {
      const result = await CloudNoticeAdminService.update(notice.id, {
        isPopupEnabled: !notice.isPopupEnabled,
        updatedAt: new Date().toISOString(),
      })
      if (result.success) {
        loadNotices()
      }
    } catch (err) {
      console.error('切换弹窗状态失败:', err)
    }
  }

  // 预览公告
  const handlePreview = (notice: Notice) => {
    setPreviewNotice(notice)
    setPreviewOpen(true)
  }

  // 获取链接显示文本
  const getLinkDisplay = (notice: Notice) => {
    if (notice.linkType === 'classRegistration') {
      const cls = availableClasses.find(c => c.id === notice.linkId)
      return cls ? `班级报名: ${cls.name}` : '班级报名'
    } else if (notice.linkType === 'coursePurchase') {
      const course = availableCourses.find(c => c.id === notice.linkId)
      return course ? `课程购买: ${course.title}` : '课程购买'
    } else if (notice.linkType === 'custom' && notice.linkUrl) {
      return `跳转: ${notice.linkUrl}`
    }
    return '无链接'
  }

  // 统计卡片
  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: React.ReactNode }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  )

  // 类型颜色映射
  const getTypeColor = (type: NoticeType) => {
    switch (type) {
      case 'class': return 'primary'
      case 'course': return 'secondary'
      case 'system': return 'error'
      default: return 'default'
    }
  }

  // 类型文本映射
  const getTypeText = (type: NoticeType) => {
    switch (type) {
      case 'class': return '开班公告'
      case 'course': return '课程公告'
      case 'system': return '系统通知'
      default: return '通用公告'
    }
  }

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success'
      case 'draft': return 'default'
      case 'expired': return 'error'
      default: return 'default'
    }
  }

  // 状态文本映射
  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return '已发布'
      case 'draft': return '草稿'
      case 'expired': return '已过期'
      default: return status
    }
  }

  // 筛选后的公告
  const filteredNotices = notices.filter(notice => {
    if (statusFilter !== 'all' && notice.status !== statusFilter) return false
    if (typeFilter !== 'all' && notice.type !== typeFilter) return false
    if (popupFilter === 'popup' && !notice.showAsPopup) return false
    if (popupFilter === 'enabled' && !notice.isPopupEnabled) return false
    return true
  })

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsActive color="primary" />
          公告管理
        </Typography>
        <Typography variant="body2" color="textSecondary">
          管理网站公告，支持弹窗展示和跳转链接
        </Typography>
      </Box>

      {/* 成功/错误提示 */}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* 统计卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="全部公告" value={stats.total} color="primary" icon={<NotificationsActive />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="已发布" value={stats.published} color="success" icon={<CheckCircle />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="草稿" value={stats.draft} color="default" icon={<Edit />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="已过期" value={stats.expired} color="error" icon={<Schedule />} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard title="弹窗公告" value={stats.popupEnabled} color="warning" icon={<Visibility />} />
        </Grid>
      </Grid>

      {/* 操作栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          新建公告
        </Button>
        {selectedIds.length > 0 && (
          <>
            <Button variant="outlined" color="success" onClick={handleBatchPublish}>
              批量发布 ({selectedIds.length})
            </Button>
            <Button variant="outlined" color="error" onClick={handleBatchDelete}>
              批量删除
            </Button>
          </>
        )}
      </Box>

      {/* 筛选栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="搜索公告标题"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="published">已发布</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
              <MenuItem value="expired">已过期</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>类型</InputLabel>
            <Select value={typeFilter} label="类型" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="class">开班公告</MenuItem>
              <MenuItem value="course">课程公告</MenuItem>
              <MenuItem value="system">系统通知</MenuItem>
              <MenuItem value="general">通用公告</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>弹窗</InputLabel>
            <Select value={popupFilter} label="弹窗" onChange={(e) => setPopupFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="popup">有弹窗</MenuItem>
              <MenuItem value="enabled">已启用</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* 公告列表 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell padding="checkbox">
                <Checkbox checked={selectAll} onChange={handleSelectAll} />
              </TableCell>
              <TableCell>标题</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>跳转链接</TableCell>
              <TableCell>弹窗</TableCell>
              <TableCell>发布时间</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredNotices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">暂无公告</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredNotices.map((notice) => (
                <TableRow key={notice.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox 
                      checked={selectedIds.includes(notice.id)} 
                      onChange={() => handleSelect(notice.id)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 500 }}>{notice.title}</Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ 
                      display: 'block', 
                      maxWidth: 300, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {notice.content}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getTypeText(notice.type)} 
                      color={getTypeColor(notice.type) as any}
                      size="small"
                      icon={notice.type === 'class' ? <School /> : notice.type === 'course' ? <CalendarMonth /> : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusText(notice.status)} 
                      color={getStatusColor(notice.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ 
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {notice.linkType !== 'none' && <LinkIcon fontSize="small" color="primary" />}
                      {getLinkDisplay(notice)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {notice.showAsPopup ? (
                      <Tooltip title={notice.isPopupEnabled ? '点击禁用弹窗' : '点击启用弹窗'}>
                        <Switch
                          checked={notice.isPopupEnabled}
                          onChange={() => handleTogglePopup(notice)}
                          color="warning"
                          size="small"
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {notice.startTime ? new Date(notice.startTime).toLocaleDateString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="预览">
                      <IconButton size="small" onClick={() => handlePreview(notice)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => handleOpenDialog(notice)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => handleDelete(notice.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      <AdminTablePagination
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
      />

      {/* 新建/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? '编辑公告' : '新建公告'}
          <IconButton onClick={handleCloseDialog} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {/* 基本信息 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>基本信息</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="公告标题"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                required
                placeholder="请输入公告标题"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>公告类型</InputLabel>
                <Select
                  value={noticeForm.type}
                  label="公告类型"
                  onChange={(e) => setNoticeForm({ ...noticeForm, type: e.target.value as NoticeType })}
                >
                  <MenuItem value="general">通用公告</MenuItem>
                  <MenuItem value="class">开班公告</MenuItem>
                  <MenuItem value="course">课程公告</MenuItem>
                  <MenuItem value="system">系统通知</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="公告内容"
                value={noticeForm.content}
                onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                multiline
                rows={4}
                required
                placeholder="请输入公告内容，支持换行"
              />
            </Grid>

            {/* 链接设置 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon fontSize="small" />
                跳转链接设置
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>链接类型</InputLabel>
                <Select
                  value={noticeForm.linkType}
                  label="链接类型"
                  onChange={(e) => setNoticeForm({ ...noticeForm, linkType: e.target.value as LinkType })}
                >
                  <MenuItem value="none">无链接</MenuItem>
                  <MenuItem value="classRegistration">班级报名</MenuItem>
                  <MenuItem value="coursePurchase">课程购买</MenuItem>
                  <MenuItem value="custom">自定义链接</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {noticeForm.linkType === 'classRegistration' && (
              <Grid item xs={12} md={8}>
                <Autocomplete
                  options={availableClasses}
                  getOptionLabel={(option) => option.name}
                  value={selectedClass}
                  onChange={(_, newValue) => setSelectedClass(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="选择班级" placeholder="搜索班级名称" />
                  )}
                  noOptionsText="无可用班级"
                />
              </Grid>
            )}
            
            {noticeForm.linkType === 'coursePurchase' && (
              <Grid item xs={12} md={8}>
                <Autocomplete
                  options={availableCourses}
                  getOptionLabel={(option) => option.title}
                  value={selectedCourse}
                  onChange={(_, newValue) => setSelectedCourse(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="选择课程" placeholder="搜索课程名称" />
                  )}
                  noOptionsText="无可用课程"
                />
              </Grid>
            )}
            
            {noticeForm.linkType === 'custom' && (
              <>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="自定义链接"
                    value={noticeForm.linkUrl}
                    onChange={(e) => setNoticeForm({ ...noticeForm, linkUrl: e.target.value })}
                    placeholder="https://example.com"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="按钮文字"
                    value={noticeForm.linkText}
                    onChange={(e) => setNoticeForm({ ...noticeForm, linkText: e.target.value })}
                    placeholder="查看详情"
                  />
                </Grid>
              </>
            )}

            {/* 弹窗设置 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility fontSize="small" />
                首页弹窗设置
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={noticeForm.showAsPopup}
                    onChange={(e) => setNoticeForm({ ...noticeForm, showAsPopup: e.target.checked })}
                  />
                }
                label="启用弹窗"
              />
            </Grid>
            {noticeForm.showAsPopup && (
              <>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>弹窗样式</InputLabel>
                    <Select
                      value={noticeForm.popupStyle}
                      label="弹窗样式"
                      onChange={(e) => setNoticeForm({ ...noticeForm, popupStyle: e.target.value as any })}
                    >
                      <MenuItem value="modal">模态弹窗</MenuItem>
                      <MenuItem value="banner">顶部横幅</MenuItem>
                      <MenuItem value="toast">轻提示</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={noticeForm.isPopupEnabled}
                        onChange={(e) => setNoticeForm({ ...noticeForm, isPopupEnabled: e.target.checked })}
                      />
                    }
                    label="立即启用"
                  />
                </Grid>
              </>
            )}

            {/* 其他设置 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>其他设置</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={noticeForm.priority}
                  label="优先级"
                  onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value as any })}
                >
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>发布状态</InputLabel>
                <Select
                  value={noticeForm.status}
                  label="发布状态"
                  onChange={(e) => setNoticeForm({ ...noticeForm, status: e.target.value as any })}
                >
                  <MenuItem value="draft">草稿</MenuItem>
                  <MenuItem value="published">立即发布</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="datetime-local"
                label="开始时间"
                InputLabelProps={{ shrink: true }}
                value={noticeForm.startTime}
                onChange={(e) => setNoticeForm({ ...noticeForm, startTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="datetime-local"
                label="结束时间"
                InputLabelProps={{ shrink: true }}
                value={noticeForm.endTime}
                onChange={(e) => setNoticeForm({ ...noticeForm, endTime: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 预览弹窗 */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          公告预览
          <IconButton onClick={() => setPreviewOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewNotice && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Chip 
                label={getTypeText(previewNotice.type)} 
                color={getTypeColor(previewNotice.type) as any}
                size="small"
                sx={{ mb: 2 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                {previewNotice.title}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                {previewNotice.content}
              </Typography>
              {previewNotice.linkType !== 'none' && (
                <Button 
                  variant="contained" 
                  startIcon={<Launch />}
                  sx={{ mt: 2 }}
                >
                  {previewNotice.linkText || '查看详情'}
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
