import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  People as UsersIcon,
  ShoppingBag as OrdersIcon,
  AttachMoney as RevenueIcon,
  Book as CoursesIcon,
  TrendingUp as TrendingIcon,
  Assessment as AnalyticsIcon,
} from '@mui/icons-material'
import { CloudUserAdminService, CloudOrderAdminService } from '../../services/CloudAdminService'
import AdminChart from './AdminChart'

import { parseDate } from '@/utils/dateUtils'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalOrders: number
  totalRevenue: number
  todayOrders: number
  todayRevenue: number
  paidOrders: number
  pendingOrders: number
}

// 图表数据类型
interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

// 模块分类
const MODULE_CATEGORIES = {
  core: {
    title: '核心管理',
    icon: <AnalyticsIcon />,
    color: '#1976d2',
    modules: [
      { name: '数据仪表盘', path: '/admin', icon: <AnalyticsIcon /> },
      { name: '用户管理', path: '/admin/users', icon: <UsersIcon /> },
      { name: '财务统计', path: '/admin/finance', icon: <RevenueIcon /> },
      ]
  },
  content: {
    title: '内容管理',
    icon: <CoursesIcon />,
    color: '#2e7d32',
    modules: [
      { name: '课程管理', path: '/admin/courses', icon: <CoursesIcon /> },
      { name: '章节管理', path: '/admin/chapters', icon: <CoursesIcon /> },
      { name: '试卷管理', path: '/admin/exams', icon: <AnalyticsIcon /> },
      { name: '题库管理', path: '/admin/banks', icon: <CoursesIcon /> },
    ]
  },
  marketing: {
    title: '运营管理',
    icon: <TrendingIcon />,
    color: '#ed6c02',
    modules: [
      { name: '教师管理', path: '/admin/teachers', icon: <UsersIcon /> },
      { name: '学员管理', path: '/admin/students', icon: <UsersIcon /> },
      { name: '排课出勤', path: '/admin/schedules', icon: <TrendingIcon /> },
      { name: '财务统计', path: '/admin/finance', icon: <RevenueIcon /> },
      { name: '证书管理', path: '/admin/certificates', icon: <CoursesIcon /> },
      { name: '营销工具', path: '/admin/marketing', icon: <OrdersIcon /> },
    ]
  },
  system: {
    title: '系统管理',
    icon: <AnalyticsIcon />,
    color: '#9c27b0',
    modules: [
      { name: '角色权限', path: '/admin/roles', icon: <AnalyticsIcon /> },
      { name: '系统日志', path: '/admin/logs', icon: <AnalyticsIcon /> },
    ]
  },
  statistics: {
    title: '数据统计',
    icon: <TrendingIcon />,
    color: '#d32f2f',
    modules: [
      { name: '练习记录', path: '/admin/records', icon: <TrendingIcon /> },
      { name: '评论反馈', path: '/admin/comments', icon: <TrendingIcon /> },
      { name: '财务收入', path: '/admin/finance', icon: <RevenueIcon /> },
    ]
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    todayOrders: 0,
    todayRevenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
  })
  const [revenueData, setRevenueData] = useState<ChartDataPoint[]>([])
  const [userGrowthData, setUserGrowthData] = useState<ChartDataPoint[]>([])
  const [orderStatusData, setOrderStatusData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // 加载用户和订单数据
      const [usersResult, ordersResult] = await Promise.all([
        CloudUserAdminService.getAll(),
        CloudOrderAdminService.getAll(),
      ])

      // 提取数据（适配新的返回格式）
      const users = usersResult.success ? usersResult.data : []
      const orders = ordersResult.success ? ordersResult.data : []

      // 计算统计数据
      const totalUsers = users.length
      const activeUsers = users.filter((u: any) => u.status === 'active').length
      const totalOrders = orders.length
      const paidOrders = orders.filter((o: any) => o.status === 'paid').length
      const pendingOrders = orders.filter((o: any) => o.status === 'pending').length
      const totalRevenue = orders
        .filter((o: any) => o.status === 'paid')
        .reduce((sum: number, o: any) => sum + o.amount, 0)

      // 计算今日数据
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayOrders = orders.filter((o: any) => {
        const createdAt = parseDate(o.createdAt)
        return createdAt && createdAt >= today
      })
      const todayRevenue = todayOrders
        .filter((o: any) => o.status === 'paid')
        .reduce((sum: number, o: any) => sum + o.amount, 0)

      setStats({
        totalUsers,
        activeUsers,
        totalOrders,
        totalRevenue,
        todayOrders: todayOrders.length,
        todayRevenue,
        paidOrders,
        pendingOrders,
      })

      // 生成收入趋势数据（模拟最近7天）
      const revenueData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          name: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          value: Math.floor(Math.random() * 1000) + 500,
        }
      })
      setRevenueData(revenueData)

      // 生成用户增长数据（模拟）
      const userGrowthData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          name: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
          value: Math.floor(Math.random() * 50) + 10,
        }
      })
      setUserGrowthData(userGrowthData)

      // 生成订单状态数据
      setOrderStatusData([
        { name: '已支付', value: paidOrders },
        { name: '待支付', value: pendingOrders },
        { name: '已完成', value: orders.filter((o: any) => o.status === 'completed').length },
        { name: '已取消', value: orders.filter((o: any) => o.status === 'cancelled').length },
      ])
    } catch (error) {
      console.error('加载仪表盘数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {/* 页面标题 */}
      <Typography variant="h4" component="h1" gutterBottom>
        数据仪表盘
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        系统运营数据总览
      </Typography>

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="总用户数"
            value={stats.totalUsers}
            icon={<UsersIcon />}
            color="#1976d2"
            subtitle={`活跃用户: ${stats.activeUsers}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="总订单数"
            value={stats.totalOrders}
            icon={<OrdersIcon />}
            color="#2e7d32"
            subtitle={`今日: ${stats.todayOrders}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="总收入"
            value={`¥${stats.totalRevenue.toFixed(2)}`}
            icon={<RevenueIcon />}
            color="#ed6c02"
            subtitle={`今日: ¥${stats.todayRevenue.toFixed(2)}`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="支付率"
            value={`${stats.totalOrders > 0 ? ((stats.paidOrders / stats.totalOrders) * 100).toFixed(1) : 0}%`}
            icon={<TrendingIcon />}
            color="#9c27b0"
            subtitle={`待支付: ${stats.pendingOrders}`}
          />
        </Grid>
      </Grid>

      {/* 数据图表 */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={8}>
          <AdminChart
            title="收入趋势（最近7天）"
            data={revenueData}
            type="line"
            height={350}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <AdminChart
            title="订单状态分布"
            data={orderStatusData}
            type="pie"
            height={350}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <AdminChart
            title="用户增长趋势（最近7天）"
            data={userGrowthData}
            type="bar"
            height={300}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <AdminChart
            title="用户活跃度"
            data={[
              { name: '日活跃', value: Math.floor(stats.activeUsers * 0.6) },
              { name: '周活跃', value: Math.floor(stats.activeUsers * 0.8) },
              { name: '月活跃', value: stats.activeUsers },
            ]}
            type="bar"
            height={300}
          />
        </Grid>
      </Grid>

      {/* 模块分类展示 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          管理模块
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {Object.entries(MODULE_CATEGORIES).map(([key, category]) => (
            <Grid item xs={12} md={6} key={key}>
              <CategoryCard category={category} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}

// 统计卡片组件
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  subtitle?: string
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
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
              bgcolor: `${color}20`,
            }}
          >
            <Box sx={{ color, fontSize: 32 }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// 分类卡片组件
interface CategoryCardProps {
  category: {
    title: string
    icon: React.ReactNode
    color: string
    modules: Array<{
      name: string
      path: string
      icon: React.ReactNode
    }>
  }
}

function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 1, color: category.color }}>{category.icon}</Box>
          <Typography variant="h6">{category.title}</Typography>
        </Box>

        <Grid container spacing={1}>
          {category.modules.map((module, index) => (
            <Grid item xs={6} key={index}>
              <Chip
                label={module.name}
                icon={module.icon as React.ReactElement}
                variant="outlined"
                sx={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    bgcolor: `${category.color}10`,
                    cursor: 'pointer',
                  },
                }}
              />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}
