/**
 * 报名与权限管理服务 v3.0
 * 版本: v20260515-unified
 * 
 * 统一使用 CloudDBService (HTTP → db-init)
 */

import { CloudDBService } from './CloudDBService'
import type { 
  Registration, 
  CreateRegistrationRequest,
  ReviewRegistrationRequest,
  UpdateAccessRequest,
  CheckVideoAccessResponse
} from '../types/registration'
import type { Class, PaginationParams } from '../types'

export const registrationService = {
  /**
   * 创建报名申请
   */
  async create(data: CreateRegistrationRequest) {
    const registrationData = {
      ...data,
      source: data.source || 'offline',
      access: { videoEnabled: false, offlineMaterials: false },
      payment: { amount: 0, originalAmount: 0, discountAmount: 0, status: 'pending' },
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await CloudDBService.add('registrations', registrationData)
    const regId = result?.id

    if (data.classId && regId) {
      try {
        await CloudDBService.add('class_members', {
          registrationId: regId,
          classId: data.classId,
          studentId: data.phone || data.studentId || '',
          studentName: data.studentName || '',
          phone: data.phone || '',
          source: data.source || 'offline_enroll',
          status: 'active',
          joinedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      } catch (err) {
        console.error('创建班级成员记录失败:', err)
      }
    }

    return { code: 0, data: { _id: regId } }
  },

  /**
   * 获取我的报名列表
   */
  async getMyRegistrations(userIdentifier: string, phone?: string, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const queryConditions = [
        { userId: userIdentifier },
        { openid: userIdentifier },
        { studentId: userIdentifier }
      ]
      if (phone) {
        queryConditions.push({ phone: phone })
      }
      
      const result = await CloudDBService.query<Registration>('registrations', {
        where: { $or: queryConditions },
        orderBy: 'createdAt',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })

      return {
        code: 0,
        data: { list: result.data, total: result.total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取我的报名列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取我的报名列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 获取报名详情
   */
  async getDetail(id: string) {
    try {
      const reg = await CloudDBService.get<Registration>('registrations', id)
      let classInfo: Class | null = null
      if (reg?.classId) {
        try {
          classInfo = await CloudDBService.get<Class>('classes', reg.classId)
        } catch (e) {}
      }
      return { code: 0, data: { ...reg, classInfo } }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 检查视频观看权限
   */
  async checkVideoAccess(registrationId: string, studentId: string): Promise<CheckVideoAccessResponse> {
    try {
      const result = await CloudDBService.get<Registration>('registrations', registrationId)
      if (!result) return { allowed: false, message: '报名记录不存在' }

      const reg = result
      if (reg.studentId !== studentId) return { allowed: false, message: '无权访问' }
      if (!reg.access?.videoEnabled) return { allowed: false, message: '未开通视频观看权限' }

      const now = new Date()
      if (reg.access?.videoValidFrom && now < new Date(reg.access.videoValidFrom)) {
        return { allowed: false, message: '视频观看尚未开始' }
      }
      if (reg.access?.videoValidUntil && now > new Date(reg.access.videoValidUntil)) {
        return { allowed: false, message: '视频观看已过期' }
      }

      return { allowed: true, validUntil: reg.access?.videoValidUntil }
    } catch (error) {
      return { allowed: false, message: '检查权限失败' }
    }
  },

  /**
   * 报名列表查询（管理后台）
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    try {
      const result = await CloudDBService.query<Registration>('registrations', {
        where: query,
        orderBy: 'createdAt',
        order: 'desc',
        skip: (page - 1) * pageSize,
        limit: pageSize
      })
      return { code: 0, data: { list: result.data, total: result.total, page, pageSize } }
    } catch (error: any) {
      console.error('获取报名列表失败:', error)
      return { code: -1, message: error.message || '获取报名列表失败', data: { list: [], total: 0, page, pageSize } }
    }
  },

  /**
   * 审核报名
   */
  async review(data: ReviewRegistrationRequest) {
    try {
      await CloudDBService.update('registrations', data.id, {
        status: data.status,
        review: {
          reviewerId: data.reviewerId,
          reviewedAt: new Date().toISOString(),
          comment: data.comment || ''
        },
        updatedAt: new Date().toISOString()
      })
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 分配班级
   */
  async assignClass(registrationId: string, classId: string) {
    try {
      const classData = await CloudDBService.get<Class>('classes', classId)
      if (!classData) throw new Error('班级不存在')
      if (classData.capacity?.confirmed >= classData.capacity?.max) throw new Error('班级已满')

      const regData = await CloudDBService.get<any>('registrations', registrationId)

      await CloudDBService.update('registrations', registrationId, {
        classId,
        className: classData.name,
        updatedAt: new Date().toISOString()
      })

      await CloudDBService.add('class_members', {
        registrationId,
        classId,
        studentId: regData?.phone || regData?.studentId || '',
        studentName: regData?.studentName || '',
        phone: regData?.phone || '',
        source: regData?.source || 'offline_enroll',
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      await CloudDBService.update('classes', classId, {
        enrolledCount: (classData.enrolledCount || 0) + 1,
        updatedAt: new Date().toISOString()
      })

      return { code: 0, message: '班级分配成功' }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 更新视频权限
   */
  async updateAccess(data: UpdateAccessRequest) {
    try {
      const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
      if (data.videoEnabled !== undefined) updateData['access.videoEnabled'] = data.videoEnabled
      if (data.videoValidFrom !== undefined) updateData['access.videoValidFrom'] = data.videoValidFrom
      if (data.videoValidUntil !== undefined) updateData['access.videoValidUntil'] = data.videoValidUntil
      if (data.offlineMaterials !== undefined) updateData['access.offlineMaterials'] = data.offlineMaterials

      await CloudDBService.update('registrations', data.id, updateData)
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  },

  /**
   * 更新支付信息
   */
  async updatePayment(id: string, data: { amount: number; status: string; method?: string; transactionId?: string }) {
    try {
      const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
      updateData['payment.amount'] = data.amount
      updateData['payment.status'] = data.status
      if (data.method) updateData['payment.method'] = data.method
      if (data.transactionId) updateData['payment.transactionId'] = data.transactionId
      if (data.status === 'paid') updateData['payment.paidAt'] = new Date().toISOString()

      await CloudDBService.update('registrations', id, updateData)
      return { code: 0 }
    } catch (error: any) {
      return { code: -1, message: error.message }
    }
  }
}

export default { registrationService }
