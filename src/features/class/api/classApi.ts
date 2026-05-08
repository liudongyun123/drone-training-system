/**
 * Class API - 班级接口
 */

import { platform } from '../../../platform/adapters';
import { BaseResponse, PaginatedResponse } from '../../../platform/adapters/IRequestAdapter';
import { apiCache } from '../../../infrastructure/cache/CacheManager';
import { apiMonitor } from '../../../infrastructure/monitor/APIMonitor';
import { apiLogger } from '../../../infrastructure/logger/Logger';
import type {
  ClassInfo,
  ClassSchedule,
  ClassListParams,
  ClassDetailParams,
  EnrollClassParams,
  AttendanceParams,
  StudentClass,
} from '../types/Class';

// ============================================================================
// API 端点
// ============================================================================

const API_BASE = '/classes';

const endpoints = {
  list: `${API_BASE}`,
  detail: (id: string) => `${API_BASE}/${id}`,
  enroll: (id: string) => `${API_BASE}/${id}/enroll`,
  schedules: (id: string) => `${API_BASE}/${id}/schedules`,
  myClasses: `${API_BASE}/my`,
  attendance: (id: string, scheduleId: string) => 
    `${API_BASE}/${id}/schedules/${scheduleId}/attendance`,
};

// ============================================================================
// API 函数
// ============================================================================

/**
 * 获取班级列表
 */
export async function getClassList(
  params: ClassListParams = {}
): Promise<PaginatedResponse<ClassInfo>> {
  const { page = 1, pageSize = 10, ...rest } = params;
  
  return apiMonitor.track('GET', endpoints.list, () =>
    platform.request.get<PaginatedResponse<ClassInfo>>(endpoints.list, {
      page,
      pageSize,
      ...rest,
    })
  );
}

/**
 * 获取报名中的班级列表
 */
export async function getEnrollingClasses(
  sourceId?: string,
  limit: number = 10
): Promise<BaseResponse<ClassInfo[]>> {
  return apiMonitor.track('GET', `${endpoints.list}/enrolling`, () =>
    apiCache.get<ClassInfo[]>(`${endpoints.list}/enrolling`, { sourceId, limit }, {
      ttl: 5 * 60 * 1000, // 5分钟缓存
      key: `enrolling_classes_${sourceId || 'all'}`,
    })
  );
}

/**
 * 获取班级详情
 */
export async function getClassDetail(
  params: ClassDetailParams
): Promise<BaseResponse<ClassInfo & { schedules?: ClassSchedule[] }>> {
  const { classId, includeSchedules = true } = params;
  
  return apiMonitor.track('GET', endpoints.detail(classId), () =>
    apiCache.get<ClassInfo>(endpoints.detail(classId), undefined, {
      ttl: 10 * 60 * 1000, // 10分钟缓存
      key: `class_detail_${classId}`,
    })
  );
}

/**
 * 获取班级排课列表
 */
export async function getClassSchedules(
  classId: string
): Promise<BaseResponse<ClassSchedule[]>> {
  return apiMonitor.track('GET', endpoints.schedules(classId), () =>
    apiCache.get<ClassSchedule[]>(endpoints.schedules(classId), undefined, {
      ttl: 5 * 60 * 1000,
      key: `class_schedules_${classId}`,
    })
  );
}

/**
 * 获取我的班级列表
 */
export async function getMyClasses(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<StudentClass>> {
  return apiMonitor.track('GET', endpoints.myClasses, () =>
    platform.request.get<PaginatedResponse<StudentClass>>(
      endpoints.myClasses,
      { page, pageSize }
    )
  );
}

/**
 * 报名班级
 */
export async function enrollClass(
  params: EnrollClassParams
): Promise<BaseResponse<{ enrollmentId: string; orderId?: string }>> {
  const { classId, ...rest } = params;
  
  apiLogger.info('[Class] 报名班级', { classId, studentPhone: rest.studentPhone });
  
  // 清除我的班级缓存
  apiCache.invalidate(endpoints.myClasses);
  
  return apiMonitor.track('POST', endpoints.enroll(classId), () =>
    platform.request.post<BaseResponse<{ enrollmentId: string; orderId?: string }>>(
      endpoints.enroll(classId),
      rest
    )
  );
}

/**
 * 提交考勤
 */
export async function submitAttendance(
  params: AttendanceParams
): Promise<BaseResponse<{ success: number; failed: number }>> {
  const { classId, scheduleId, records } = params;
  
  apiLogger.info('[Class] 提交考勤', { classId, scheduleId, count: records.length });
  
  return apiMonitor.track('POST', endpoints.attendance(classId, scheduleId), () =>
    platform.request.post<BaseResponse<{ success: number; failed: number }>>(
      endpoints.attendance(classId, scheduleId),
      { records }
    )
  );
}

/**
 * 获取班级等级列表
 */
export async function getClassLevels(): Promise<BaseResponse<Array<{ value: string; label: string }>>> {
  return apiMonitor.track('GET', `${API_BASE}/levels`, () =>
    apiCache.get(`${API_BASE}/levels`, undefined, {
      ttl: 24 * 60 * 60 * 1000, // 24小时缓存
      key: 'class_levels',
    })
  );
}

// ============================================================================
// 导出
// ============================================================================

export const classApi = {
  getList: getClassList,
  getEnrolling: getEnrollingClasses,
  getDetail: getClassDetail,
  getSchedules: getClassSchedules,
  getMyClasses: getMyClasses,
  enroll: enrollClass,
  submitAttendance,
  getLevels: getClassLevels,
};

export default classApi;
