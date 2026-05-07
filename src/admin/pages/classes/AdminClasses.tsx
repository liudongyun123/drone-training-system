// ============================================================================
// 管理后台 - 班级管理
// 功能:班级CRUD、关联课程、教师分配、报名配置
// 版本:v20260411-member-source
// ============================================================================
import { useState, useEffect } from 'react';
import { useConfirm } from '@/admin/hooks/useConfirm';
import { useDictionary } from '@/admin/hooks/useDictionary';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { classService } from '@/services';
import { courseService, teacherService } from '@/services/database';
import type { ClassV2 as Class, Course, Teacher } from '@/types';
import type { MemberSource } from '@/types/member';
import { MemberSourceLabels, MemberSourceColors } from '@/types/member';
import { CloudAdminService } from '@/services/CloudAdminService';
import {
  Plus, Edit, Trash2, Search, Calendar, MapPin, Users,
  BookOpen, UserCheck, Video, X, ChevronLeft, ChevronRight, Grid, List,
  Link as LinkIcon, ExternalLink, Copy, Check, Monitor, Smartphone
} from 'lucide-react';

// 班级状态标签
const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'bg-gray-100 text-gray-700' },
  enrolling: { text: '报名中', color: 'bg-green-100 text-green-700' },
  full: { text: '已满员', color: 'bg-orange-100 text-orange-700' },
  in_progress: { text: '进行中', color: 'bg-blue-100 text-blue-700' },
  completed: { text: '已结课', color: 'bg-gray-100 text-gray-700' },
  cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' }
};

// ★ 辅助函数:获取班级人数(兼容新旧格式)
const getClassEnrollmentStats = (cls: any) => {
  // 新版格式:capacity.confirmed / capacity.max
  if (cls.capacity) {
    return {
      enrolled: cls.capacity.confirmed || 0,
      max: cls.capacity.max || cls.maxStudents || 20
    };
  }
  // 旧版格式:enrolledCount / maxStudents
  return {
    enrolled: cls.enrolledCount || 0,
    max: cls.maxStudents || 20
  };
};

// 获取班级报名链接
const getClassRegistrationUrl = (classId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/#/registration/class/${classId}`;
};

// 复制链接到剪贴板
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

// 初始表单数据
const initialFormData: Partial<Class> = {
  name: '',
  description: '',
  level: '',
  courseId: '',
  maxStudents: 20,
  startDate: '',
  endDate: '',
  location: '',
  teacherId: '',
  // 班级介绍
  intro: {
    videoUrl: undefined,
    videoCover: undefined,
    documentUrl: undefined,
    documentName: undefined,
    content: undefined
  },
  enrollmentConfig: {
    price: 0,
    originalPrice: undefined,
    enableVideoAccess: false,
    videoAccessDays: 365,
    materials: []
  }
};

