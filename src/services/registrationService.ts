/**
 * 报名与权限管理服务 v2.0
 * 
 * 核心业务：
 * 1. 线下报名管理（创建、审核、分班）- 关联班级(Class)
 * 2. 线上购买管理 - 关联课程(Course)
 * 3. 视频权限控制（开通、有效期管理）
 * 4. 学习进度关联
 * 
 * 版本: v20260410-refactor
 * 
 * 业务逻辑变更：
 * - 线下报名关联班级(classId)，不再是直接关联课程
 * - 班级再关联课程，形成 "报名 -> 班级 -> 课程" 的链路
 * - 视频权限通过班级配置控制
 */

import app from '../config/tcb'
import type { 
  Registration, 
  CreateRegistrationRequest,
  ReviewRegistrationRequest,
  UpdateAccessRequest,
  CheckVideoAccessResponse,
  RegistrationSource
} from '../types/registration'
import type { Class, ClassV2 } from '../types'
import type { PaginationParams } from '../types/service'
import { parseCloudFunctionListResponse } from '@/utils/safeData'

const CLOUD_FUNCTION_NAME = 'admin'

// 错误日志开关
const ENABLE_ERROR_LOG = false

/**
 * 调用管理后台云函数
 */
async function callAdminFunction(action: string, params: Record<string, unknown> = {}) {
  try {
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { ...params, action }
    })

    const response = result.result as { code: number; message?: string; data?: unknown }

    if (response.code !== 0) {
      if (ENABLE_ERROR_LOG) console.error(`云函数调用失败:`, response)
      throw new Error(response.message || '操作失败')
    }

    return response
  } catch (error) {
    if (ENABLE_ERROR_LOG) console.error('报名服务错误:', error)
    throw error
  }
}

/**
 * 报名管理服务
 */
