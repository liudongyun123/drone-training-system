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
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { CloudOrderAdminService } from '../../services/CloudAdminService'
import { Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../types/database'
import { getOrderCourseNames, getOrderAmount } from '../../types/database'
import AdminTablePagination from './AdminTablePagination'
import { formatDateStr } from '@/utils/dateUtils'

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  })

  // 分页状态
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  // 搜索状态
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadOrders()
  }, [page, rowsPerPage, searchText])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const offset = page * rowsPerPage
      const result = await CloudOrderAdminService.getAll({
        offset,
        limit: rowsPerPage,
        search: searchText || undefined,
      })
      if (result.success && result.data) {
        setOrders(result.data)
        if (result.total !== undefined) {
          setTotal(result.total)
        }
      }
    } catch (error) {
      console.error('加载订单列表失败:', error)
      setSnackbar({ open: true, message: '加载订单列表失败', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await CloudOrderAdminService.update(orderId, { status: newStatus })
      setSnackbar({ open: true, message: '订单状态更新成功', severity: 'success' })
      await loadOrders()
    } catch (error) {
      setSnackbar({ open: true, message: '更新订单状态失败', severity: 'error' })
    }
  }

  const getStatusColor = (status: string) => {
    return ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || 'default'
  }

  const getStatusLabel = (status: string) => {
    return ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status
  }

  // 获取订单显示的课程名称
  const getDisplayCourseName = (order: Order) => {
    const names = getOrderCourseNames(order)
    return names.length > 0 ? names.join(', ') : order.courseName || '-'
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">订单管理</Typography>
        <TextField
          placeholder="搜索订单号、用户或课程..."
          size="small"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value)
            setPage(0)
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>订单号</TableCell>
              <TableCell>用户</TableCell>
              <TableCell>课程</TableCell>
              <TableCell>金额</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>支付方式</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>支付时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id}>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {order.orderNo || order._id?.slice(-8) || '-'}
                </TableCell>
                <TableCell>{order.userName || order.userId?.slice(-6) || '-'}</TableCell>
                <TableCell>{getDisplayCourseName(order)}</TableCell>
                <TableCell>¥{getOrderAmount(order).toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(order.status)}
                    color={getStatusColor(order.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{order.paymentMethod || '-'}</TableCell>
                <TableCell>
                  {formatDateStr(order.createdAt, {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  {formatDateStr(order.paidAt, {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  <FormControl size="small">
                    <Select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order._id!, e.target.value)}
                      sx={{ minWidth: 100 }}
                    >
                      <MenuItem value="pending">待支付</MenuItem>
                      <MenuItem value="paid">已支付</MenuItem>
                      <MenuItem value="completed">已完成</MenuItem>
                      <MenuItem value="cancelled">已取消</MenuItem>
                      <MenuItem value="refunded">已退款</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AdminTablePagination
        rows={orders}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
