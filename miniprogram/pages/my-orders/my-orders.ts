// pages/my-orders/my-orders.ts
// 我的订单页

import { orderApi } from '../../utils/api'
import { checkLogin } from '../../utils/util'
import logger from '../../utils/logger'

// 状态映射
const statusMap: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消'
}

Page({
  data: {
    tabs: [
      { key: 'all', title: '全部', count: 0 },
      { key: 'pending', title: '待支付', count: 0 },
      { key: 'paid', title: '待发货', count: 0 },
      { key: 'shipped', title: '待收货', count: 0 },
      { key: 'completed', title: '已完成', count: 0 }
    ],
    currentTab: 'all',
    orders: [] as any[],
    loading: false,
    refreshing: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: '我的订单' })
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    this.loadOrders()
  },

  onShow() {
    if (checkLogin()) {
      this.loadOrders()
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true })
    this.loadOrders().then(() => {
      this.setData({ refreshing: false })
      wx.stopPullDownRefresh()
    })
  },

  async loadOrders() {
    this.setData({ loading: true })

    try {
      const orderType = this.data.currentTab === 'all' ? undefined : this.data.currentTab
      const status = this.data.currentTab === 'all' ? undefined : this.data.currentTab
      
      const orders = await orderApi.getByUserId('', orderType)
      let processedOrders = orders || []
      
      // 处理订单数据
      processedOrders = processedOrders.map((order: any) => ({
        ...order,
        statusText: statusMap[order.status] || order.status,
        createdAt: this.formatTime(order.createdAt)
      }))

      // 根据状态筛选
      if (status) {
        processedOrders = processedOrders.filter((o: any) => o.status === status)
      }

      this.setData({ orders: processedOrders, loading: false })
      
      // 更新各状态数量
      this.updateTabCounts(orders || [])
    } catch (err) {
      logger.error('订单', '加载订单失败', err)
      this.setData({ loading: false })
    }
  },

  // 格式化时间
  formatTime(timeStr: string): string {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${minute}`
  },

  // 更新 Tab 数量
  updateTabCounts(allOrders: any[]) {
    const counts: Record<string, number> = { all: allOrders.length }
    
    allOrders.forEach((order: any) => {
      if (order.status) {
        counts[order.status] = (counts[order.status] || 0) + 1
      }
    })

    const tabs = this.data.tabs.map(tab => ({
      ...tab,
      count: counts[tab.key] || 0
    }))

    this.setData({ tabs })
  },

  // 切换 Tab
  switchTab(e: any) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.currentTab) return
    this.setData({ currentTab: key, orders: [] })
    this.loadOrders()
  },

  // 支付订单
  payOrder(e: any) {
    const order = e.currentTarget.dataset.order
    wx.showModal({
      title: '确认支付',
      content: `确定支付 ¥${order.totalPrice || order.totalAmount} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '支付中...' })
            
            // 模拟支付成功
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            wx.hideLoading()
            wx.showToast({ title: '支付成功', icon: 'success' })
            this.loadOrders()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '支付失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 取消订单
  cancelOrder(e: any) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            const result = await wx.cloud.callFunction({
              name: 'api-order',
              data: {
                action: 'cancel',
                orderId
              }
            })

            wx.hideLoading()
            
            if (result.result && (result.result as any).success) {
              wx.showToast({ title: '已取消', icon: 'success' })
              this.loadOrders()
            } else {
              throw new Error((result.result as any)?.error || '取消失败')
            }
          } catch (err: any) {
            wx.hideLoading()
            logger.error('订单', '取消订单失败', err)
            wx.showToast({ title: err.message || '取消失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 删除订单
  deleteOrder(e: any) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            
            const result = await wx.cloud.callFunction({
              name: 'api-order',
              data: {
                action: 'delete',
                orderId
              }
            })

            wx.hideLoading()
            
            if (result.result && (result.result as any).success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              // 从列表中移除
              const orders = this.data.orders.filter((o: any) => o._id !== orderId)
              this.setData({ orders })
            } else {
              throw new Error((result.result as any)?.error || '删除失败')
            }
          } catch (err: any) {
            wx.hideLoading()
            logger.error('订单', '删除订单失败', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 再来一单
  reorder(e: any) {
    const order = e.currentTarget.dataset.order
    if (order.orderType === 'course' && order.courseId) {
      wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${order.courseId}` })
    } else if (order.orderType === 'shop') {
      wx.switchTab({ url: '/pages/shop/shop' })
    }
  },

  // 去逛逛
  goShop() {
    wx.switchTab({ url: '/pages/shop/shop' })
  }
})
