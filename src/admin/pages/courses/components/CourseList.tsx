// ============================================================================
// CourseList - 课程列表表格
// ============================================================================
import { User, TrendingUp, List, Save, Trash2 } from 'lucide-react';
import AdminPageTemplate, { DataRecord } from '@/admin/pages/system/_AdminPageTemplate';
import { StatusBadge } from '@/admin/components/StatusBadge';
import type { Course } from '@/types';
import React from 'react';

interface CourseListProps {
  courses: Course[];
  loading: boolean;
  total: number;
  page: number;
  categories: Array<{ _id: string; name: string; code: string }>;
  onSearch: () => void;
  onPageChange: (page: number) => void;
  onAdd: () => void;
  onEdit: (record: Course) => void;
  onDelete: (id: string) => void;
  onViewStats: (record: Course) => void;
  onManageLessons: (record: Course) => void;
}

export default function CourseList({
  courses,
  loading,
  total,
  page,
  categories,
  onSearch,
  onPageChange,
  onAdd,
  onEdit,
  onDelete,
  onViewStats,
  onManageLessons,
}: CourseListProps) {
  const columns: any[] = [
    {
      key: 'coverImage',
      title: '封面',
      render: (value: unknown, _record: DataRecord, _index: number): React.ReactNode => {
        const url = value as string;
        return (
          <div className="w-16 h-9 rounded overflow-hidden">
            <img
              src={
                url ||
                'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=64'
              }
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        );
      },
    },
    { key: 'title', title: '课程名称' },
    {
      key: 'category',
      title: '分类',
      render: (value: unknown, record: DataRecord, _index: number): React.ReactNode => {
        const category = value as string;
        if (!category && record.categoryId && categories.length > 0) {
          const cat = categories.find((c) => c._id === record.categoryId);
          return cat?.name || record.categoryId;
        }
        return category || '-';
      },
    },
    {
      key: 'instructor',
      title: '授课教师',
      render: (value: unknown, _record: DataRecord, _index: number): React.ReactNode => {
        const instructor = value as string;
        return (
          <div className="flex items-center gap-1">
            <User size={14} className="text-gray-400" />
            <span>{instructor || '-'}</span>
          </div>
        );
      },
    },
    {
      key: 'price',
      title: '价格',
      render: (value: unknown, _record: DataRecord, _index: number): React.ReactNode => {
        const price = value as number;
        return `¥${price ?? 0}`;
      },
    },
    {
      key: 'status',
      title: '状态',
      render: (value: unknown, _record: DataRecord, _index: number): React.ReactNode => {
        const status = value as string;
        return <StatusBadge groupKey="courseStatus" statusKey={status} fallbackText={status} />;
      },
    },
    { key: 'salesCount', title: '销量' },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (value: unknown, _record: DataRecord, _index: number): React.ReactNode => {
        const date = value as string;
        if (!date || date === 'Invalid Date') return '-';
        try {
          return new Date(date).toLocaleDateString();
        } catch {
          return '-';
        }
      },
    },
  ];

  // Cast Course[] to DataRecord[] for compatibility with AdminPageTemplate
  const dataSource = courses as unknown as DataRecord[];

  return (
    <AdminPageTemplate
      title="课程管理"
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      total={total}
      page={page}
      pageSize={10}
      onPageChange={onPageChange}
      onSearch={onSearch}
      onAdd={onAdd}
      renderActions={(record: DataRecord) => {
        const course = record as unknown as Course;
        return (
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-square btn-ghost text-purple-500"
              onClick={() => onViewStats(course)}
              title="权限统计"
            >
              <TrendingUp size={16} />
            </button>
            <button
              className="btn btn-sm btn-square btn-ghost text-blue-500"
              onClick={() => onManageLessons(course)}
              title="管理章节"
            >
              <List size={16} />
            </button>
            <button
              className="btn btn-sm btn-square btn-ghost"
              onClick={() => onEdit(course)}
            >
              <Save size={16} />
            </button>
            <button
              className="btn btn-sm btn-square btn-ghost text-red-500"
              onClick={() => onDelete(course._id!)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      }}
    />
  );
}