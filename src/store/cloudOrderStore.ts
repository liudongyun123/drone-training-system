import { create } from 'zustand'
import { dbService } from '../services/cloudBaseService'
import { Order } from '../types/database'

interface CloudOrderState {
  orders: Order[]
  loading: boolean
  error: string | null
  fetchOrders: (userId: string) => Promise<void>
  createOrder: (order: Omit<Order, '_id' | '_openid' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
}

export const useCloudOrderStore = create<CloudOrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  fetchOrders: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const orders = await dbService.where('orders', { userId })
      set({ orders, loading: false })
    } catch (error) {
      console.error('获取订单列表失败:', error)
      set({ loading: false, error: '获取订单列表失败' })
    }
  },

  createOrder: async (order: Omit<Order, '_id' | '_openid' | 'createdAt' | 'updatedAt'>) => {
    try {
      await dbService.add('orders', order)
      await get().fetchOrders(order.userId)
    } catch (error) {
      console.error('创建订单失败:', error)
      throw error
    }
  },

  updateOrder: async (id: string, order: Partial<Order>) => {
    try {
      await dbService.update('orders', id, order)
      await get().fetchOrders(order.userId || '')
    } catch (error) {
      console.error('更新订单失败:', error)
      throw error
    }
  },

  deleteOrder: async (id: string) => {
    try {
      await dbService.delete('orders', id)
      set({ orders: get().orders.filter(o => o._id !== id) })
    } catch (error) {
      console.error('删除订单失败:', error)
      throw error
    }
  }
}))
