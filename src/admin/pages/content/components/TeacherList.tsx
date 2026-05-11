// ============================================================================
// TeacherList - 教师列表表格组件
// ============================================================================
import { Edit, Trash2, Calendar, BarChart3, User, Star, Clock, Users } from 'lucide-react';
import type { Teacher } from '@/types';
import { StatusBadge } from '../../../components/StatusBadge';

interface TeacherListProps {
  teachers: Teacher[];
  loading: boolean;
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacherId: string) => void;
  onShowSchedule: (teacherId: string, teacherName: string) => void;
  onShowStats: (teacher: Teacher) => void;
}

export function TeacherList({
  teachers,
  loading,
  onEdit,
  onDelete,
  onShowSchedule,
  onShowStats,
}: TeacherListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <User className="mx-auto mb-4 text-gray-300" size={48} />
        <p>暂无教师数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">教师</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">联系方式</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">擅长领域</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">资质证书</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状态</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">统计</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {teachers.map((teacher) => (
            <tr key={teacher._id} className="hover:bg-gray-50 transition-colors">
              {/* 教师信息 */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {(teacher as any).avatar ? (
                    <img
                      src={(teacher as any).avatar}
                      alt={teacher.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-800">{teacher.name}</div>
                    {teacher.bio && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{teacher.bio}</div>
                    )}
                  </div>
                </div>
              </td>

              {/* 联系方式 */}
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="space-y-1">
                  {(teacher as any).phone && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">📱</span>
                      {(teacher as any).phone}
                    </div>
                  )}
                  {(teacher as any).email && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">📧</span>
                      {(teacher as any).email}
                    </div>
                  )}
                </div>
              </td>

              {/* 擅长领域 */}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(teacher.specialties || []).slice(0, 3).map((s: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {s}
                    </span>
                  ))}
                  {(teacher.specialties || []).length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{(teacher.specialties || []).length - 3}
                    </span>
                  )}
                </div>
              </td>

              {/* 资质证书 */}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(teacher.certifications || []).slice(0, 2).map((c: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                      {c}
                    </span>
                  ))}
                  {(teacher.certifications || []).length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{(teacher.certifications || []).length - 2}
                    </span>
                  )}
                </div>
              </td>

              {/* 状态 */}
              <td className="px-4 py-3">
                <StatusBadge
                  groupKey="memberStatus"
                  statusKey={(teacher as any).status || 'active'}
                  fallbackText={(teacher as any).status === 'active' ? '在职' : '离职'}
                />
              </td>

              {/* 统计 */}
              <td className="px-4 py-3 text-sm">
                <div className="flex items-center gap-4 text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-500" />
                    {(teacher as any).rating || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {(teacher as any).totalHours || 0}h
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {(teacher as any).studentCount || 0}
                  </span>
                </div>
              </td>

              {/* 操作 */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onShowSchedule(teacher._id, teacher.name)}
                    className="p-2 text-purple-500 hover:bg-purple-50 rounded transition-colors"
                    title="查看排课"
                  >
                    <Calendar size={18} />
                  </button>
                  <button
                    onClick={() => onShowStats(teacher)}
                    className="p-2 text-green-500 hover:bg-green-50 rounded transition-colors"
                    title="查看统计"
                  >
                    <BarChart3 size={18} />
                  </button>
                  <button
                    onClick={() => onEdit(teacher)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                    title="编辑"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(teacher._id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeacherList;