/**
 * useCourseList - 课程列表 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { courseApi } from '../api/courseApi';
import type { Course, CourseListParams } from '../types/Course';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseCourseListResult {
  /** 课程列表 */
  courses: Course[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 是否还有更多 */
  hasMore: boolean;
  /** 刷新 */
  refresh: () => Promise<void>;
  /** 加载更多 */
  loadMore: () => Promise<void>;
  /** 总数 */
  total: number;
  /** 加载状态 */
  isLoadingMore: boolean;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useCourseList(
  initialParams: CourseListParams = {}
): UseCourseListResult {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  // 当前参数
  const [params, setParams] = useState<CourseListParams>({
    page: 1,
    pageSize: 10,
    ...initialParams,
  });

  // 加载数据
  const loadData = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await courseApi.getList({
        ...params,
        page: isLoadMore ? params.page! + 1 : 1,
      });

      if (response.code === 0) {
        const newCourses = response.data.list;
        
        if (isLoadMore) {
          setCourses(prev => [...prev, ...newCourses]);
        } else {
          setCourses(newCourses);
        }
        
        setTotal(response.data.total);
        setHasMore(response.data.hasMore);
        setParams(prev => ({ ...prev, page: response.data.page }));
      } else {
        throw new Error(response.message || '获取课程列表失败');
      }
    } catch (err) {
      setError(err as Error);
      apiLogger.error('[Course] 获取课程列表失败', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [params]);

  // 首次加载
  useEffect(() => {
    loadData(false);
  }, []);

  // 参数变化时重新加载
  useEffect(() => {
    loadData(false);
  }, [JSON.stringify(initialParams)]);

  // 刷新
  const refresh = useCallback(async () => {
    setParams(prev => ({ ...prev, page: 1 }));
    await loadData(false);
  }, [loadData]);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      await loadData(true);
    }
  }, [isLoadingMore, hasMore, loadData]);

  return {
    courses,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    total,
    isLoadingMore,
  };
}
