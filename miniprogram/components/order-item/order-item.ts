// components/order-item/order-item.ts
// 订单项组件

Component({
  properties: {
    order: {
      type: Object,
      value: {}
    }
  },

  data: {
    statusText: '',
    statusClass: ''
  },

  observers: {
    'order.status': function(status) {
      const statusMap: Record<string, { text: string, class: string }> = {
        'pending': { text: '待支付', class: 'warning' },
        'paid': { text: '已支付', class: 'success' },
        'shipped': { text: '已发货', class: 'info' },
        'delivered': { text: '已完成', class: 'success' },
        'cancelled': { text: '已取消', class: 'default' },
        'refunded': { text: '已退款', class: 'error' }
      }
      const info = statusMap[status] || { text: status, class: 'default' }
      this.setData({
        statusText: info.text,
        statusClass: info.class
      })
    }
  },

  methods: {
    goToDetail() {
      const order = this.properties.order
      if (order && order._id) {
        wx.navigateTo({
          url: `/pages/my-orders/my-orders?id=${order._id}`
        })
      }
    },

    cancelOrder() {
      this.triggerEvent('cancel', { orderId: this.properties.order._id })
    },

    payOrder() {
      this.triggerEvent('pay', { orderId: this.properties.order._id })
    },

    confirmReceipt() {
      this.triggerEvent('confirm', { orderId: this.properties.order._id })
    }
  }
})