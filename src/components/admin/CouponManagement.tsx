import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  CircularProgress,
  MenuItem,
  InputAdornment,
} from '@mui/material'
import { Delete, Edit, Search as SearchIcon } from '@mui/icons-material'
import { CloudCouponAdminService } from '../../services/CloudAdminService'
import AdminTablePagination from './AdminTablePagination'

interface Coupon {
  id: string
  name: string
  code: string
  type: 'discount' | 'fixed' | 'free'
  value: number
  minAmount: number
  totalCount: number
  usedCount: number
  courseLimit: 'all' | 'specific' | 'category'
  courseId?: string
  categoryId?: string
  status: 'active' | 'inactive' | 'expired'
  startTime: string
  endTime: string
  createdAt: string
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [couponForm, setCouponForm] = useState({
    name: '',
    code: '',
    type: 'discount' as const,
    value: 0,
    minAmount: 0,
    totalCount: 100,
    usedCount: 0,
    courseLimit: 'all' as const,
    courseId: '',
    categoryId: '',
    status: 'active' as const,
    startTime: '',
    endTime: '',
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(9)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 防抖处理搜索输入
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value)
    
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // 设置新的定时器，300ms后更新搜索值
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchText(value)
      setPage(0) // 重置到第一页
    }, 300)
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    loadCoupons()
  }, [page, rowsPerPage, debouncedSearchText])

  const loadCoupons = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      // ✅ 优化：getAll 直接返回 total
      const result = await CloudCouponAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: debouncedSearchText || undefined,
      })
      console.log('loadCoupons result:', result)
      if (result.success && result.data) {
        setCoupons(result.data)
        // ✅ 从 getAll 结果中获取 total
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      } else {
        setError(result.message || '加载优惠券失败')
      }
    } catch (error) {
      console.error('加载优惠券失败:', error)
      setError('加载优惠券失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditMode(true)
      setEditingCoupon(coupon)
      setCouponForm({
        name: coupon.name,
        code: coupon.code,
        // @ts-ignore
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        totalCount: coupon.totalCount,
        usedCount: coupon.usedCount,
        // @ts-ignore
        courseLimit: coupon.courseLimit,
        courseId: coupon.courseId || '',
        categoryId: coupon.categoryId || '',
        // @ts-ignore
        status: coupon.status,
        startTime: coupon.startTime,
        endTime: coupon.endTime,
      })
    } else {
      setEditMode(false)
      setEditingCoupon(null)
      setCouponForm({
        name: '',
        code: '',
        type: 'discount',
        value: 0,
        minAmount: 0,
        totalCount: 100,
        usedCount: 0,
        courseLimit: 'all',
        courseId: '',
        categoryId: '',
        status: 'active',
        startTime: '',
        endTime: '',
      })
    }
    setDialogOpen(true)
    setError('')
    setSuccess('')
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditMode(false)
    setEditingCoupon(null)
    setCouponForm({
      name: '',
      code: '',
      type: 'discount',
      value: 0,
      minAmount: 0,
      totalCount: 100,
      usedCount: 0,
      courseLimit: 'all',
      courseId: '',
      categoryId: '',
      status: 'active',
      startTime: '',
      endTime: '',
    })
  }

  const handleSaveCoupon = async () => {
    if (!couponForm.name.trim()) {
      setError('请输入优惠券名称')
      return
    }
    if (!couponForm.code.trim()) {
      setError('请输入优惠码')
      return
    }
    // @ts-ignore
    if (couponForm.value <= 0 && couponForm.type !== 'free') {
      setError('请输入有效的优惠金额/折扣')
      return
    }

    if (editMode && editingCoupon) {
      try {
        const result = await CloudCouponAdminService.update(editingCoupon.id, couponForm)
        if (result.success) {
          setSuccess('优惠券更新成功')
          await loadCoupons()
          setTimeout(() => {
            handleCloseDialog()
            setSuccess('')
          }, 1500)
        } else {
          setError(result.error || '更新失败')
          setTimeout(() => setError(''), 3000)
        }
      } catch (error) {
        console.error('更新优惠券失败:', error)
        setError('更新优惠券失败')
        setTimeout(() => setError(''), 3000)
      }
    } else {
      try {
        const result = await CloudCouponAdminService.add(couponForm)
        if (result.success) {
          setSuccess('优惠券创建成功')
          await loadCoupons()
          setTimeout(() => {
            handleCloseDialog()
            setSuccess('')
          }, 1500)
        } else {
          setError(result.error || '创建失败')
          setTimeout(() => setError(''), 3000)
        }
      } catch (error) {
        console.error('创建优惠券失败:', error)
        setError('创建优惠券失败')
        setTimeout(() => setError(''), 3000)
      }
    }
  }

  const handleDeleteCoupon = async (couponId: string) => {
    if (window.confirm('确定要删除这张优惠券吗?')) {
      try {
        const result = await CloudCouponAdminService.delete(couponId)
        if (result.success) {
          setSuccess('优惠券删除成功')
          await loadCoupons()
          setTimeout(() => setSuccess(''), 2000)
        } else {
          setError(result.error || '删除失败')
        }
      } catch (error) {
        console.error('删除优惠券失败:', error)
        setError('删除优惠券失败')
      }
    }
  }

  const handleToggleStatus = async (couponId: string) => {
    try {
      const coupon = coupons.find(c => c.id === couponId)
      if (coupon) {
        const newStatus = coupon.status === 'active' ? 'inactive' : 'active'
        const result = await CloudCouponAdminService.update(couponId, { status: newStatus })
        if (result.success) {
          setSuccess('状态已更新')
          await loadCoupons()
          setTimeout(() => setSuccess(''), 2000)
        } else {
          setError(result.error || '更新失败')
        }
      }
    } catch (error) {
      console.error('更新状态失败:', error)
      setError('更新状态失败')
    }
  }

  const getTypeColor = (type: string) => {
    const colors = {
      discount: 'primary',
      fixed: 'success',
      free: 'warning',
    }
    return colors[type as keyof typeof colors] || 'default'
  }

  const getTypeText = (type: string) => {
    const texts = {
      discount: '折扣',
      fixed: '满减',
      free: '免费',
    }
    return texts[type as keyof typeof texts] || type
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      expired: 'error',
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusText = (status: string) => {
    const texts = {
      active: '启用',
      inactive: '禁用',
      expired: '已过期',
    }
    return texts[status as keyof typeof texts] || status
  }

  const getUsagePercent = (used: number, total: number) => {
    return total > 0 ? ((used / total) * 100).toFixed(1) : 0
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">优惠券管理</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索优惠券..."
            size="small"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
            新增优惠券
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Grid container spacing={3}>
        {coupons.map((coupon) => (
          <Grid item xs={12} md={6} lg={4} key={coupon.id}>
            <Card
              sx={{
                position: 'relative',
                border: coupon.status === 'active' ? '2px solid #1976d2' : '2px solid transparent',
                opacity: coupon.status === 'inactive' ? 0.6 : 1,
              }}
            >
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  p: 2,
                }}
              >
                <Typography variant="h5">{coupon.name}</Typography>
                <Typography variant="caption">{coupon.code}</Typography>
              </Box>

              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  {coupon.type === 'discount' ? (
                    <Typography variant="h4" color="primary.main">
                      {coupon.value}% 折扣
                    </Typography>
                  ) : coupon.type === 'fixed' ? (
                    <Typography variant="h4" color="primary.main">
                      ¥{coupon.value}
                    </Typography>
                  ) : (
                    <Typography variant="h4" color="primary.main">
                      免费
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    满 ¥{coupon.minAmount} 可用
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">使用情况</Typography>
                    <Typography variant="body2">
                      {coupon.usedCount}/{coupon.totalCount} ({getUsagePercent(coupon.usedCount, coupon.totalCount)}%)
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                    <Box
                      sx={{
                        width: `${getUsagePercent(coupon.usedCount, coupon.totalCount)}%`,
                        bgcolor: 'primary.main',
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={getTypeText(coupon.type)} color={getTypeColor(coupon.type) as any} size="small" />
                  <Chip
                    label={getStatusText(coupon.status)}
                    color={getStatusColor(coupon.status) as any}
                    size="small"
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" display="block">
                  有效期: {coupon.startTime} ~ {coupon.endTime}
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {coupon.createdAt} 创建
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(coupon)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCoupon(coupon.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                    <Switch
                      size="small"
                      checked={coupon.status === 'active'}
                      onChange={() => handleToggleStatus(coupon.id)}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <AdminTablePagination
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(newPage) => setPage(newPage)}
        onRowsPerPageChange={(newRowsPerPage) => setRowsPerPage(newRowsPerPage)}
      />
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? '编辑优惠券' : '新增优惠券'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="优惠券名称"
              fullWidth
              variant="outlined"
              value={couponForm.name}
              onChange={(e) => setCouponForm(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="优惠码"
              fullWidth
              variant="outlined"
              value={couponForm.code}
              onChange={(e) => setCouponForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              helperText="不区分大小写"
              sx={{ mb: 2 }}
            />

            <TextField
              select
              margin="dense"
              label="优惠类型"
              fullWidth
              variant="outlined"
              value={couponForm.type}
              onChange={(e) => setCouponForm(prev => ({ ...prev, type: e.target.value as any }))}
              sx={{ mb: 2 }}
            >
              <MenuItem value="discount">折扣</MenuItem>
              <MenuItem value="fixed">满减</MenuItem>
              <MenuItem value="free">免费</MenuItem>
            </TextField>

            // @ts-ignore
            {couponForm.type !== 'free' && (
              <TextField
                margin="dense"
                label={couponForm.type === 'discount' ? '折扣比例(%)' : '优惠金额(¥)'}
                fullWidth
                type="number"
                variant="outlined"
                value={couponForm.value}
                onChange={(e) => setCouponForm(prev => ({ ...prev, value: Number(e.target.value) }))}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              margin="dense"
              label="最低消费金额(¥)"
              fullWidth
              type="number"
              variant="outlined"
              value={couponForm.minAmount}
              onChange={(e) => setCouponForm(prev => ({ ...prev, minAmount: Number(e.target.value) }))}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="发放数量"
              fullWidth
              type="number"
              variant="outlined"
              value={couponForm.totalCount}
              onChange={(e) => setCouponForm(prev => ({ ...prev, totalCount: Number(e.target.value) }))}
              sx={{ mb: 2 }}
            />

            <TextField
              select
              margin="dense"
              label="适用范围"
              fullWidth
              variant="outlined"
              value={couponForm.courseLimit}
              onChange={(e) => setCouponForm(prev => ({ ...prev, courseLimit: e.target.value as any }))}
              sx={{ mb: 2 }}
            >
              <MenuItem value="all">全部课程</MenuItem>
              <MenuItem value="specific">指定课程</MenuItem>
              <MenuItem value="category">指定分类</MenuItem>
            </TextField>

            // @ts-ignore
            {couponForm.courseLimit === 'specific' && (
              <TextField
                margin="dense"
                label="课程ID"
                fullWidth
                variant="outlined"
                value={couponForm.courseId}
                onChange={(e) => setCouponForm(prev => ({ ...prev, courseId: e.target.value }))}
                sx={{ mb: 2 }}
              />
            )}

            // @ts-ignore
            // @ts-ignore
            {couponForm.courseLimit === 'category' && (
              <TextField
                margin="dense"
                label="分类ID"
                fullWidth
                variant="outlined"
                value={couponForm.categoryId}
                onChange={(e) => setCouponForm(prev => ({ ...prev, categoryId: e.target.value }))}
                sx={{ mb: 2 }}
              />
            )}

            <TextField
              margin="dense"
              label="开始时间"
              fullWidth
              type="date"
              variant="outlined"
              value={couponForm.startTime}
              onChange={(e) => setCouponForm(prev => ({ ...prev, startTime: e.target.value }))}
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              margin="dense"
              label="结束时间"
              fullWidth
              type="date"
              variant="outlined"
              value={couponForm.endTime}
              onChange={(e) => setCouponForm(prev => ({ ...prev, endTime: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={couponForm.status === 'active'}
                  // @ts-ignore
                  onChange={(e) => setCouponForm(prev => ({
                    ...prev,
                    status: e.target.checked ? 'active' : 'inactive'
                  }))}
                />
              }
              label="启用状态"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSaveCoupon} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
