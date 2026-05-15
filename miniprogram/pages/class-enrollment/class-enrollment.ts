// pages/class-enrollment/class-enrollment.ts
// 培训班报名页

import { classApi, orderApi } from '../../utils/api'
import { dbGetList, callFunction } from '../../utils/http'
import { checkLogin, getPhone, showToast } from '../../utils/util'
import { validatePhone, validateName, validateIdCard } from '../../utils/validation'
import { parseError } from '../../utils/error'
import logger from '../../utils/logger'

Page({
  data: {
    classInfo: null as any,
    loading: true,
    payMethod: 'online' as 'online' | 'offline',
    contactName: '',
    idCard: '',
    contactPhone: '',
    remark: '',
    submitting: false
  },

  classId: '',

  onLoad(options: any) {
    wx.setNavigationBarTitle({ title: '培训班报名' })
    this.classId = options.id
    this.loadClassInfo()
  },

  async loadClassInfo() {
    try {
      const classInfo = await classApi.getDetail(this.classId)
      this.setData({ classInfo, loading: false })
    } catch (err) {
      logger.error('培训班', '加载培训班失败', err)
      this.setData({ loading: false })
      showToast('加载失败')
    }
  },

  // 选择支付方式
  selectPayMethod(e: any) {
    const method = e.currentTarget.dataset.method
    this.setData({ payMethod: method })
  },

  // 输入联系人姓名
  onNameInput(e: any) {
    this.setData({ contactName: e.detail.value })
  },

  // 输入身份证号
  onIdCardInput(e: any) {
    this.setData({ idCard: e.detail.value })
  },

  // 输入联系电话
  onPhoneInput(e: any) {
    this.setData({ contactPhone: e.detail.value })
  },

  // 输入备注
  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value })
  },

  // 提交报名（购买培训班 = 创建订单 + 完成报名）
  async submitEnrollment() {
    if (!checkLogin()) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    if (this.data.submitting) return

    // 表单验证
    const nameResult = validateName(this.data.contactName)
    if (!nameResult.valid) {
      showToast(nameResult.message!)
      return
    }

    // 身份证号验证
    const idCardResult = validateIdCard(this.data.idCard)
    if (!idCardResult.valid) {
      showToast(idCardResult.message!)
      return
    }

    const phoneResult = validatePhone(this.data.contactPhone)
    if (!phoneResult.valid) {
      showToast(phoneResult.message!)
      return
    }

    this.setData({ submitting: true })

    try {
      const phone = getPhone() || ''
      const openid = wx.getStorageSync('openid') || ''

      if (!phone) {
        showToast('请先登录')
        return
      }

      // 检查是否已报名（通过订单查询）
      const existingOrders = await orderApi.getByUserId('', 'class')
      const alreadyEnrolled = existingOrders.some((o: any) => 
        o.classId === this.classId && ['pending', 'paid', 'completed'].includes(o.status)
      )
      
      if (alreadyEnrolled) {
        showToast('您已报名此培训班')
        return
      }

      // ★ 培训班报名 = 创建订单 + 完成报名
      const classInfo = this.data.classInfo
      
      // 1. 创建培训班订单
      console.log('[培训班报名] 创建订单', {
        classId: this.classId,
        className: classInfo?.name,
        phone: phone
      })

      const orderRes = await callFunction('api-order', {
        action: 'create',
        data: {
          orderType: 'class',
          classId: this.classId,
          className: classInfo?.name || '',
          phone: phone,
          openid: openid,
          totalPrice: classInfo?.price || 0,
          finalAmount: classInfo?.price || 0,
          items: [{
            classId: this.classId,
            className: classInfo?.name || '',
            price: classInfo?.price || 0
          }],
          remark: this.data.remark
        }
      })

      console.log('[培训班报名] 订单创建结果:', orderRes)

      if (!orderRes || !orderRes.success) {
        throw new Error(orderRes?.error || '创建订单失败')
      }

      const orderId = orderRes.data?.orderId || orderRes.data?._id

      // 2. 模拟支付成功（虚拟商品自动完成）
      console.log('[培训班报名] 更新订单状态为已完成')
      await callFunction('api-order', {
        action: 'updateStatus',
        data: { orderId, status: 'completed' }
      })

      // 3. 完成培训班报名
      console.log('[培训班报名] 创建报名记录')
      await callFunction('api-order', {
        action: 'enrollClass',
        data: {
          classId: this.classId,
          phone,
          openid,
          status: 'confirmed',
          source: 'online_purchase',
          userName: this.data.contactName,
          idCard: this.data.idCard,
          contactPhone: this.data.contactPhone,
          remark: this.data.remark
        }
      })

      wx.showToast({ title: '报名成功', icon: 'success' })

      setTimeout(() => {
        // 跳转到我的订单页面
        wx.redirectTo({ url: '/pages/my-orders/my-orders' })
      }, 1500)

    } catch (err: any) {
      logger.error('培训班', '报名失败', err)
      const { message } = parseError(err)
      showToast(message)
    } finally {
      this.setData({ submitting: false })
    }
  }
})