// ============================================================================
// 管理后台 - 学员人员管理（收口）
// 功能：按班级看名单/审核/调班；按课程管购课人员与视频权限
// 版本：v20260714-class-members-hub
// 数据来源：enrollments（班级名单）+ course_permissions（视频权限）
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import AdminPageTemplate from '@/admin/pages/system/_AdminPageTemplate';
import { classMemberService } from '@/services/classMemberService';
import { toast } from '@/components/Toast';
import {
  UsersRound, BookOpen, Search, RefreshCw, Check, X, Eye, EyeOff,
  ArrowRightLeft, UserMinus, AlertCircle, ClipboardList, GraduationCap,
  Download, Edit, Trash2, UserPlus, Plus, Gift
} from 'lucide-react';

// 报名状态标签
const ENR_STATUS: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-700' },
  active: { text: '正常', color: 'bg-green-100 text-green-700' },
  learning: { text: '学习中', color: 'bg-green-100 text-green-700' },
  completed: { text: '已结课', color: 'bg-gray-100 text-gray-700' },
  cancelled: { text: '已取消', color: 'bg-red-100 text-red-700' },
  dropped: { text: '已退课', color: 'bg-red-100 text-red-700' },
};

const SOURCE_LABEL: Record<string, string> = {
  online_purchase: '线上购买',
  online_enroll: '线上报名',
  offline_enroll: '线下报名',
  hybrid: '混合',
  online: '线上',
  offline: '线下',
  purchase: '购买',
  registration: '报名',
  gift: '赠送',
  trial: '试用',
  admin_grant: '管理员授权',
  class_enrollment: '报班赠送',
  class_gift: '管理员赠送',
};

const PERM_STATUS: Record<string, { text: string; color: string }> = {
  active: { text: '有效', color: 'bg-green-100 text-green-700' },
  expired: { text: '已过期', color: 'bg-gray-100 text-gray-700' },
  revoked: { text: '已撤销', color: 'bg-red-100 text-red-700' },
};

const REVIEWER = { id: 'admin', name: '管理员' };

