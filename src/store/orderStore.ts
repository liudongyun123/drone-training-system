/**
 * 订单状态管理
 * 使用统一的 Order 类型
 */

import { create } from 'zustand'
import { Order, normalizeOrder } from '../types/database'
import { CloudOrderService } from '../services/CloudOrderService'

interface OrderState {
  orders: Order[]
  loading: boolean
  error: string | null
  currentOrder: Order | null

  // 获取用户订单
  fetchOrders: () => Promise<void>

  // 创建订单
  createOrder: (orderData: {
    items?: Array<{
      courseId: string
      title: string
      thumbnail?: string
      price: number
      instructor?: string
    }>
    courseId?: string
    courseName?: string
    courseCover?: string
    amount: number
    couponId?: string
  }) => Promise<Order | null>

  // 更新订单状态
  updateOrderStatus: (orderId: string, status: Order['status'], paymentMethod?: string) => Promise<boolean>

  // 删除订单
  deleteOrder: (orderId: string) => Promise<boolean>

  // 清除错误
  clearError: () => void
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  currentOrder: null,

  fetchOrders: async () => {
    set({ loading: true, error: null })
    try {
      const orders = await CloudOrderService.getUserOrders()
      set({ orders, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createOrder: async (orderData) => {
    set({ loading: true, error: null })
    try {
      const order = await CloudOrderService.create(orderData)
      if (order) {
        set((state) => ({
          orders: [...state.orders, order],
          currentOrder: order,
          loading: false
        }))
        return order
      }
      throw new Error('创建订单失败')
    } catch (error: any) {
      set({ error: error.message, loading: false })
      return null
    }
  },

  updateOrderStatus: async (orderId, status, paymentMethod) => {
    set({ loading: true, error: null })
    try {
      const success = await CloudOrderService.updateStatus(orderId, status, paymentMethod)
      if (success) {
        set((state) => ({
          orders: state.orders.map((o) =>
            o._id === orderId ? normalizeOrder({ ...o, status }) : o
          ),
          loading: false
        }))
      }
      return success
    } catch (error: any) {
      set({ error: error.message, loading: false })
      return false
    }
  },

  deleteOrder: async (orderId) => {
    set({ loading: true, error: null })
    try {
      const success = await CloudOrderService.delete(orderId)
      if (success) {
        set((state) => ({
          orders: state.orders.filter((o) => o._id !== orderId),
          loading: false
        }))
      }
      return success
    } catch (error: any) {
      set({ error: error.message, loading: false })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
