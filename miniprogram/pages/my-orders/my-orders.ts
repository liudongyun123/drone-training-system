// pages/my-orders/my-orders.ts
// 我的订单页

import { orderApi } from '../../utils/api'
import { checkLogin, getUserId } from '../../utils/util'

Page({
  data: {
    tabs: [
      { key: 'all', title: '全部' },
      { key: 'course', title: '课程' },
      { key: 'shop', title: '商城' }
    ],
    currentTab: 'all',
    orders: [] as any[],
    loading: false
  },

  onLoad() {
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
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  async loadOrders() {
    this.setData({ loading: true })

    try {
      const userId = getUserId()!
      const orderType = this.data.currentTab === 'all' ? undefined : this.data.currentTab as 'course' | 'shop'
      const orders = await orderApi.getByUserId(userId, orderType)
      this.setData({ orders, loading: false })
    } catch (err) {
      console.error('加载订单失败:', err)
      this.setData({ loading: false })
    }
  },

  // 切换 Tab
  switchTab(e: any) {
    const key = e.currentTarget.dataset.key
    this.setData({ currentTab: key })
    this.loadOrders()
  },

  // 支付订单
  payOrder(e: any) {
    const order = e.currentTarget.dataset.order
    // TODO: 调用支付接口
    wx.showToast({ title: '支付功能开发中', icon: 'none' })
  },

  // 取消订单
  cancelOrder(e: any) {
    const orderId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          // TODO: 调用取消订单接口
          wx.showToast({ title: '已取消', icon: 'success' })
          this.loadOrders()
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
          // TODO: 调用删除订单接口
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadOrders()
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

  // 获取状态文本
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }
})