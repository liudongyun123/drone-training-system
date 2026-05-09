// ============================================================================
// 管理后台 - 教师管理（重构版）
// 功能：教师档案管理、排课管理、统计数据
// ============================================================================
import { useState } from 'react';
import { Plus, Search, Calendar, BarChart3, X, Clock, Users, MapPin, Star } from 'lucide-react';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { useTeachers } from './hooks/useTeachers';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { TeacherList } from './components/TeacherList';
import { TeacherForm } from './components/TeacherForm';
import { teacherService } from '@/services/teacherService';
import type { Teacher, Schedule } from '@/types';
import { parseDate, formatTime } from '@/utils/dateUtils';
import { app as cloudbaseApp } from '@/utils/cloudbase';

export default function AdminTeachers() {
  const {
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
  } = useTeachers();

  const { confirm, ConfirmDialog } = useConfirm();

  // 弹窗状态
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTeacherId, setScheduleTeacherId] = useState<string>('');
  const [scheduleTeacherName, setScheduleTeacherName] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsTeacher, setStatsTeacher] = useState<Teacher | null>(null);

  // 搜索
  const handleSearch = (kw: string) => {
    setKeyword(kw);
  };

  // 新增
  const handleAdd = () => {
    setEditingTeacher(null);
    setFormOpen(true);
  };

  // 编辑
  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormOpen(true);
  };

  // 保存
  const handleSave = async (data: Partial<Teacher>) => {
    try {
      const success = await saveTeacher(data, editingTeacher);
      if (success) {
        setFormOpen(false);
      }
    } catch (error: any) {
      await confirm({ title: '提示', message: error.message || '保存失败', variant: 'info' });
    }
  };

  // 删除
  const handleDelete = async (teacherId: string) => {
    const ok = await confirm({
      title: '删除教师',
      message: '确定要删除这位教师吗？此操作不可恢复。',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteTeacher(teacherId);
    } catch (error: any) {
      await confirm({ title: '提示', message: error.message || '删除失败', variant: 'info' });
    }
  };

  // 排课查询
  const handleShowSchedule = (teacherId: string, teacherName: string) => {
    setScheduleTeacherId(teacherId);
    setScheduleTeacherName(teacherName);
    setScheduleOpen(true);
    loadSchedules(teacherId, scheduleDate);
  };

  const loadSchedules = async (teacherId: string, date: string) => {
    setScheduleLoading(true);
    try {
      // 1. 先找到该教师负责的培训班（classes）
      const classesResult = await adminService.list('classes', { teacherId }, { limit: 100 });
      const classesList = classesResult.data?.list || [];
      
      const classIds = classesList.map((c: any) => c._id) || [];
      const classNamesMap: Record<string, string> = {};
      classesList.forEach((c: any) => {
        classNamesMap[c._id] = c.name;
      });
      
      // 2. 如果有培训班，再查询这些培训班的排课（class_schedules）
      let schedules: any[] = [];
      if (classIds.length > 0) {
        const schedulesResult = await adminService.list('class_schedules', { 
          classId: { $in: classIds },
          date: date,
        }, { orderBy: 'startTime', order: 'asc', limit: 100 });
        
        // 为排课添加班级名称
        schedules = (schedulesResult.data?.list || []).map((s: any) => ({
          ...s,
          className: classNamesMap[s.classId] || '未知班级'
        }));
      }
      
      setSchedules(schedules || []);
    } catch (error) {
      console.error('加载排课失败:', error);
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // 统计
  const handleShowStats = (teacher: Teacher) => {
    setStatsTeacher(teacher);
    setStatsOpen(true);
  };

  return (
    <AdminPageTemplate
      title="教师管理"
      subtitle="管理教师档案、排课和统计数据"
      onSearch={handleSearch}
      onAdd={handleAdd}
      searchPlaceholder="搜索教师姓名..."
    >
      {/* 状态筛选 */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'active' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          在职
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'inactive' ? 'bg-gray-100 text-gray-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          离职
        </button>
      </div>

      {/* 教师列表 */}
      <TeacherList
        teachers={teachers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShowSchedule={handleShowSchedule}
        onShowStats={handleShowStats}
      />

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-gray-500">
            共 {total} 条，第 {page} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= total}
              className="px-3 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 教师表单弹窗 */}
      <TeacherForm
        teacher={editingTeacher}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        saving={saving}
      />

      {/* 排课弹窗 */}
      {scheduleOpen && (
        <ScheduleModal
          teacherId={scheduleTeacherId}
          teacherName={scheduleTeacherName}
          isOpen={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          date={scheduleDate}
          onDateChange={(d) => {
            setScheduleDate(d);
            loadSchedules(scheduleTeacherId, d);
          }}
          schedules={schedules}
          loading={scheduleLoading}
        />
      )}

      {/* 统计弹窗 */}
      {statsOpen && statsTeacher && (
        <StatsModal
          teacher={statsTeacher}
          isOpen={statsOpen}
          onClose={() => setStatsOpen(false)}
        />
      )}

      <ConfirmDialog />
    </AdminPageTemplate>
  );
}

// 排课弹窗组件
function ScheduleModal({
  teacherId,
  teacherName,
  isOpen,
  onClose,
  date,
  onDateChange,
  schedules,
  loading,
}: {
  teacherId: string;
  teacherName: string;
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onDateChange: (d: string) => void;
  schedules: Schedule[];
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">教师排课表</h2>
            <p className="text-sm text-gray-500">{teacherName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <Calendar className="text-purple-500" size={20} />
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="mx-auto mb-4 text-gray-300" size={48} />
              <p>该日期暂无排课安排</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((s) => (
                <div key={s._id} className="border rounded-xl p-4 hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{s.title || '排课'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(s.startTime)} - {formatTime(s.endTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {s.location || '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {(s as any).enrolledCount || 0}/{s.maxStudents || 0} 人
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      s.status === 'completed' ? 'bg-green-100 text-green-700' :
                      s.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {s.status === 'completed' ? '已完成' : s.status === 'ongoing' ? '进行中' : '待开始'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 统计弹窗组件
function StatsModal({
  teacher,
  isOpen,
  onClose,
}: {
  teacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const stats = {
    rating: (teacher as any).rating || 0,
    totalHours: (teacher as any).totalHours || 0,
    studentCount: (teacher as any).studentCount || 0,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-green-50 to-blue-50">
          <h2 className="text-xl font-bold text-gray-800">教师统计</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            {(teacher as any).avatar ? (
              <img src={(teacher as any).avatar} className="w-20 h-20 rounded-full mx-auto" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto">
                <span className="text-2xl">👤</span>
              </div>
            )}
            <h3 className="text-lg font-semibold mt-3">{teacher.name}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <Star className="text-yellow-500 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-800">{stats.rating}</div>
              <div className="text-sm text-gray-500">评分</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Clock className="text-blue-500 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-800">{stats.totalHours}</div>
              <div className="text-sm text-gray-500">授课时长(h)</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <Users className="text-green-500 mx-auto mb-2" size={24} />
              <div className="text-2xl font-bold text-gray-800">{stats.studentCount}</div>
              <div className="text-sm text-gray-500">学员数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}