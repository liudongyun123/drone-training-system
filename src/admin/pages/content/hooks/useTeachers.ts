// ============================================================================
// useTeachers Hook - 教师管理业务逻辑
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/adminService';
import type { Teacher } from '@/types';

// 修正 adminService.list 返回类型
interface AdminListResult<T = any> {
  code: number;
  data: {
    list: T[];
    total: number;
    skip: number;
    limit: number;
  };
  message?: string;
}

interface UseTeachersOptions {
  autoLoad?: boolean;
}

interface UseTeachersReturn {
  teachers: Teacher[];
  loading: boolean;
  saving: boolean;
  total: number;
  page: number;
  pageSize: number;
  keyword: string;
  statusFilter: 'all' | 'active' | 'inactive';
  setPage: (page: number) => void;
  setKeyword: (keyword: string) => void;
  setStatusFilter: (filter: 'all' | 'active' | 'inactive') => void;
  loadTeachers: () => Promise<void>;
  saveTeacher: (data: Partial<Teacher>, existingTeacher?: Teacher | null) => Promise<boolean>;
  deleteTeacher: (teacherId: string) => Promise<boolean>;
}

export function useTeachers({ autoLoad = true }: UseTeachersOptions = {}): UseTeachersReturn {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = {};
      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }

      const result = await adminService.listTeachers({ page, pageSize, orderBy: 'createdAt', order: 'desc' }) as AdminListResult<Teacher>;

      let teacherList: Teacher[] = [];

      if (result.data?.list && Array.isArray(result.data.list)) {
        teacherList = result.data.list;
      } else if (Array.isArray(result.data)) {
        teacherList = result.data;
      }

      if (keyword && teacherList.length > 0) {
        teacherList = teacherList.filter((t: any) =>
          t.name?.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      setTeachers(teacherList);
      setTotal(result.data?.total || teacherList.length);
    } catch (error) {
      console.error('加载教师失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, keyword]);

  useEffect(() => {
    if (autoLoad) {
      loadTeachers();
    }
  }, [autoLoad, loadTeachers]);

  const saveTeacher = useCallback(async (data: Partial<Teacher>, existingTeacher?: Teacher | null): Promise<boolean> => {
    try {
      setSaving(true);

      if (!data.name || data.name.trim() === '') {
        throw new Error('请输入教师姓名');
      }

      const saveData = {
        ...data,
        specialties: data.specialties || [],
        certifications: data.certifications || [],
        status: data.status || 'active',
        updatedAt: new Date().toISOString(),
      };

      if (!existingTeacher) {
        (saveData as any).createdAt = new Date().toISOString();
        (saveData as any).rating = 0;
        (saveData as any).totalHours = 0;
        (saveData as any).studentCount = 0;
      }

      let result;
      if (existingTeacher) {
        result = await adminService.updateTeacher(existingTeacher._id, saveData);
      } else {
        result = await adminService.createTeacher(saveData);
      }

      if (result && result.code === 0) {
        await loadTeachers();
        return true;
      } else {
        throw new Error('保存失败，请重试');
      }
    } catch (error) {
      console.error('保存教师失败:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [loadTeachers]);

  const deleteTeacher = useCallback(async (teacherId: string): Promise<boolean> => {
    try {
      const result = await adminService.deleteTeacher(teacherId);
      if (result && result.code === 0) {
        await loadTeachers();
        return true;
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除教师失败:', error);
      throw error;
    }
  }, [loadTeachers]);

  return {
    teachers,
    loading,
    saving,
    total,
    page,
    pageSize,
    keyword,
    statusFilter,
    setPage,
    setKeyword,
    setStatusFilter,
    loadTeachers,
    saveTeacher,
    deleteTeacher,
  };
}

export default useTeachers;
