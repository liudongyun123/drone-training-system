// pages/checkout/checkout.ts
// 结算页 - 支持微信支付

import { orderApi, courseApi, coursePermissionApi } from '../../utils/api'
import { checkLogin, getUserId, showToast, getOpenId, getPhone, requirePhoneBinding } from '../../utils/util'
import { callFunction, dbGetList } from '../../utils/http'
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

  // 运费配置（从后台获取）
  freightConfig: { freeThreshold: 200, defaultFee: 10 } as { freeThreshold: number; defaultFee: number },

  onLoad(options: any) {
    const type = options.type || 'shop'
    wx.setNavigationBarTitle({ title: '确认订单' })
    this.setData({ type })

    if (type === 'course') {
      this.courseId = options.id
      
      // 课程订单：先检查是否已有权限
      this.checkCoursePermission(options.id).then(hasPermission => {
        if (hasPermission) {
          wx.showModal({
            title: '已购买',
            content: '您已购买过该课程，无需重复购买',
            showCancel: false,
            confirmText: '去学习',
            success: (res) => {
              if (res.confirm) {
                wx.redirectTo({ url: '/pages/my-learning/my-learning' })
              }
            }
          })
          return
        }
        // 没有权限，加载课程信息
        this.loadCourse()
      })
    } else {
      this.loadCartItems()
    }

    // 获取 openid
    this.getUserOpenId()

    // 加载运费配置
    this.loadFreightConfig()
  },
  
  // 检查用户是否已有课程权限
  async checkCoursePermission(courseId: string): Promise<boolean> {
    const phone = wx.getStorageSync('phone') || ''
    if (!phone) return false
    
    const PAID_STATUSES = ['paid', 'completed', 'paid_offline']
    try {
      // 1) course_permissions：兼容 courseId / data.courseId / targetId / data.targetId 多种字段
      //    且与 course-detail 保持一致：撤销/过期/视频权限关闭的记录视为"未购买"
      const result = await dbGetList('course_permissions', { where: { phone } })
      const perms = (result.data || []) as any[]
      const permMatch = perms.some((p: any) => {
        const cid = p.courseId || p.data?.courseId || p.targetId || p.data?.targetId
        if (cid !== courseId) return false
        if (p.status === 'revoked') return false
        if (p.videoAccess && p.videoAccess.enabled === false) return false
        if (p.videoAccess && p.videoAccess.validUntil) {
          const until = new Date(p.videoAccess.validUntil).getTime()
          if (!isNaN(until) && until < Date.now()) return false
        }
        return true
      })
      if (permMatch) return true

      // 2) 兜底：已支付订单（与 createOrder 的"已购买"判定一致）
      const orderRes = await dbGetList('orders', { where: { phone, courseId } })
      return (orderRes.data || []).some((o: any) => PAID_STATUSES.includes(o.status))
    } catch (err) {
      logger.error('Checkout', '检查课程权限失败:', err)
      return false
    }
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

  // 加载运费配置（从后台 system_config 集合）
  async loadFreightConfig() {
    try {
      const result = await dbGetList('system_config', {
        where: { type: 'freight' },
        limit: 1
      })
      const config = (result.data || [])[0]
      if (config) {
        this.freightConfig = {
          freeThreshold: config.freeThreshold || 200,
          defaultFee: config.defaultFee || 10
        }
      }
    } catch (err) {
      logger.warn('结算', '加载运费配置失败，使用默认值', err)
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
    const freight = total > this.freightConfig.freeThreshold ? 0 : this.freightConfig.defaultFee // 使用后台运费配置
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
    
    logger.debug('Checkout.checkPhoneBound', '检查绑定状态:', {
      storagePhone,
      storagePhoneType: typeof storagePhone,
      loginInfo: loginInfo ? 'exists' : 'null',
      loginInfoPhone: loginInfo?.phone,
      userId
    })
    
    // 优先使用 storage 中的 phone
    if (typeof storagePhone === 'string' && storagePhone.length > 0) {
      logger.debug('Checkout.checkPhoneBound', '使用 storagePhone:', storagePhone)
      return storagePhone
    }
    
    // 其次检查 loginInfo 中的 phone
    if (loginInfo && typeof loginInfo.phone === 'string' && loginInfo.phone.length > 0) {
      logger.debug('Checkout.checkPhoneBound', '使用 loginInfo.phone:', loginInfo.phone)
      return loginInfo.phone
    }
    
    // 兼容旧数据：userId 可能实际存的是 phone
    if (typeof userId === 'string' && userId.length > 0 && /^1[3-9]\d{9}$/.test(userId)) {
      logger.debug('Checkout.checkPhoneBound', '使用 userId 作为 phone:', userId)
      return userId
    }
    
    logger.debug('Checkout.checkPhoneBound', '本地未找到绑定手机号，尝试从服务器获取')
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
      logger.debug('Checkout.checkAndGetPhone', '服务器返回:', result)
      
      if (result.success && result.data?.user?.phone) {
        const serverPhone = result.data.user.phone
        logger.debug('Checkout.checkAndGetPhone', '从服务器获取到 phone:', serverPhone)
        // 保存到本地
        wx.setStorageSync('phone', serverPhone)
        // 同时更新 loginInfo
        const loginInfo = wx.getStorageSync('loginInfo') || {}
        loginInfo.phone = serverPhone
        wx.setStorageSync('loginInfo', loginInfo)
        return serverPhone
      }
    } catch (err) {
      logger.error('Checkout.checkAndGetPhone', '从服务器获取手机号失败:', err)
    }
    
    return null
  },

  // 校验表单
  async validateForm(): Promise<boolean> {
    // ★ 统一手机号绑定检查
    if (!await requirePhoneBinding('购买课程')) {
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
    if (!await this.validateForm()) return

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
      logger.debug('Checkout', '创建订单数据:', orderData)
      
      const orderRes = await orderApi.create(orderData)
      logger.debug('Checkout', '订单创建响应:', JSON.stringify(orderRes))
      
      // 获取创建的订单ID - 兼容多种返回格式
      let orderId = ''
      if (orderRes?.data?._id) {
        orderId = orderRes.data._id
      } else if (orderRes?.data?.id) {
        orderId = orderRes.data.id
      } else if (orderRes?.data?.orderNo) {
        orderId = orderRes.data.orderNo
      } else if (orderRes?._id) {
        orderId = orderRes._id
      } else if (orderRes?.id) {
        orderId = orderRes.id
      } else if (orderRes?.orderNo) {
        orderId = orderRes.orderNo
      } else if (typeof orderRes === 'string') {
        orderId = orderRes
      }
      
      logger.debug('Checkout', '解析到的订单ID:', orderId)
      
      if (!orderId) {
        logger.error('Checkout', '无法从响应中获取订单ID:', orderRes)
        throw new Error('订单创建失败')
      }

      logger.debug('Checkout', '订单创建成功:', orderId)
      
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
    const openid = wx.getStorageSync('openid') || ''
    logger.debug('Checkout.buildOrderData', 'phone:', phone, 'openid:', openid, 'type:', this.data.type)
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    const orderData: any = {
      orderNo,
      phone,
      openid,  // ★ 添加 openid，确保数据关联
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
    logger.debug('Checkout', '开始微信支付流程, orderId:', orderId)
    
    // 获取用户 openid
    const openid = wx.getStorageSync('openid')
    if (!openid) {
      logger.error('Checkout', '未获取到 openid')
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    wx.showLoading({ title: '正在唤起支付...' })
    
    try {
      // 调用 api-order 云函数获取支付参数
      const result = await callFunction('api-order', {
        action: 'createJsapiOrder',
        orderId: orderId,
        openid: openid
      })
      
      logger.debug('Checkout', 'api-order 返回:', JSON.stringify(result))
      wx.hideLoading()
      
      if (result.code === 0 && result.data) {
        const payData = result.data
        logger.debug('Checkout', '支付参数:', payData)
        
        // 调用微信支付
        await new Promise<void>((resolve, reject) => {
          wx.requestPayment({
            timeStamp: payData.timeStamp,
            nonceStr: payData.nonceStr,
            package: payData.package,
            signType: payData.signType || 'RSA',
            paySign: payData.paySign,
            appId: payData.appId,
            success: (res) => {
              logger.debug('Checkout', '微信支付成功:', res)
              resolve()
            },
            fail: (err) => {
              logger.error('Checkout', '微信支付失败/取消:', err)
              // 用户取消或支付失败
              if (err.errMsg === 'requestPayment:fail cancel') {
                wx.showToast({ title: '支付已取消', icon: 'none' })
              } else {
                wx.showToast({ title: '支付失败', icon: 'none' })
              }
              reject(new Error(err.errMsg || '支付失败'))
            }
          })
        })
        
        // 支付成功后处理
        await this.handlePaymentSuccess(orderId)
        
      } else {
        logger.error('Checkout', '获取支付参数失败:', result)
        wx.showToast({ title: result.message || '发起支付失败', icon: 'none' })
      }
      
    } catch (err: any) {
      logger.error('Checkout', '支付流程异常:', err)
      wx.hideLoading()
      // 如果是用户取消，不显示错误
      if (err.message !== 'requestPayment:fail cancel') {
        wx.showToast({ title: err.message || '支付异常', icon: 'none' })
      }
    }
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

  // 创建培训班报名记录
  async createClassEnrollment(classId: string) {
    try {
      const phone = getPhone() || ''
      const openid = wx.getStorageSync('openid') || ''
      
      if (!phone && !openid) {
        logger.warn('Checkout', '创建报名失败：缺少用户标识')
        return
      }
      
      // 使用已有的 enrollClass action
      await callFunction('api-order', {
        action: 'enrollClass',
        data: {
          classId,
          phone,
          openid,
          status: 'confirmed',
          source: 'online_purchase'
        }
      })
      logger.debug('Checkout', '培训班报名创建成功')
    } catch (err) {
      logger.error('Checkout', '创建培训班报名失败', err)
    }
  },

  // 处理支付成功
  async handlePaymentSuccess(orderId: string) {
    try {
      // 更新订单状态为已支付
      await orderApi.updateStatus(orderId, 'paid')
      
      // 如果是课程订单，创建学习权限
      if (this.data.type === 'course' && this.courseId) {
        await this.createCoursePermissionSafely(orderId)
      }
      
      wx.showToast({ title: '支付成功', icon: 'success' })
      
      setTimeout(() => {
        // 课程订单：购买后无需签培训合同，直接跳转「我的学习」
        // 仅培训班（class-enrollment 流程）才涉及合同签署
        if (this.data.type === 'course' && this.courseId) {
          wx.redirectTo({ url: '/pages/my-learning/my-learning' })
        } else {
          wx.redirectTo({ url: '/pages/my-orders/my-orders' })
        }
      }, 1500)
    } catch (err) {
      logger.error('Checkout', '更新订单状态失败', err)
      // 支付已成功，订单状态让回调处理
      wx.redirectTo({ url: '/pages/my-orders/my-orders' })
    }
  },

  // 安全地创建课程权限（带重试和降级处理）
  async createCoursePermissionSafely(orderId: string) {
    let phone = this.checkPhoneBound() || ''
    const openid = wx.getStorageSync('openid') || ''
    
    // 如果本地没有 phone，尝试从服务器获取
    if (!phone) {
      logger.debug('Checkout', '本地无 phone，尝试从服务器获取')
      phone = await this.checkAndGetPhone() || ''
    }
    
    // 如果仍然没有 phone，跳过权限创建（让后端回调处理）
    if (!phone && !openid) {
      logger.error('Checkout', '无法获取用户标识，跳过前端权限创建')
      logger.debug('Checkout', '提示：后端支付回调将负责创建权限')
      return
    }
    
    // 创建权限（最多重试2次）
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const permResult = await callFunction('api-order', {
          action: 'createCoursePermission',
          data: {
            courseId: this.courseId,
            phone: phone || '',
            openid: openid || '',
            source: 'purchase',
            orderId: orderId
          }
        })
        
        logger.debug('Checkout', '创建课程权限 (尝试 ${attempt}):', permResult)
        
        if (permResult.code === 0) {
          if (permResult.data?.alreadyExists) {
            logger.debug('Checkout', '用户已有该课程权限')
          } else {
            logger.debug('Checkout', '课程权限创建成功，ID:', permResult.data?.permissionId)
          }
          return // 成功，直接返回
        } else {
          logger.error('Checkout', '创建权限失败 (尝试 ${attempt}):', permResult.error)
        }
      } catch (permErr) {
        logger.error('Checkout', '创建权限异常 (尝试 ${attempt}):', permErr)
      }
      
      // 失败后短暂等待再重试
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    logger.warn('Checkout', '前端权限创建失败，将依赖后端支付回调')
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
