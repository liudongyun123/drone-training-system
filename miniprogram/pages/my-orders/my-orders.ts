// pages/my-orders/my-orders.ts
// 我的订单页

import { orderApi } from '../../utils/api'
import { callFunction } from '../../utils/http'
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
      // 获取所有订单（不筛选 orderType）
      const orders = await orderApi.getByUserId('')
      let processedOrders = orders || []
      
      // 处理订单数据
      processedOrders = processedOrders.map((order: any) => ({
        ...order,
        statusText: statusMap[order.status] || order.status,
        createdAt: this.formatTime(order.createdAt)
      }))

      // 根据当前 Tab 筛选状态
      const currentTab = this.data.currentTab
      if (currentTab !== 'all') {
        processedOrders = processedOrders.filter((o: any) => {
          // 课程/培训班订单：paid 状态显示在"已完成"中
          if ((o.orderType === 'course' || o.orderType === 'class') && o.status === 'paid') {
            return currentTab === 'completed'
          }
          
          // 待发货/待收货 Tab：只显示商品订单
          if (currentTab === 'paid' || currentTab === 'shipped') {
            return o.status === currentTab && o.orderType === 'shop'
          }
          
          return o.status === currentTab
        })
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
      if (!order.status) return
      
      // 课程/培训班订单：paid 状态计入"已完成"
      if ((order.orderType === 'course' || order.orderType === 'class') && order.status === 'paid') {
        counts['completed'] = (counts['completed'] || 0) + 1
        return
      }
      
      // 待发货/待收货 Tab：只统计商品订单
      if ((order.status === 'paid' || order.status === 'shipped') && order.orderType !== 'shop') {
        return
      }
      
      counts[order.status] = (counts[order.status] || 0) + 1
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
            
            // 课程/培训班订单：支付后直接完成（虚拟商品自动发货）
            // 商品订单：支付后变为 paid 状态（等待发货）
            const isVirtual = order.orderType === 'course' || order.orderType === 'class'
            const newStatus = isVirtual ? 'completed' : 'paid'
            
            // 更新订单状态
            await callFunction('api-order', {
              action: 'updateStatus',
              data: { 
                orderId: order._id,
                status: newStatus
              }
            })
            
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
            
            // 使用 HTTP API 调用云函数
            const result = await callFunction('api-order', {
              action: 'cancel',
              data: { orderId }
            })

            wx.hideLoading()
            
            if (result && result.success) {
              wx.showToast({ title: '已取消', icon: 'success' })
              this.loadOrders()
            } else {
              throw new Error(result?.error || '取消失败')
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
            
            // 使用 HTTP API 调用云函数
            const result = await callFunction('api-order', {
              action: 'delete',
              data: { orderId }
            })

            wx.hideLoading()
            
            if (result && result.success) {
              wx.showToast({ title: '已删除', icon: 'success' })
              // 从列表中移除
              const orders = this.data.orders.filter((o: any) => o._id !== orderId)
              this.setData({ orders })
            } else {
              throw new Error(result?.error || '删除失败')
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

  // 去学习（课程/培训班订单）
  goToLearn(e: any) {
    const order = e.currentTarget.dataset.order
    if (order.orderType === 'course' && order.courseId) {
      // 已购买的课程，跳转到课程详情页（会显示"开始学习"按钮）
      wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${order.courseId}` })
    } else if (order.orderType === 'class' && order.classId) {
      wx.navigateTo({ url: `/pages/class-detail/class-detail?id=${order.classId}` })
    } else {
      wx.showToast({ title: '课程信息不存在', icon: 'none' })
    }
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
