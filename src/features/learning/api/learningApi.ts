/**
 * Learning API - 学习接口
 */

import { platform } from '../../../platform/adapters';
import { BaseResponse, PaginatedResponse } from '../../../platform/adapters/IRequestAdapter';
import { apiCache } from '../../../infrastructure/cache/CacheManager';
import { apiMonitor } from '../../../infrastructure/monitor/APIMonitor';
import { apiLogger } from '../../../infrastructure/logger/Logger';
import type {
  LearningProgress,
  LessonProgress,
  LearningPath,
  Certificate,
} from '../types/Learning';

// ============================================================================
// API 端点
// ============================================================================

const API_BASE = '/learning';

const endpoints = {
  // 学习进度
  myCourses: `${API_BASE}/courses`,
  progress: (courseId: string) => `${API_BASE}/courses/${courseId}/progress`,
  lessonProgress: (courseId: string, lessonId: string) => 
    `${API_BASE}/courses/${courseId}/lessons/${lessonId}/progress`,
  
  // 学习路径
  paths: `${API_BASE}/paths`,
  pathDetail: (pathId: string) => `${API_BASE}/paths/${pathId}`,
  pathProgress: (pathId: string) => `${API_BASE}/paths/${pathId}/progress`,
  
  // 证书
  certificates: `${API_BASE}/certificates`,
  certificateDetail: (certId: string) => `${API_BASE}/certificates/${certId}`,
};

// ============================================================================
// 学习进度 API 函数
// ============================================================================

/**
 * 获取我的学习课程列表
 */
export async function getMyLearningCourses(
  page: number = 1,
  pageSize: number = 10,
  status?: 'learning' | 'completed'
): Promise<PaginatedResponse<LearningProgress>> {
  return apiMonitor.track('GET', endpoints.myCourses, () =>
    platform.request.get<PaginatedResponse<LearningProgress>>(endpoints.myCourses, {
      page,
      pageSize,
      status,
    })
  );
}

/**
 * 获取课程学习进度
 */
export async function getCourseProgress(
  courseId: string
): Promise<BaseResponse<LearningProgress>> {
  return apiMonitor.track('GET', endpoints.progress(courseId), () =>
    platform.request.get<BaseResponse<LearningProgress>>(endpoints.progress(courseId))
  );
}

/**
 * 更新课时学习进度
 */
export async function updateLessonProgress(
  courseId: string,
  lessonId: string,
  watchProgress: number,
  duration: number
): Promise<BaseResponse<LessonProgress>> {
  apiLogger.debug('[Learning] 更新进度', { courseId, lessonId, watchProgress });
  
  return apiMonitor.track('POST', endpoints.lessonProgress(courseId, lessonId), () =>
    platform.request.post<BaseResponse<LessonProgress>>(
      endpoints.lessonProgress(courseId, lessonId),
      { watchProgress, duration }
    )
  );
}

/**
 * 标记课时为完成
 */
export async function completeLesson(
  courseId: string,
  lessonId: string
): Promise<BaseResponse<LearningProgress>> {
  apiLogger.info('[Learning] 完成课时', { courseId, lessonId });
  
  // 清除课程进度缓存
  apiCache.invalidate(endpoints.progress(courseId));
  
  return apiMonitor.track('POST', endpoints.lessonProgress(courseId, lessonId), () =>
    platform.request.post<BaseResponse<LearningProgress>>(
      endpoints.lessonProgress(courseId, lessonId),
      { completed: true }
    )
  );
}

// ============================================================================
// 学习路径 API 函数
// ============================================================================

/**
 * 获取学习路径列表
 */
export async function getLearningPaths(
  sourceId?: string
): Promise<BaseResponse<LearningPath[]>> {
  return apiMonitor.track('GET', endpoints.paths, () =>
    apiCache.get<LearningPath[]>(endpoints.paths, { sourceId }, {
      ttl: 10 * 60 * 1000, // 10分钟缓存
      key: `learning_paths_${sourceId || 'all'}`,
    })
  );
}

/**
 * 获取学习路径详情
 */
export async function getLearningPathDetail(
  pathId: string
): Promise<BaseResponse<LearningPath & { progress?: any }>> {
  return apiMonitor.track('GET', endpoints.pathDetail(pathId), () =>
    apiCache.get<LearningPath>(endpoints.pathDetail(pathId), undefined, {
      ttl: 10 * 60 * 1000,
      key: `learning_path_${pathId}`,
    })
  );
}

/**
 * 获取学习路径进度
 */
export async function getLearningPathProgress(
  pathId: string
): Promise<BaseResponse<{ overall: number; levels: any[] }>> {
  return apiMonitor.track('GET', endpoints.pathProgress(pathId), () =>
    platform.request.get<BaseResponse<{ overall: number; levels: any[] }>>(
      endpoints.pathProgress(pathId)
    )
  );
}

// ============================================================================
// 证书 API 函数
// ============================================================================

/**
 * 获取我的证书列表
 */
export async function getMyCertificates(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Certificate>> {
  return apiMonitor.track('GET', endpoints.certificates, () =>
    platform.request.get<PaginatedResponse<Certificate>>(endpoints.certificates, {
      page,
      pageSize,
    })
  );
}

/**
 * 获取证书详情
 */
export async function getCertificateDetail(
  certId: string
): Promise<BaseResponse<Certificate>> {
  return apiMonitor.track('GET', endpoints.certificateDetail(certId), () =>
    platform.request.get<BaseResponse<Certificate>>(endpoints.certificateDetail(certId))
  );
}

// ============================================================================
// 导出
// ============================================================================

export const learningApi = {
  // 学习进度
  getMyCourses: getMyLearningCourses,
  getCourseProgress,
  updateLessonProgress,
  completeLesson,
  
  // 学习路径
  getPaths: getLearningPaths,
  getPathDetail: getLearningPathDetail,
  getPathProgress: getLearningPathProgress,
  
  // 证书
  getCertificates: getMyCertificates,
  getCertificateDetail,
};

export default learningApi;
