// pages/class-enrollment/class-enrollment.ts
// 培训班报名页

import { classApi, orderApi } from '../../utils/api'
import { dbGetList, callFunction } from '../../utils/http'
import { checkLogin, getPhone, showToast, requirePhoneBinding } from '../../utils/util'
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

      // ★ 统一手机号绑定检查
      if (!await requirePhoneBinding('报名培训班')) {
        this.setData({ submitting: false })
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

      // ★ 培训班报名 = 创建订单 + （微信支付 / 线下缴费）+ 完成报名
      const classInfo = this.data.classInfo

      // 1. 创建培训班订单（状态：待支付 pending）
      logger.debug('培训班报名', '创建订单', {
        classId: this.classId,
        className: classInfo?.name,
        phone
      })

      const orderRes = await callFunction('api-order', {
        action: 'create',
        data: {
          orderType: 'class',
          classId: this.classId,
          className: classInfo?.name || '',
          phone,
          openid,
          status: 'pending',
          totalPrice: classInfo?.price || 0,
          finalAmount: classInfo?.price || 0,
          items: [{
            classId: this.classId,
            title: classInfo?.name || '',
            className: classInfo?.name || '',
            price: classInfo?.price || 0
          }],
          remark: this.data.remark
        }
      })

      logger.debug('培训班报名', '订单创建结果:', orderRes)

      if (!orderRes || !orderRes.success) {
        throw new Error(orderRes?.error || '创建订单失败')
      }

      const orderId = orderRes.data?.orderId || orderRes.data?._id
      if (!orderId) {
        throw new Error('创建订单失败：未返回订单ID')
      }

      // 2. 根据支付方式分流
      if (this.data.payMethod === 'offline') {
        // 线下缴费：订单保持 pending，报名待管理员审核确认
        await this.enrollClass(orderId, 'pending', 'offline_enroll', phone, openid)
        wx.showToast({ title: '报名提交成功', icon: 'success' })
        this.saveEnrollmentInfo(classInfo)
        setTimeout(() => {
          const courseName = encodeURIComponent(classInfo?.courseName || classInfo?.name || '')
          wx.redirectTo({
            url: `/pages/contract-sign/contract-sign?orderId=${orderId}&courseName=${courseName}`
          })
        }, 1500)
      } else {
        // 线上支付：调用微信支付，支付成功后报名
        await this.payOnline(orderId, classInfo, phone, openid)
      }

    } catch (err: any) {
      logger.error('培训班', '报名失败', err)
      const { message } = parseError(err)
      showToast(message)
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 调用微信支付（JSAPI）
  async payOnline(orderId: string, classInfo: any, phone: string, openid: string) {
    if (!openid) {
      wx.showModal({
        title: '无法发起支付',
        content: '未获取到微信身份，请重新登录后重试',
        showCancel: false,
        confirmText: '知道了'
      })
      throw new Error('未获取到 openid')
    }

    wx.showLoading({ title: '正在唤起支付...' })
    try {
      const result = await callFunction('api-order', {
        action: 'createJsapiOrder',
        orderId,
        openid
      })
      wx.hideLoading()

      if (!(result.code === 0 && result.data)) {
        throw new Error(result.message || '发起支付失败')
      }

      const payData = result.data
      await new Promise<void>((resolve, reject) => {
        wx.requestPayment({
          timeStamp: payData.timeStamp,
          nonceStr: payData.nonceStr,
          package: payData.package,
          signType: payData.signType || 'RSA',
          paySign: payData.paySign,
          appId: payData.appId,
          success: () => resolve(),
          fail: (err: any) => {
            if (err.errMsg === 'requestPayment:fail cancel') {
              wx.showToast({ title: '支付已取消', icon: 'none' })
            } else {
              wx.showToast({ title: '支付失败', icon: 'none' })
            }
            reject(new Error(err.errMsg || '支付失败'))
          }
        })
      })

      // 支付成功：更新订单状态为已支付 + 完成报名
      await callFunction('api-order', {
        action: 'updateStatus',
        data: { orderId, status: 'paid' }
      })
      await this.enrollClass(orderId, 'confirmed', 'online_purchase', phone, openid)

      wx.showToast({ title: '报名成功', icon: 'success' })
      this.saveEnrollmentInfo(classInfo)
      setTimeout(() => {
        const courseName = encodeURIComponent(classInfo?.courseName || classInfo?.name || '')
        wx.redirectTo({
          url: `/pages/contract-sign/contract-sign?orderId=${orderId}&courseName=${courseName}`
        })
      }, 1500)
    } catch (err: any) {
      wx.hideLoading()
      throw err
    }
  },

  // 创建培训班报名记录
  async enrollClass(orderId: string, status: string, source: string, phone: string, openid: string) {
    logger.debug('培训班报名', '创建报名记录', { status, source, orderId })
    await callFunction('api-order', {
      action: 'enrollClass',
      data: {
        orderId,
        classId: this.classId,
        phone,
        openid,
        status,
        source,
        userName: this.data.contactName,
        idCard: this.data.idCard,
        contactPhone: this.data.contactPhone,
        remark: this.data.remark
      }
    })
  },

  // 保存学员信息到 storage（合同签署页需要）
  saveEnrollmentInfo(classInfo: any) {
    wx.setStorageSync('userName', this.data.contactName)
    wx.setStorageSync('idCard', this.data.idCard)
  }
})