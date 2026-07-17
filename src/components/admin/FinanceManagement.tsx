import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material'
import {
  ArrowUpward,
  ArrowDownward,
  TrendingUp,
  AttachMoney,
  Close,
} from '@mui/icons-material'
import AdminChart from './AdminChart'
import { CloudOrderAdminService } from '../../services/CloudAdminService'
import { parseDate } from '@/utils/dateUtils'
import { PAID_STATUSES, getOrderAmount } from '@/services/financeService'

interface Order {
  id: string
  userId: string
  userName: string
  amount: number
  status: 'pending' | 'paid' | 'refunded'
  createdAt: string
}

interface FinanceData {
  totalRevenue: number
  todayRevenue: number
  monthRevenue: number
  orderCount: number
  revenueGrowth: number
}

interface RevenueData {
  name: string
  date: string
  value: number
}

interface StatusData {
  name: string
  value: number
}

export default function FinanceManagement() {
  const [tabValue, setTabValue] = useState(0)
  const [timeFilter, setTimeFilter] = useState('week')
  const [financeData, setFinanceData] = useState<FinanceData>({
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    orderCount: 0,
    revenueGrowth: 0,
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [statusData, setStatusData] = useState<StatusData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadFinanceData()
    loadOrders()
  }, [timeFilter])

  const loadFinanceData = async () => {
    try {
      setLoading(true)
      const result = await CloudOrderAdminService.getAll()
      if (result.success && result.data) {
        const allOrders = result.data

        // 计算财务数据
        const paidOrders = allOrders.filter((o: Order) => PAID_STATUSES.includes(o.status))
        const totalRevenue = paidOrders.reduce((sum: number, o: Order) => sum + getOrderAmount(o), 0)

        // 按时间过滤
        const now = new Date()
        let todayRevenue = 0
        let monthRevenue = 0

        paidOrders.forEach((order: Order) => {
          const orderDate = parseDate(order.createdAt)
          if (orderDate) {
            if (orderDate.toDateString() === now.toDateString()) {
              todayRevenue += getOrderAmount(order)
            }
            if (orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear()) {
              monthRevenue += getOrderAmount(order)
            }
          }
        })

        // 生成收入趋势数据
        const revenueTrend = generateRevenueTrend(paidOrders, timeFilter)
        setRevenueData(revenueTrend)

        // 生成状态分布数据
        const statusTrend = allOrders.reduce((acc: any, order: Order) => {
          const statusText = getStatusText(order.status)
          const amount = order.status === 'refunded' ? 0 : getOrderAmount(order)
          if (acc[statusText]) {
            acc[statusText] += amount
          } else {
            acc[statusText] = amount
          }
          return acc
        }, {})

        const statusChartData = Object.entries(statusTrend).map(([name, value]) => ({
          name,
          value: value as number,
        }))
        setStatusData(statusChartData)

        setFinanceData({
          totalRevenue,
          todayRevenue,
          monthRevenue,
          orderCount: allOrders.length,
          revenueGrowth: allOrders.length >= 2 ? Math.round(((totalRevenue - monthRevenue) / (monthRevenue || 1)) * 1000) / 10 : 0, // 基于真实数据计算
        })
      }
    } catch (err) {
      setError('加载财务数据失败: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const orders = await CloudOrderAdminService.getAll()
      setOrders(orders as any)
    } catch (err) {
      setError('加载订单数据失败: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const generateRevenueTrend = (_orders: Order[], filter: string): RevenueData[] => {
    const now = new Date()
    const data: RevenueData[] = []

    let days = 7
    let labels: string[] = []

    if (filter === 'today') {
      days = 1
      labels = Array.from({ length: 24 }, (_, i) => `${i}:00`)
    } else if (filter === 'week') {
      days = 7
      labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (6 - i))
        return `${d.getMonth() + 1}/${d.getDate()}`
      })
    } else if (filter === 'month') {
      days = 30
      labels = Array.from({ length: 30 }, (_, i) => `${i + 1}日`)
    } else if (filter === 'year') {
      days = 12
      labels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    }

    // 基于真实订单数据聚合收入趋势
    for (let i = 0; i < days; i++) {
      // 根据时间范围计算日期区间
      const startDate = new Date()
      let endDate = new Date()
      if (filter === 'today') {
        startDate.setHours(i, 0, 0, 0)
        endDate.setHours(i + 1, 0, 0, 0)
      } else if (filter === 'week') {
        startDate.setDate(startDate.getDate() - (6 - i))
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1)
      } else if (filter === 'month') {
        startDate.setDate(i + 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1)
      } else if (filter === 'year') {
        startDate.setMonth(i, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1)
      }

      const dayRevenue = _orders
        .filter((o: any) => {
          const d = new Date(o.createdAt || o.created_at)
          return d >= startDate && d < endDate && PAID_STATUSES.includes(o.status)
        })
        .reduce((sum: number, o: any) => sum + getOrderAmount(o), 0)

      data.push({
        name: labels[i] || `${i + 1}`,
        date: labels[i] || `${i + 1}`,
        value: Math.round(dayRevenue * 100) / 100,
      })
    }

    return data
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'pending':
        return 'warning'
      case 'refunded':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '已支付'
      case 'pending':
        return '待支付'
      case 'refunded':
        return '已退款'
      default:
        return status
    }
  }

  const StatCard = ({ title, value, icon: Icon, trend, prefix = '' }: any) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {prefix}{value.toLocaleString()}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend > 0 ? (
                  <ArrowUpward color="success" fontSize="small" sx={{ mr: 0.5 }} />
                ) : (
                  <ArrowDownward color="error" fontSize="small" sx={{ mr: 0.5 }} />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                >
                  {Math.abs(trend)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                  较上期
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.light',
            }}
          >
            <Icon sx={{ color: 'primary.main', fontSize: 32 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        财务收入管理
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{ mb: 3 }}
      >
        <Tab label="财务概览" />
        <Tab label="交易明细" />
        <Tab label="收入分析" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>时间范围</InputLabel>
              <Select
                value={timeFilter}
                label="时间范围"
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <MenuItem value="today">今日</MenuItem>
                <MenuItem value="week">本周</MenuItem>
                <MenuItem value="month">本月</MenuItem>
                <MenuItem value="year">本年</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="总收入"
                value={financeData.totalRevenue}
                icon={AttachMoney}
                trend={financeData.revenueGrowth}
                prefix="¥"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="今日收入"
                value={financeData.todayRevenue}
                icon={TrendingUp}
                prefix="¥"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="本月收入"
                value={financeData.monthRevenue}
                icon={TrendingUp}
                prefix="¥"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="订单数量"
                value={financeData.orderCount}
                icon={TrendingUp}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            收入趋势
          </Typography>
          <Card>
            <CardContent sx={{ height: 400 }}>
              {revenueData.length > 0 ? (
                <AdminChart
                  type="line"
                  data={revenueData}
                  title="收入趋势"
                />
              ) : (
                <Typography color="text.secondary" align="center" sx={{ mt: 10 }}>
                  暂无数据
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>用户</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    暂无订单数据
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>ORD-{order.id}</TableCell>
                    <TableCell>{(order as any).username}</TableCell>
                    <TableCell>¥{order.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(order.status)}
                        color={getStatusColor(order.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{order.createdAt}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text" onClick={() => setSelectedOrder(order)}>
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  订单状态分布
                </Typography>
                {statusData.length > 0 ? (
                  <AdminChart
                    type="pie"
                    data={statusData}
                    title="订单状态分布"
                  />
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ mt: 10 }}>
                    暂无数据
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  收入来源分布（按课程）
                </Typography>
                <AdminChart
                  type="bar"
                  data={revenueData.slice(0, 7)}
                  title="每日收入"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          订单详情
          <IconButton onClick={() => setSelectedOrder(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography><strong>订单ID：</strong>{selectedOrder.id}</Typography>
              <Typography><strong>用户：</strong>{selectedOrder.userName || selectedOrder.userId}</Typography>
              <Typography><strong>金额：</strong>¥{selectedOrder.amount}</Typography>
              <Typography><strong>状态：</strong>{getStatusText(selectedOrder.status)}</Typography>
              <Typography><strong>创建时间：</strong>{selectedOrder.createdAt}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
