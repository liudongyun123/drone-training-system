// ============================================================================
// 管理后台 - 教师管理
// 功能：教师档案管理、排课管理、统计数据
// ============================================================================
import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, Calendar, BarChart3, User, 
  Star, Clock, Users, Award, ChevronLeft, ChevronRight,
  X, Check, MapPin, Phone, Mail, BookOpen
} from 'lucide-react';
import { teacherService } from '@/services/teacherService';
import { app as cloudbaseApp, checkLogin } from '@/utils/cloudbase';
import ImageUploader from '@/components/admin/ImageUploader';
import type { Teacher, Schedule } from '@/types';
import { parseDate, formatTime as formatTimeSafe } from '@/utils/dateUtils';

// 教师档案弹窗
interface TeacherModalProps {
  teacher?: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Teacher>) => void;
  saving?: boolean;
}

function TeacherModal({ teacher, isOpen, onClose, onSave, saving = false }: TeacherModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    avatar: '',
    bio: '',
    specialties: [] as string[],
    certifications: [] as string[],
    status: 'active' as 'active' | 'inactive',
  });
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [certInput, setCertInput] = useState('');

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        phone: (teacher as any).phone || '',
        email: (teacher as any).email || '',
        avatar: (teacher as any).avatar || '',
        bio: teacher.bio || '',
        specialties: teacher.specialties || [],
        certifications: teacher.certifications || [],
        status: teacher.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        avatar: '',
        bio: '',
        specialties: [],
        certifications: [],
        status: 'active',
      });
    }
  }, [teacher, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData(prev => ({ ...prev, specialties: [...prev.specialties, specialtyInput.trim()] }));
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (item: string) => {
    setFormData(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== item) }));
  };

  const addCert = () => {
    if (certInput.trim() && !formData.certifications.includes(certInput.trim())) {
      setFormData(prev => ({ ...prev, certifications: [...prev.certifications, certInput.trim()] }));
      setCertInput('');
    }
  };

  const removeCert = (item: string) => {
    setFormData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c !== item) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-800">
            {teacher ? '编辑教师档案' : '添加新教师'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* 头像上传 */}
            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-700 mb-3">教师头像</label>
              <div className="w-32">
                <ImageUploader
                  value={formData.avatar}
                  onChange={(url) => setFormData(prev => ({ ...prev, avatar: url }))}
                  maxSize={5}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  placeholder="上传头像"
                  previewHeight="h-32"
                  className="w-full"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG，最大 5MB</p>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入教师姓名"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="请输入电子邮箱"
                  />
                </div>
              </div>
            </div>

            {/* 个人简介 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">个人简介</label>
              <textarea
                value={formData.bio}
                onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                placeholder="请输入教师个人简介、教学经历等"
              />
            </div>

            {/* 擅长领域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">擅长领域</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={specialtyInput}
                  onChange={e => setSpecialtyInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入擅长领域，如：无人机航拍、农业植保等"
                />
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map((specialty, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {specialty}
                    <button type="button" onClick={() => removeSpecialty(specialty)} className="hover:text-blue-900">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 资质证书 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">资质证书</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={certInput}
                  onChange={e => setCertInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCert())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="输入证书名称，如：CAAC执照、AOPA认证等"
                />
                <button
                  type="button"
                  onClick={addCert}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  添加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.certifications.map((cert, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    <Award size={14} />
                    {cert}
                    <button type="button" onClick={() => removeCert(cert)} className="hover:text-green-900">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">账号状态</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    在职
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    离职
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={false}
              className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              <>
                <Check size={18} />
                保存
              </>
            )}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

// 排课弹窗
interface ScheduleModalProps {
  teacherId: string;
  teacherName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ScheduleModal({ teacherId, teacherName, isOpen, onClose }: ScheduleModalProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen && teacherId) {
      loadSchedules();
    }
  }, [isOpen, teacherId, selectedDate]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const result = await teacherService.getScheduleList(teacherId, {
        startDate: selectedDate,
      });
      setSchedules(result.data?.list || []);
    } catch (error) {
      console.error('加载排课失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">教师排课表</h2>
            <p className="text-sm text-gray-500 mt-1">{teacherName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 日期选择 */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <Calendar className="text-purple-500" size={20} />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button
                onClick={loadSchedules}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                查询
              </button>
            </div>
          </div>

          {/* 排课列表 */}
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
                {schedules.map((schedule) => (
                  <div key={schedule._id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">{schedule.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatTimeSafe(schedule.startTime)} -
                            {formatTimeSafe(schedule.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {schedule.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {schedule.enrolledCount}/{schedule.maxStudents} 人
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        schedule.status === 'completed' ? 'bg-green-100 text-green-700' :
                        schedule.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                        schedule.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {schedule.status === 'completed' ? '已完成' :
                         schedule.status === 'ongoing' ? '进行中' :
                         schedule.status === 'cancelled' ? '已取消' : '待开始'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计弹窗
interface StatsModalProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
}

function StatsModal({ teacher, isOpen, onClose }: StatsModalProps) {
  const [stats, setStats] = useState({
    totalHours: 0,
    totalCourses: 0,
    totalStudents: 0,
    avgRating: 0,
    monthlyData: [] as { month: string; hours: number; students: number }[],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && teacher) {
      loadStats();
    }
  }, [isOpen, teacher]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // 确保已登录
      try {
        await checkLogin();
      } catch (authError) {
        console.warn('登录检查失败:', authError);
      }

      const db = cloudbaseApp.database();
      const teacherId = teacher?._id || teacher?.id;

      // 1. 查询该教师的排课记录（course_schedules 集合）
      let schedules: any[] = [];
      let enrollments: any[] = [];
      let courses: any[] = [];
      
      try {
        const schedulesResult = await db.collection('course_schedules')
          .where({ teacherId: teacherId })
          .limit(500)
          .get();
        schedules = schedulesResult.data || [];
      } catch (e) {
        console.warn('排课查询失败:', e);
      }

      // 2. 查询该教师的课程
      try {
        const coursesResult = await db.collection('courses')
          .where({ teacherId: teacherId })
          .limit(100)
          .get();
        courses = coursesResult.data || [];
        
        // 3. 根据课程查询报名记录
        const courseIds = courses.map((c: any) => c._id);
        if (courseIds.length > 0) {
          // 查询所有相关报名记录
          const allEnrollments = await db.collection('enrollments')
            .limit(500)
            .get();
          // 筛选关联的报名
          enrollments = (allEnrollments.data || []).filter((e: any) => 
            courseIds.includes(e.courseId)
          );
        }
      } catch (e) {
        console.warn('课程/报名查询失败:', e);
      }

      // 计算总课时（从已完成排课）
      const completedSchedules = schedules.filter((s: any) => s.status === 'completed');
      const totalHours = completedSchedules.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

      // 统计学员数（去重）
      const uniqueStudentIds = new Set(enrollments.map((e: any) => e.studentId || e.userId));
      const totalStudents = uniqueStudentIds.size;

      // 计算月度数据（最近6个月）
      const now = new Date();
      const monthlyData: { month: string; hours: number; students: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = monthDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).getTime();

        // 该月的课时
        const monthSchedules = completedSchedules.filter((s: any) => {
          const scheduleTime = parseDate(s.date || s.startTime)?.getTime();
          return scheduleTime !== undefined && scheduleTime >= monthStart && scheduleTime <= monthEnd;
        });
        const monthHours = monthSchedules.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

        // 该月的学员数（去重）
        const monthEnrollments = enrollments.filter((e: any) => {
          const enrollTime = parseDate(e.createdAt || e.enrolledAt)?.getTime() || 0;
          return enrollTime >= monthStart && enrollTime <= monthEnd;
        });
        const monthStudentSet = new Set(monthEnrollments.map((e: any) => e.studentId || e.userId));

        monthlyData.push({
          month: monthStr,
          hours: monthHours,
          students: monthStudentSet.size,
        });
      }

      // 计算平均评分（从课程评分）
      const ratings = courses.filter((c: any) => c.rating > 0).map((c: any) => c.rating);
      const avgRating = ratings.length > 0
        ? Number((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1))
        : 0;

      setStats({
        totalHours: totalHours,
        totalCourses: courses.length,
        totalStudents: totalStudents,
        avgRating: avgRating,
        monthlyData,
      });
    } catch (error) {
      console.error('加载统计失败:', error);
      // 出错时使用基础数据
      setStats({
        totalHours: teacher?.totalHours || 0,
        totalCourses: 0,
        totalStudents: teacher?.studentCount || 0,
        avgRating: teacher?.rating || 0,
        monthlyData: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
              {teacher.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{teacher.name}</h2>
              <p className="text-sm text-gray-500">教学统计报表</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Clock size={20} />
                    <span className="text-sm font-medium">授课时长</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalHours}h</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <BookOpen size={20} />
                    <span className="text-sm font-medium">开设课程</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalCourses}门</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Users size={20} />
                    <span className="text-sm font-medium">累计学员</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalStudents}人</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <Star size={20} />
                    <span className="text-sm font-medium">平均评分</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.avgRating.toFixed(1)}</p>
                </div>
              </div>

              {/* 月度数据表 */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-800">近6个月教学数据</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">月份</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">授课时长</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">学员数量</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">趋势</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.monthlyData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-800">{item.month}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{item.hours} 小时</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{item.students} 人</td>
                        <td className="px-6 py-3">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                              style={{ width: `${(item.hours / 70) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 擅长领域 */}
              {teacher.specialties && teacher.specialties.length > 0 && (
                <div className="border rounded-xl p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">擅长领域</h3>
                  <div className="flex flex-wrap gap-2">
                    {teacher.specialties.map((specialty, idx) => (
                      <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 主组件
export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      // 使用 keyword 进行名称搜索
      const query: any = {};
      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }
      
      // 调用教师服务获取列表
      const result = await teacherService.getList(query, { 
        page, 
        pageSize 
      });
      
      // 解析返回数据 - teacherService.getList 返回 { code: 0, data: { list: [...], total: n } }
      let teacherList: any[] = [];
      
      // 直接从 result.data.list 获取数组
      if (result.data?.list && Array.isArray(result.data.list)) {
        teacherList = result.data.list;
      } else if (Array.isArray(result.data)) {
        // 兼容直接返回数组的情况
        teacherList = result.data;
      } else if (result.data?.data && Array.isArray(result.data.data)) {
        // 兼容 { data: { data: [...] } } 格式
        teacherList = result.data.data;
      }
      
      // 关键词过滤（前端过滤）
      if (keyword && teacherList.length > 0) {
        teacherList = teacherList.filter((t: any) => 
          t.name?.toLowerCase().includes(keyword.toLowerCase())
        );
      }
      
      console.log('教师数据:', teacherList.length, '条', teacherList);
      setTeachers(teacherList);
      setTotal(result.data?.total || teacherList.length);
    } catch (error) {
      console.error('加载教师失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTeachers();
  };

  const handleSave = async (data: Partial<Teacher>) => {
    try {
      setSaving(true);
      
      // 表单验证
      if (!data.name || data.name.trim() === '') {
        alert('请输入教师姓名');
        setSaving(false);
        return;
      }

      // 准备保存数据
      const saveData = {
        ...data,
        // 确保数组字段不为null
        specialties: data.specialties || [],
        certifications: data.certifications || [],
        // 确保状态有默认值
        status: data.status || 'active',
        // 明确添加时间戳
        updatedAt: new Date().toISOString(),
      };

      // 如果是新建，添加创建时间
      if (!selectedTeacher) {
        saveData.createdAt = new Date().toISOString();
        saveData.rating = 0;
        saveData.totalHours = 0;
        saveData.studentCount = 0;
      }

      console.log('[教师保存] 准备保存教师数据:', saveData);

      let result;
      let actionType = selectedTeacher ? '更新' : '创建';

      if (selectedTeacher) {
        // 更新现有教师
        console.log('[教师保存] 更新教师, ID:', selectedTeacher._id);
        result = await teacherService.update(selectedTeacher._id, saveData);
        console.log('[教师保存] 更新结果:', JSON.stringify(result, null, 2));
      } else {
        // 创建新教师
        console.log('[教师保存] 创建新教师');
        result = await teacherService.create(saveData);
        console.log('[教师保存] 创建结果:', JSON.stringify(result, null, 2));
      }

      // 检查操作结果 - 详细检查
      console.log('[教师保存] 检查返回结果, code:', result?.code, 'message:', result?.message);
      
      if (result && result.code === 0) {
        console.log(`[教师保存] ${actionType}成功, 关闭弹窗并刷新列表`);
        setIsModalOpen(false);
        setSelectedTeacher(null);
        await loadTeachers();
        
        // 显示成功提示
        alert(selectedTeacher ? '更新成功' : '创建成功');
      } else {
        // 处理非0返回码的情况
        console.error('[教师保存] 操作失败, result:', result);
        const errorMessage = result?.message || `${actionType}失败，请重试`;
        alert(`错误: ${errorMessage}`);
      }
    } catch (error) {
      console.error('[教师保存] 保存失败详细错误:', error);
      
      // 详细错误提示
      let errorMsg = '保存失败，请重试';
      if (error instanceof Error) {
        console.error('[教师保存] 错误类型:', error.name);
        console.error('[教师保存] 错误信息:', error.message);
        
        // 检查是否是云函数未部署
        if (error.message.includes('找不到函数') || error.message.includes('function not found')) {
          errorMsg = '云函数未部署，请联系管理员部署 admin 云函数';
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMsg = '网络错误，请检查网络连接后重试';
        } else if (error.message.includes('permission') || error.message.includes('权限')) {
          errorMsg = '权限不足，无法保存数据，请检查数据库安全规则';
        } else if (error.message.includes('timeout')) {
          errorMsg = '请求超时，请重试';
        } else {
          errorMsg = `保存失败: ${error.message}`;
        }
      } else {
        console.error('[教师保存] 未知错误类型:', error);
      }
      
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`确定要删除教师「${teacher.name}」吗？此操作不可撤销。`)) {
      return;
    }
    try {
      const result = await teacherService.delete(teacher._id);
      if (result.code === 0) {
        alert('删除成功');
        loadTeachers();
      } else {
        alert(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const openAddModal = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const openScheduleModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsScheduleOpen(true);
  };

  const openStatsModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsStatsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 面包屑 */}
        <nav className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center gap-2">
            <li><a href="/admin" className="hover:text-blue-600 transition-colors">管理后台</a></li>
            <li>/</li>
            <li className="text-gray-800 font-medium">教师管理</li>
          </ol>
        </nav>

        {/* 标题区域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">教师管理</h1>
          <p className="text-gray-500">管理教师档案、查看排课安排和教学统计</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">在职教师</p>
                <p className="text-2xl font-bold text-gray-800">
                  {teachers.filter(t => t.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="text-green-600" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">累计授课</p>
                <p className="text-2xl font-bold text-gray-800">
                  {teachers.reduce((sum, t) => sum + (t.totalHours || 0), 0)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">平均评分</p>
                <p className="text-2xl font-bold text-gray-800">
                  {(teachers.reduce((sum, t) => sum + (t.rating || 0), 0) / (teachers.length || 1)).toFixed(1)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Star className="text-amber-600" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">累计学员</p>
                <p className="text-2xl font-bold text-gray-800">
                  {teachers.reduce((sum, t) => sum + (t.studentCount || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Award className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* 搜索和操作栏 */}
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* 搜索框 */}
              <form onSubmit={handleSearch} className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="搜索教师姓名..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </form>

              {/* 状态筛选 */}
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">全部状态</option>
                <option value="active">在职</option>
                <option value="inactive">离职</option>
              </select>

              {/* 添加按钮 */}
              <button
                onClick={openAddModal}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={20} />
                添加教师
              </button>
            </div>
          </div>
        </div>

        {/* 教师列表 */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="mx-auto mb-4 text-gray-300" size={64} />
              <h3 className="text-lg font-medium text-gray-600 mb-1">暂无教师数据</h3>
              <p className="text-gray-400 mb-4">点击上方按钮添加新教师</p>
              <button
                onClick={openAddModal}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                添加教师
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">教师信息</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">擅长领域</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">教学数据</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                            {teacher.avatar ? (
                              <img src={teacher.avatar} alt={teacher.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              teacher.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{teacher.name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1 max-w-xs">
                              {teacher.bio || '暂无简介'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(teacher.specialties || []).slice(0, 3).map((spec, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md">
                              {spec}
                            </span>
                          ))}
                          {(teacher.specialties || []).length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                              +{(teacher.specialties || []).length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Star size={14} className="text-amber-400" />
                            <span>{(teacher.rating || 0).toFixed(1)} 分</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users size={14} className="text-blue-400" />
                            <span>{teacher.studentCount || 0} 学员</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock size={14} className="text-green-400" />
                            <span>{teacher.totalHours || 0}h 授课</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          teacher.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            teacher.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                          {teacher.status === 'active' ? '在职' : '离职'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openStatsModal(teacher)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="查看统计"
                          >
                            <BarChart3 size={18} />
                          </button>
                          <button
                            onClick={() => openScheduleModal(teacher)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="排课表"
                          >
                            <Calendar size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(teacher)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(teacher)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          )}

          {/* 分页 */}
          {!loading && teachers.length > 0 && total > pageSize && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                共 {total} 条记录，第 {page} / {Math.ceil(total / pageSize)} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft size={16} />
                  上一页
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  下一页
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 弹窗组件 */}
      <TeacherModal
        teacher={selectedTeacher}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedTeacher(null); }}
        onSave={handleSave}
        saving={saving}
      />

      <ScheduleModal
        teacherId={selectedTeacher?._id || ''}
        teacherName={selectedTeacher?.name || ''}
        isOpen={isScheduleOpen}
        onClose={() => { setIsScheduleOpen(false); setSelectedTeacher(null); }}
      />

      <StatsModal
        teacher={selectedTeacher}
        isOpen={isStatsOpen}
        onClose={() => { setIsStatsOpen(false); setSelectedTeacher(null); }}
      />
    </div>
  );
}
