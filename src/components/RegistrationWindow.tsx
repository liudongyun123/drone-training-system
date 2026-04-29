// ============================================================================
// 前台报名窗口组件 v2.1
// 功能：线下报名入口，支持班级详情查看、填写报名信息
// 版本: v20260410-class-intro
// ============================================================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, MapPin, Clock, CheckCircle, AlertCircle,
  ChevronRight, User, BookOpen, GraduationCap,
  Play, FileText, X, Eye, ExternalLink
} from 'lucide-react';
import { classService } from '@/services/classService';
import { courseService } from '@/services/database';
import { registrationService } from '@/services/registrationService';
import { useAuthStore } from '@/store/authStore';
import type { ClassV2, Course } from '@/types';
import { toast } from '@/components';

interface RegistrationWindowProps {
  courseId?: string;
  classId?: string;  // 班级专属报名
  onSuccess?: () => void;
  onClose?: () => void;
}

// 班级介绍弹窗
function ClassIntroModal({ 
  cls, 
  onClose, 
  onEnroll 
}: { 
  cls: ClassV2; 
  onClose: () => void; 
  onEnroll: () => void;
}) {
  const hasIntro = cls.intro && (
    cls.intro.videoUrl || 
    cls.intro.documentUrl || 
    cls.intro.content
  );
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{cls.name}</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">{cls.courseName}</p>
        </div>
        
        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 视频介绍 */}
          {cls.intro?.videoUrl && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-500" />
                视频介绍
              </h4>
              <div className="bg-gray-100 rounded-xl overflow-hidden">
                {cls.intro.videoCover ? (
                  <div className="relative">
                    <img 
                      src={cls.intro.videoCover} 
                      alt="视频封面"
                      className="w-full h-48 object-cover"
                    />
                    <a 
                      href={cls.intro.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        观看视频
                      </div>
                    </a>
                  </div>
                ) : (
                  <a 
                    href={cls.intro.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-6 text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Play className="w-6 h-6" />
                    <span>点击观看视频介绍</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* 文档介绍 */}
          {cls.intro?.documentUrl && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                相关文档
              </h4>
              <a 
                href={cls.intro.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
              >
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-800">
                    {cls.intro.documentName || '课程文档'}
                  </p>
                  <p className="text-sm text-gray-500">点击查看详情</p>
                </div>
                <ExternalLink className="w-5 h-5 text-green-600 ml-auto" />
              </a>
            </div>
          )}
          
          {/* 详细介绍 */}
          {cls.intro?.content && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                详细介绍
              </h4>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {cls.intro.content}
                </p>
              </div>
            </div>
          )}
          
          {/* 无介绍内容 */}
          {!hasIntro && (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无详细介绍</p>
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            返回列表
          </button>
          <button
            onClick={onEnroll}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            立即报名
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegistrationWindow({ courseId, classId, onSuccess, onClose }: RegistrationWindowProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  // 课程和班级数据
  const [course, setCourse] = useState<Course | null>(null);
  const [classes, setClasses] = useState<ClassV2[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 选择的班级
  const [selectedClass, setSelectedClass] = useState<ClassV2 | null>(null);
  
  // 报名表单
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    remark: ''
  });
  
  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // 支付确认状态（缴费即报名）
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  
  // 班级详情弹窗
  const [showClassIntro, setShowClassIntro] = useState(false);
  const [introClass, setIntroClass] = useState<ClassV2 | null>(null);
  
  // 加载数据
  useEffect(() => {
    loadData();
  }, [courseId, classId]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // 优先：班级专属报名模式
      if (classId) {
        const classResult = await classService.getById(classId);
        if (classResult && classResult.code === 0) {
          const classData = classResult.data;
          // 自动选中该班级
          setSelectedClass(classData);
          setClasses([classData]);
          
          // 如果班级有关联课程，加载课程信息
          if (classData.courseId) {
            const courseData = await courseService.getById(classData.courseId);
            if (courseData) {
              setCourse(courseData);
            }
          }
        } else {
          toast.error('班级不存在或已下架');
          setClasses([]);
        }
        setLoading(false);
        return;
      }
      
      // 次优先：课程报名模式
      if (courseId) {
        const courseData = await courseService.getById(courseId);
        if (courseData) {
          setCourse(courseData);
        }
        
        // 获取课程的招生班级
        const classesResult = await classService.getClassesByCourse(courseId);
        const enrollingClasses = (classesResult.data || []).filter(
          (c: ClassV2) => c.status === 'enrolling'
        );
        setClasses(enrollingClasses);
      } else {
        // 默认：加载所有招生中的班级
        const result = await classService.getList({ status: 'enrolling', page: 1, pageSize: 50 });
        const safeList = result.data?.list || [];
        setClasses(safeList);
      }
    } catch (error) {
      console.error('加载报名数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 提交报名 - 显示支付确认
  const handleSubmit = () => {
    if (!selectedClass) {
      toast.warning('请选择要报名的班级');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.warning('请输入姓名');
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      toast.warning('请输入正确的手机号');
      return;
    }
    
    // 检查登录状态
    if (!isAuthenticated) {
      // 构建返回地址
      const redirectPath = classId 
        ? `/registration/class/${classId}` 
        : '/registration';
      toast.warning('请先登录后报名');
      navigate('/login', { state: { redirect: redirectPath } });
      return;
    }
    
    // 显示支付确认界面
    setShowPaymentConfirm(true);
  };
  
  // 确认支付 - 直接完成报名（简化版，跳过实际支付）
  const handleConfirmPayment = async () => {
    if (!selectedClass) return;
    
    setSubmitting(true);
    try {
      // 创建报名记录 - 缴费即报名，直接标记为已确认
      await registrationService.create({
        studentId: user!.id,
        studentName: formData.name,
        phone: formData.phone,
        courseId: selectedClass.courseId || course?._id || '',
        courseName: selectedClass.courseName || course?.title || '',
        classId: selectedClass._id!,
        className: selectedClass.name,
        source: 'offline',
        remarks: formData.remark || '',
        status: 'confirmed'
      });
      
      setShowPaymentConfirm(false);
      setSubmitSuccess(true);
      toast.success('报名成功！');
      onSuccess?.();
      
    } catch (error: any) {
      console.error('报名失败:', error);
      toast.error(error.message || '报名失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 提交成功状态
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">报名成功！</h2>
            <p className="text-gray-600 mb-6">
              您的报名申请已提交，请等待管理员审核。
              审核通过后，您将收到短信通知。
            </p>
            <div className="space-y-3">
              <Link
                to="/my-registrations"
                className="btn btn-primary btn-block"
              >
                查看我的报名
              </Link>
              <button
                onClick={() => navigate('/')}
                className="btn btn-outline btn-block"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 头部 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">线下报名</h1>
            {onClose && (
              <button
                onClick={onClose}
                className="btn btn-sm btn-ghost"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <>
            {/* 课程信息 */}
            {course && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex gap-4">
                  <img
                    src={course.coverImage || 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=200'}
                    alt={course.title}
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h2 className="font-bold text-gray-800">{course.title}</h2>
                    <p className="text-sm text-gray-500">{course.category}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 班级选择 */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                {classId ? '报名班级' : '选择班级'}
              </h3>
              
              {classes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                  <p>暂无可报名班级</p>
                  <p className="text-sm mt-1">请联系客服咨询最新开班信息</p>
                </div>
              ) : (
                <div className={classId ? '' : 'space-y-3'}>
                  {classes.map((cls) => {
                    const remaining = (cls.maxStudents || 50) - (cls.enrolledCount || 0);
                    const isSelected = selectedClass?._id === cls._id;
                    const isFull = remaining <= 0;
                    
                    // 班级专属模式：始终显示为选中状态
                    const displaySelected = classId ? true : isSelected;
                    
                    return (
                      <div
                        key={cls._id}
                        onClick={() => !classId && !isFull && setSelectedClass(cls)}
                        className={`
                          p-4 rounded-xl border-2 transition-all
                          ${classId 
                            ? 'border-primary bg-primary/5 shadow-md cursor-default' 
                            : isSelected 
                              ? 'border-primary bg-primary/5 shadow-md cursor-pointer' 
                              : isFull 
                                ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                : 'border-gray-200 hover:border-primary/50 cursor-pointer'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-800">{cls.name}</h4>
                              {!classId && (
                                <span className={`
                                  badge badge-sm
                                  ${isFull ? 'badge-error' : 'badge-success'}
                                `}>
                                  {isFull ? '已满员' : `剩余 ${remaining} 名额`}
                                </span>
                              )}
                              {classId && displaySelected && (
                                <span className="badge badge-sm badge-primary">已选择</span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>{cls.startDate} ~ {cls.endDate}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{cls.location}</span>
                              </div>
                              {cls.teacherName && (
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  <span>{cls.teacherName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{cls.startTime || '09:00'} - {cls.endTime || '17:00'}</span>
                              </div>
                            </div>
                            
                            {cls.description && (
                              <p className="text-sm text-gray-500 mt-2">{cls.description}</p>
                            )}
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2 ml-4">
                            {/* 查看详情按钮 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIntroClass(cls);
                                setShowClassIntro(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4" />
                              <span>详情</span>
                            </button>
                            
                            {/* 选中指示 */}
                            {displaySelected && !classId && (
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* 报名表单 */}
            {selectedClass && !selectedClass.status?.includes('full') && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  填写报名信息
                </h3>
                
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">姓名 *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入您的姓名"
                      className="input input-bordered w-full"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">手机号 *</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="请输入手机号"
                      className="input input-bordered w-full"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">备注</span>
                    </label>
                    <textarea
                      placeholder="如有特殊需求请在此说明"
                      className="textarea textarea-bordered w-full"
                      rows={3}
                      value={formData.remark}
                      onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* 注意事项 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                报名须知
              </h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>1. 缴费成功后即完成报名</li>
                <li>2. 报名成功后可在"我的班级"查看详情</li>
                <li>3. 如需取消报名，请联系客服</li>
                <li>4. 报名费支付后不予退还</li>
              </ul>
            </div>
            
            {/* 提交按钮 - 改为立即缴费 */}
            {selectedClass && !selectedClass.status?.includes('full') && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.name || !formData.phone}
                className="btn btn-primary btn-block btn-lg"
              >
                {submitting ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  <>
                    立即缴费报名
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
      
      {/* 支付确认弹窗 */}
      {showPaymentConfirm && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl text-center">
              <h3 className="text-xl font-bold">确认报名信息</h3>
            </div>
            
            {/* 内容 */}
            <div className="p-6">
              {/* 班级信息 */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-slate-800 mb-2">{selectedClass.name}</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{selectedClass.startDate} ~ {selectedClass.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{selectedClass.location}</span>
                  </div>
                </div>
              </div>
              
              {/* 报名信息 */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">报名人</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">联系电话</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">报名方式</span>
                  <span className="font-medium text-blue-600">缴费即报名</span>
                </div>
              </div>
              
              {/* 费用 */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">报名费用</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-orange-500">
                      ¥{selectedClass.price || 0}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 提示 */}
              <p className="text-xs text-slate-500 text-center mb-6">
                点击"确认缴费"即表示您同意报名条款，缴费成功后不予退还
              </p>
              
              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentConfirm(false)}
                  disabled={submitting}
                  className="btn btn-outline flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      确认缴费
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 班级详情弹窗 */}
      {showClassIntro && introClass && (
        <ClassIntroModal
          cls={introClass}
          onClose={() => {
            setShowClassIntro(false);
            setIntroClass(null);
          }}
          onEnroll={() => {
            setShowClassIntro(false);
            setSelectedClass(introClass);
            setIntroClass(null);
          }}
        />
      )}
    </div>
  );
}
