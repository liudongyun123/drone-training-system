/**
 * 财务统计服务
 * 处理订单管理、收入统计、业绩报表等功能
 * 版本：v20260404-refactor
 */

import app from '../config/tcb'
import type { Order, OrderItem, PaginationParams, RevenueStats, DailyStat } from '../types/service'
import { parseCloudFunctionListResponse } from '@/utils/safeData'

const CLOUD_FUNCTION_NAME = 'admin'

// 错误日志开关（生产环境设为 false）
const ENABLE_ERROR_LOG = false

/**
 * 调用管理后台云函数
 */
async function callAdminFunction(action: string, params: Record<string, unknown> = {}) {
  try {
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: {
        ...params,
        action
      }
    })

    const response = result.result as { code: number; message?: string; data?: unknown }

    if (response.code !== 0) {
      if (ENABLE_ERROR_LOG) {
        console.error(`云函数调用失败:`, response)
      }
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error) {
    if (ENABLE_ERROR_LOG) {
      console.error('财务服务错误:', error)
    }
    throw error
  }
}

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

/**
 * 财务统计服务
 */
export const financeService = {
  /**
   * 获取订单列表
   * @param query - 查询条件
   * @param options - 分页和搜索选项
   * @param options.keyword - 可选，搜索手机号/姓名/订单号
   */
  async getOrders(query: Record<string, unknown> = {}, options: PaginationParams & { keyword?: string } = {}) {
    const { page = 1, pageSize = 20, keyword } = options
    
    try {
      // 如果有 keyword，添加到查询条件（支持手机号、姓名、订单号搜索）
      const finalQuery = { ...query }
      if (keyword) {
        // 云函数通过 $or 实现多字段搜索
        finalQuery.$or = [
          { phone: { $regex: keyword } },
          { buyerPhone: { $regex: keyword } },
          { userName: { $regex: keyword } },
          { buyerName: { $regex: keyword } },
          { orderNo: { $regex: keyword } }
        ]
      }
      
      const result = await callAdminFunction('list', {
        collection: 'orders',
        query: finalQuery,
        options: { page, limit: pageSize }
      })

      const { list, total } = parseCloudFunctionListResponse<Order>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
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
   * ★ 通过手机号获取用户的所有订单（线下班 + 线上课程）
   */
  async getOrdersByPhone(phone: string): Promise<{
    code: number
    data: {
      classOrders: Order[]   // 线下班订单
      courseOrders: Order[]  // 线上课程订单
      allOrders: Order[]     // 所有订单
    }
  }> {
    try {
      // 查询该手机号的所有订单
      const result = await callAdminFunction('list', {
        collection: 'orders',
        query: {
          $or: [
            { phone: phone },
            { buyerPhone: phone }
          ]
        },
        options: { limit: 100 }
      }) as { data: Order[] }

      const allOrders = result.data || []
      
      // 分类
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
    return await callAdminFunction('get', {
      collection: 'orders',
      docId: orderId
    })
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

    return await callAdminFunction('update', {
      collection: 'orders',
      docId: orderId,
      data: updateData
    })
  },

  /**
   * 获取收入统计
   */
  async getRevenueStats(startDate?: string, endDate?: string): Promise<{ code: number; data: RevenueStats }> {
    const query: Record<string, unknown> = {
      status: 'paid'
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      }
    }

    const result = await callAdminFunction('list', {
      collection: 'orders',
      query,
      options: {
        limit: 1000
      }
    }) as { data: Order[] }

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
    const result = await callAdminFunction('list', {
      collection: 'orders',
      query: { status: 'paid' },
      options: { limit: 1000 }
    }) as { data: Order[] }

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
    const result = await callAdminFunction('list', {
      collection: 'orders',
      query: { status: 'paid' },
      options: { limit: 1000 }
    }) as { data: Order[] }

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
  }
}

export default financeService