export default function AdminClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  // 筛选状态
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // ★ 培训班等级选项
  const { options: classLevelOptions, loading: classLevelsLoading } = useDictionary({ groupKey: 'classLevels' });

  // ★ 学员来源统计
  const [classMemberStats, setClassMemberStats] = useState<Record<string, {
    total: number;
    online_enroll: number;
    offline_enroll: number;
    hybrid: number;
    other: number;
  }>>({});

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // 关联数据
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const { confirm, ConfirmDialog } = useConfirm();
  
  // 安全提取列表数据(兼容多种返回格式)
  const extractList = <T,>(result: any): T[] => {
    if (!result) return [];
    // 格式1: 直接数组
    if (Array.isArray(result)) return result;
    // 格式2: { code: 0, data: { list, total } } - classService 返回格式
    if (result.data?.list) return result.data.list;
    if (Array.isArray(result.data?.list)) return result.data.list;
    // 格式3: { data: [...] }
    if (Array.isArray(result.data)) return result.data;
    // 格式4: { list, total }
    if (Array.isArray(result.list)) return result.list;
    return [];
  };

  // 安全提取总数(兼容多种返回格式)
  const extractTotal = (result: any): number => {
    if (!result) return 0;
    // 格式1: { code: 0, data: { list, total } } - classService 返回格式
    if (typeof result.data?.total === 'number') return result.data.total;
    // 格式2: { total } - 扁平格式
    if (typeof result.total === 'number') return result.total;
    // 格式3: { data: { total } }
    if (typeof result.data?.total === 'number') return result.data.total;
    return 0;
  };

  // 加载班级列表
  const loadClasses = async () => {
    setLoading(true);
    try {
      const query: Record<string, unknown> = {};
      if (filterStatus) query.status = filterStatus;
      if (filterCourse) query.courseId = filterCourse;
      if (searchKeyword) query.keyword = searchKeyword;

      const result = await classService.getList({
        ...query,
        page,
        pageSize: 10
      });

      // 安全提取数据
      const listData = extractList<Class>(result);
      setClasses(listData);
      setTotal(extractTotal(result));
    } catch (error) {
      console.error('加载班级失败:', error);
      setClasses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 加载关联数据
  const loadRelatedData = async () => {
    try {
      const [coursesResult, teachersResult] = await Promise.all([
        courseService.getList({ page: 1, pageSize: 100 }),
        teacherService.getList({ page: 1, pageSize: 100 })
      ]);

      // 调试日志

      // 直接访问 list 字段,确保是数组
      setCourses(Array.isArray(coursesResult?.list) ? coursesResult.list : []);
      setTeachers(Array.isArray(teachersResult?.list) ? teachersResult.list : []);
    } catch (error) {
      console.error('加载关联数据失败:', error);
      // 出错时设置为空数组
      setCourses([]);
      setTeachers([]);
    }
  };

  useEffect(() => {
    loadClasses();
    loadRelatedData();
  }, [page, filterStatus, filterCourse]);

  // ★ 加载班级学员来源统计
  const loadClassMemberStats = async (classId: string) => {
    try {
      const result = await CloudAdminService.list({
        collection: 'class_members',
        query: { classId },
        options: { limit: 100 }
      }) as { code: number; data: any[] };

      if (result.code === 0 && result.data) {
        const stats = {
          total: result.data.length,
          online_enroll: 0,
          offline_enroll: 0,
          hybrid: 0,
          other: 0
        };

        result.data.forEach((member: any) => {
          // 通过 member.source 或关联的 registration/source 判断来源
          if (member.source === 'online_enroll') stats.online_enroll++;
          else if (member.source === 'offline_enroll') stats.offline_enroll++;
          else if (member.source === 'hybrid') stats.hybrid++;
          else stats.other++;
        });

        setClassMemberStats(prev => ({ ...prev, [classId]: stats }));
      }
    } catch (error) {
      console.error('加载班级学员统计失败:', error);
    }
  };

  // 加载所有班级的学员统计
  const loadAllClassMemberStats = async () => {
    for (const cls of classes) {
      if (cls._id && !classMemberStats[cls._id]) {
        await loadClassMemberStats(cls._id);
      }
    }
  };

  // 当班级列表加载完成后,加载学员统计
  useEffect(() => {
    if (classes.length > 0) {
      loadAllClassMemberStats();
    }
  }, [classes]);

  // 打开创建模态框
  const openCreateModal = () => {
    setEditingClass(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  // 打开编辑模态框
  const openEditModal = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      description: cls.description || '',
      level: cls.level || '',
      courseId: cls.courseId,
      maxStudents: cls.maxStudents,
      startDate: cls.startDate,
      endDate: cls.endDate,
      location: cls.location,
      teacherId: cls.teacherId,
      intro: cls.intro || initialFormData.intro,
      enrollmentConfig: cls.enrollmentConfig || initialFormData.enrollmentConfig
    });
    setIsModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.name || !formData.courseId || !formData.teacherId) {
      await confirm({ title: '提示', message: '请填写必填项', variant: 'info' });
      return;
    }

    setSubmitting(true);
    try {
      // 获取课程和教师名称
      const course = courses.find(c => c._id === formData.courseId);
      const teacher = teachers.find(t => t._id === formData.teacherId);

      const submitData = {
        ...formData,
        courseName: course?.title,
        teacherName: teacher?.name
      };

      if (editingClass) {
        await classService.update(editingClass._id!, submitData);
      } else {
        // @ts-ignore
        await classService.create(submitData);
      }

      setIsModalOpen(false);
      loadClasses();
    } catch (error) {
      console.error('保存失败:', error);
      await confirm({ title: '提示', message: '保存失败', variant: 'info' });
    } finally {
      setSubmitting(false);
    }
  };

  // 删除班级
  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: '删除确认', message: '确定要删除该班级吗？此操作不可撤销。', variant: 'danger' });
    if (!ok) return;

    try {
      await classService.delete(id);
      loadClasses();
    } catch (error: any) {
      await confirm({ title: '提示', message: error.message || '删除失败', variant: 'info' });
    }
  };

  // 复制报名链接
  const [copiedClassId, setCopiedClassId] = useState<string | null>(null);
  const handleCopyRegistrationLink = async (cls: Class) => {
    const url = getClassRegistrationUrl(cls._id!);
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedClassId(cls._id!);
      setTimeout(() => setCopiedClassId(null), 2000);
    } else {
      await confirm({ title: '提示', message: '复制失败，请手动复制链接', variant: 'info' });
    }
  };

  // 新窗口打开报名页面
  const handleOpenRegistrationPage = (classId: string) => {
    const url = getClassRegistrationUrl(classId);
    window.open(url, '_blank');
  };

  // 渲染班级卡片
  const renderClassCard = (cls: Class) => (
    <div key={cls._id} className="bg-white rounded-xl border hover:shadow-lg transition-shadow p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{cls.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{cls.courseName}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[cls.status]?.color || 'bg-gray-100'}`}>
          {STATUS_LABELS[cls.status]?.text || cls.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>{cls.startDate} ~ {cls.endDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} />
          <span>{cls.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck size={14} />
          <span>{cls.teacherName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} />
          <span>{getClassEnrollmentStats(cls).enrolled} / {getClassEnrollmentStats(cls).max} 人</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            ¥{cls.enrollmentConfig?.price || 0}
          </span>
          {cls.enrollmentConfig?.enableVideoAccess && (
            <span className="flex items-center gap-1 text-green-600">
              <Video size={14} />
              含视频
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 报名链接按钮 - 仅招生中班级显示 */}
          {cls.status === 'enrolling' && (
            <div className="flex items-center gap-1 border-r pr-3 mr-1">
              <button
                onClick={() => handleCopyRegistrationLink(cls)}
                className={`p-2 rounded-lg transition-colors ${
                  copiedClassId === cls._id
                    ? 'text-green-600 bg-green-50'
                    : 'text-green-600 hover:bg-green-50'
                }`}
                title="复制报名链接"
              >
                {copiedClassId === cls._id ? <Check size={16} /> : <LinkIcon size={16} />}
              </button>
              <button
                onClick={() => handleOpenRegistrationPage(cls._id!)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="预览报名页面"
              >
                <ExternalLink size={16} />
              </button>
            </div>
          )}
          <button
            onClick={() => openEditModal(cls)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(cls._id!)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  // ★ 渲染学员来源统计
  const renderMemberSourceStats = (clsId: string) => {
    const stats = classMemberStats[clsId];
    if (!stats) {
      return <span className="text-gray-400 text-xs">加载中...</span>;
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* 线上报名 */}
        {stats.online_enroll > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Smartphone size={10} />
            线上 {stats.online_enroll}
          </span>
        )}
        {/* 线下报名 */}
        {stats.offline_enroll > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <Users size={10} />
            线下 {stats.offline_enroll}
          </span>
        )}
        {/* 混合用户 */}
        {stats.hybrid > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <Users size={10} />
            混合 {stats.hybrid}
          </span>
        )}
        {/* 其他 */}
        {stats.other > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            其他 {stats.other}
          </span>
        )}
        {stats.total === 0 && (
          <span className="text-gray-400 text-xs">暂无学员</span>
        )}
      </div>
    );
  };

  // 渲染班级列表行
  const renderClassRow = (cls: Class) => (
    <tr key={cls._id} className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <div className="font-medium text-gray-900">{cls.name}</div>
          <div className="text-sm text-gray-500">{cls.courseName}</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[cls.status]?.color || 'bg-gray-100'}`}>
          {STATUS_LABELS[cls.status]?.text || cls.status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          {cls.startDate} ~ {cls.endDate}
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Users size={14} />
          {getClassEnrollmentStats(cls).enrolled} / {getClassEnrollmentStats(cls).max}
        </div>
      </td>
      {/* ★ 新增:学员来源列 */}
      <td className="px-6 py-4">
        {renderMemberSourceStats(cls._id!)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">
        ¥{cls.enrollmentConfig?.price || 0}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {/* 报名链接按钮 - 仅招生中班级显示 */}
          {cls.status === 'enrolling' && (
            <div className="flex items-center gap-1 border-r pr-3 mr-1">
              <button
                onClick={() => handleCopyRegistrationLink(cls)}
                className={`p-2 rounded-lg transition-colors ${
                  copiedClassId === cls._id
                    ? 'text-green-600 bg-green-50'
                    : 'text-green-600 hover:bg-green-50'
                }`}
                title="复制报名链接"
              >
                {copiedClassId === cls._id ? <Check size={16} /> : <LinkIcon size={16} />}
              </button>
              <button
                onClick={() => handleOpenRegistrationPage(cls._id!)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="预览报名页面"
              >
                <ExternalLink size={16} />
              </button>
            </div>
          )}
          <button
            onClick={() => openEditModal(cls)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="编辑"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(cls._id!)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <AdminPageTemplate
      title="班级管理"
      description="管理线下培训班级,配置课程、教师、排课信息"
      action={
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          创建班级
        </button>
      }
    >
      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索班级名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部状态</option>
            <option value="enrolling">报名中</option>
            <option value="full">已满员</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已结课</option>
          </select>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部课程</option>
            {(courses || []).map(course => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 班级列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(classes || []).map(renderClassCard)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">班级信息</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">状态</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">时间</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">人数</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">★ 学员来源</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">价格</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(classes || []).map(renderClassRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {!loading && total > 10 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            共 {total} 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              第 {page} 页
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={classes.length < 10}
              className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog />

      {/* 创建/编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 头部 */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingClass ? '编辑班级' : '创建班级'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingClass ? '修改班级信息' : '创建新的线下培训班级'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 表单 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      班级名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="如:无人机驾驶第3期"
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">班级描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  {/* 培训班等级 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      班级等级
                    </label>
                    <select
                      value={formData.level || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                      disabled={classLevelsLoading}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">请选择等级</option>
                      {classLevelOptions.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      关联课程 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.courseId}
                      onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">请选择课程</option>
                      {(courses || []).map(course => (
                        <option key={course._id} value={course._id}>{course.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      授课教师 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.teacherId}
                      onChange={(e) => setFormData(prev => ({ ...prev, teacherId: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">请选择教师</option>
                      {(teachers || []).map(teacher => (
                        <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 时间地点 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">最大学员数</label>
                    <input
                      type="number"
                      value={formData.maxStudents}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: parseInt(e.target.value) || 20 }))}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上课地点</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="如:北京市海淀区XX路XX号"
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* 班级介绍 */}
                <div className="border-t pt-5 mt-5">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-600" />
                    班级介绍(前台展示给学员)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">视频介绍URL</label>
                      <input
                        type="url"
                        value={formData.intro.videoUrl}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          intro: { ...prev.intro, videoUrl: e.target.value }
                        }))}
                        placeholder="如:https://www.bilibili.com/video/xxx"
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">支持B站、腾讯视频、微信视频号等链接</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">视频封面图URL</label>
                      <input
                        type="url"
                        value={formData.intro.videoCover}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          intro: { ...prev.intro, videoCover: e.target.value }
                        }))}
                        placeholder="视频封面图片链接(可选)"
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">课程文档URL</label>
                      <input
                        type="url"
                        value={formData.intro.documentUrl}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          intro: { ...prev.intro, documentUrl: e.target.value }
                        }))}
                        placeholder="如:https://example.com/syllabus.pdf"
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">支持PDF、Word等文档链接</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">文档名称</label>
                      <input
                        type="text"
                        value={formData.intro.documentName}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          intro: { ...prev.intro, documentName: e.target.value }
                        }))}
                        placeholder="如:课程大纲、招生简章"
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">详细介绍</label>
                    <textarea
                      value={formData.intro.content}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        intro: { ...prev.intro, content: e.target.value }
                      }))}
                      rows={4}
                      placeholder="详细介绍班级课程内容、培训目标、适合人群等..."
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* 报名配置 */}
                <div className="border-t pt-5">
                  <h3 className="font-medium text-gray-900 mb-4">报名配置</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">报名价格</label>
                      <input
                        type="number"
                        value={formData.enrollmentConfig.price}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          enrollmentConfig: { ...prev.enrollmentConfig, price: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">原价</label>
                      <input
                        type="number"
                        value={formData.enrollmentConfig.originalPrice}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          enrollmentConfig: { ...prev.enrollmentConfig, originalPrice: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">视频有效期(天)</label>
                      <input
                        type="number"
                        value={formData.enrollmentConfig.videoAccessDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          enrollmentConfig: { ...prev.enrollmentConfig, videoAccessDays: parseInt(e.target.value) || 365 }
                        }))}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enableVideo"
                      checked={formData.enrollmentConfig.enableVideoAccess}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        enrollmentConfig: { ...prev.enrollmentConfig, enableVideoAccess: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="enableVideo" className="text-sm text-gray-700">
                      开通视频观看权限(学员报名后可观看关联课程的线上视频)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
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
                {editingClass ? '保存修改' : '创建班级'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageTemplate>
  );
}
