// ============================================================================
// 商城订单管理 - 后台
// ============================================================================

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material'
import {
  Visibility as ViewIcon,
  LocalShipping as ShipIcon
} from '@mui/icons-material'
import { unifiedOrderApi } from '@/shared/services/unifiedOrderApi'
import type { UnifiedOrder } from '@/shared/types/unifiedOrder'

export default function AdminShopOrders() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [shipDialogOpen, setShipDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null)
  const [shipData, setShipData] = useState({ company: '', trackingNumber: '' })

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const filters = statusFilter !== 'all' ? { orderType: 'shop', status: statusFilter } : { orderType: 'shop' }
      // @ts-ignore
      const data = await unifiedOrderApi.getList(filters)
      setOrders(data.orders)
    } catch (err) {
      console.error('加载订单失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (order: UnifiedOrder) => {
    setSelectedOrder(order)
    setDetailDialogOpen(true)
  }

  const handleOpenShipDialog = (order: UnifiedOrder) => {
    setSelectedOrder(order)
    setShipData({ company: '', trackingNumber: '' })
    setShipDialogOpen(true)
  }

  const handleShip = async () => {
    if (!selectedOrder) return
    try {
      await unifiedOrderApi.shipOrder(selectedOrder._id, shipData)
      setShipDialogOpen(false)
      loadOrders()
    } catch (err) {
      console.error('发货失败:', err)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
      pending: 'default',
      paid: 'primary',
      shipped: 'warning',
      delivered: 'success',
      cancelled: 'error',
      refunded: 'error'
    }
    return colors[status] || 'default'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待付款',
      paid: '已付款',
      shipped: '已发货',
      delivered: '已签收',
      cancelled: '已取消',
      refunded: '已退款'
    }
    return labels[status] || status
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 3 }}>
        商城订单管理
      </Typography>

      {/* 状态筛选 */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>订单状态</InputLabel>
          <Select
            value={statusFilter}
            label="订单状态"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="pending">待付款</MenuItem>
            <MenuItem value="paid">已付款</MenuItem>
            <MenuItem value="shipped">已发货</MenuItem>
            <MenuItem value="delivered">已签收</MenuItem>
            <MenuItem value="cancelled">已取消</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>订单号</TableCell>
              <TableCell>用户</TableCell>
              <TableCell>商品</TableCell>
              <TableCell>金额</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order._id}>
                <TableCell>{order.orderNo}</TableCell>
                <TableCell>{order.phone}</TableCell>
                <TableCell>
                  {order.shopItems?.map(item => item.productName).join(', ') || '-'}
                </TableCell>
                <TableCell>¥{order.finalAmount}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(order.status)}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleViewDetail(order)}>
                    <ViewIcon />
                  </IconButton>
                  {order.status === 'paid' && (
                    <IconButton size="small" color="primary" onClick={() => handleOpenShipDialog(order)}>
                      <ShipIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2">订单号: {selectedOrder.orderNo}</Typography>
              <Typography variant="subtitle2">用户手机: {selectedOrder.phone}</Typography>
              <Typography variant="subtitle2">金额: ¥{selectedOrder.finalAmount}</Typography>
              <Typography variant="subtitle2">状态: {getStatusLabel(selectedOrder.status)}</Typography>
              
              <Typography variant="h6" sx={{ mt: 2 }}>商品列表</Typography>
              {selectedOrder.shopItems?.map(item => (
                <Box key={item.productId} sx={{ py: 1 }}>
                  <Typography>{item.productName} x {item.quantity}</Typography>
                  <Typography color="text.secondary">¥{item.price}</Typography>
                </Box>
              ))}
              
              {selectedOrder.shippingAddress && (
                <Typography variant="h6" sx={{ mt: 2 }}>
                  收货地址: {selectedOrder.shippingAddress.province} {selectedOrder.shippingAddress.city} {selectedOrder.shippingAddress.detail}
                </Typography>
              )}
              
              {selectedOrder.shippingInfo && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6">物流信息</Typography>
                  <Typography>快递公司: {selectedOrder.shippingInfo.company}</Typography>
                  <Typography>快递单号: {selectedOrder.shippingInfo.trackingNumber}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 发货对话框 */}
      <Dialog open={shipDialogOpen} onClose={() => setShipDialogOpen(false)}>
        <DialogTitle>发货</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'grid', gap: 2 }}>
            <TextField
              label="快递公司"
              value={shipData.company}
              onChange={e => setShipData({ ...shipData, company: e.target.value })}
              fullWidth
            />
            <TextField
              label="快递单号"
              value={shipData.trackingNumber}
              onChange={e => setShipData({ ...shipData, trackingNumber: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleShip}>
            确认发货
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}