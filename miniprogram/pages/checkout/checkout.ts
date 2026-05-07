// pages/checkout/checkout.ts
// 结算页

import { orderApi, courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import logger from '../../utils/logger'

Page({
  data: {
    type: 'shop' as 'course' | 'shop',
    courseInfo: null as any,
    // 地址信息
    address: {
      name: '',
      phone: '',
      address: ''
    },
    // 商品列表（用于显示）
    items: [] as any[],
    // 价格相关
    totalAmount: '0.00',
    freight: 0,
    finalAmount: '0.00',
    remark: '',
    submitting: false
  },

  courseId: '',

  onLoad(options: any) {
    const type = options.type || 'shop'
    this.setData({ type })

    if (type === 'course') {
      this.courseId = options.id
      this.loadCourse()
    } else {
      this.loadCartItems()
    }
  },

  async loadCourse() {
    try {
      const course = await courseApi.getDetail(this.courseId)
      const price = course.price || 0
      this.setData({
        courseInfo: course,
        items: [{
          _id: course._id,
          name: course.title,
          price: price,
          quantity: 1,
          coverImage: course.coverImage
        }],
        totalAmount: price.toFixed(2),
        freight: 0,
        finalAmount: price.toFixed(2)
      })
    } catch (err) {
      logger.error('结算', '加载课程失败', err)
      showToast('加载失败')
    }
  },

  loadCartItems() {
    const items = wx.getStorageSync('checkoutItems') || []
    let total = 0
    items.forEach((item: any) => {
      const price = item.sku?.price || item.product?.price || 0
      total += price * item.quantity
    })
    const freight = total > 200 ? 0 : 10 // 满200包邮
    this.setData({
      items: items,
      totalAmount: total.toFixed(2),
      freight: freight,
      finalAmount: (total + freight).toFixed(2)
    })
  },

  // 输入姓名
  onNameInput(e: any) {
    this.setData({
      'address.name': e.detail.value
    })
  },

  // 输入电话
  onPhoneInput(e: any) {
    this.setData({
      'address.phone': e.detail.value
    })
  },

  // 输入地址
  onAddressInput(e: any) {
    this.setData({
      'address.address': e.detail.value
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

  // 备注输入
  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value })
  },

  // 提交订单（微信支付）
  onWechatPay() {
    this.submitOrder()
  },

  // 提交订单
  async submitOrder() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    if (this.data.submitting) return

    // 校验收货信息
    if (!this.data.address.name.trim()) {
      showToast('请输入收货人姓名')
      return
    }
    if (!this.data.address.phone.trim()) {
      showToast('请输入收货人电话')
      return
    }
    if (!this.data.address.address.trim()) {
      showToast('请输入详细收货地址')
      return
    }

    this.setData({ submitting: true })

    try {
      const userId = getUserId()!
      let orderData: any = {
        userId,
        orderType: this.data.type,
        status: 'pending',
        totalPrice: parseFloat(this.data.finalAmount),
        remark: this.data.remark,
        address: this.data.address,
        createdAt: new Date().toISOString()
      }

      if (this.data.type === 'course') {
        orderData.courseId = this.courseId
        orderData.courseInfo = {
          id: this.courseId,
          title: this.data.courseInfo?.title,
          price: this.data.courseInfo?.price
        }
        orderData.items = [{
          productId: this.courseId,
          title: this.data.courseInfo?.title,
          price: this.data.courseInfo?.price,
          quantity: 1
        }]
      } else {
        orderData.items = this.data.items.map((item: any) => ({
          productId: item.productId,
          skuId: item.sku?._id,
          title: item.name || item.product?.title,
          price: item.sku?.price || item.product?.price || item.price,
          quantity: item.quantity,
          specs: item.specs,
          coverImage: item.coverImage || item.product?.coverImage
        }))
      }

      await orderApi.create(orderData)

      // 清空购物车
      if (this.data.type === 'shop') {
        wx.removeStorageSync('checkoutItems')
        // 从购物车移除已结算的商品
        const cart = wx.getStorageSync('cart') || []
        const checkedIds = this.data.items.map((item: any) => 
          `${item.productId}_${JSON.stringify(item.specs || {})}`
        )
        const remaining = cart.filter((item: any) => 
          !checkedIds.includes(`${item.productId}_${JSON.stringify(item.specs || {})}`)
        )
        wx.setStorageSync('cart', remaining)
      }

      wx.showToast({ title: '下单成功', icon: 'success' })

      setTimeout(() => {
        wx.redirectTo({ url: '/pages/my-orders/my-orders' })
      }, 1500)

    } catch (err) {
      logger.error('结算', '创建订单失败', err)
      showToast('下单失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  }
})