export default function AdminClassMembers() {
  const [activeTab, setActiveTab] = useState<'class' | 'course'>('class');

  // ---- 按班级 ----
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [roster, setRoster] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'active' | 'removed'>('active');
  const [classLoading, setClassLoading] = useState(false);

  // 调班弹窗
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveEnrollment, setMoveEnrollment] = useState<any>(null);
  const [targetClasses, setTargetClasses] = useState<any[]>([]);
  const [targetClassId, setTargetClassId] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);

  // ---- 按课程 ----
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [buyers, setBuyers] = useState<any[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseStats, setCourseStats] = useState<{ total: number; active: number; revoked: number; expired: number } | null>(null);

  // 编辑权限弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<any>(null);
  const [editForm, setEditForm] = useState({ videoEnabled: true, videoValidDays: 365, status: 'active' });
  const [editLoading, setEditLoading] = useState(false);
  const [editResult, setEditResult] = useState<{ success: boolean; message: string } | null>(null);

  // 手动授权弹窗
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantStep, setGrantStep] = useState<'search' | 'confirm'>('search');
  const [grantKeyword, setGrantKeyword] = useState('');
  const [grantResults, setGrantResults] = useState<any[]>([]);
  const [grantSearching, setGrantSearching] = useState(false);
  const [grantSelectedUser, setGrantSelectedUser] = useState<any>(null);
  const [grantSelectedCourse, setGrantSelectedCourse] = useState<any>(null);
  const [grantVideoEnabled, setGrantVideoEnabled] = useState(true);
  const [grantValidDays, setGrantValidDays] = useState(365);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantResult, setGrantResult] = useState<{ success: boolean; message: string } | null>(null);

  // 编辑权限上下文：来自"按课程"还是"按班级关联课程"，决定保存后刷新哪个列表
  const [editContext, setEditContext] = useState<'course' | 'member'>('course');

  // 班级学员关联课程（报班赠送）弹窗
  const [memberCoursesOpen, setMemberCoursesOpen] = useState(false);
  const [memberCoursesEnr, setMemberCoursesEnr] = useState<any>(null);
  const [memberCourses, setMemberCourses] = useState<any[]>([]);
  const [memberCoursesLoading, setMemberCoursesLoading] = useState(false);

  // 添加赠送关联课程弹窗
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addCourseSelected, setAddCourseSelected] = useState<any>(null);
  const [addCourseEnabled, setAddCourseEnabled] = useState(true);
  const [addCourseDays, setAddCourseDays] = useState(365);
  const [addCourseLoading, setAddCourseLoading] = useState(false);
  const [addCourseResult, setAddCourseResult] = useState<{ success: boolean; message: string } | null>(null);

  // ===================== 按班级 =====================
  const loadClasses = useCallback(async () => {
    const list = await classMemberService.getClasses({ status: { $in: ['enrolling', 'in_progress', 'full', 'completed'] } });
    setClasses(list);
    if (!selectedClassId && list.length) setSelectedClassId(list[0]._id);
  }, [selectedClassId]);

  const loadRoster = useCallback(async (classId: string, filter: 'active' | 'removed' = 'active') => {
    if (!classId) { setRoster([]); setPending([]); return; }
    setClassLoading(true);
    try {
      if (filter === 'removed') {
        const r = await classMemberService.getClassRoster(classId, { statuses: ['cancelled'], keyword });
        setRoster(r);
        setPending([]);
      } else {
        const [r, p] = await Promise.all([
          classMemberService.getClassRoster(classId, { keyword }),
          classMemberService.getPendingEnrollments(classId)
        ]);
        setRoster(r);
        setPending(p);
      }
    } finally {
      setClassLoading(false);
    }
  }, [keyword]);

  useEffect(() => { loadClasses(); }, [loadClasses]);
  useEffect(() => { if (activeTab === 'class') loadRoster(selectedClassId, rosterFilter); }, [activeTab, selectedClassId, rosterFilter, loadRoster]);

  const handleConfirm = async (enrollmentId: string) => {
    const res = await classMemberService.confirmEnrollment(enrollmentId, REVIEWER);
    if (res.code === 0) {
      toast.success('已确认入班');
      loadRoster(selectedClassId);
    } else {
      toast.error(res.message || '操作失败');
    }
  };

  const openMove = async (enrollment: any) => {
    setMoveEnrollment(enrollment);
    setTargetClassId('');
    setMoveOpen(true);
    const list = await classMemberService.getOpenClasses(enrollment.classId);
    setTargetClasses(list);
  };

  const handleMove = async () => {
    if (!targetClassId) { toast.error('请选择目标班级'); return; }
    setMoveLoading(true);
    try {
      const res = await classMemberService.moveMemberToClass(moveEnrollment._id || moveEnrollment.id, targetClassId);
      if (res.code === 0) {
        toast.success('已调整班级');
        setMoveOpen(false);
        loadRoster(selectedClassId);
      } else {
        toast.error(res.message || '调班失败');
      }
    } finally {
      setMoveLoading(false);
    }
  };

  const handleRemove = async (enrollment: any) => {
    if (!window.confirm(`确认将 ${enrollment.studentName || enrollment.userName || '该学员'} 移出班级？`)) return;
    const res = await classMemberService.removeMember(enrollment._id || enrollment.id);
    if (res.code === 0) { toast.success('已移除'); loadRoster(selectedClassId, rosterFilter); }
    else toast.error(res.message || '操作失败');
  };

  const handleRejoin = async (enrollment: any) => {
    if (!window.confirm(`确认将 ${enrollment.studentName || enrollment.userName || '该学员'} 重新加入班级？`)) return;
    const res = await classMemberService.rejoinClass(enrollment._id || enrollment.id);
    if (res.code === 0) { toast.success('已重新加入'); loadRoster(selectedClassId, rosterFilter); }
    else toast.error(res.message || '操作失败');
  };

  // 行内按钮可用性（与服务端判定保持一致，客户端仅做 UX 提示）
  const memberState = (e: any) => {
    const cls = classes.find((c: any) => c._id === e.classId) || {};
    const paid = e.payment?.status
      ? ['paid', 'completed', 'paid_offline'].includes(e.payment.status)
      : e.paymentStatus === 'paid';
    const free = Number(cls.enrollmentConfig?.price ?? cls.price ?? 0) === 0;
    const endDate = cls.endDate ? new Date(cls.endDate).getTime() : 0;
    const expired = endDate > 0 && Date.now() > endDate;
    const canRemove = !(paid && !expired);
    const canTransfer = !expired;
    return { paid, free, expired, canRemove, canTransfer };
  };

  const handleToggleVideo = async (enrollment: any) => {
    const enabled = !(enrollment.access?.videoEnabled);
    try {
      const res = await classMemberService.toggleClassMemberVideo(enrollment, enabled, enrollment.access?.videoValidUntil);
      if (res.code === 0) { toast.success(enabled ? '已开通视频' : '已关闭视频'); loadRoster(selectedClassId); }
      else toast.error('操作失败');
    } catch (e) {
      toast.error('操作失败，请重试');
    }
  };

  // 打开某学员的关联课程（报班赠送）弹窗
  const openMemberCourses = async (enrollment: any) => {
    setMemberCoursesEnr(enrollment);
    setMemberCoursesOpen(true);
    setMemberCourses([]);
    const phone = enrollment.phone || enrollment.studentPhone;
    if (!phone || !enrollment.classId) { setMemberCourses([]); return; }
    setMemberCoursesLoading(true);
    try {
      const list = await classMemberService.getClassMemberCourses(enrollment.classId, phone);
      setMemberCourses(list);
    } finally {
      setMemberCoursesLoading(false);
    }
  };

  const handleToggleMemberCourseVideo = async (perm: any) => {
    const enabled = !(perm.videoAccess?.enabled);
    try {
      const res = await classMemberService.toggleCourseBuyerVideo(perm._id || perm.id, enabled, perm.videoAccess?.validUntil);
      if (res.code === 0) { toast.success(enabled ? '已开通视频' : '已关闭视频'); openMemberCourses(memberCoursesEnr); }
      else toast.error('操作失败');
    } catch (e) {
      toast.error('操作失败，请重试');
    }
  };

  const handleRevokeMemberCourse = async (perm: any) => {
    if (!window.confirm(`确定撤销 ${perm.courseName || perm.courseId} 的关联课程权限？`)) return;
    const res = await classMemberService.revokeCourseBuyerPermission(perm._id || perm.id);
    if (res.code === 0) { toast.success('已撤销关联课程'); openMemberCourses(memberCoursesEnr); }
    else toast.error('操作失败');
  };

  // 添加赠送关联课程
  const openAddCourse = () => {
    setAddCourseOpen(true);
    setAddCourseSelected(null);
    setAddCourseEnabled(true);
    setAddCourseDays(365);
    setAddCourseResult(null);
  };
  const closeAddCourse = () => setAddCourseOpen(false);

  const submitAddCourse = async () => {
    if (!addCourseSelected || !memberCoursesEnr) return;
    setAddCourseLoading(true);
    setAddCourseResult(null);
    try {
      const phone = memberCoursesEnr.phone || memberCoursesEnr.studentPhone;
      const res = await classMemberService.grantClassMemberCourse({
        classId: memberCoursesEnr.classId,
        className: memberCoursesEnr.className,
        phone,
        userId: memberCoursesEnr.studentId || memberCoursesEnr.userId,
        name: memberCoursesEnr.studentName || memberCoursesEnr.userName,
        courseId: addCourseSelected._id,
        courseName: addCourseSelected.name || addCourseSelected.title,
        enabled: addCourseEnabled,
        validDays: addCourseDays
      });
      if (res.code === 0) {
        setAddCourseResult({ success: true, message: res.message || '已添加赠送课程' });
        openMemberCourses(memberCoursesEnr);
      } else {
        setAddCourseResult({ success: false, message: res.message || '添加失败' });
      }
    } finally {
      setAddCourseLoading(false);
    }
  };

  // ===================== 按课程 =====================
  const loadCourses = useCallback(async () => {
    const list = await classMemberService.getCourses();
    setCourses(list);
    if (!selectedCourseId && list.length) setSelectedCourseId(list[0]._id);
  }, [selectedCourseId]);

  // 注意：必须在 loadCourses 声明之后调用，避免 TDZ（依赖数组里引用未初始化的 const）
  useEffect(() => { loadCourses(); }, [loadCourses]);

  const loadBuyers = useCallback(async (courseId: string) => {
    if (!courseId) { setBuyers([]); setCourseStats(null); return; }
    setCourseLoading(true);
    try {
      const list = await classMemberService.getCourseBuyers(courseId);
      setBuyers(list);
      setCourseStats({
        total: list.length,
        active: list.filter((p: any) => p.status === 'active' && p.videoAccess?.enabled !== false).length,
        revoked: list.filter((p: any) => p.status === 'revoked').length,
        expired: list.filter((p: any) =>
          p.videoAccess?.validUntil && new Date(p.videoAccess.validUntil) < new Date()
        ).length,
      });
    } finally {
      setCourseLoading(false);
    }
  }, []);

  useEffect(() => { if (activeTab === 'course') { loadCourses(); } }, [activeTab, loadCourses]);
  useEffect(() => { if (activeTab === 'course') loadBuyers(selectedCourseId); }, [activeTab, selectedCourseId, loadBuyers]);

  const handleToggleBuyerVideo = async (perm: any) => {
    const enabled = !(perm.videoAccess?.enabled);
    try {
      const res = await classMemberService.toggleCourseBuyerVideo(perm._id || perm.id, enabled, perm.videoAccess?.validUntil);
      if (res.code === 0) { toast.success(enabled ? '已开通视频' : '已关闭视频'); loadBuyers(selectedCourseId); }
      else toast.error('操作失败');
    } catch (e) {
      toast.error('操作失败，请重试');
    }
  };

  // 打开编辑权限弹窗（context: 'course'=按课程，'member'=班级学员关联课程）
  const openEdit = (perm: any, context: 'course' | 'member' = 'course') => {
    setEditContext(context);
    // 关联课程权限可能未存 courseName，按 courseId 从课程列表补全
    const courseName = perm.courseName || courses.find((c: any) => c._id === perm.courseId)?.name || perm.courseId
    setEditingPerm({ ...perm, courseName });
    const validDays = (() => {
      if (!perm.videoAccess?.validUntil) return 365;
      const days = Math.ceil((new Date(perm.videoAccess.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 365;
    })();
    setEditForm({
      videoEnabled: perm.videoAccess?.enabled ?? true,
      videoValidDays: validDays,
      status: perm.status || 'active'
    });
    setEditResult(null);
    setEditOpen(true);
  };
  const closeEdit = () => { setEditOpen(false); setEditingPerm(null); setEditResult(null); };

  const handleSaveEdit = async () => {
    if (!editingPerm) return;
    setEditLoading(true);
    setEditResult(null);
    try {
      const res = await classMemberService.updateCourseBuyerPermission(editingPerm._id || editingPerm.id, {
        enabled: editForm.videoEnabled,
        validDays: editForm.videoValidDays,
        status: editForm.status
      });
      if (res.code === 0) {
        setEditResult({ success: true, message: '权限已更新' });
        if (editContext === 'member' && memberCoursesEnr) openMemberCourses(memberCoursesEnr);
        else loadBuyers(selectedCourseId);
      } else {
        setEditResult({ success: false, message: res.message || '更新失败' });
      }
    } finally {
      setEditLoading(false);
    }
  };

  // 撤销权限
  const handleRevoke = async (perm: any) => {
    if (!window.confirm(`确定撤销 ${perm.userName || perm.phone || '该用户'} 的课程视频权限？`)) return;
    const res = await classMemberService.revokeCourseBuyerPermission(perm._id || perm.id);
    if (res.code === 0) { toast.success('已撤销权限'); loadBuyers(selectedCourseId); }
    else toast.error('操作失败');
  };

  // CSV 导出
  const handleExport = () => {
    try {
      const header = ['用户', '手机号', '课程', '来源', '状态', '视频有效期', '视频开关'];
      const rows = buyers.map((p: any) => [
        p.userName || '',
        p.phone || p.userId || '',
        (courses.find((c: any) => c._id === selectedCourseId)?.name) || selectedCourseId,
        p.source || '',
        p.status || '',
        p.videoAccess?.validUntil ? p.videoAccess.validUntil.slice(0, 10) : '-',
        p.videoAccess?.enabled ? '开' : '关'
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `课程购课权限_${selectedCourseId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('导出失败');
    }
  };

  // ===================== 手动授权 =====================
  const openGrant = () => {
    setGrantOpen(true);
    setGrantStep('search');
    setGrantKeyword('');
    setGrantResults([]);
    setGrantSelectedUser(null);
    setGrantSelectedCourse(null);
    setGrantVideoEnabled(true);
    setGrantValidDays(365);
    setGrantResult(null);
  };
  const closeGrant = () => setGrantOpen(false);

  const searchGrantUsers = async () => {
    if (!grantKeyword.trim()) return;
    setGrantSearching(true);
    try {
      const list = await classMemberService.searchMembers(grantKeyword);
      setGrantResults(list);
    } finally {
      setGrantSearching(false);
    }
  };

  const submitGrant = async () => {
    if (!grantSelectedUser || !grantSelectedCourse) return;
    setGrantLoading(true);
    setGrantResult(null);
    try {
      const res = await classMemberService.grantCoursePermission({
        phone: grantSelectedUser.phone,
        userId: grantSelectedUser._id,
        name: grantSelectedUser.name || grantSelectedUser.phone || '未知',
        courseId: grantSelectedCourse._id,
        courseName: grantSelectedCourse.name || grantSelectedCourse.title,
        enabled: grantVideoEnabled,
        validDays: grantValidDays
      });
      if (res.code === 0) {
        setGrantResult({ success: true, message: res.message || '已开通课程视频权限' });
        loadBuyers(selectedCourseId);
      } else {
        setGrantResult({ success: false, message: res.message || '授权失败' });
      }
    } finally {
      setGrantLoading(false);
    }
  };

  // ===================== 渲染 =====================
  return (
    <AdminPageTemplate title="学员人员管理" subtitle="班级名单 / 购课人员 · 统一收口">
      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('class')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'class' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <UsersRound size={16} /> 按班级（学员名单）
        </button>
        <button
          onClick={() => setActiveTab('course')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'course' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <BookOpen size={16} /> 按课程（购课人员）
        </button>
      </div>

      {activeTab === 'class' ? (
        <div>
          {/* 班级选择 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm min-w-[240px]"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}（{c.courseName || ''}）· 在读 {c._enrolled}/{c._max} · 剩余 {c._remaining}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索姓名/手机"
                className="border rounded-lg pl-9 pr-3 py-2 text-sm w-56"
              />
            </div>
            <button onClick={() => loadRoster(selectedClassId)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-sm">
              <RefreshCw size={15} /> 刷新
            </button>
          </div>

          {/* 待审核 */}
          {pending.length > 0 && (
            <div className="mb-4 border border-yellow-200 bg-yellow-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
                <ClipboardList size={16} /> 待审核报名（{pending.length}）
              </div>
              <div className="space-y-2">
                {pending.map((p) => (
                  <div key={p._id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{p.studentName || p.userName}</span>
                      <span className="text-gray-500 ml-2">{p.phone}</span>
                      <span className="text-gray-400 ml-2">{SOURCE_LABEL[p.source] || p.source}</span>
                    </div>
                    <button
                      onClick={() => handleConfirm(p._id || p.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-600 text-white text-xs"
                    >
                      <Check size={14} /> 确认入班
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 名单筛选 */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setRosterFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-sm ${rosterFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >在读学员</button>
            <button
              onClick={() => setRosterFilter('removed')}
              className={`px-3 py-1.5 rounded-lg text-sm ${rosterFilter === 'removed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >已移出（可恢复）</button>
          </div>

          {/* 名单表格 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">学员</th>
                  <th className="text-left px-4 py-3">手机</th>
                  <th className="text-left px-4 py-3">来源</th>
                  <th className="text-left px-4 py-3">状态</th>
                  <th className="text-left px-4 py-3">缴费</th>
                  <th className="text-left px-4 py-3">视频</th>
                  <th className="text-left px-4 py-3">关联课程</th>
                  <th className="text-left px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {classLoading && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">加载中…</td></tr>
                )}
                {!classLoading && roster.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">{rosterFilter === 'removed' ? '该班级暂无已移出的学员' : '该班级暂无在读学员'}</td></tr>
                )}
                {!classLoading && roster.map((e) => (
                  <tr key={e._id || e.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.studentName || e.userName || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{e.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{SOURCE_LABEL[e.source] || e.source || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${ENR_STATUS[e.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {ENR_STATUS[e.status]?.text || e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.paymentStatus === 'paid' ? <span className="text-green-600">已付</span>
                        : e.paymentStatus === 'unpaid' ? <span className="text-yellow-600">未付</span>
                          : (e.payment?.status === 'paid' ? <span className="text-green-600">已付</span> : <span className="text-yellow-600">未付</span>)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleVideo(e)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${e.access?.videoEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        title="开关视频权限"
                      >
                        {e.access?.videoEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        {e.access?.videoEnabled ? '开' : '关'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openMemberCourses(e)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-600 text-xs"
                        title="查看/编辑报班赠送的关联课程"
                      >
                        <Gift size={14} /> 关联课程
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {e.status === 'cancelled' || e.status === 'dropped' ? (
                        <button onClick={() => handleRejoin(e)} className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-600 text-xs" title="重新加入班级">
                          <UserPlus size={14} /> 重新加入
                        </button>
                      ) : (() => {
                        const ms = memberState(e)
                        return (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openMove(e)}
                              disabled={!ms.canTransfer}
                              title={ms.canTransfer ? '调整班级' : '培训已过期，不可调班'}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ArrowRightLeft size={14} /> 调班
                            </button>
                            <button
                              onClick={() => handleRemove(e)}
                              disabled={!ms.canRemove}
                              title={ms.canRemove ? '移除' : '已付费在读，请调班或等培训完成'}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <UserMinus size={14} />
                            </button>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 调班弹窗 */}
          {moveOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMoveOpen(false)}>
              <div className="bg-white rounded-xl p-6 w-[480px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><ArrowRightLeft size={18} /> 调整班级</h3>
                  <button onClick={() => setMoveOpen(false)}><X size={18} className="text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  学员：{moveEnrollment?.studentName || moveEnrollment?.userName} · 原班级：{moveEnrollment?.className}
                </p>
                <label className="text-sm text-gray-600">选择目标班级（任意开班）</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full mt-1"
                >
                  <option value="">请选择…</option>
                  {targetClasses.map((c) => (
                    <option key={c._id} value={c._id} disabled={c._remaining <= 0}>
                      {c.name}（剩余 {c._remaining} 名额）{c.courseName ? ` · ${c.courseName}` : ''}{c._remaining <= 0 ? ' · 已满' : ''}
                    </option>
                  ))}
                </select>
                  {targetClasses.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><AlertCircle size={13} /> 暂无可选的开班</p>
                )}
                <div className="flex justify-end gap-2 mt-5">
                  <button onClick={() => setMoveOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-sm">取消</button>
                  <button
                    onClick={handleMove}
                    disabled={moveLoading || !targetClassId}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                  >
                    {moveLoading ? '处理中…' : '确认调班'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* 统计卡片（收口自权限管理） */}
          {courseStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500">总权限数</p>
                <p className="text-2xl font-semibold">{courseStats.total}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500">有效</p>
                <p className="text-2xl font-semibold text-green-600">{courseStats.active}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500">已撤销</p>
                <p className="text-2xl font-semibold text-red-600">{courseStats.revoked}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500">已过期</p>
                <p className="text-2xl font-semibold text-gray-500">{courseStats.expired}</p>
              </div>
            </div>
          )}

          {/* 课程选择 + 工具栏 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm min-w-[260px]"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.name || c.title}</option>
              ))}
            </select>
            <button onClick={() => loadBuyers(selectedCourseId)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-sm">
              <RefreshCw size={15} /> 刷新
            </button>
            <button onClick={handleExport} disabled={!buyers.length} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-sm disabled:opacity-50">
              <Download size={15} /> 导出
            </button>
            <button onClick={openGrant} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">
              <UserPlus size={15} /> 手动授权
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">学员</th>
                  <th className="text-left px-4 py-3">来源</th>
                  <th className="text-left px-4 py-3">状态</th>
                  <th className="text-left px-4 py-3">视频有效期</th>
                  <th className="text-left px-4 py-3">视频</th>
                  <th className="text-left px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {courseLoading && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">加载中…</td></tr>
                )}
                {!courseLoading && buyers.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">该课程暂无纯购课人员</td></tr>
                )}
                {!courseLoading && buyers.map((p) => (
                  <tr key={p._id || p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.userName || p.phone || p.userId}</td>
                    <td className="px-4 py-3 text-gray-600">{SOURCE_LABEL[p.source] || p.source || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${PERM_STATUS[p.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {PERM_STATUS[p.status]?.text || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.videoAccess?.validUntil ? p.videoAccess.validUntil.slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleBuyerVideo(p)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${p.videoAccess?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        title="开关视频权限"
                      >
                        {p.videoAccess?.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        {p.videoAccess?.enabled ? '开' : '关'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs" title="编辑权限">
                          <Edit size={14} /> 编辑
                        </button>
                        <button onClick={() => handleRevoke(p)} className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 text-xs" title="撤销权限">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <GraduationCap size={13} /> 购课人员与班级学员是两种概念，此处管理"纯购买课程视频权限"的学员（课程视频权限原"权限管理"模块已收口至此）。
          </p>
        </div>
      )}

      {/* 编辑权限弹窗（收口自权限管理） */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeEdit}>
          <div className="bg-white rounded-xl p-6 w-[420px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Edit size={18} /> 编辑课程权限</h3>
              <button onClick={closeEdit}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">用户：{editingPerm?.userName || editingPerm?.phone || '未知'} · 课程：{editingPerm?.courseName || editingPerm?.courseId}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="toggle toggle-primary" checked={editForm.videoEnabled} onChange={(e) => setEditForm({ ...editForm, videoEnabled: e.target.checked })} />
                <span>开通视频观看权限</span>
              </label>
              {editForm.videoEnabled && (
                <div>
                  <label className="text-gray-500 mb-1 block">视频权限有效期</label>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={editForm.videoValidDays} onChange={(e) => setEditForm({ ...editForm, videoValidDays: Number(e.target.value) })}>
                    <option value={30}>30天</option>
                    <option value={90}>90天</option>
                    <option value={180}>半年（180天）</option>
                    <option value={365}>一年（365天）</option>
                    <option value={730}>两年（730天）</option>
                    <option value={0}>永久有效</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-gray-500 mb-1 block">权限状态</label>
                <select className="border rounded-lg px-3 py-2 text-sm w-full" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">有效</option>
                  <option value="expired">已过期</option>
                  <option value="revoked">已撤销</option>
                </select>
              </div>
              {editResult && (
                <div className={`text-sm ${editResult.success ? 'text-green-600' : 'text-red-600'}`}>{editResult.message}</div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeEdit} className="px-4 py-2 rounded-lg bg-gray-100 text-sm">取消</button>
              <button onClick={handleSaveEdit} disabled={editLoading} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
                {editLoading ? '保存中…' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 手动授权弹窗（收口自权限管理） */}
      {grantOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeGrant}>
          <div className="bg-white rounded-xl p-6 w-[480px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><UserPlus size={18} /> 手动开通课程权限</h3>
              <button onClick={closeGrant}><X size={18} className="text-gray-400" /></button>
            </div>
            {grantStep === 'search' && !grantResult && (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs">1</span>搜索用户</h4>
                  <div className="flex gap-2">
                    <input
                      value={grantKeyword}
                      onChange={(e) => setGrantKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchGrantUsers()}
                      placeholder="输入手机号或姓名"
                      className="border rounded-lg px-3 py-2 text-sm flex-1"
                    />
                    <button onClick={searchGrantUsers} disabled={grantSearching || !grantKeyword.trim()} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
                      {grantSearching ? '搜索中…' : '搜索'}
                    </button>
                  </div>
                </div>
                {grantResults.length > 0 && (
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {grantResults.map((u) => (
                      <div key={u._id} className="p-3 border rounded-lg hover:border-blue-500 cursor-pointer" onClick={() => { setGrantSelectedUser(u); setGrantStep('confirm'); }}>
                        <div className="font-medium">{u.name || '未设置姓名'}</div>
                        <div className="text-sm text-gray-500">手机: {u.phone || '未绑定'}</div>
                      </div>
                    ))}
                  </div>
                )}
                {grantKeyword && grantResults.length === 0 && !grantSearching && (
                  <p className="text-center py-6 text-gray-400">未找到匹配的用户</p>
                )}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs">2</span>选择课程</h4>
                  <select className="border rounded-lg px-3 py-2 text-sm w-full" value={grantSelectedCourse?._id || ''} onChange={(e) => setGrantSelectedCourse(courses.find((c) => c._id === e.target.value) || null)}>
                    <option value="">请选择课程</option>
                    {courses.map((c) => (<option key={c._id} value={c._id}>{c.name || c.title}</option>))}
                  </select>
                </div>
              </>
            )}
            {grantStep === 'confirm' && !grantResult && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p><span className="text-gray-500">用户：</span>{grantSelectedUser?.name || '未设置'}</p>
                  <p><span className="text-gray-500">手机：</span>{grantSelectedUser?.phone || '未绑定'}</p>
                  <p><span className="text-gray-500">课程：</span>{grantSelectedCourse?.name || grantSelectedCourse?.title}</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="toggle toggle-primary" checked={grantVideoEnabled} onChange={(e) => setGrantVideoEnabled(e.target.checked)} />
                  <span className="text-sm">开通视频观看权限</span>
                </label>
                {grantVideoEnabled && (
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">视频权限有效期</label>
                    <select className="border rounded-lg px-3 py-2 text-sm w-full" value={grantValidDays} onChange={(e) => setGrantValidDays(Number(e.target.value))}>
                      <option value={30}>30天</option>
                      <option value={90}>90天</option>
                      <option value={180}>半年（180天）</option>
                      <option value={365}>一年（365天）</option>
                      <option value={730}>两年（730天）</option>
                      <option value={0}>永久有效</option>
                    </select>
                  </div>
                )}
                <button onClick={() => { setGrantStep('search'); setGrantSelectedUser(null); setGrantSelectedCourse(null); }} className="text-xs text-blue-600">重新选择用户</button>
              </div>
            )}
            {grantResult && (
              <div className={`text-sm ${grantResult.success ? 'text-green-600' : 'text-red-600'} mb-3`}>{grantResult.message}</div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeGrant} className="px-4 py-2 rounded-lg bg-gray-100 text-sm">关闭</button>
              {!grantResult && (
                grantStep === 'search' ? (
                  <button onClick={() => { if (grantSelectedUser) setGrantStep('confirm'); }} disabled={!grantSelectedUser} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">下一步</button>
                ) : (
                  <button onClick={submitGrant} disabled={!grantSelectedUser || !grantSelectedCourse || grantLoading} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
                    {grantLoading ? '处理中…' : '确认授权'}
                  </button>
                )
              )}
              {grantResult?.success && (
                <button onClick={openGrant} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">继续授权</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 班级学员关联课程（报班赠送）弹窗 */}
      {memberCoursesOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMemberCoursesOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-[560px] max-w-[94vw] max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Gift size={18} /> 学员关联课程（报班赠送）</h3>
              <button onClick={() => setMemberCoursesOpen(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              学员：{memberCoursesEnr?.studentName || memberCoursesEnr?.userName || '未知'} · 班级：{memberCoursesEnr?.className}
            </p>

            {memberCoursesLoading && <p className="text-center py-6 text-gray-400">加载中…</p>}

            {!memberCoursesLoading && (() => {
              const mainCourseId = memberCoursesEnr?.courseId
              const mainPerm = memberCourses.find((p) => p.courseId === mainCourseId)
              const gifts = memberCourses.filter((p) => p.courseId !== mainCourseId)
              return (
                <div className="space-y-4">
                  {mainPerm && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-500">本班主课程：</span>
                          <span className="font-medium">{mainPerm.courseName || mainPerm.courseId}</span>
                          <span className="ml-2 text-xs text-gray-400">（视频开关请在列表“视频”列操作）</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs ${mainPerm.videoAccess?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {mainPerm.videoAccess?.enabled ? '视频开' : '视频关'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Gift size={15} /> 赠送关联课程（{gifts.length}）
                      </h4>
                      <button onClick={openAddCourse} className="flex items-center gap-1 px-2 py-1 rounded bg-purple-600 text-white text-xs">
                        <Plus size={14} /> 添加赠送课程
                      </button>
                    </div>

                    {gifts.length === 0 && (
                      <p className="text-center py-6 text-gray-400 text-sm">该学员本班暂无额外赠送关联课程</p>
                    )}

                    <div className="space-y-2">
                      {gifts.map((p) => (
                        <div key={p._id || p.id} className="border rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{p.courseName || p.courseId}</span>
                              <span className="ml-2 text-xs text-gray-400">{SOURCE_LABEL[p.source] || p.source}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs ${PERM_STATUS[p.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                              {PERM_STATUS[p.status]?.text || p.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            视频有效期：{p.videoAccess?.validUntil ? p.videoAccess.validUntil.slice(0, 10) : (p.videoAccess?.enabled ? '永久' : '-')}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => handleToggleMemberCourseVideo(p)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${p.videoAccess?.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {p.videoAccess?.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                              {p.videoAccess?.enabled ? '视频开' : '视频关'}
                            </button>
                            <button onClick={() => openEdit(p, 'member')} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs">
                              <Edit size={13} /> 编辑
                            </button>
                            <button onClick={() => handleRevokeMemberCourse(p)} className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 text-xs">
                              <Trash2 size={13} /> 撤销
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* 添加赠送关联课程弹窗 */}
      {addCourseOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeAddCourse}>
          <div className="bg-white rounded-xl p-6 w-[460px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Plus size={18} /> 添加赠送关联课程</h3>
              <button onClick={closeAddCourse}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              为 {memberCoursesEnr?.studentName || memberCoursesEnr?.userName} 在「{memberCoursesEnr?.className}」添加赠送课程
            </p>
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-1 block">选择课程</label>
              <select
                className="border rounded-lg px-3 py-2 text-sm w-full"
                value={addCourseSelected?._id || ''}
                onChange={(e) => setAddCourseSelected(courses.find((c) => c._id === e.target.value) || null)}
              >
                <option value="">请选择课程</option>
                {courses.filter((c) => c._id !== memberCoursesEnr?.courseId).map((c) => (
                  <option key={c._id} value={c._id}>{c.name || c.title}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input type="checkbox" className="toggle toggle-primary" checked={addCourseEnabled} onChange={(e) => setAddCourseEnabled(e.target.checked)} />
              <span className="text-sm">开通视频观看权限</span>
            </label>
            {addCourseEnabled && (
              <div className="mb-3">
                <label className="text-sm text-gray-500 mb-1 block">视频权限有效期</label>
                <select className="border rounded-lg px-3 py-2 text-sm w-full" value={addCourseDays} onChange={(e) => setAddCourseDays(Number(e.target.value))}>
                  <option value={30}>30天</option>
                  <option value={90}>90天</option>
                  <option value={180}>半年（180天）</option>
                  <option value={365}>一年（365天）</option>
                  <option value={730}>两年（730天）</option>
                  <option value={0}>永久有效</option>
                </select>
              </div>
            )}
            {addCourseResult && (
              <div className={`text-sm mb-3 ${addCourseResult.success ? 'text-green-600' : 'text-red-600'}`}>{addCourseResult.message}</div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeAddCourse} className="px-4 py-2 rounded-lg bg-gray-100 text-sm">关闭</button>
              <button
                onClick={submitAddCourse}
                disabled={!addCourseSelected || addCourseLoading}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:opacity-50"
              >
                {addCourseLoading ? '处理中…' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminPageTemplate>
  );
}
