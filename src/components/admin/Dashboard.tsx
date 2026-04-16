import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  People as PeopleIcon,
  ShoppingBag as OrdersIcon,
  AttachMoney as RevenueIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material'
import {
  CloudUserAdminService,
  CloudOrderAdminService,
  CloudCourseAdminService,
  CloudQuestionBankAdminService,
} from '../../services/CloudAdminService'
import { Order, Course, getOrderAmount, isOrderPaid, ORDER_STATUS_LABELS } from '../../types/database'
import { parseDate, formatDateStr } from '@/utils/dateUtils'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalOrders: number
  totalRevenue: number
  totalCourses: number
  totalQuestionBanks: number
  todayOrders: number
  todayRevenue: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCourses: 0,
    totalQuestionBanks: 0,
    todayOrders: 0,
    todayRevenue: 0,
  })
  const [topCourses, setTopCourses] = useState<Course[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // ✅ 优化：使用 count() 方法获取统计数据，而不是获取全量数据
      const [usersCountResult, ordersCountResult, coursesCountResult, questionBanksCountResult] = await Promise.all([
        CloudUserAdminService.count(),
        CloudOrderAdminService.count(),
        CloudCourseAdminService.count(),
        CloudQuestionBankAdminService.count(),
      ])

      // 并行获取必要的列表数据（用于排行和最近订单）
      const [ordersResult, coursesResult] = await Promise.all([
        CloudOrderAdminService.getAll({ limit: 100 }), // 订单需要计算收入和排行
        CloudCourseAdminService.getAll({ limit: 100 }), // 课程需要销量排行
      ])

      // 提取数据
      const orders = ordersResult.success ? ordersResult.data : []
      const courses = coursesResult.success ? coursesResult.data : []

      // 计算统计数据（从已获取的订单数据中计算，不需要额外请求）
      const totalUsers = typeof usersCountResult === 'number' ? usersCountResult : 0
      const totalOrders = typeof ordersCountResult === 'number' ? ordersCountResult : orders.length
      const totalCourses = typeof coursesCountResult === 'number' ? coursesCountResult : courses.length
      const totalQuestionBanks = typeof questionBanksCountResult === 'number' ? questionBanksCountResult : 0

      // 计算总收入（使用统一的辅助函数）
      const totalRevenue = orders
        .filter((o) => isOrderPaid(o))
        .reduce((sum, o) => sum + getOrderAmount(o), 0)

      // 计算今日订单和收入
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayOrders = orders.filter((o) => {
        const orderDate = parseDate(o.createdAt)
        return orderDate !== null && orderDate >= today
      }).length
      const todayRevenue = orders
        .filter((o) => {
          const orderDate = parseDate(o.createdAt)
          return isOrderPaid(o) && orderDate !== null && orderDate >= today
        })
        .reduce((sum, o) => sum + getOrderAmount(o), 0)

      // 计算课程销量排行（使用统一的辅助函数）
      const courseSales: Record<string, number> = {}
      orders.forEach((o) => {
        if (isOrderPaid(o)) {
          const courseIds = getOrderCourseIds(o)
          courseIds.forEach(courseId => {
            courseSales[courseId] = (courseSales[courseId] || 0) + 1
          })
        }
      })

      const sortedCourses = courses
        .map((course: any) => ({
          ...course,
          sales: courseSales[course.id] || 0,
        }))
        .sort((a: any, b: any) => b.sales - a.sales)
        .slice(0, 10)

      // 获取最近订单（从已获取的订单数据）
      const recentOrdersData = [...orders]
        .sort((a: any, b: any) => {
          const dateA = parseDate(a.createdAt)?.getTime() || 0
          const dateB = parseDate(b.createdAt)?.getTime() || 0
          return dateB - dateA
        })
        .slice(0, 10)

      setStats({
        totalUsers,
        activeUsers: 0, // 如果需要这个指标，需要单独的查询
        totalOrders,
        totalRevenue,
        totalCourses,
        totalQuestionBanks,
        todayOrders,
        todayRevenue,
      })
      setTopCourses(sortedCourses)
      setRecentOrders(recentOrdersData)
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return formatDateStr(dateString, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
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
      <Typography variant="h6" gutterBottom>数据仪表盘</Typography>

      {/* 关键指标卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总用户数
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    活跃用户: {stats.activeUsers}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总订单数
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.totalOrders}
                  </Typography>
                  <Typography variant="caption" color="info.main">
                    今日: +{stats.todayOrders}
                  </Typography>
                </Box>
                <OrdersIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    总收入
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {formatCurrency(stats.totalRevenue)}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    今日: +{formatCurrency(stats.todayRevenue)}
                  </Typography>
                </Box>
                <RevenueIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    课程/题库
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    {stats.totalCourses} / {stats.totalQuestionBanks}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    课程 / 题库
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* 课程销量排行 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>课程销量排行</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>排名</TableCell>
                      <TableCell>课程名称</TableCell>
                      <TableCell>价格</TableCell>
                      <TableCell>销量</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topCourses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            暂无数据
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      topCourses.map((course, index) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <Chip
                              label={index < 3 ? (index + 1) : index + 1}
                              color={index < 3 ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{course.title}</TableCell>
                          <TableCell>{formatCurrency(course.price)}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {course.sales}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 最近订单 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>最近订单</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>订单号</TableCell>
                      <TableCell>课程</TableCell>
                      <TableCell>金额</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>时间</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            暂无数据
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentOrders.map((order) => (
                        <TableRow key={order._id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {order.orderNo || order._id?.slice(-8) || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {getOrderCourseNames(order).join(', ') || order.courseName || '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(getOrderAmount(order))}</TableCell>
                          <TableCell>
                            <Chip
                              label={ORDER_STATUS_LABELS[order.status] || order.status}
                              color={order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
