// pages/class-enrollment/class-enrollment.ts
// 培训班报名页

import { classApi } from '../../utils/api'
import { checkLogin, getUserId, showToast } from '../../utils/util'

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
    this.classId = options.id
    this.loadClassInfo()
  },

  async loadClassInfo() {
    try {
      const classInfo = await classApi.getDetail(this.classId)
      this.setData({ classInfo, loading: false })
    } catch (err) {
      console.error('加载培训班失败:', err)
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

    // 校验
    if (!this.data.contactName.trim()) {
      showToast('请输入联系人姓名')
      return
    }
    if (!this.data.contactPhone.trim()) {
      showToast('请输入联系电话')
      return
    }
    if (!/^1\d{10}$/.test(this.data.contactPhone)) {
      showToast('请输入正确的手机号')
      return
    }

    this.setData({ submitting: true })

    try {
      const userId = getUserId()!
      const enrollmentData = {
        userId,
        classId: this.classId,
        classInfo: {
          id: this.classId,
          title: this.data.classInfo?.title,
          price: this.data.classInfo?.price,
          startDate: this.data.classInfo?.startDate,
          location: this.data.classInfo?.location
        },
        contactName: this.data.contactName,
        contactPhone: this.data.contactPhone,
        payMethod: this.data.payMethod,
        remark: this.data.remark,
        status: this.data.payMethod === 'online' ? 'paid' : 'pending',
        createdAt: new Date().toISOString()
      }

      // 这里应该调用云函数创建报名记录
      // await callFunction('createEnrollment', enrollmentData)

      wx.showToast({ title: '报名成功', icon: 'success' })

      setTimeout(() => {
        wx.redirectTo({ url: '/pages/my-classes/my-classes' })
      }, 1500)

    } catch (err) {
      console.error('报名失败:', err)
      showToast('报名失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  }
})