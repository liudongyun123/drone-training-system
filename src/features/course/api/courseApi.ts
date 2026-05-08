/**
 * Course API - 课程接口
 */

import { platform } from '../../../platform/adapters';
import { BaseResponse, PaginatedResponse } from '../../../platform/adapters/IRequestAdapter';
import { apiCache } from '../../../infrastructure/cache/CacheManager';
import { apiMonitor } from '../../../infrastructure/monitor/APIMonitor';
import { apiLogger } from '../../../infrastructure/logger/Logger';
import type {
  Course,
  CourseListParams,
  CourseDetailParams,
  LearningProgress,
  UpdateProgressParams,
} from '../types/Course';

// ============================================================================
// API 端点
// ============================================================================

const API_BASE = '/courses';

const endpoints = {
  list: `${API_BASE}`,
  detail: (id: string) => `${API_BASE}/${id}`,
  hot: `${API_BASE}/hot`,
  featured: `${API_BASE}/featured`,
  enroll: (id: string) => `${API_BASE}/${id}/enroll`,
  progress: (courseId: string) => `${API_BASE}/${courseId}/progress`,
  myCourses: `${API_BASE}/my`,
};

const progressEndpoints = {
  update: (courseId: string, lessonId: string) => 
    `${endpoints.progress(courseId)}/lessons/${lessonId}`,
};

// ============================================================================
// API 函数
// ============================================================================

/**
 * 获取课程列表
 */
export async function getCourseList(
  params: CourseListParams = {}
): Promise<PaginatedResponse<Course>> {
  const { page = 1, pageSize = 10, ...rest } = params;
  
  return apiMonitor.track('GET', endpoints.list, () =>
    platform.request.get<PaginatedResponse<Course>>(endpoints.list, {
      page,
      pageSize,
      ...rest,
    })
  );
}

/**
 * 获取热门课程
 */
export async function getHotCourses(
  limit: number = 10,
  sourceId?: string
): Promise<BaseResponse<Course[]>> {
  return apiMonitor.track('GET', endpoints.hot, () =>
    apiCache.get<Course[]>(endpoints.hot, { limit, sourceId }, {
      ttl: 5 * 60 * 1000, // 5分钟缓存
      key: `hot_courses_${sourceId || 'all'}_${limit}`,
    })
  );
}

/**
 * 获取推荐课程
 */
export async function getFeaturedCourses(
  limit: number = 10,
  sourceId?: string
): Promise<BaseResponse<Course[]>> {
  return apiMonitor.track('GET', endpoints.featured, () =>
    apiCache.get<Course[]>(endpoints.featured, { limit, sourceId }, {
      ttl: 5 * 60 * 1000,
      key: `featured_courses_${sourceId || 'all'}_${limit}`,
    })
  );
}

/**
 * 获取课程详情
 */
export async function getCourseDetail(
  params: CourseDetailParams
): Promise<BaseResponse<Course>> {
  const { courseId, includeSections = true } = params;
  
  return apiMonitor.track('GET', endpoints.detail(courseId), () =>
    apiCache.get<Course>(endpoints.detail(courseId), undefined, {
      ttl: 10 * 60 * 1000, // 10分钟缓存
      key: `course_detail_${courseId}`,
    })
  );
}

/**
 * 获取我的课程列表
 */
export async function getMyCourses(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResponse<Course & { progress: LearningProgress }>> {
  return apiMonitor.track('GET', endpoints.myCourses, () =>
    platform.request.get<PaginatedResponse<Course & { progress: LearningProgress }>>(
      endpoints.myCourses,
      { page, pageSize }
    )
  );
}

/**
 * 获取课程学习进度
 */
export async function getCourseProgress(
  courseId: string
): Promise<BaseResponse<LearningProgress>> {
  return apiMonitor.track('GET', endpoints.progress(courseId), () =>
    platform.request.get<BaseResponse<LearningProgress>>(
      endpoints.progress(courseId)
    )
  );
}

/**
 * 更新课时观看进度
 */
export async function updateLessonProgress(
  params: UpdateProgressParams
): Promise<BaseResponse<LearningProgress>> {
  const { courseId, lessonId, progress } = params;
  
  apiLogger.debug('[Course] 更新进度', { courseId, lessonId, progress });
  
  // 清除课程缓存
  apiCache.invalidate(endpoints.detail(courseId));
  apiCache.invalidate(endpoints.progress(courseId));
  
  return apiMonitor.track('POST', progressEndpoints.update(courseId, lessonId), () =>
    platform.request.post<BaseResponse<LearningProgress>>(
      progressEndpoints.update(courseId, lessonId),
      { progress }
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
  return updateLessonProgress({
    courseId,
    lessonId,
    progress: 100,
  });
}

/**
 * 报名课程
 */
export async function enrollCourse(
  courseId: string,
  paymentMethod: 'wechat' | 'offline' = 'wechat'
): Promise<BaseResponse<{ orderId: string }>> {
  apiLogger.info('[Course] 报名课程', { courseId, paymentMethod });
  
  // 清除我的课程缓存
  apiCache.invalidate(endpoints.myCourses);
  
  return apiMonitor.track('POST', endpoints.enroll(courseId), () =>
    platform.request.post<BaseResponse<{ orderId: string }>>(
      endpoints.enroll(courseId),
      { paymentMethod }
    )
  );
}

// ============================================================================
// 导出
// ============================================================================

export const courseApi = {
  getList: getCourseList,
  getHot: getHotCourses,
  getFeatured: getFeaturedCourses,
  getDetail: getCourseDetail,
  getMyCourses: getMyCourses,
  getProgress: getCourseProgress,
  updateProgress: updateLessonProgress,
  completeLesson,
  enroll: enrollCourse,
};

export default courseApi;
