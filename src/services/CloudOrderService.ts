/**
 * @deprecated 此服务已废弃，建议迁移到 orderApi (from '@/shared/services/orderApi')
 * 
 * 注意：orderApi 提供更简洁的 API：
 * - create(params): 创建订单
 * - getByUserId(userId): 获取用户订单
 * - getById(orderId): 获取订单详情
 * - updateStatus(orderId, status): 更新订单状态
 * 
 * 此服务保留用于向后兼容，因为它包含复杂的授权逻辑，
 * 将在后续版本中迁移到统一订单服务后删除
 */

/**
 * 订单数据服务（C端）
 * 使用统一的订单类型和数据结构
 */

import { dbService, authService } from './cloudBaseService'
import { Order, OrderItem, normalizeOrder } from '../types/database'
import { membersService } from './membersService'
import { useAuthStore } from '../store/authStore'
import { app } from '../utils/cloudbase'

// 统一的订单数据服务
export const CloudOrderService = {

  // 创建订单
  async create(orderData: {
    items?: OrderItem[]
    courseId?: string
    courseName?: string
    courseCover?: string
    amount: number
    couponId?: string
    phone?: string  // 新增：手机号
  }): Promise<Order | null> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('用户未登录')
      }

      // 从 authStore 获取手机号（优先）
      const { user: storeUser } = useAuthStore.getState()
      const phone = orderData.phone || storeUser?.phone || (user as any)?.phone

      if (!phone) {
        throw new Error('用户未绑定手机号，无法创建订单')
      }

      console.log('[CloudOrderService] 创建订单，用户手机号:', phone)

      const order: Partial<Order> = {
        userId: user.uid,
        phone: phone,  // ★ 关键：保存手机号
        userName: storeUser?.nickname || storeUser?.name || (user as any).nickName || (user as any).username || '匿名用户',
        _openid: (user as any)._openid,
        orderNo: `ORD${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        items: orderData.items,
        courseId: orderData.courseId,
        courseName: orderData.courseName,
        courseCover: orderData.courseCover,
        amount: orderData.amount,
        discountAmount: 0,
        finalAmount: orderData.amount,
        status: 'pending',
        paymentMethod: 'wechat',
        createdAt: new Date().toISOString(),
        couponId: orderData.couponId,
      }

      const result = await dbService.add('orders', order)
      if (!result) return null

      return normalizeOrder({ ...order, _id: result.id })
    } catch (error) {
      console.error('创建订单失败:', error)
      return null
    }
  },

  // 获取用户的所有订单（通过云函数查询）
  async getUserOrders(options: { userId?: string; phone?: string; openid?: string } = {}): Promise<Order[]> {
    console.log('[CloudOrderService] getUserOrders 被调用 - 云函数版本')
    try {
      // 优先使用传入的参数，其次使用 authStore
      const authStoreUser = useAuthStore.getState()?.user
      
      const phone = options.phone || authStoreUser?.phone || localStorage.getItem('user_phone') || undefined
      const uid = options.userId || authStoreUser?.id
      const openid = options.openid || (authStoreUser as any)?._openid || uid

      console.log('[CloudOrderService] 用户信息:', { phone, uid, openid, authStorePhone: authStoreUser?.phone, localPhone: localStorage.getItem('user_phone') });

      // 如果没有手机号、openid、userId，无法查询
      if (!phone && !openid && !uid) {
        console.warn('[CloudOrderService] 无法获取用户标识信息');
        return [];
      }

      // ★ 调用云函数查询订单
      let result: any
      try {
        result = await app.callFunction({
          name: 'admin',
          data: {
            action: 'getUserOrders',
            phone: phone,
            openid: openid,
            userId: uid
          }
        })
        console.log('[CloudOrderService] 云函数原始返回:', JSON.stringify(result));
      } catch (callError: any) {
        console.error('[CloudOrderService] 云函数调用异常:', callError);
        return []
      }

      // 解析返回结果 - CloudBase SDK 返回 { result: { code, data, message } }
      if (!result) {
        console.error('[CloudOrderService] 云函数返回结果为空');
        return []
      }

      const response = result.result || result
      console.log('[CloudOrderService] 解析后响应:', response);

      if (response.code === 0) {
        const orders = response.data || []
        console.log('[CloudOrderService] 找到订单:', orders.length, '条');
        return orders.map((d: any) => normalizeOrder(d))
      } else {
        console.error('[CloudOrderService] 云函数调用失败:', response.message);
        return []
      }
    } catch (error: any) {
      console.error('[CloudOrderService] 获取用户订单失败:', error);
      return []
    }
  },

  // 根据ID获取订单
  async getById(id: string): Promise<Order | null> {
    try {
      if (!id) {
        throw new Error('订单ID不能为空')
      }
      const result = await dbService.get('orders', id)
      if (!result) return null
      return normalizeOrder(result)
    } catch (error) {
      console.error('获取订单详情失败:', error)
      return null
    }
  },

  // 更新订单状态
  async updateStatus(id: string, status: Order['status'], paymentMethod?: string): Promise<boolean> {
    try {
      // 获取订单信息（用于后续业务逻辑）
      const order = await this.getById(id)
      if (!order) {
        throw new Error('订单不存在')
      }

      const updateData: Partial<Order> = {
        status,
        updatedAt: new Date().toISOString(),
      }
      if (status === 'paid') {
        updateData.paidAt = new Date().toISOString()
      }
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod as any
      }

      const result = await dbService.update('orders', id, updateData)

      // 支付成功后：授予课程权限（写入 course_permissions 集合）
      if (result && status === 'paid') {
        console.log('[CloudOrderService] 订单支付成功，触发课程授权逻辑')

        const phone = (order as any).phone
        const orderItems = order.items || []
        const courseIds = orderItems.map((item: any) => item.courseId).filter(Boolean)
        if (order.courseId && !courseIds.includes(order.courseId)) {
          courseIds.push(order.courseId)
        }

        if (phone && courseIds.length > 0) {
          // 先更新 members.enrolledCourses
          try {
            await membersService.grantCoursePermission(phone, order.courseId || courseIds[0], {
              source: 'purchase',
              orderId: order._id || id
            })
            console.log('[CloudOrderService] members.enrolledCourses 更新成功')
          } catch (err) {
            console.error('[CloudOrderService] members 更新失败:', err)
          }

          // ★ 关键修复：写入 course_permissions 集合
          for (const courseId of courseIds) {
            try {
              await app.callFunction({
                name: 'admin',
                data: {
                  action: 'upsert',
                  collection: 'course_permissions',
                  query: { phone, courseId },
                  data: {
                    phone,
                    courseId,
                    orderId: order._id || id,
                    source: 'purchase',
                    status: 'active',
                    grantedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                }
              })
              console.log('[CloudOrderService] course_permissions 写入成功:', { phone, courseId })
            } catch (permErr) {
              console.error('[CloudOrderService] course_permissions 写入失败:', permErr)
            }
          }
        } else {
          console.warn('[CloudOrderService] 无法授权课程：缺少手机号或课程ID', { phone, courseIds })
        }
      }

      return !!result
    } catch (error) {
      console.error('更新订单状态失败:', error)
      return false
    }
  },

  // 删除订单（仅限未支付订单）
  async delete(id: string): Promise<boolean> {
    try {
      const order = await this.getById(id)
      if (!order) return false
      if (order.status !== 'pending') {
        throw new Error('只能删除待支付订单')
      }

      const result = await dbService.delete('orders', id)
      return !!result
    } catch (error) {
      console.error('删除订单失败:', error)
      return false
    }
  },
}