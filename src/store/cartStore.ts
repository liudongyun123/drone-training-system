import { create } from 'zustand'

export interface CartItem {
  courseId: string
  title: string
  thumbnail: string
  price: number
  instructor: string
}

interface CartState {
  items: CartItem[]
  total: number
  addItem: (item: CartItem) => void
  removeItem: (courseId: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  addItem: (item) =>
    set((state) => {
      const exists = state.items.find((i) => i.courseId === item.courseId)
      if (exists) return state
      return {
        items: [...state.items, item],
        total: state.total + item.price,
      }
    }),
  removeItem: (courseId) =>
    set((state) => {
      const item = state.items.find((i) => i.courseId === courseId)
      if (!item) return state
      return {
        items: state.items.filter((i) => i.courseId !== courseId),
        total: state.total - item.price,
      }
    }),
  clearCart: () => set({ items: [], total: 0 }),
}))
