/**
 * 财务统计服务 v2.0
 * 版本: v20260515-unified
 * 
 * 统一使用 CloudDBService (HTTP → db-init)
 */

import { CloudDBService } from './CloudDBService'
import type { Order, OrderItem, PaginationParams, RevenueStats, DailyStat } from '../types/service'

// 订单项统计
interface CourseSalesStat {
  courseId: string
  courseTitle: string
  salesCount: number
  revenue: number
}

// 教师业绩统计
interface TeacherPerformanceStat {
  teacherId: string
  teacherName: string
  totalRevenue: number
  orderCount: number
  studentCount: number
}

export const financeService = {
  /**
   * 获取订单列表
   */
  async getOrders(query: Record<string, unknown> = {}, options: PaginationParams & { keyword?: string } = {}) {
    const { page = 1, pageSize = 20, keyword } = options
    
    try {
      const finalQuery: Record<string, any> = { ...query }
      
      // 如果有 keyword，添加到查询条件
      if (keyword) {
        finalQuery.$or = [
          { phone: { $regex: keyword } },
          { buyerPhone: { $regex: keyword } },
          { userName: { $regex: keyword } },
          { buyerName: { $regex: keyword } },
          { orderNo: { $regex: keyword } }
        ]
      }
      
      const result = await CloudDBService.query<Order>('orders', {
        where: finalQuery,
        orderBy: 'createdAt',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取订单列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取订单列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 通过手机号获取用户的所有订单
   */
  async getOrdersByPhone(phone: string): Promise<{
    code: number
    data: {
      classOrders: Order[]
      courseOrders: Order[]
      allOrders: Order[]
    }
  }> {
    try {
      const result = await CloudDBService.query<Order>('orders', {
        where: {
          $or: [
            { phone: phone },
            { buyerPhone: phone }
          ]
        },
        limit: 100
      })

      const allOrders = result.data || []
      const classOrders = allOrders.filter(o => o.type === 'class' || o.source === 'offline_enroll' || o.source === 'online_enroll')
      const courseOrders = allOrders.filter(o => o.type === 'course' || o.source === 'online_purchase')

      return {
        code: 0,
        data: { classOrders, courseOrders, allOrders }
      }
    } catch (error: any) {
      console.error('获取用户订单失败:', error)
      return {
        code: -1,
        data: { classOrders: [], courseOrders: [], allOrders: [] }
      }
    }
  },

  /**
   * 获取订单详情
   */
  async getOrderDetail(orderId: string) {
    try {
      const data = await CloudDBService.get<Order>('orders', orderId)
      return { code: 0, data }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 更新订单状态
   */
  async updateOrderStatus(orderId: string, status: string, remark?: string) {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString()
    }
    if (remark) {
      updateData.remark = remark
    }
    if (status === 'paid') {
      updateData.paidAt = new Date().toISOString()
    }

    try {
      await CloudDBService.update('orders', orderId, updateData)
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 获取收入统计
   */
  async getRevenueStats(startDate?: string, endDate?: string): Promise<{ code: number; data: RevenueStats }> {
    const query: Record<string, any> = { status: 'paid' }
    if (startDate && endDate) {
      query.createdAt = { $gte: startDate, $lte: endDate }
    }

    const result = await CloudDBService.query<Order>('orders', {
      where: query,
      limit: 1000
    })

    const orders = result.data || []
    const totalRevenue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0)
    const totalOrders = orders.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // 按日期分组
    const dailyStatsMap: Record<string, DailyStat> = {}
    orders.forEach(order => {
      const date = order.createdAt?.split('T')[0] || 'unknown'
      if (!dailyStatsMap[date]) {
        dailyStatsMap[date] = { date, revenue: 0, orders: 0 }
      }
      dailyStatsMap[date].revenue += order.finalAmount || 0
      dailyStatsMap[date].orders += 1
    })

    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date))

    return {
      code: 0,
      data: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        dailyStats
      }
    }
  },

  /**
   * 获取课程销售统计
   */
  async getCourseSalesStats(): Promise<{ code: number; data: CourseSalesStat[] }> {
    const result = await CloudDBService.query<Order>('orders', {
      where: { status: 'paid' },
      limit: 1000
    })

    const orders = result.data || []
    const courseStats: Record<string, CourseSalesStat> = {}

    orders.forEach(order => {
      order.items?.forEach((item: OrderItem) => {
        const courseId = item.courseId
        if (!courseStats[courseId]) {
          courseStats[courseId] = {
            courseId,
            courseTitle: item.courseTitle,
            salesCount: 0,
            revenue: 0
          }
        }
        courseStats[courseId].salesCount += 1
        courseStats[courseId].revenue += item.price || 0
      })
    })

    return {
      code: 0,
      data: Object.values(courseStats).sort((a, b) => b.revenue - a.revenue)
    }
  },

  /**
   * 获取教师业绩统计
   */
  async getTeacherPerformanceStats(): Promise<{ code: number; data: TeacherPerformanceStat[] }> {
    const result = await CloudDBService.query<Order>('orders', {
      where: { status: 'paid' },
      limit: 1000
    })

    const orders = result.data || []
    const teacherStats: Record<string, TeacherPerformanceStat> = {}

    orders.forEach(order => {
      order.items?.forEach((item: OrderItem) => {
        const teacherId = item.teacherId || 'unknown'
        const teacherName = item.teacherName || '未知教师'
        if (!teacherStats[teacherId]) {
          teacherStats[teacherId] = {
            teacherId,
            teacherName,
            totalRevenue: 0,
            orderCount: 0,
            studentCount: 0
          }
        }
        teacherStats[teacherId].totalRevenue += item.price || 0
        teacherStats[teacherId].orderCount += 1
        teacherStats[teacherId].studentCount += 1
      })
    })

    return {
      code: 0,
      data: Object.values(teacherStats).sort((a, b) => b.totalRevenue - a.totalRevenue)
    }
  },

  /**
   * 导出财务报表
   */
  async exportFinanceReport(startDate?: string, endDate?: string) {
    const revenueStats = await this.getRevenueStats(startDate, endDate)
    const courseStats = await this.getCourseSalesStats()
    const teacherStats = await this.getTeacherPerformanceStats()

    return {
      code: 0,
      data: {
        summary: revenueStats.data,
        courseSales: courseStats.data,
        teacherPerformance: teacherStats.data,
        exportTime: new Date().toISOString()
      }
    }
  },

  // ============== 支付管理相关 ==============

  /**
   * 获取支付配置
   */
  async getPaymentConfig() {
    try {
      return {
        code: 0,
        data: {
          wechatPayEnabled: true,
          alipayEnabled: false,
          mchId: import.meta.env.VITE_WX_MCH_ID || '1726655499',
          appId: import.meta.env.VITE_WX_APPID || 'wx25aaf895ab86181a',
          notifyUrl: import.meta.env.VITE_WX_NOTIFY_URL || '',
        }
      }
    } catch (error: any) {
      return {
        code: -1,
        message: error.message || '获取支付配置失败'
      }
    }
  },

  /**
   * 获取支付统计数据
   */
  async getPaymentStats() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0]
    const monthStart = now.toISOString().split('T')[0].slice(0, 7) + '-01'

    try {
      // 查询今日支付
      const todayResult = await CloudDBService.query<Order>('orders', {
        where: { status: 'paid', paidAt: { $gte: today } },
        limit: 1000
      })
      const todayOrders = todayResult.data || []
      const todayAmount = todayOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0)

      // 查询本周支付
      const weekResult = await CloudDBService.query<Order>('orders', {
        where: { status: 'paid', paidAt: { $gte: weekStart } },
        limit: 1000
      })
      const weekOrders = weekResult.data || []
      const weekAmount = weekOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0)

      // 查询本月支付
      const monthResult = await CloudDBService.query<Order>('orders', {
        where: { status: 'paid', paidAt: { $gte: monthStart } },
        limit: 1000
      })
      const monthOrders = monthResult.data || []
      const monthAmount = monthOrders.reduce((sum, o) => sum + (o.finalAmount || 0), 0)

      // 查询待支付订单数
      const pendingCount = await CloudDBService.count('orders', { status: 'pending' })

      return {
        code: 0,
        data: {
          todayAmount,
          todayCount: todayOrders.length,
          weekAmount,
          weekCount: weekOrders.length,
          monthAmount,
          monthCount: monthOrders.length,
          pendingPayments: pendingCount
        }
      }
    } catch (error: any) {
      console.error('获取支付统计失败:', error)
      return {
        code: -1,
        message: error.message || '获取支付统计失败',
        data: {
          todayAmount: 0,
          todayCount: 0,
          weekAmount: 0,
          weekCount: 0,
          monthAmount: 0,
          monthCount: 0,
          pendingPayments: 0
        }
      }
    }
  },

  /**
   * 获取退款记录
   */
  async getRefundList(params: PaginationParams = {}) {
    const { page = 1, pageSize = 10 } = params

    try {
      const result = await CloudDBService.query('refunds', {
        orderBy: 'createdAt',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data || [], total: result.total || 0, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取退款记录失败:', error)
      return {
        code: -1,
        message: error.message || '获取退款记录失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 处理退款
   */
  async refund(orderId: string, reason: string) {
    try {
      // 更新订单状态为已退款
      await CloudDBService.update('orders', orderId, {
        status: 'refunded',
        refundReason: reason,
        refundedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return { code: 0, message: '退款处理成功' }
    } catch (error: any) {
      console.error('退款失败:', error)
      return { code: -1, message: error.message || '退款失败' }
    }
  },

  /**
   * 导出支付记录
   */
  async exportPaymentReport() {
    try {
      const result = await CloudDBService.query<Order>('orders', {
        where: { status: 'paid' },
        orderBy: 'paidAt',
        order: 'desc',
        limit: 1000
      })

      const orders = result.data || []
      const paymentData = orders.map(o => ({
        orderNo: o.orderNo,
        title: o.items?.[0]?.title || '-',
        amount: o.finalAmount || 0,
        payMethod: o.paymentMethod || 'wechat',
        status: o.status,
        paidAt: o.paidAt || ''
      }))

      return {
        code: 0,
        data: paymentData
      }
    } catch (error: any) {
      console.error('导出支付记录失败:', error)
      return {
        code: -1,
        message: error.message || '导出失败'
      }
    }
  }
}

export default financeService
