/**
 * 前台用户服务 - 用户个人数据查询
 * 
 * 区别于 adminService（后台管理专用），这是前台用户专用的服务。
 * 所有查询都基于当前登录用户的身份（userId/phone）。
 * 
 * 安全规则：read: true（所有人可读），所以匿名登录也能查询。
 */

import { dbService } from './cloudBaseService'
import { useAuthStore } from '@/store/authStore'

/**
 * 获取当前用户身份
 */
function getUserIdentity() {
  const user = useAuthStore.getState().user
  return {
    userId: user?.uid || user?.id || (user as any)?._openid || '',
    userPhone: user?.phone || localStorage.getItem('user_phone') || ''
  }
}

/**
 * 用户学习服务
 */
export const userLearningService = {
  /**
   * 获取学习进度
   */
  async getProgress() {
    const { userId } = getUserIdentity()
    if (!userId) return []
    
    try {
      const data = await dbService.where('user_progress', { userId })
      return data || []
    } catch (e) {
      // 尝试另一个集合名
      try {
        const data = await dbService.where('learning_progress', { userId })
        return data || []
      } catch (e2) {
        return []
      }
    }
  },

  /**
   * 获取课程权限（已购买课程）
   */
  async getCoursePermissions() {
    const { userId, userPhone } = getUserIdentity()
    const results: any[] = []
    const seenIds = new Set<string>()

    // 按 phone 查询
    if (userPhone) {
      const perms = await dbService.where('course_permissions', { phone: userPhone })
      for (const p of perms || []) {
        const id = p.courseId || p.targetId
        if (id && !seenIds.has(id)) {
          seenIds.add(id)
          results.push(p)
        }
      }
    }

    // 按 userId 查询（兼容旧数据）
    if (userId) {
      const queries = [{ userId }, { studentId: userId }, { memberId: userId }]
      for (const q of queries) {
        const perms = await dbService.where('course_permissions', q)
        for (const p of perms || []) {
          const id = p.courseId || p.targetId
          if (id && !seenIds.has(id)) {
            seenIds.add(id)
            results.push(p)
          }
        }
      }
    }

    return results
  },

  /**
   * 获取订单
   */
  async getOrders() {
    const { userId, userPhone } = getUserIdentity()
    const results: any[] = []

    // 按 phone 查询
    if (userPhone) {
      const orders = await dbService.where('orders', { phone: userPhone })
      results.push(...(orders || []))
    }

    // 按 userId 查询
    if (userId) {
      const orders = await dbService.where('orders', { userId })
      for (const o of orders || []) {
        if (!results.find(r => r._id === o._id)) {
          results.push(o)
        }
      }
    }

    return results
  },

  /**
   * 获取报名记录
   */
  async getEnrollments() {
    const { userId, userPhone } = getUserIdentity()
    const results: any[] = []

    if (userPhone) {
      const enrollments = await dbService.where('enrollments', { phone: userPhone })
      results.push(...(enrollments || []))
    }

    if (userId) {
      const queries = [{ userId }, { studentId: userId }, { memberId: userId }]
      for (const q of queries) {
        const enrollments = await dbService.where('enrollments', q)
        for (const e of enrollments || []) {
          if (!results.find(r => r._id === e._id)) {
            results.push(e)
          }
        }
      }
    }

    return results
  },

  /**
   * 获取课程详情
   */
  async getCourse(courseId: string) {
    return dbService.getById('courses', courseId)
  },

  /**
   * 获取班级详情
   */
  async getClass(classId: string) {
    return dbService.getById('classes', classId)
  }
}
