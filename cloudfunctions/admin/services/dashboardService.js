/**
 * 仪表板服务 - 符合生产规范的数据统计
 */

const ApiResponse = require('../lib/response')

class DashboardService {
  constructor(db) {
    this.db = db
  }

  /**
   * 获取仪表板统计数据
   */
  async getStats() {
    try {
      const [
        coursesCount,
        teachersCount,
        studentsCount,
        schedulesCount,
        pendingSchedules,
        pendingTransfers,
        recentEnrollments
      ] = await Promise.all([
        this.db.collection('courses').where({ status: 'active' }).count(),
        this.db.collection('teachers').where({ status: 'active' }).count(),
        this.db.collection('students').where({ status: 'active' }).count(),
        this.db.collection('course_schedules').count(),
        this.db.collection('course_schedules').where({ status: 'open' }).count(),
        this.db.collection('transfer_requests').where({ status: 'pending' }).count(),
        this.db.collection('enrollments')
          .where({
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          })
          .count()
      ])

      // 获取本月收入
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      const ordersResult = await this.db.collection('orders')
        .where({
          status: 'paid',
          createdAt: { $gte: startOfMonth }
        })
        .get()

      const monthRevenue = ordersResult.data.reduce((sum, order) => {
        // 兼容新旧订单格式
        if (order.amount) {
          return sum + (typeof order.amount === 'number' ? order.amount : 0)
        }
        if (order.items && order.items.length > 0) {
          return sum + order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0)
        }
        return sum
      }, 0)

      return ApiResponse.success({
        overview: {
          courses: coursesCount.total,
          teachers: teachersCount.total,
          students: studentsCount.total,
          schedules: schedulesCount.total,
          openSchedules: pendingSchedules.total,
          pendingTransfers: pendingTransfers.total,
          recentEnrollments: recentEnrollments.total,
          monthRevenue: monthRevenue
        },
        generatedAt: new Date().toISOString()
      }, '获取成功')
    } catch (error) {
      console.error('[Dashboard] 获取统计数据失败:', error)
      return ApiResponse.error(500, '获取统计数据失败', error.message)
    }
  }

  /**
   * 获取近期报名趋势
   */
  async getEnrollmentTrend(days = 7) {
    const endDate = new Date()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const enrollments = await this.db.collection('enrollments')
      .where({
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        }
      })
      .orderBy('createdAt', 'asc')
      .get()

    // 按天分组统计
    const trend = {}
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      trend[dateStr] = 0
    }

    enrollments.data.forEach(e => {
      const dateStr = e.createdAt?.split('T')[0]
      if (dateStr && trend[dateStr] !== undefined) {
        trend[dateStr]++
      }
    })

    return ApiResponse.success({
      trend: Object.entries(trend).map(([date, count]) => ({ date, count })),
      total: enrollments.data.length
    }, '获取成功')
  }

  /**
   * 获取课程报名排名
   */
  async getCourseRanking(limit = 10) {
    const enrollments = await this.db.collection('enrollments')
      .aggregate([
        { $group: { _id: '$courseId', courseName: { $first: '$courseName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ])
      .end()

    return ApiResponse.success(enrollments.list || [], '获取成功')
  }
}

module.exports = DashboardService