export const registrationService = {
  // ==================== 学员端 API ====================

  /**
   * 创建报名申请
   */
  async create(data: CreateRegistrationRequest) {
    const registrationData = {
      ...data,
      source: data.source || 'offline',
      access: {
        videoEnabled: false,
        offlineMaterials: false
      },
      payment: {
        amount: 0,
        originalAmount: 0,
        discountAmount: 0,
        status: 'pending'
      },
      status: data.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await callAdminFunction('add', {
      collection: 'registrations',
      data: registrationData
    }) as { code: number; data?: { _id: string } }

    // 如果创建时指定了班级，则同时创建班级成员记录
    if (data.classId && result.code === 0 && result.data?._id) {
      try {
        await callAdminFunction('add', {
          collection: 'class_members',
          data: {
            registrationId: result.data._id,
            classId: data.classId,
            studentId: data.phone || data.studentId || '',
            studentName: data.studentName || '',
            phone: data.phone || '',
            source: data.source || 'offline_enroll',
            status: 'active',
            joinedAt: new Date().toISOString()
          }
        })
      } catch (err) {
        console.error('创建班级成员记录失败:', err)
      }
    }

    return result
  },

  /**
   * 获取我的报名列表
   * 支持通过 userId、openid、studentId、phone 任一字段查询
   */
  async getMyRegistrations(userIdentifier: string, phone?: string, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      // 构建查询条件 - 支持多种用户标识
      const queryConditions = [
        { userId: userIdentifier },
        { openid: userIdentifier },
        { studentId: userIdentifier }
      ]
      // 如果提供了手机号，也添加到查询条件
      if (phone) {
        queryConditions.push({ phone: phone })
      }
      
      const result = await callAdminFunction('list', {
        collection: 'registrations',
        query: { $or: queryConditions },
        options: {
          ...options,
          page,
          pageSize,
          orderBy: 'createdAt',
          order: 'desc'
        }
      })

      const { list, total } = parseCloudFunctionListResponse<Registration>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
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
    const result = await callAdminFunction('get', {
      collection: 'registrations',
      docId: id
    }) as { data: Registration }

    // 获取班级信息
    let classInfo: Class | null = null
    if (result.data?.classId) {
      try {
        const classResult = await callAdminFunction('get', {
          collection: 'classes',
          docId: result.data.classId
        }) as { data: Class }
        classInfo = classResult.data
      } catch (e) {
        // 班级可能已被删除
      }
    }

    return {
      code: 0,
      data: {
        ...result.data,
        classInfo
      }
    }
  },

  /**
   * 检查视频观看权限
   */
  async checkVideoAccess(registrationId: string, studentId: string): Promise<CheckVideoAccessResponse> {
    try {
      const result = await callAdminFunction('get', {
        collection: 'registrations',
        docId: registrationId
      }) as { data: Registration }

      const reg = result.data

      // 检查学员身份
      if (reg.studentId !== studentId) {
        return { allowed: false, message: '无权访问' }
      }

      // 检查视频权限
      if (!reg.access.videoEnabled) {
        return { allowed: false, message: '未开通视频观看权限' }
      }

      // 检查有效期
      const now = new Date()
      if (reg.access.videoValidFrom && now < new Date(reg.access.videoValidFrom)) {
        return { allowed: false, message: '视频观看尚未开始' }
      }
      if (reg.access.videoValidUntil && now > new Date(reg.access.videoValidUntil)) {
        return { allowed: false, message: '视频观看已过期' }
      }

      return {
        allowed: true,
        validUntil: reg.access.videoValidUntil
      }
    } catch (error) {
      return { allowed: false, message: '检查权限失败' }
    }
  },

  // ==================== 管理端 API ====================

  /**
   * 报名列表查询（管理后台）
   */
  async getList(query: Record<string, unknown> = {}, options: PaginationParams = {}) {
    const { page = 1, pageSize = 20 } = options
    
    try {
      const result = await callAdminFunction('list', {
        collection: 'registrations',
        query,
        options: {
          ...options,
          page,
          pageSize,
          orderBy: 'createdAt',
          order: 'desc'
        }
      })

      const { list, total } = parseCloudFunctionListResponse<Registration>(result, page, pageSize)

      return {
        code: 0,
        data: { list, total, page, pageSize }
      }
    } catch (error: any) {
      console.error('获取报名列表失败:', error)
      return {
        code: -1,
        message: error.message || '获取报名列表失败',
        data: { list: [], total: 0, page, pageSize }
      }
    }
  },

  /**
   * 审核报名
   */
  async review(data: ReviewRegistrationRequest) {
    const updateData = {
      status: data.status,
      review: {
        reviewerId: data.reviewerId,
        reviewedAt: new Date().toISOString(),
        comment: data.comment || ''
      },
      updatedAt: new Date().toISOString()
    }

    return await callAdminFunction('update', {
      collection: 'registrations',
      docId: data.id,
      data: updateData
    })
  },

  /**
   * 分配班级
   */
  async assignClass(registrationId: string, classId: string) {
    // 获取班级信息
    const classResult = await callAdminFunction('get', {
      collection: 'classes',
      docId: classId
    }) as { data: Class }

    const classData = classResult.data

    // 检查容量
    if (classData.capacity?.confirmed >= classData.capacity?.max) {
      throw new Error('班级已满')
    }

    // 获取报名记录信息
    const regResult = await callAdminFunction('get', {
      collection: 'registrations',
      docId: registrationId
    }) as { data: any }

    const regData = regResult.data

    // 更新报名记录
    await callAdminFunction('update', {
      collection: 'registrations',
      docId: registrationId,
      data: {
        classId,
        className: classData.name,
        updatedAt: new Date().toISOString()
      }
    })

    // ★ 创建班级成员记录
    await callAdminFunction('add', {
      collection: 'class_members',
      data: {
        registrationId,
        classId,
        studentId: regData.phone || regData.studentId || '',
        studentName: regData.studentName || '',
        phone: regData.phone || '',
        source: regData.source || 'offline_enroll',
        status: 'active',
        joinedAt: new Date().toISOString()
      }
    })

    // 更新班级人数
    await callAdminFunction('update', {
      collection: 'classes',
      docId: classId,
      data: {
        enrolledCount: (classData.enrolledCount || 0) + 1,
        updatedAt: new Date().toISOString()
      }
    })

    return { code: 0, message: '班级分配成功' }
  },

  /**
   * 更新视频权限
   */
  async updateAccess(data: UpdateAccessRequest) {
    const updateData: Record<string, unknown> = {
      'access.videoEnabled': data.videoEnabled,
      updatedAt: new Date().toISOString()
    }

    if (data.videoValidFrom !== undefined) {
      updateData['access.videoValidFrom'] = data.videoValidFrom
    }
    if (data.videoValidUntil !== undefined) {
      updateData['access.videoValidUntil'] = data.videoValidUntil
    }
    if (data.offlineMaterials !== undefined) {
      updateData['access.offlineMaterials'] = data.offlineMaterials
    }

    return await callAdminFunction('update', {
      collection: 'registrations',
      docId: data.id,
      data: updateData
    })
  },

  /**
   * 更新支付信息
   */
  async updatePayment(
    id: string, 
    data: { amount: number; status: string; method?: PaymentMethod; transactionId?: string }
  ) {
    const updateData: Record<string, unknown> = {
      'payment.amount': data.amount,
      'payment.status': data.status,
      updatedAt: new Date().toISOString()
    }

    if (data.method) updateData['payment.method'] = data.method
    if (data.transactionId) updateData['payment.transactionId'] = data.transactionId
    if (data.status === 'paid') {
      updateData['payment.paidAt'] = new Date().toISOString()
    }

    return await callAdminFunction('update', {
      collection: 'registrations',
      docId: id,
      data: updateData
    })
  }
}

export default {
  registrationService
}
