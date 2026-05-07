// pages/my-orders/my-orders.ts
// 我的订单页

import { orderApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import logger from '../../utils/logger'

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
    this.loadOrders().then(() => wx.stopPullDownRefresh())
  },

  async loadOrders() {
    this.setData({ loading: true })

    try {
      const userId = getUserId() || ''
      const orderType = this.data.currentTab === 'all' ? undefined : this.data.currentTab as 'course' | 'shop'
      const orders = await orderApi.getByUserId(userId, orderType)
      this.setData({ orders, loading: false })
    } catch (err) {
      logger.error('订单', '加载订单失败', err)
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
    // 微信支付功能需要商户号配置，暂时显示提示
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
          try {
            // 调用云函数取消订单
            const result = await wx.cloud.callFunction({
              name: 'api-order',
              data: {
                action: 'cancel',
                orderId
              }
            })

            logger.debug('订单', '取消订单云函数返回', result)

            if (result.result && result.result.success) {
              wx.showToast({ title: '已取消', icon: 'success' })
              this.loadOrders()
            } else {
              throw new Error(result.result?.error || '取消失败')
            }
          } catch (err: any) {
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
            // 调用云函数删除订单
            const result = await wx.cloud.callFunction({
              name: 'api-order',
              data: {
                action: 'delete',
                orderId
              }
            })

            logger.debug('订单', '删除订单云函数返回', result)

            if (result.result && result.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadOrders()
            } else {
              throw new Error(result.result?.error || '删除失败')
            }
          } catch (err: any) {
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