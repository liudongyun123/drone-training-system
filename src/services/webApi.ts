/**
 * Web API 服务 - 通过云函数统一访问数据
 * 
 * 所有 Web端的数据访问都通过 web-api 云函数
 * 避免前端直接调用数据库的问题
 */

import { ensureInit } from '@/utils/cloudbase'

const CLOUD_FUNCTION_NAME = 'web-api'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function callWebApi<T = any>(action: string, data: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
  try {
    await ensureInit()
    const { getCloudbaseApp } = await import('@/utils/cloudbase')
    const app = getCloudbaseApp()
    
    const result = await app.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, ...data }
    })

    const response = result.result as ApiResponse<T>

    if (!response.success) {
      console.error(`[webApi] ${action} 失败:`, response.error)
    } else {
      console.log(`[webApi] ${action} 成功`)
    }

    return response
  } catch (error: any) {
    console.error(`[webApi] ${action} 异常:`, error)
    return {
      success: false,
      error: error.message || '网络请求失败'
    }
  }
}

/**
 * 班级相关 API
 */
export const classApi = {
  /**
   * 获取班级列表
   */
  getClasses: (params: {
    page?: number
    pageSize?: number
    status?: string | string[]
    keyword?: string
    courseId?: string
    teacherId?: string
  } = {}) => {
    return callWebApi('getClasses', params)
  },

  /**
   * 获取班级详情
   */
  getClassDetail: (classId: string) => {
    return callWebApi('getClassDetail', { classId })
  },

  /**
   * 班级报名
   */
  enroll: (data: {
    classId: string
    userName: string
    phone: string
    idCard?: string
    emergencyContact?: string
    emergencyPhone?: string
    notes?: string
    userId?: string
  }) => {
    return callWebApi('enrollClass', data)
  }
}

/**
 * 排课相关 API
 */
export const scheduleApi = {
  /**
   * 获取排课列表
   */
  getSchedules: (params: {
    page?: number
    pageSize?: number
    classId?: string
    courseId?: string
    teacherId?: string
    status?: string
    startDate?: string
    endDate?: string
  } = {}) => {
    return callWebApi('getSchedules', params)
  },

  /**
   * 获取我的排课
   */
  getMySchedules: (params: {
    userId?: string
    phone?: string
    page?: number
    pageSize?: number
  }) => {
    return callWebApi('getMySchedules', params)
  }
}

/**
 * 调课申请相关 API
 */
export const transferApi = {
  /**
   * 获取调课申请列表
   */
  getRequests: (params: {
    userId?: string
    phone?: string
    page?: number
    pageSize?: number
    status?: string
  } = {}) => {
    return callWebApi('transferRequests', params)
  },

  /**
   * 创建调课申请
   */
  createRequest: (data: {
    fromClassId: string
    fromScheduleId?: string
    toClassId: string
    toScheduleId?: string
    reason: string
    userId?: string
    userName?: string
    phone?: string
  }) => {
    return callWebApi('createTransfer', data)
  },

  /**
   * 取消调课申请
   */
  cancelRequest: (requestId: string, userId?: string) => {
    return callWebApi('cancelTransfer', { requestId, userId })
  }
}

export default {
  class: classApi,
  schedule: scheduleApi,
  transfer: transferApi
}
