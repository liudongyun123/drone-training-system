// pages/checkout/checkout.js
// 结算页面

const { orderApi, cartApi } = require('../../utils/api')

// 获取应用实例
const app = getApp()

Page({
  data: {
    // 订单类型：cart=购物车结算, direct=直接购买
    orderType: 'cart',
    
    // 商品列表
    items: [],
    
    // 价格
    totalAmount: 0,
    freight: 0,
    finalAmount: 0,
    
    // 收货地址
    address: {
      name: '',
      phone: '',
      address: ''
    },
    
    // 备注
    remark: '',
    
    // 支付方式
    paymentMethod: 'wechat',
    
    // 用户信息
    userId: '',
    openid: '',
    
    // 状态
    loading: false,
    submitting: false
  },

  onLoad(options) {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {}
    const userId = wx.getStorageSync('userId') || ''
    const openid = wx.getStorageSync('openid') || ''
    
    this.setData({
      userId: userId || openid,
      openid: openid
    })
    
    // 处理传入的商品信息
    if (options.type === 'direct' && options.productInfo) {
      // 直接购买
      try {
        const productInfo = JSON.parse(decodeURIComponent(options.productInfo))
        const item = {
          _id: productInfo.id,
          name: productInfo.name,
          price: productInfo.price,
          coverImage: productInfo.image || '',
          quantity: productInfo.quantity || 1
        }
        this.setData({
          orderType: 'direct',
          items: [item]
        })
        this.calculateAmount()
      } catch (err) {
        console.error('解析商品信息失败:', err)
        wx.showToast({ title: '参数错误', icon: 'none' })
      }
    } else {
      // 购物车结算
      this.loadCartItems()
    }
    
    // 加载用户保存的地址
    this.loadSavedAddress()
  },

  onShow() {
    // 检查登录状态
    if (!this.data.userId) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再进行结算',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' })
          } else {
            wx.navigateBack()
          }
        }
      })
    }
  },

  // 加载购物车商品
  loadCartItems() {
    const cart = cartApi.getCart()
    if (cart.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({ items: cart })
    this.calculateAmount()
  },

  // 计算金额
  calculateAmount() {
    const { items } = this.data
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    
    // 计算运费（满99包邮）
    const freight = totalAmount >= 99 ? 0 : 10
    
    this.setData({
      totalAmount: totalAmount.toFixed(2),
      freight: freight,
      finalAmount: (totalAmount + freight).toFixed(2)
    })
  },

  // 加载保存的地址
  loadSavedAddress() {
    const savedAddress = wx.getStorageSync('shipping_address')
    if (savedAddress) {
      this.setData({ address: savedAddress })
    }
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      'address.name': e.detail.value
    })
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      'address.phone': e.detail.value
    })
  },

  // 地址输入
  onAddressInput(e) {
    this.setData({
      'address.address': e.detail.value
    })
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },

  // 支付方式选择
  onPaymentChange(e) {
    this.setData({
      paymentMethod: e.detail.value
    })
  },

  // 选择微信收货地址
  onChooseAddress() {
    wx.chooseAddress({
      success: (res) => {
        this.setData({
          'address.name': res.userName || '',
          'address.phone': res.telNumber || '',
          'address.address': `${res.provinceName}${res.cityName}${res.countyName}${res.detailInfo}` || ''
        })
      }
    })
  },

  // 表单验证
  validateForm() {
    const { address, items } = this.data
    
    if (!address.name) {
      wx.showToast({ title: '请输入收货人姓名', icon: 'none' })
      return false
    }
    
    if (!address.phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return false
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(address.phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return false
    }
    
    if (!address.address) {
      wx.showToast({ title: '请输入收货地址', icon: 'none' })
      return false
    }
    
    if (items.length === 0) {
      wx.showToast({ title: '订单商品不能为空', icon: 'none' })
      return false
    }
    
    return true
  },

  // 提交订单
  async onSubmitOrder() {
    if (this.data.submitting) return
    
    if (!this.validateForm()) return
    
    this.setData({ submitting: true })
    
    try {
      const { userId, openid, address, items, remark, paymentMethod, freight, orderType } = this.data
      
      // 准备订单数据
      const orderData = {
        userId: userId || openid,
        phone: address.phone,
        items: items.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          coverImage: item.coverImage || ''
        })),
        shippingAddress: {
          name: address.name,
          phone: address.phone,
          address: address.address
        },
        remark: remark
      }
      
      // 创建订单
      const order = await orderApi.createShopOrder(orderData)
      
      // 保存地址
      wx.setStorageSync('shipping_address', address)
      
      // 如果是购物车结算，清空购物车
      if (orderType === 'cart') {
        cartApi.clearCart()
      }
      
      // 显示成功提示
      wx.showToast({
        title: '订单创建成功',
        icon: 'success'
      })
      
      // 跳转到订单详情页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/my-orders/my-orders`
        })
      }, 1500)
      
    } catch (err) {
      console.error('创建订单失败:', err)
      wx.showToast({
        title: '创建订单失败',
        icon: 'none'
      })
      this.setData({ submitting: false })
    }
  },

  // 微信支付
  async onWechatPay() {
    if (!this.validateForm()) return
    
    this.setData({ submitting: true })
    
    try {
      // 先创建订单
      const { userId, openid, address, items, remark, freight } = this.data
      
      const orderData = {
        userId: userId || openid,
        phone: address.phone,
        items: items.map(item => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          coverImage: item.coverImage || ''
        })),
        shippingAddress: {
          name: address.name,
          phone: address.phone,
          address: address.address
        },
        remark: remark
      }
      
      const order = await orderApi.createShopOrder(orderData)
      
      // 保存地址
      wx.setStorageSync('shipping_address', address)
      
      // 调用微信支付
      // 注意：实际项目中需要调用云函数获取支付参数
      const payResult = await this.requestPayment(order)
      
      if (payResult) {
        // 支付成功
        // 清空购物车
        if (this.data.orderType === 'cart') {
          cartApi.clearCart()
        }
        
        wx.showToast({
          title: '支付成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/my-orders/my-orders`
          })
        }, 1500)
      }
      
    } catch (err) {
      console.error('支付失败:', err)
      
      if (err.errMsg && err.errMsg.includes('cancel')) {
        wx.showToast({ title: '用户取消支付', icon: 'none' })
      } else {
        wx.showToast({ title: '支付失败', icon: 'none' })
      }
      
      this.setData({ submitting: false })
    }
  },

  // 请求支付参数
  async requestPayment(order) {
    return new Promise((resolve, reject) => {
      // 实际项目中需要调用云函数获取支付参数
      // 这里模拟支付成功
      wx.showModal({
        title: '提示',
        content: '当前为演示模式，是否模拟支付成功？',
        success: async (res) => {
          if (res.confirm) {
            // 模拟支付成功，更新订单状态
            try {
              await orderApi.updateStatus(order._id, 'paid', {
                paidAt: new Date().toISOString(),
                paymentMethod: 'wechat'
              })
              resolve(true)
            } catch (err) {
              reject(err)
            }
          } else {
            reject({ errMsg: 'cancel' })
          }
        }
      })
    })
  },

  // 返回
  onBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/shop/shop' })
      }
    })
  }
})
