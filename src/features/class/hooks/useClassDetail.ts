/**
 * useClassDetail - 班级详情 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { classApi } from '../api/classApi';
import type { ClassInfo, ClassSchedule, StudentClass, EnrollClassParams } from '../types/Class';
import { apiLogger } from '../../../infrastructure/logger/Logger';

// ============================================================================
// Hook 结果类型
// ============================================================================

export interface UseClassDetailResult {
  /** 班级信息 */
  classInfo: ClassInfo | null;
  /** 排课列表 */
  schedules: ClassSchedule[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 是否已报名 */
  isEnrolled: boolean;
  /** 我的报名信息 */
  myEnrollment: StudentClass | null;
  /** 刷新 */
  refresh: () => Promise<void>;
  /** 报名班级 */
  enroll: (params: Omit<EnrollClassParams, 'classId'>) => Promise<boolean>;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useClassDetail(
  classId: string | undefined
): UseClassDetailResult {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [myEnrollment, setMyEnrollment] = useState<StudentClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载班级详情
  const loadClass = useCallback(async () => {
    if (!classId) return;

    try {
      setLoading(true);
      setError(null);

      const [classRes, schedulesRes] = await Promise.all([
        classApi.getDetail({ classId, includeSchedules: true }),
        classApi.getSchedules(classId).catch(() => ({ code: 0, data: [] })),
      ]);

      if (classRes.code === 0) {
        setClassInfo(classRes.data);
        setSchedules(schedulesRes.data || []);
      } else {
        throw new Error(classRes.message || '获取班级详情失败');
      }
    } catch (err) {
      setError(err as Error);
      apiLogger.error('[Class] 获取班级详情失败', { classId, error: err });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  // 加载我的报名信息
  const loadMyEnrollment = useCallback(async () => {
    if (!classId) return;

    try {
      const response = await classApi.getMyClasses(1, 100);
      if (response.code === 0) {
        const enrollment = response.data.list.find(
          (item: StudentClass) => item.classId === classId
        );
        setMyEnrollment(enrollment || null);
      }
    } catch (err) {
      apiLogger.error('[Class] 获取我的报名信息失败', { classId, error: err });
    }
  }, [classId]);

  // 首次加载
  useEffect(() => {
    loadClass();
    loadMyEnrollment();
  }, [loadClass, loadMyEnrollment]);

  // 刷新
  const refresh = useCallback(async () => {
    await Promise.all([loadClass(), loadMyEnrollment()]);
  }, [loadClass, loadMyEnrollment]);

  // 报名班级
  const enroll = useCallback(
    async (params: Omit<EnrollClassParams, 'classId'>) => {
      if (!classId) return false;

      try {
        const response = await classApi.enroll({
          classId,
          ...params,
        });

        if (response.code === 0) {
          await loadMyEnrollment(); // 刷新报名状态
          await loadClass(); // 刷新班级信息（更新已报名人数）
          return true;
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        apiLogger.error('[Class] 报名失败', { classId, error: err });
        throw err;
      }
    },
    [classId, loadClass, loadMyEnrollment]
  );

  return {
    classInfo,
    schedules,
    loading,
    error,
    isEnrolled: !!myEnrollment,
    myEnrollment,
    refresh,
    enroll,
  };
}
