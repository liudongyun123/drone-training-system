/**
 * useCourseDetail - 课程详情 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { courseApi } from '../api/courseApi';
import type { Course, LearningProgress } from '../types/Course';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseCourseDetailResult {
  /** 课程信息 */
  course: Course | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 学习进度 */
  progress: LearningProgress | null;
  /** 是否已报名 */
  isEnrolled: boolean;
  /** 刷新 */
  refresh: () => Promise<void>;
  /** 更新进度 */
  updateProgress: (lessonId: string, progress: number) => Promise<void>;
  /** 报名课程 */
  enroll: (paymentMethod?: 'wechat' | 'offline') => Promise<boolean>;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useCourseDetail(
  courseId: string | undefined
): UseCourseDetailResult {
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // 加载课程详情
  const loadCourse = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      const [courseRes, progressRes] = await Promise.all([
        courseApi.getDetail({ courseId }),
        courseApi.getProgress(courseId).catch(() => ({ code: 0, data: null })),
      ]);

      if (courseRes.code === 0) {
        setCourse(courseRes.data);
        setProgress(progressRes.data);
        setIsEnrolled(!!progressRes.data);
      } else {
        throw new Error(courseRes.message || '获取课程详情失败');
      }
    } catch (err) {
      setError(err as Error);
      apiLogger.error('[Course] 获取课程详情失败', { courseId, error: err });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // 首次加载
  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // 刷新
  const refresh = useCallback(async () => {
    await loadCourse();
  }, [loadCourse]);

  // 更新学习进度
  const updateProgress = useCallback(
    async (lessonId: string, lessonProgress: number) => {
      if (!courseId) return;

      try {
        const response = await courseApi.updateProgress({
          courseId,
          lessonId,
          progress: lessonProgress,
        });

        if (response.code === 0) {
          setProgress(response.data);
          setIsEnrolled(true);
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[Course] 更新进度失败', { courseId, lessonId, error: err });
        throw err;
      }
    },
    [courseId]
  );

  // 报名课程
  const enroll = useCallback(
    async (paymentMethod: 'wechat' | 'offline' = 'wechat') => {
      if (!courseId) return false;

      try {
        const response = await courseApi.enroll(courseId, paymentMethod);

        if (response.code === 0) {
          setIsEnrolled(true);
          await loadCourse(); // 刷新获取最新进度
          return true;
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[Course] 报名失败', { courseId, error: err });
        throw err;
      }
    },
    [courseId, loadCourse]
  );

  return {
    course,
    loading,
    error,
    progress,
    isEnrolled,
    refresh,
    updateProgress,
    enroll,
  };
}

// 导入日志
import { apiLogger } from '../../../infrastructure/logger/Logger';
