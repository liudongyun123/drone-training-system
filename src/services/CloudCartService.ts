import { dbService } from './cloudBaseService'
import { authService } from './cloudBaseService'
import type { Course } from '../types'

// 购物车数据服务（云开发版本）
export const CloudCartService = {
  // 添加到购物车
  async addItem(course: Course): Promise<boolean> {
    try {
      if (!course || !course.id) {
        console.error('课程数据无效')
        return false
      }

      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('用户未登录')
      }

      // 检查是否已在购物车中
      const existing = await dbService.where('cart', {
        userId: user.uid,
        courseId: course.id,
      })

      if (existing.length > 0) {
        console.log('课程已在购物车中')
        return true
      }

      // 添加到购物车
      const result = await dbService.add('cart', {
        userId: user.uid,
        courseId: course.id,
        title: course.title || '未知课程',
        thumbnail: course.thumbnail || '',
        price: course.price || 0,
        instructor: course.instructor || '未知讲师',
        addedAt: new Date().toISOString(),
      })

      return !!result
    } catch (error) {
      console.error('添加到购物车失败:', error)
      return false
    }
  },

  // 获取购物车列表
  async getItems(): Promise<any[]> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return []

      const data = await dbService.where('cart', { userId: user.uid })

      return data.map((item: any) => ({
        id: item._id,
        courseId: item.courseId,
        title: item.title,
        thumbnail: item.thumbnail,
        price: item.price,
        instructor: item.instructor,
        addedAt: item.addedAt,
      }))
    } catch (error) {
      console.error('获取购物车失败:', error)
      return []
    }
  },

  // 从购物车移除
  async removeItem(cartItemId: string): Promise<boolean> {
    try {
      return await dbService.delete('cart', cartItemId)
    } catch (error) {
      console.error('移除购物车项失败:', error)
      return false
    }
  },

  // 清空购物车
  async clear(): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser()
      if (!user) return false

      return await dbService.deleteWhere('cart', { userId: user.uid })
    } catch (error) {
      console.error('清空购物车失败:', error)
      return false
    }
  },

  // 计算总价
  async getTotal(): Promise<number> {
    try {
      const items = await this.getItems()
      return items.reduce((total: number, item: any) => total + item.price, 0)
    } catch (error) {
      console.error('计算总价失败:', error)
      return 0
    }
  },
}

export default CloudCartService
