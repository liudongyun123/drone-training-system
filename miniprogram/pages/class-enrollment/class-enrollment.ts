// pages/class-enrollment/class-enrollment.ts
// 培训班报名页

import { classApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'
import { validatePhone, validateName } from '../../utils/validation'
import { parseError } from '../../utils/error'
import logger from '../../utils/logger'

Page({
  data: {
    classInfo: null as any,
    loading: true,
    payMethod: 'online' as 'online' | 'offline',
    contactName: '',
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

  // 输入联系电话
  onPhoneInput(e: any) {
    this.setData({ contactPhone: e.detail.value })
  },

  // 输入备注
  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value })
  },

  // 提交报名
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

    const phoneResult = validatePhone(this.data.contactPhone)
    if (!phoneResult.valid) {
      showToast(phoneResult.message!)
      return
    }

    this.setData({ submitting: true })

    try {
      const userId = getUserId() || ''
      const openid = wx.getStorageSync('openid') || ''

      // 调用云函数创建报名记录
      const res = await wx.cloud.callFunction({
        name: 'web-api',
        data: {
          action: 'enrollClass',
          data: {
            classId: this.classId,
            userId: userId,
            userName: this.data.contactName,
            phone: this.data.contactPhone,
            notes: this.data.remark,
            payMethod: this.data.payMethod
          }
        }
      })

      logger.debug('培训班', '云函数返回', res)

      if (res.result && res.result.success) {
        wx.showToast({ title: '报名成功', icon: 'success' })

        setTimeout(() => {
          wx.redirectTo({ url: '/pages/my-classes/my-classes' })
        }, 1500)
      } else {
        throw new Error(res.result?.error || '报名失败')
      }

    } catch (err: any) {
      logger.error('培训班', '报名失败', err)
      const { message } = parseError(err)
      showToast(message)
    } finally {
      this.setData({ submitting: false })
    }
  }
})