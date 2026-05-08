/**
 * useClassList - 班级列表 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { classApi } from '../api/classApi';
import type { ClassInfo, ClassListParams } from '../types/Class';
import { apiLogger } from '../../../infrastructure/logger/Logger';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseClassListResult {
  /** 班级列表 */
  classes: ClassInfo[];
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
  /** 加载更多状态 */
  isLoadingMore: boolean;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useClassList(
  initialParams: ClassListParams = {}
): UseClassListResult {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  // 当前参数
  const [params, setParams] = useState<ClassListParams>({
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

      const response = await classApi.getList({
        ...params,
        page: isLoadMore ? params.page! + 1 : 1,
      });

      if (response.code === 0) {
        const newClasses = response.data.list;
        
        if (isLoadMore) {
          setClasses(prev => [...prev, ...newClasses]);
        } else {
          setClasses(newClasses);
        }
        
        setTotal(response.data.total);
        setHasMore(response.data.hasMore);
        setParams(prev => ({ ...prev, page: response.data.page }));
      } else {
        throw new Error(response.message || '获取班级列表失败');
      }
    } catch (err) {
      setError(err as Error);
      apiLogger.error('[Class] 获取班级列表失败', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [params]);

  // 首次加载
  useEffect(() => {
    loadData(false);
  }, []);

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
    classes,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    total,
    isLoadingMore,
  };
}
