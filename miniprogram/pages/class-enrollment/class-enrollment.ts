// pages/class-enrollment/class-enrollment.ts
// 培训班报名页

import { classApi } from '../../utils/api'
import { dbAdd, dbGetList } from '../../utils/http'
import { checkLogin, getUserId, getPhone, showToast } from '../../utils/util'
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
      // ★ 统一使用 phone 作为用户标识
      const phone = getPhone() || ''

      // 检查是否已报名
      const existingResult = await dbGetList('class_members', {
        where: {
          classId: this.classId,
          phone: phone
        }
      })
      
      if (existingResult.data && existingResult.data.length > 0) {
        showToast('您已报名此培训班')
        return
      }

      // 使用 db-init 直接创建报名记录
      const now = new Date().toISOString()
      console.log('[培训班报名] 开始创建报名记录', {
        classId: this.classId,
        phone: phone,
        userName: this.data.contactName
      })
      
      const res = await dbAdd('class_members', {
        classId: this.classId,
        className: this.data.classInfo?.name || '',
        courseId: this.data.classInfo?.courseId || '',
        phone: phone,
        userName: this.data.contactName,
        idCard: this.data.idCard,
        emergencyContact: '',
        emergencyPhone: this.data.contactPhone,
        notes: this.data.remark,
        status: 'pending',  // 待审核
        source: this.data.payMethod === 'online' ? 'online_purchase' : 'offline_enroll',
        enrollmentTime: now,
        createdAt: now,
        updatedAt: now
      })

      console.log('[培训班报名] 报名返回:', JSON.stringify(res))

      // 检查返回结果 - db-init 返回格式: { code, data: { id }, message }
      const recordId = res?.data?.id
      if (recordId) {
        wx.showToast({ title: '报名成功', icon: 'success' })

        setTimeout(() => {
          wx.redirectTo({ url: '/pages/my-classes/my-classes' })
        }, 1500)
      } else {
        console.error('[培训班报名] 报名失败，返回结果:', res)
        throw new Error(res?.message || res?.error || '报名失败')
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