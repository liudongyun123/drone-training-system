import { useState, useEffect, useCallback } from 'react';
import { learningApi } from '../api/learningApi';
import type { LearningProgress, LearningPath } from '../types';

interface UseMyLearningOptions {
  /** 是否自动加载 */
  autoLoad?: boolean;
  /** 排序方式 */
  sortBy?: 'recent' | 'progress' | 'name';
}

interface UseMyLearningReturn {
  /** 学习进度列表 */
  progressList: LearningProgress[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 继续学习 */
  continueLearning: (courseId: string) => void;
  /** 统计数据 */
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalHours: number;
  };
}

/**
 * 我的学习 Hook
 * 管理用户的学习进度列表
 */
export function useMyLearning(options: UseMyLearningOptions = {}): UseMyLearningReturn {
  const { autoLoad = true, sortBy = 'recent' } = options;

  const [progressList, setProgressList] = useState<LearningProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载学习进度
  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const progress = await learningApi.getMyLearningProgress({ sortBy });
      setProgressList(progress);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载学习进度失败'));
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await loadProgress();
  }, [loadProgress]);

  // 继续学习
  const continueLearning = useCallback((courseId: string) => {
    const progress = progressList.find(p => p.courseId === courseId);
    if (progress?.lastLessonId) {
      // 跳转到继续学习的课程页面
      window.location.href = `/course/${courseId}/lesson/${progress.lastLessonId}`;
    } else {
      // 跳转到课程首页
      window.location.href = `/course/${courseId}`;
    }
  }, [progressList]);

  // 计算统计数据
  const stats = {
    totalCourses: progressList.length,
    completedCourses: progressList.filter(p => p.status === 'completed').length,
    inProgressCourses: progressList.filter(p => p.status === 'in_progress').length,
    totalHours: progressList.reduce((sum, p) => sum + p.totalHours, 0),
  };

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadProgress();
    }
  }, [autoLoad, loadProgress]);

  return {
    progressList,
    loading,
    error,
    refresh,
    continueLearning,
    stats,
  };
}
