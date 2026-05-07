/**
 * 线上报班页面
 * 
 * 功能：
 * 1. 浏览开班信息（线下班级列表）
 * 2. 选择班级并报名
 * 3. 线上支付
 * 4. 报名成功后自动分配到班级
 * 
 * 业务流程：
 * 1. 用户浏览可报名的班级
 * 2. 选择班级 -> 填写报名信息 -> 支付
 * 3. 支付成功后：
 *    - 创建报名记录（registrations）
 *    - 创建班级成员（class_members）
 *    - 如果有视频赠送，创建课程权限（course_permissions）
 *    - 更新订单状态
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CreditCard,
  CheckCircle,
  ChevronRight,
  Video,
  BookOpen,
  AlertCircle,
  User,
  Search
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Loading, EmptyState, Card, Modal } from '@/components';
import { formatDateStr } from '@/utils/dateUtils';
import { classApi } from '@/services/webApi';

interface ClassInfo {
  _id: string;
  name: string;
  courseId?: string;
  courseName?: string;
  teacherName?: string;
  teacherId?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  maxStudents?: number;
  enrolledCount?: number;
  price?: number;
  originalPrice?: number;
  hasVideoGrant?: boolean;  // 是否赠送视频课程
  videoGrantCourseId?: string;  // 赠送的视频课程ID
  videoGrantCourseName?: string;  // 赠送的视频课程名称
  coverImage?: string;
  status?: string;
  requirements?: string[];  // 报名要求
  schedule?: string;  // 课程安排描述
}

interface EnrollmentForm {
  name: string;
  phone: string;
  idCard?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

export default function ClassEnrollmentPage() {
  const navigate = useNavigate();
  const { user, loginWithPhone, sendPhoneCode } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassInfo[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // 报名流程状态
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [enrollmentStep, setEnrollmentStep] = useState<'info' | 'pay' | 'success'>('info');
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentForm>({
    name: '',
    phone: '',
    idCard: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
  });
  const [enrolling, setEnrolling] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    // 过滤班级
    let filtered = classes;
    
    if (searchKeyword) {
      filtered = filtered.filter(c => 
        c.name?.includes(searchKeyword) ||
        c.courseName?.includes(searchKeyword) ||
        c.teacherName?.includes(searchKeyword) ||
        c.location?.includes(searchKeyword)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    setFilteredClasses(filtered);
  }, [classes, searchKeyword, statusFilter]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      // 使用云函数获取班级列表
      const res = await classApi.getClasses({
        status: ['enrolling', 'upcoming', 'open'],
        pageSize: 50
      });
      
      if (res.success && res.data) {
        console.log('[ClassEnrollmentPage] 加载班级:', res.data.list?.length || 0);
        
        const classList: ClassInfo[] = (res.data.list || []).map((cls: any) => ({
          _id: cls._id,
          name: cls.name,
          courseId: cls.courseId,
          courseName: cls.courseName || '',
          teacherName: cls.teacherName || cls.teacher?.name || '',
          teacherId: cls.teacherId,
          description: cls.description,
          startDate: cls.startDate,
          endDate: cls.endDate,
          location: cls.location,
          maxStudents: cls.maxStudents,
          enrolledCount: cls.enrolledCount || cls.enrolledStudents || 0,
          price: cls.price || cls.coursePrice || 0,
          originalPrice: cls.originalPrice,
          hasVideoGrant: cls.hasVideoGrant,
          videoGrantCourseId: cls.videoGrantCourseId,
          videoGrantCourseName: cls.videoGrantCourseName,
          coverImage: cls.coverImage,
          status: cls.status,
          requirements: cls.requirements,
          schedule: cls.schedule,
        }));
        
        setClasses(classList);
        setFilteredClasses(classList);
      } else {
        console.error('[ClassEnrollmentPage] 加载班级失败:', res.error);
        setClasses([]);
        setFilteredClasses([]);
      }
    } catch (error) {
      console.error('[ClassEnrollmentPage] 加载班级失败:', error);
      setClasses([]);
      setFilteredClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // 发送验证码
  const handleSendCode = async () => {
    const phoneNum = enrollmentForm.phone;
    if (!phoneNum || !/^1[3-9]\d{9}$/.test(phoneNum)) {
      setError('请输入正确的手机号');
      return;
    }
    
    setError('');
    try {
      const result = await sendPhoneCode(phoneNum);
      if (result.success) {
        setSmsSent(true);
        setSmsCountdown(60);
        const timer = setInterval(() => {
          setSmsCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.error || '发送验证码失败');
      }
    } catch (e: any) {
      setError(e.message || '发送验证码失败');
    }
  };

  // 开始报名
  const handleStartEnrollment = (cls: ClassInfo) => {
    setSelectedClass(cls);
    setEnrollmentStep('info');
    setEnrollmentForm({
      name: user?.name || '',
      phone: user?.phone || '',
      idCard: '',
      emergencyContact: '',
      emergencyPhone: '',
      notes: '',
    });
    setShowEnrollmentModal(true);
  };

  // 提交报名信息
  const handleSubmitEnrollment = async () => {
    // 验证表单
    if (!enrollmentForm.name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!enrollmentForm.phone || !/^1[3-9]\d{9}$/.test(enrollmentForm.phone)) {
      setError('请输入正确的手机号');
      return;
    }
    if (!smsCode || smsCode.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    
    setError('');
    setEnrolling(true);
    
    try {
      // 使用云函数完成报名流程
      const result = await classApi.enroll({
        classId: selectedClass?._id || '',
        userName: enrollmentForm.name,
        phone: enrollmentForm.phone,
        idCard: enrollmentForm.idCard,
        emergencyContact: enrollmentForm.emergencyContact,
        emergencyPhone: enrollmentForm.emergencyPhone,
        notes: enrollmentForm.notes,
      });
      
      console.log('[ClassEnrollmentPage] 报名结果:', result);
      
      if (result.success) {
        // 报名成功
        setEnrollmentStep('success');
        setEnrolling(false);
      } else {
        setError(result.error || '报名失败，请重试');
        setEnrolling(false);
      }
    } catch (e: any) {
      console.error('[ClassEnrollmentPage] 报名失败:', e);
      setError(e.message || '报名失败，请重试');
      setEnrolling(false);
    }
  };

  // 立即支付
  const handlePayNow = async () => {
    if (!selectedClass) return;
    
    setEnrolling(true);
    try {
      // 创建订单并发起支付
      const result = await app.callFunction({
        name: 'admin',
        data: {
          action: 'createOrder',
          data: {
            items: [{
              type: 'class',
              classId: selectedClass._id,
              className: selectedClass.name,
              price: selectedClass.price,
            }],
            totalAmount: selectedClass.price,
            phone: enrollmentForm.phone,
            studentName: enrollmentForm.name,
          }
        }
      });
      
      if ((result.result as any)?.code === 0) {
        // 跳转支付页面
        const orderId = (result.result as any)?.data?.orderId;
        navigate(`/checkout?orderId=${orderId}&type=class`);
      } else {
        setError((result.result as any)?.message || '创建订单失败');
        setEnrolling(false);
      }
    } catch (e: any) {
      setError(e.message || '支付失败');
      setEnrolling(false);
    }
  };

  // 查看已报名班级详情
  const handleViewClass = (cls: ClassInfo) => {
    navigate(`/class/${cls._id}`);
  };

  // 计算剩余名额
  const getRemainingSlots = (cls: ClassInfo) => {
    const max = cls.maxStudents || 30;
    const enrolled = cls.enrolledCount || 0;
    return max - enrolled;
  };

  // 获取班级状态标签
  const getStatusBadge = (cls: ClassInfo) => {
    const remaining = getRemainingSlots(cls);
    
    if (cls.status === 'full' || remaining <= 0) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">已满员</span>;
    }
    if (remaining <= 5) {
      return <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs animate-pulse">仅剩 {remaining} 名</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">报名中</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loading fullScreen text="加载班级信息..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">线上报班</h1>
          <p className="text-gray-500 mt-2">选择班级，线上报名缴费，即刻开始培训</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
            <p className="text-sm text-gray-500 mt-1">可选班级</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {classes.filter(c => getRemainingSlots(c) > 0).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">可报名</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {classes.filter(c => c.hasVideoGrant).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">赠送视频</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-orange-600">
              {classes.filter(c => getRemainingSlots(c) <= 5 && getRemainingSlots(c) > 0).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">即将满员</p>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索班级名称、课程、老师..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部状态</option>
                <option value="enrolling">报名中</option>
                <option value="upcoming">即将开班</option>
                <option value="full">已满员</option>
              </select>
            </div>
          </div>
        </div>

        {/* 班级列表 */}
        {filteredClasses.length === 0 ? (
          <EmptyState
            icon={<Users className="w-16 h-16 text-gray-300" />}
            title="暂无可报名的班级"
            description="目前没有开放报名的班级，请稍后再来"
            action={
              <button
                onClick={() => navigate('/courses')}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                先看看视频课程
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map(cls => (
              <Card key={cls._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* 班级封面 */}
                <div className="relative aspect-video">
                  <img
                    src={cls.coverImage || 'https://images.unsplash.com/photo-1509062522247-3755977927d7?w=400'}
                    alt={cls.name}
                    className="w-full h-full object-cover"
                  />
                  {/* 状态标签 */}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(cls)}
                  </div>
                  {/* 视频赠送标签 */}
                  {cls.hasVideoGrant && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-purple-500 text-white rounded text-xs font-medium">
                      <Video size={12} />
                      赠送视频课
                    </div>
                  )}
                </div>

                {/* 班级信息 */}
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-1">
                    {cls.name}
                  </h3>
                  
                  {cls.courseName && (
                    <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                      <BookOpen size={14} />
                      {cls.courseName}
                    </p>
                  )}

                  {/* 课程信息 */}
                  <div className="space-y-2 mb-4">
                    {cls.startDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDateStr(cls.startDate)} 开始</span>
                      </div>
                    )}
                    {cls.teacherName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User size={14} className="text-gray-400" />
                        <span>{cls.teacherName}</span>
                      </div>
                    )}
                    {cls.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        <span>{cls.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users size={14} className="text-gray-400" />
                      <span>
                        {cls.enrolledCount || 0}/{cls.maxStudents || 30} 人
                      </span>
                      <span className="text-xs text-gray-400">
                        ({getRemainingSlots(cls)} 个名额)
                      </span>
                    </div>
                  </div>

                  {/* 赠送视频课程 */}
                  {cls.hasVideoGrant && cls.videoGrantCourseName && (
                    <div className="p-3 bg-purple-50 rounded-lg mb-4">
                      <p className="text-xs text-purple-600 font-medium mb-1">报名即送</p>
                      <p className="text-sm text-purple-800">{cls.videoGrantCourseName}</p>
                    </div>
                  )}

                  {/* 价格和操作 */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      {cls.originalPrice && cls.originalPrice > cls.price && (
                        <span className="text-sm text-gray-400 line-through">
                          ¥{cls.originalPrice}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-blue-600">
                        ¥{cls.price || 0}
                      </span>
                      {cls.price === 0 && (
                        <span className="text-sm text-green-600 ml-2">免费</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleStartEnrollment(cls)}
                      disabled={getRemainingSlots(cls) <= 0}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                        getRemainingSlots(cls) <= 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {getRemainingSlots(cls) <= 0 ? '已满员' : '立即报名'}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 报名弹窗 */}
        <Modal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          title={enrollmentStep === 'success' ? '报名成功' : `报名 - ${selectedClass?.name}`}
          size="lg"
        >
          {/* 报名成功 */}
          {enrollmentStep === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">报名成功！</h3>
              <p className="text-gray-500 mb-6">
                您已成功报名 <span className="font-medium">{selectedClass?.name}</span>
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowEnrollmentModal(false);
                    navigate('/my-training');
                  }}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  查看我的培训
                </button>
                <button
                  onClick={() => {
                    setShowEnrollmentModal(false);
                    navigate('/');
                  }}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  返回首页
                </button>
              </div>
            </div>
          )}

          {/* 报名信息表单 */}
          {enrollmentStep === 'info' && (
            <div className="space-y-4">
              {/* 班级信息摘要 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">{selectedClass?.name}</h4>
                    {selectedClass?.courseName && (
                      <p className="text-sm text-gray-500 mt-1">{selectedClass.courseName}</p>
                    )}
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    ¥{selectedClass?.price || 0}
                  </span>
                </div>
                {selectedClass?.hasVideoGrant && (
                  <div className="mt-2 p-2 bg-purple-100 rounded text-sm text-purple-700">
                    赠送视频课程：{selectedClass.videoGrantCourseName}
                  </div>
                )}
              </div>

              {/* 报名表单 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={enrollmentForm.name}
                    onChange={e => setEnrollmentForm({ ...enrollmentForm, name: e.target.value })}
                    placeholder="请输入真实姓名"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    手机号 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={enrollmentForm.phone}
                      onChange={e => setEnrollmentForm({ ...enrollmentForm, phone: e.target.value })}
                      placeholder="用于接收课程通知"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={smsCountdown > 0}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        smsCountdown > 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    验证码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={smsCode}
                    onChange={e => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6位验证码"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    身份证号
                  </label>
                  <input
                    type="text"
                    value={enrollmentForm.idCard}
                    onChange={e => setEnrollmentForm({ ...enrollmentForm, idCard: e.target.value })}
                    placeholder="选填，用于证书制作"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      紧急联系人
                    </label>
                    <input
                      type="text"
                      value={enrollmentForm.emergencyContact}
                      onChange={e => setEnrollmentForm({ ...enrollmentForm, emergencyContact: e.target.value })}
                      placeholder="选填"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      紧急联系电话
                    </label>
                    <input
                      type="tel"
                      value={enrollmentForm.emergencyPhone}
                      onChange={e => setEnrollmentForm({ ...enrollmentForm, emergencyPhone: e.target.value })}
                      placeholder="选填"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={enrollmentForm.notes}
                    onChange={e => setEnrollmentForm({ ...enrollmentForm, notes: e.target.value })}
                    placeholder="如有特殊需求请在此说明"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEnrollmentModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmitEnrollment}
                  disabled={enrolling}
                  className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enrolling ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      提交中...
                    </>
                  ) : (
                    <>
                      {selectedClass?.price && selectedClass.price > 0 ? '提交并支付' : '提交报名'}
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 支付页面 */}
          {enrollmentStep === 'pay' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">确认支付</h3>
              <p className="text-gray-500 mb-4">
                报名班级：{selectedClass?.name}
              </p>
              <div className="text-3xl font-bold text-blue-600 mb-6">
                ¥{selectedClass?.price}
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handlePayNow}
                  disabled={enrolling}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enrolling ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      处理中...
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} />
                      立即支付
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEnrollmentModal(false);
                    navigate('/my-training');
                  }}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  稍后支付
                </button>
              </div>

              {/* 支付说明 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <h4 className="font-medium text-gray-700 mb-2">支付说明</h4>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• 支付成功后即可加入班级开始学习</li>
                  <li>• 如需发票，请联系客服</li>
                  <li>• 支持微信、支付宝支付</li>
                </ul>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
