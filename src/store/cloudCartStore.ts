import { create } from 'zustand'
import { callCloudFunction } from '../config/tcb'

export interface CartItem {
  courseId: string
  title: string
  thumbnail: string
  price: number
  instructor: string
}

interface CloudCartState {
  items: CartItem[]
  total: number
  loading: boolean
  addItem: (item: CartItem) => void
  removeItem: (courseId: string) => void
  clearCart: () => void
  createOrder: () => Promise<string>
}

export const useCloudCartStore = create<CloudCartState>((set) => ({
  items: JSON.parse(localStorage.getItem('cart') || '[]'),
  total: 0,
  loading: false,
  addItem: (item) => {
    const items = JSON.parse(localStorage.getItem('cart') || '[]')
    const exists = items.find(i => i.courseId === item.courseId)
    if (exists) return

    const newItems = [...items, item]
    localStorage.setItem('cart', JSON.stringify(newItems))
    const total = newItems.reduce((sum, i) => sum + i.price, 0)
    set({ items: newItems, total })
  },
  removeItem: (courseId) => {
    const items = JSON.parse(localStorage.getItem('cart') || '[]')
    const newItems = items.filter(i => i.courseId !== courseId)
    localStorage.setItem('cart', JSON.stringify(newItems))
    const total = newItems.reduce((sum, i) => sum + i.price, 0)
    set({ items: newItems, total })
  },
  clearCart: () => {
    localStorage.removeItem('cart')
    set({ items: [], total: 0 })
  },
  createOrder: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('请先登录')
    }

    set({ loading: true })
    try {
      const result = await callCloudFunction('api/orders-create', {
        openid: JSON.parse(localStorage.getItem('user') || '{}')?.openid || '',
        items: JSON.parse(localStorage.getItem('cart') || '[]')
      })

      if (result.code === 0) {
        // 清空购物车
        localStorage.removeItem('cart')
        set({ items: [], total: 0, loading: false })
        return result.data.orderId
      }
      throw new Error(result.message)
    } catch (error) {
      console.error('创建订单失败:', error)
      set({ loading: false })
      throw error
    }
  }
}))
