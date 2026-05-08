import { useState, useEffect, useCallback } from 'react';
import { learningApi } from '../api/learningApi';
import type { LearningPath, LearningProgress } from '../types';

interface UseLearningPathOptions {
  /** 学习路径 ID */
  pathId?: string;
  /** 是否自动加载 */
  autoLoad?: boolean;
}

interface UseLearningPathReturn {
  /** 学习路径详情 */
  path: LearningPath | null;
  /** 用户进度 */
  progress: LearningProgress | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 刷新数据 */
  refresh: () => Promise<void>;
  /** 获取下一步课程 */
  getNextCourse: () => string | null;
  /** 路径完成度百分比 */
  completionPercentage: number;
}

/**
 * 学习路径 Hook
 * 管理单个学习路径的详情和进度
 */
export function useLearningPath(options: UseLearningPathOptions = {}): UseLearningPathReturn {
  const { pathId, autoLoad = true } = options;

  const [path, setPath] = useState<LearningPath | null>(null);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载学习路径详情
  const loadPath = useCallback(async () => {
    if (!pathId) return;

    setLoading(true);
    setError(null);

    try {
      const [pathData, progressData] = await Promise.all([
        learningApi.getLearningPathDetail(pathId),
        learningApi.getPathProgress(pathId).catch(() => null),
      ]);

      setPath(pathData);
      setProgress(progressData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载学习路径失败'));
    } finally {
      setLoading(false);
    }
  }, [pathId]);

  // 刷新数据
  const refresh = useCallback(async () => {
    await loadPath();
  }, [loadPath]);

  // 获取下一步课程
  const getNextCourse = useCallback(() => {
    if (!path || !progress) return null;

    const completedCourseIds = progress.courseIds || [];
    const nextCourse = path.courses.find(
      course => !completedCourseIds.includes(course.id)
    );

    return nextCourse?.id || null;
  }, [path, progress]);

  // 计算路径完成度
  const completionPercentage = path && progress
    ? Math.round((progress.courseIds.length / path.courses.length) * 100)
    : 0;

  // 自动加载
  useEffect(() => {
    if (autoLoad && pathId) {
      loadPath();
    }
  }, [autoLoad, pathId, loadPath]);

  return {
    path,
    progress,
    loading,
    error,
    refresh,
    getNextCourse,
    completionPercentage,
  };
}
