// ============================================================================
// 管理后台 - 班级排课管理
// 功能：班级课表管理、批量排课、调课、考勤管理
// 版本：v20260411-attendance-source
// ============================================================================
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { classService } from '@/services';
import { CloudAdminService } from '@/services/CloudAdminService';
import type { ClassV2 as Class, ClassSchedule } from '@/types';
import type { MemberSource } from '@/types/member';
import {
  Plus, Edit, Trash2, Calendar, MapPin, ArrowLeft,
  X, Check, ChevronLeft, ChevronRight, Layers,
  Users, Clock, Smartphone, UserCheck
} from 'lucide-react';

// 排课状态标签
const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  scheduled: { text: '待上课', color: 'bg-blue-100 text-blue-700' },
  ongoing: { text: '进行中', color: 'bg-green-100 text-green-700' },
  completed: { text: '已完成', color: 'bg-gray-100 text-gray-700' },
  cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' }
};

export default function AdminClassSchedules() {
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = searchParams.get('classId');

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [selectedScheduleForAttendance, setSelectedScheduleForAttendance] = useState<ClassSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // 表单数据
  const [formData, setFormData] = useState({
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    title: '',
    content: '',
    location: '',
    teacherId: ''
  });

  // 批量排课表单
  const [batchFormData, setBatchFormData] = useState({
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '12:00',
    repeatType: 'weekly' as 'daily' | 'weekly',
    repeatDays: [1, 3, 5], // 周一、三、五
    title: '',
    content: '',
    location: ''
  });

  // 加载班级列表
  const loadClasses = async () => {
    try {
      const result = await classService.getList({ page: 1, pageSize: 100 });
      if (result.code === 0 && result.data?.list) {
        setClasses(result.data.list);
        // 如果有classId参数，自动选中
        if (classId) {
          const cls = result.data.list.find(c => c._id === classId);
          if (cls) {
            setSelectedClass(cls);
            loadSchedules(classId);
          }
        }
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('加载班级失败:', error);
      setClasses([]);
    }
  };

  // 加载排课列表
  const loadSchedules = async (cid: string) => {
    setLoading(true);
    try {
      const result = await classService.getClassSchedules(cid);
      if (result.code === 0) {
        setSchedules(result.data);
      }
    } catch (error) {
      console.error('加载排课失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // 选择班级
  const handleSelectClass = (cls: Class) => {
    setSelectedClass(cls);
    setSearchParams({ classId: cls._id! });
    loadSchedules(cls._id!);
  };

  // 返回班级列表
  const handleBack = () => {
    setSelectedClass(null);
    setSchedules([]);
    setSearchParams({});
  };

  // 打开创建模态框
  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      date: '',
      startTime: selectedClass?.startDate ? '09:00' : '',
      endTime: selectedClass?.startDate ? '12:00' : '',
      title: '',
      content: '',
      location: selectedClass?.location || '',
      teacherId: selectedClass?.teacherId || ''
    });
    setIsModalOpen(true);
  };

  // 打开编辑模态框
  const openEditModal = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      title: schedule.title || '',
      content: schedule.content || '',
      location: schedule.location || '',
      teacherId: schedule.teacherId || ''
    });
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      await confirm({ title: '提示', message: '请填写完整的时间和地点信息', variant: 'info' });
      return;
    }

    setSubmitting(true);
    try {
      if (editingSchedule) {
        await classService.updateSchedule(editingSchedule._id!, formData);
      } else {
        await classService.createSchedule({
          ...formData,
          classId: selectedClass!._id!
        });
      }

      setIsModalOpen(false);
      loadSchedules(selectedClass!._id!);
    } catch (error) {
      console.error('保存失败:', error);
      await confirm({ title: '提示', message: '保存失败', variant: 'info' });
    } finally {
      setSubmitting(false);
    }
  };

  // 批量创建排课
  const handleBatchSubmit = async () => {
    if (!batchFormData.startDate || !batchFormData.endDate) {
      await confirm({ title: '提示', message: '请选择日期范围', variant: 'info' });
      return;
    }

    setSubmitting(true);
    try {
      await classService.createSchedulesBatch({
        classId: selectedClass!._id!,
        ...batchFormData
      });

      setIsBatchModalOpen(false);
      loadSchedules(selectedClass!._id!);
    } catch (error) {
      console.error('批量创建失败:', error);
      await confirm({ title: '提示', message: '批量创建失败', variant: 'info' });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除排课
  const handleDelete = async (scheduleId: string) => {
    const ok = await confirm({ title: '删除确认', message: '确定要删除该排课吗？', variant: 'danger' });
    if (!ok) return;

    try {
      await classService.deleteSchedule(scheduleId, selectedClass!._id!);
      loadSchedules(selectedClass!._id!);
    } catch (error) {
      await confirm({ title: '提示', message: '删除失败', variant: 'info' });
    }
  };

  // 打开出勤管理模态框
  const openAttendanceModal = (schedule: ClassSchedule) => {
    setSelectedScheduleForAttendance(schedule);
    setIsAttendanceModalOpen(true);
  };

  // 渲染班级选择视图
  const renderClassSelector = () => (
    <div>
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">选择班级</h2>
        <p className="text-gray-500 mb-6">请先选择要管理排课的班级</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <button
              key={cls._id}
              onClick={() => handleSelectClass(cls)}
              className="text-left p-5 border rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {cls.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_LABELS[cls.status]?.color || 'bg-gray-100'}`}>
                  {STATUS_LABELS[cls.status]?.text || cls.status}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{cls.startDate} ~ {cls.endDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="truncate">{cls.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>排课数: {cls.scheduleCount || 0}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染排课列表
  const renderScheduleList = () => (
    <div>
      {/* 头部信息 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedClass!.name}</h2>
              <p className="text-gray-600 mt-1">
                {selectedClass!.courseName} · {selectedClass!.location}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Layers size={18} />
              批量排课
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              添加排课
            </button>
          </div>
        </div>
      </div>

      {/* 排课列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无排课</h3>
          <p className="text-gray-500 mb-6">该班级还没有安排任何课程</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              批量排课
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加排课
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">日期时间</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">课时内容</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">地点</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((schedule, index) => (
                <tr key={schedule._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{schedule.date}</div>
                    <div className="text-sm text-gray-500">
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {schedule.title || `第${index + 1}课时`}
                    </div>
                    {schedule.content && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {schedule.content}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {schedule.location || selectedClass!.location}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[schedule.status]?.color || 'bg-gray-100'}`}>
                      {STATUS_LABELS[schedule.status]?.text || schedule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAttendanceModal(schedule)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="出勤管理"
                      >
                        <UserCheck size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(schedule)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(schedule._id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <AdminPageTemplate
      title="班级排课"
      description="管理班级课表，支持批量排课和调课"
    >
      {selectedClass ? renderScheduleList() : renderClassSelector()}

      {/* 创建/编辑排课模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingSchedule ? '编辑排课' : '添加排课'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="上课地点"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课时标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="如：无人机飞行原理入门"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课程内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  placeholder="本课时的教学内容和目标"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editingSchedule ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 出勤管理模态框 */}
      {isAttendanceModalOpen && selectedScheduleForAttendance && (
        <AttendanceModal
          schedule={selectedScheduleForAttendance}
          classInfo={selectedClass!}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setSelectedScheduleForAttendance(null);
          }}
        />
      )}

      <ConfirmDialog />

      {/* 批量排课模态框 */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Layers className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">批量排课</h2>
                  <p className="text-sm text-gray-500">一次创建多条排课记录</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={batchFormData.startDate}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input
                    type="date"
                    value={batchFormData.endDate}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={batchFormData.startTime}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={batchFormData.endTime}
                    onChange={(e) => setBatchFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重复方式</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="daily"
                      checked={batchFormData.repeatType === 'daily'}
                      onChange={(e) => setBatchFormData(prev => ({ ...prev, repeatType: e.target.value as any }))}
                      className="text-emerald-600"
                    />
                    <span className="text-sm">每天</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="weekly"
                      checked={batchFormData.repeatType === 'weekly'}
                      onChange={(e) => setBatchFormData(prev => ({ ...prev, repeatType: e.target.value as any }))}
                      className="text-emerald-600"
                    />
                    <span className="text-sm">每周</span>
                  </label>
                </div>
              </div>

              {batchFormData.repeatType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择星期</label>
                  <div className="flex gap-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const days = batchFormData.repeatDays.includes(index)
                            ? batchFormData.repeatDays.filter(d => d !== index)
                            : [...batchFormData.repeatDays, index].sort();
                          setBatchFormData(prev => ({ ...prev, repeatDays: days }));
                        }}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          batchFormData.repeatDays.includes(index)
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">课时标题前缀</label>
                <input
                  type="text"
                  value={batchFormData.title}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="如：无人机驾驶基础"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">系统会自动添加序号，如：无人机驾驶基础-第1课</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">地点</label>
                <input
                  type="text"
                  value={batchFormData.location}
                  onChange={(e) => setBatchFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder={selectedClass?.location}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                批量创建
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageTemplate>
  );
}

// ============================================================================
// 出勤管理模态框组件
// ============================================================================

interface AttendanceModalProps {
  schedule: ClassSchedule;
  classInfo: Class;
  onClose: () => void;
}

interface AttendanceRecord {
  _id?: string;
  studentId: string;
  studentName: string;
  source?: MemberSource;
  status: 'present' | 'absent' | 'late' | 'leave';
  checkInTime?: string;
  remark?: string;
}

function AttendanceModal({ schedule, classInfo, onClose }: AttendanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classMembers, setClassMembers] = useState<Array<{ userId: string; userName: string; source?: MemberSource }>>([]);

  // 加载班级成员和出勤记录
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // ★ 从 class_members 集合加载真实班级成员
      const membersResult = await CloudAdminService.list({
        collection: 'class_members',
        query: { classId: classInfo?._id },
        options: { limit: 100 }
      }) as { code: number; data: any[] };

      if (membersResult.code === 0 && membersResult.data) {
        // 获取学员详细信息
        const memberIds = membersResult.data.map((m: any) => m.userId);
        
        // 从 members 集合获取学员信息
        const membersDetailResult = await CloudAdminService.list({
          collection: 'members',
          query: { _id: { $in: memberIds } },
          options: { limit: 100 }
        }) as { code: number; data: any[] };

        const membersMap = new Map<string, any>();
        if (membersDetailResult.code === 0 && membersDetailResult.data) {
          membersDetailResult.data.forEach((m: any) => {
            membersMap.set(m._id, m);
          });
        }

        // 合并数据
        const members = membersResult.data.map((m: any) => {
          const memberDetail = membersMap.get(m.userId);
          return {
            userId: m.userId,
            userName: memberDetail?.name || m.userName || `学员-${m.userId.slice(-4)}`,
            source: m.source || memberDetail?.source || 'offline_enroll'
          };
        });

        setClassMembers(members);
      } else {
        setClassMembers([]);
      }
      
      setRecords([]);
    } catch (error) {
      console.error('加载出勤数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setRecords(prev => {
      const existing = prev.find(r => r.studentId === studentId);
      if (existing) {
        return prev.map(r => r.studentId === studentId ? { ...r, status } : r);
      }
      const member = classMembers.find(m => m.userId === studentId);
      return [...prev, {
        studentId,
        studentName: member?.userName || '',
        source: member?.source,
        status
      }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // ★ 保存出勤记录到 attendance 集合
      for (const record of records) {
        await CloudAdminService.add({
          collection: 'attendance',
          data: {
            scheduleId: schedule._id,
            classId: classInfo?._id,
            studentId: record.studentId,
            studentName: record.studentName,
            date: schedule.date,
            status: record.status,
            createdAt: new Date().toISOString()
          }
        });
      }
      await confirm({ title: '提示', message: '出勤记录已保存', variant: 'info' });
      onClose();
    } catch (error) {
      console.error('保存出勤记录失败:', error);
      await confirm({ title: '提示', message: '保存失败', variant: 'info' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-300';
      case 'absent': return 'bg-red-100 text-red-700 border-red-300';
      case 'late': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'leave': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'present': return '出勤';
      case 'absent': return '缺勤';
      case 'late': return '迟到';
      case 'leave': return '请假';
      default: return '未记录';
    }
  };

  // ★ 获取来源标签
  const getSourceBadge = (source?: MemberSource) => {
    const sourceConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      'online_enroll': { label: '线上报名', color: 'text-green-700', bgColor: 'bg-green-100' },
      'offline_enroll': { label: '线下报名', color: 'text-orange-700', bgColor: 'bg-orange-100' },
      'hybrid': { label: '混合', color: 'text-purple-700', bgColor: 'bg-purple-100' },
      'online_purchase': { label: '线上购买', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    };
    const config = sourceConfig[source || ''] || { label: '未知', color: 'text-gray-700', bgColor: 'bg-gray-100' };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color}`}>
        {source === 'online_enroll' && <Smartphone size={10} />}
        {source !== 'online_enroll' && <Users size={10} />}
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">出勤管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              {schedule.date} {schedule.startTime}-{schedule.endTime} · {schedule.title || '课时'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {classMembers.map(member => {
                const record = records.find(r => r.studentId === member.userId);
                const status = record?.status;

                return (
                  <div key={member.userId} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Users size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {member.userName}
                          {getSourceBadge(member.source)}
                        </div>
                        <div className="text-sm text-gray-500">学员</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(['present', 'absent', 'late', 'leave'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(member.userId, s)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            status === s
                              ? getStatusColor(s)
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {getStatusLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {classMembers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p>暂无班级成员</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            保存出勤记录
          </button>
        </div>
      </div>
    </div>
  );
}
