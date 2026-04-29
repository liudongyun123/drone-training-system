// pages/checkout/checkout.ts
// 结算页

import { orderApi, courseApi, productApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'

Page({
  data: {
    type: 'shop' as 'course' | 'shop',
    courseInfo: null as any,
    cartItems: [] as any[],
    totalPrice: '0.00',
    remark: '',
    // 收货信息（门店自提）
    contactName: '',
    contactPhone: '',
    pickupStore: '',
    stores: ['总部培训中心', '城东体验店', '城西实训基地'] as string[],
    storeIndex: 0,
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
      this.setData({
        courseInfo: course,
        totalPrice: course.price.toFixed(2)
      })
    } catch (err) {
      console.error('加载课程失败:', err)
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
    this.setData({
      cartItems: items,
      totalPrice: total.toFixed(2)
    })
  },

  // 输入备注
  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value })
  },

  // 输入联系人姓名
  onNameInput(e: any) {
    this.setData({ contactName: e.detail.value })
  },

  // 输入联系人电话
  onPhoneInput(e: any) {
    this.setData({ contactPhone: e.detail.value })
  },

  // 选择自提门店
  onStoreChange(e: any) {
    this.setData({
      storeIndex: e.detail.value,
      pickupStore: this.data.stores[e.detail.value]
    })
  },

  // 提交订单
  async submitOrder() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    if (this.data.submitting) return

    // 校验
    if (this.data.type === 'shop') {
      if (!this.data.contactName.trim()) {
        showToast('请输入联系人姓名')
        return
      }
      if (!this.data.contactPhone.trim()) {
        showToast('请输入联系人电话')
        return
      }
    }

    this.setData({ submitting: true })

    try {
      const userId = getUserId()!
      let orderData: any = {
        userId,
        orderType: this.data.type,
        status: 'pending',
        totalPrice: parseFloat(this.data.totalPrice),
        remark: this.data.remark,
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
        orderData.contactName = this.data.contactName
        orderData.contactPhone = this.data.contactPhone
        orderData.pickupStore = this.data.pickupStore || this.data.stores[0]
        orderData.items = this.data.cartItems.map((item: any) => ({
          productId: item.productId,
          skuId: item.sku?._id,
          title: item.product?.title,
          price: item.sku?.price || item.product?.price,
          quantity: item.quantity,
          specs: item.specs
        }))
      }

      await orderApi.create(orderData)

      // 清空购物车
      if (this.data.type === 'shop') {
        wx.removeStorageSync('checkoutItems')
        // 从购物车移除已结算的商品
        const cart = wx.getStorageSync('cart') || []
        const checkedIds = this.data.cartItems.map((item: any) => 
          `${item.productId}_${JSON.stringify(item.specs)}`
        )
        const remaining = cart.filter((item: any) => 
          !checkedIds.includes(`${item.productId}_${JSON.stringify(item.specs)}`)
        )
        wx.setStorageSync('cart', remaining)
      }

      wx.showToast({ title: '下单成功', icon: 'success' })

      setTimeout(() => {
        wx.redirectTo({ url: '/pages/my-orders/my-orders' })
      }, 1500)

    } catch (err) {
      console.error('创建订单失败:', err)
      showToast('下单失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  }
})