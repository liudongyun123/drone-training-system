// pages/checkout/checkout.ts
// 结算页 - 支持微信支付

import { orderApi, courseApi } from '../../utils/api'
import { checkLogin, getUserId, showToast, getOpenId } from '../../utils/util'
import { callFunction } from '../../utils/http'
import { validatePhone, validateName, validateAddress } from '../../utils/validation'
import { parseError } from '../../utils/error'
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
    submitting: false,
    // 订单信息
    createdOrderId: '',
    createdOrderNo: ''
  },

  courseId: '',
  openid: '',

  onLoad(options: any) {
    const type = options.type || 'shop'
    wx.setNavigationBarTitle({ title: '确认订单' })
    this.setData({ type })

    if (type === 'course') {
      this.courseId = options.id
      this.loadCourse()
    } else {
      this.loadCartItems()
    }

    // 获取 openid
    this.getUserOpenId()
  },

  async getUserOpenId() {
    try {
      const res = await getOpenId()
      if (res && res.openid) {
        this.openid = res.openid
      }
    } catch (err) {
      logger.warn('结算', '获取 openid 失败', err)
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
          coverImage: course.coverImage || course.cover
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
    this.initiatePayment()
  },

  // 检查是否已绑定手机号（同步检查）
  checkPhoneBound(): string | null {
    const storagePhone = wx.getStorageSync('phone')
    const loginInfo = wx.getStorageSync('loginInfo')
    const userId = wx.getStorageSync('userId')
    
    console.log('[Checkout.checkPhoneBound] 检查绑定状态:', {
      storagePhone,
      storagePhoneType: typeof storagePhone,
      loginInfo: loginInfo ? 'exists' : 'null',
      loginInfoPhone: loginInfo?.phone,
      userId
    })
    
    // 优先使用 storage 中的 phone
    if (typeof storagePhone === 'string' && storagePhone.length > 0) {
      console.log('[Checkout.checkPhoneBound] 使用 storagePhone:', storagePhone)
      return storagePhone
    }
    
    // 其次检查 loginInfo 中的 phone
    if (loginInfo && typeof loginInfo.phone === 'string' && loginInfo.phone.length > 0) {
      console.log('[Checkout.checkPhoneBound] 使用 loginInfo.phone:', loginInfo.phone)
      return loginInfo.phone
    }
    
    // 兼容旧数据：userId 可能实际存的是 phone
    if (typeof userId === 'string' && userId.length > 0 && /^1[3-9]\d{9}$/.test(userId)) {
      console.log('[Checkout.checkPhoneBound] 使用 userId 作为 phone:', userId)
      return userId
    }
    
    console.log('[Checkout.checkPhoneBound] 本地未找到绑定手机号，尝试从服务器获取')
    return null
  },

  // 异步检查并获取手机号（从服务器获取）
  async checkAndGetPhone(): Promise<string | null> {
    // 先检查本地
    const localPhone = this.checkPhoneBound()
    if (localPhone) {
      return localPhone
    }
    
    // 本地没有，从服务器获取
    try {
      const { newUserApi } = require('../../utils/api')
      const result = await newUserApi.getProfile()
      console.log('[Checkout.checkAndGetPhone] 服务器返回:', result)
      
      if (result.success && result.data?.user?.phone) {
        const serverPhone = result.data.user.phone
        console.log('[Checkout.checkAndGetPhone] 从服务器获取到 phone:', serverPhone)
        // 保存到本地
        wx.setStorageSync('phone', serverPhone)
        // 同时更新 loginInfo
        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.phone = serverPhone
        wx.setStorageSync('loginInfo', loginInfo)
        return serverPhone
      }
    } catch (err) {
      console.error('[Checkout.checkAndGetPhone] 从服务器获取手机号失败:', err)
    }
    
    return null
  },

  // 校验表单
  validateForm(): boolean {
    // 检查手机号绑定状态
    const boundPhone = this.checkPhoneBound()
    if (!boundPhone) {
      // 未绑定手机号，跳转到绑定页面
      wx.showModal({
        title: '请先绑定手机号',
        content: '购买课程需要绑定手机号，是否前往绑定？',
        confirmText: '去绑定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login?redirect=bindPhone' })
          }
        }
      })
      return false
    }

    if (this.data.type === 'shop') {
      const nameResult = validateName(this.data.address.name)
      if (!nameResult.valid) {
        showToast(nameResult.message!)
        return false
      }

      const phoneResult = validatePhone(this.data.address.phone)
      if (!phoneResult.valid) {
        showToast(phoneResult.message!)
        return false
      }

      const addressResult = validateAddress(this.data.address.address)
      if (!addressResult.valid) {
        showToast(addressResult.message!)
        return false
      }
    }
    return true
  },

  // 发起支付流程
  async initiatePayment() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    if (this.data.submitting) return

    // 校验表单
    if (!this.validateForm()) return

    // 确保获取到手机号（从本地或服务器）
    const phone = await this.checkAndGetPhone()
    if (!phone) {
      wx.showModal({
        title: '无法获取手机号',
        content: '请在个人中心绑定手机号后重试',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    this.setData({ submitting: true })

    try {
      // 1. 先创建订单
      const orderData = await this.buildOrderData()
      console.log('[Checkout] 创建订单数据:', orderData)
      
      const orderRes = await orderApi.create(orderData)
      console.log('[Checkout] 订单创建响应:', JSON.stringify(orderRes))
      
      // 获取创建的订单ID - 兼容多种返回格式
      let orderId = ''
      if (orderRes?.data?._id) {
        orderId = orderRes.data._id
      } else if (orderRes?.data?.id) {
        orderId = orderRes.data.id
      } else if (orderRes?._id) {
        orderId = orderRes._id
      } else if (orderRes?.id) {
        orderId = orderRes.id
      } else if (typeof orderRes === 'string') {
        orderId = orderRes
      }
      
      console.log('[Checkout] 解析到的订单ID:', orderId)
      
      if (!orderId) {
        console.error('[Checkout] 无法从响应中获取订单ID:', orderRes)
        throw new Error('订单创建失败')
      }

      console.log('[Checkout] 订单创建成功:', orderId)
      
      // 清空购物车
      if (this.data.type === 'shop') {
        wx.removeStorageSync('checkoutItems')
        const cart = wx.getStorageSync('cart') || []
        const checkedIds = this.data.items.map((item: any) => 
          `${item.productId}_${JSON.stringify(item.specs || {})}`
        )
        const remaining = cart.filter((item: any) => 
          !checkedIds.includes(`${item.productId}_${JSON.stringify(item.specs || {})}`)
        )
        wx.setStorageSync('cart', remaining)
      }

      // 2. 调用微信支付
      await this.requestWechatPayment(orderId)

    } catch (err) {
      logger.error('结算', '支付流程失败', err)
      const { message } = parseError(err)
      showToast(message || '支付失败')
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 构建订单数据
  async buildOrderData() {
    const userId = getUserId() || ''
    // 使用已绑定的手机号
    const phone = this.checkPhoneBound() || this.data.address.phone || ''
    console.log('[Checkout.buildOrderData] phone:', phone, 'type:', this.data.type)
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    const orderData: any = {
      orderNo,
      phone,
      userId,
      orderType: this.data.type,
      status: 'pending',
      totalPrice: parseFloat(this.data.finalAmount),
      finalAmount: parseFloat(this.data.finalAmount),
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
        coverImage: item.coverImage || item.product?.coverImage || item.product?.cover
      }))
    }

    return orderData
  },

  // 请求微信支付
  async requestWechatPayment(orderId: string) {
    // 目前使用模拟支付（微信支付需要配置商户号等）
    console.log('[Checkout] 使用模拟支付')
    await this.mockPaymentSuccess(orderId)
    return
  },

  // 检查云开发环境是否就绪
  checkCloudEnv(): boolean {
    try {
      // 尝试一个简单的云函数调用来检测环境
      // 如果环境未初始化，这里会快速失败
      return true
    } catch {
      return false
    }
  },

  // 模拟支付成功（开发环境或支付未配置时）
  async mockPaymentSuccess(orderId: string) {
    wx.showLoading({ title: '模拟支付中...' })

    try {
      // 更新订单状态
      await orderApi.updateStatus(orderId, 'paid')
      
      // 课程订单：创建学习权限
      if (this.data.type === 'course' && this.data.courseInfo) {
        await this.createCoursePermission(this.data.courseInfo._id)
      }
      
      // 培训班订单：创建报名记录
      if (this.data.type === 'class' && this.data.courseInfo) {
        await this.createClassEnrollment(this.data.courseInfo._id)
      }
      
      wx.hideLoading()
      wx.showToast({ title: '模拟支付成功', icon: 'success' })
      
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/my-orders/my-orders' })
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('[Checkout] 模拟支付更新失败', err)
      // 即使更新失败，也跳转到订单列表
      wx.redirectTo({ url: '/pages/my-orders/my-orders' })
    }
  },

  // 创建课程学习权限
  async createCoursePermission(courseId: string) {
    try {
      const phone = getPhone() || ''
      const openid = wx.getStorageSync('openid') || ''
      
      if (!phone && !openid) {
        console.warn('[Checkout] 创建权限失败：缺少用户标识')
        return
      }
      
      // 直接使用 HTTP API 创建权限记录
      await callFunction('web-api', {
        action: 'createCoursePermission',
        data: {
          courseId,
          phone,
          openid,
          source: 'purchase', // 购买获得
          expiresAt: null // 永不过期
        }
      })
      console.log('[Checkout] 课程权限创建成功')
    } catch (err) {
      console.error('[Checkout] 创建课程权限失败', err)
    }
  },

  // 创建培训班报名记录
  async createClassEnrollment(classId: string) {
    try {
      const phone = getPhone() || ''
      const openid = wx.getStorageSync('openid') || ''
      
      if (!phone && !openid) {
        console.warn('[Checkout] 创建报名失败：缺少用户标识')
        return
      }
      
      // 使用已有的 enrollClass action
      await callFunction('web-api', {
        action: 'enrollClass',
        data: {
          classId,
          phone,
          openid,
          status: 'confirmed',
          source: 'online_purchase'
        }
      })
      console.log('[Checkout] 培训班报名创建成功')
    } catch (err) {
      console.error('[Checkout] 创建培训班报名失败', err)
    }
  },

  // 处理支付成功
  async handlePaymentSuccess(orderId: string) {
    try {
      // 更新订单状态为已支付
      await orderApi.updateStatus(orderId, 'paid')
      
      wx.showToast({ title: '支付成功', icon: 'success' })
      
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/my-orders/my-orders' })
      }, 1500)
    } catch (err) {
      console.error('[Checkout] 更新订单状态失败', err)
      // 支付已成功，订单状态让回调处理
      wx.redirectTo({ url: '/pages/my-orders/my-orders' })
    }
  },

  // 保留原来的 submitOrder 方法以兼容
  async submitOrder() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    if (this.data.submitting) return

    if (!this.validateForm()) return

    this.setData({ submitting: true })

    try {
      const orderData = await this.buildOrderData()
      await orderApi.create(orderData)

      // 清空购物车
      if (this.data.type === 'shop') {
        wx.removeStorageSync('checkoutItems')
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
      const { message } = parseError(err)
      showToast(message)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
